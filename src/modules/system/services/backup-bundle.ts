import { createHash } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import { z } from "zod";
import {
  canEncryptSecrets,
  openBytes,
  sealBytes,
} from "@/shared/security/secret-box";

export const BACKUP_ENCRYPTION_PURPOSE = "system-backup";
export const BACKUP_FORMAT_VERSION = 1;
export const BACKUP_STORAGE_PREFIX = "backups";
export const MAX_DECOMPRESSED_BUNDLE_BYTES = 512 * 1024 * 1024; // 512 MiB zip-bomb guard

const BACKUP_MAGIC = Buffer.from([0x56, 0x42, 0x41, 0x4b, 0x00, 0x01]); // "VBAK\0\x01"
const MANIFEST_ENTRY_PATH = "manifest.json";

const backupFileEntrySchema = z.object({
  path: z.string().min(1).max(512),
  size: z.number().int().min(0),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
});

export const backupManifestSchema = z.object({
  formatVersion: z.literal(BACKUP_FORMAT_VERSION),
  createdAt: z.string().datetime(),
  appVersion: z.string().min(1).max(64),
  schemaVersion: z.string().nullable(),
  migrationCount: z.number().int().min(0),
  dbMode: z.enum(["pg_dump", "pg_logical"]),
  dbFilename: z.enum(["database.sql", "database.json"]),
  dbDumpSha256: z.string().regex(/^[0-9a-f]{64}$/),
  dbDumpBytes: z.number().int().min(0),
  dbTableCount: z.number().int().min(0),
  dbRowCount: z.number().int().min(0),
  uploadFileCount: z.number().int().min(0),
  uploadTotalBytes: z.number().int().min(0),
  files: z.array(backupFileEntrySchema),
});

export type BackupManifest = z.infer<typeof backupManifestSchema>;

export interface BackupUploadEntry {
  path: string;
  data: Buffer;
}

export interface PackBackupInput {
  createdAt?: string;
  appVersion: string;
  schemaVersion: string | null;
  migrationCount: number;
  dbMode: "pg_dump" | "pg_logical";
  dbDump: Buffer;
  dbTableCount: number;
  dbRowCount: number;
  uploadFiles: BackupUploadEntry[];
}

export interface PackedBackupResult {
  encryptedArchive: Buffer;
  archiveSizeBytes: number;
  archiveSha256: string;
  manifest: BackupManifest;
  manifestSha256: string;
  encryptionKeyVersion: string;
}

export type SchemaCompatibility = "compatible" | "older" | "newer" | "unknown";

export interface BackupVerificationResult {
  ok: boolean;
  errorCode: string | null;
  archiveSizeBytes: number;
  archiveSha256: string;
  manifestSha256: string | null;
  encryptionKeyVersion: string | null;
  manifest: BackupManifest | null;
  schemaCompatibility: SchemaCompatibility;
  checkedUploadFiles: number;
  mismatchedFiles: string[];
  missingFiles: string[];
  unexpectedFiles: string[];
  dbIntegrityOk: boolean;
}

export function sha256Hex(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Validates that an upload relative path inside a backup archive is strictly
 * normalized, relative, free of traversal/control chars, and never inside `backups/`.
 */
export function isSafeBackupRelativePath(relPath: string): boolean {
  if (!relPath || relPath.length > 512) return false;
  if (relPath.startsWith("/") || relPath.startsWith("\\")) return false;
  if (/[\x00-\x1f\x7f\\]/.test(relPath)) return false;
  const segments = relPath.split("/");
  if (segments.some((seg) => seg === "" || seg === "." || seg === "..")) {
    return false;
  }
  if (segments[0] === BACKUP_STORAGE_PREFIX) return false;
  return true;
}

/**
 * Extracts only the non-sensitive envelope version/keyId tag from a `sealBytes` payload.
 */
export function detectEncryptionKeyVersion(payload: Uint8Array): string {
  const buf = Buffer.from(payload);
  if (buf.length >= 4 && buf.subarray(0, 4).toString("utf8") === "VE2:") {
    const secondColon = buf.indexOf(0x3a, 4);
    if (secondColon > 4 && secondColon <= 40) {
      const keyId = buf.subarray(4, secondColon).toString("utf8");
      if (/^[a-zA-Z0-9_-]{1,32}$/.test(keyId)) {
        return `v2:${keyId}`;
      }
    }
  }
  return "v1";
}

function encodeEntries(entries: Array<{ path: string; data: Buffer }>): Buffer {
  const chunks: Buffer[] = [];
  const countBuf = Buffer.allocUnsafe(4);
  countBuf.writeUInt32BE(entries.length, 0);
  chunks.push(countBuf);

  for (const entry of entries) {
    const pathBuf = Buffer.from(entry.path, "utf8");
    const header = Buffer.allocUnsafe(8);
    header.writeUInt32BE(pathBuf.length, 0);
    header.writeUInt32BE(entry.data.length, 4);
    chunks.push(header, pathBuf, entry.data);
  }
  return Buffer.concat(chunks);
}

function decodeEntries(
  raw: Buffer,
): Map<string, Buffer> | null {
  if (raw.length < 4) return null;
  const count = raw.readUInt32BE(0);
  if (count > 200_000) return null;
  let offset = 4;
  const map = new Map<string, Buffer>();

  for (let i = 0; i < count; i += 1) {
    if (offset + 8 > raw.length) return null;
    const pathLen = raw.readUInt32BE(offset);
    const dataLen = raw.readUInt32BE(offset + 4);
    offset += 8;
    if (pathLen === 0 || pathLen > 1024 || offset + pathLen + dataLen > raw.length) {
      return null;
    }
    const entryPath = raw.subarray(offset, offset + pathLen).toString("utf8");
    offset += pathLen;
    if (map.has(entryPath)) return null;
    const data = Buffer.from(raw.subarray(offset, offset + dataLen));
    offset += dataLen;
    map.set(entryPath, data);
  }

  if (offset !== raw.length) return null;
  return map;
}

export function compareSchemaVersions(
  backupSchemaVersion: string | null,
  currentSchemaVersion: string | null | undefined,
): SchemaCompatibility {
  if (!backupSchemaVersion || !currentSchemaVersion) return "unknown";
  if (backupSchemaVersion === currentSchemaVersion) return "compatible";
  return backupSchemaVersion < currentSchemaVersion ? "older" : "newer";
}

/**
 * Packs a DB dump + UPLOAD_DIR files into a gzipped deterministic binary bundle
 * and encrypts it with AES-256-GCM via `secret-box`. Fails closed if no key is configured.
 */
export function packAndEncryptBackup(input: PackBackupInput): PackedBackupResult {
  if (!canEncryptSecrets()) {
    throw new Error("BACKUP_ENCRYPTION_KEY_UNAVAILABLE");
  }

  const sortedUploads = [...input.uploadFiles].sort((a, b) =>
    a.path.localeCompare(b.path),
  );
  const manifestFiles: Array<{ path: string; size: number; sha256: string }> = [];
  let uploadTotalBytes = 0;

  for (const file of sortedUploads) {
    if (!isSafeBackupRelativePath(file.path)) {
      throw new Error(`BACKUP_UNSAFE_PATH:${file.path}`);
    }
    uploadTotalBytes += file.data.length;
    manifestFiles.push({
      path: file.path,
      size: file.data.length,
      sha256: sha256Hex(file.data),
    });
  }

  const dbFilename = input.dbMode === "pg_dump" ? "database.sql" : "database.json";
  const manifest: BackupManifest = {
    formatVersion: BACKUP_FORMAT_VERSION,
    createdAt: input.createdAt ?? new Date().toISOString(),
    appVersion: input.appVersion,
    schemaVersion: input.schemaVersion,
    migrationCount: input.migrationCount,
    dbMode: input.dbMode,
    dbFilename,
    dbDumpSha256: sha256Hex(input.dbDump),
    dbDumpBytes: input.dbDump.length,
    dbTableCount: input.dbTableCount,
    dbRowCount: input.dbRowCount,
    uploadFileCount: sortedUploads.length,
    uploadTotalBytes,
    files: manifestFiles,
  };

  const manifestBuf = Buffer.from(JSON.stringify(manifest, null, 2), "utf8");
  const manifestSha256 = sha256Hex(manifestBuf);

  const entries: Array<{ path: string; data: Buffer }> = [
    { path: MANIFEST_ENTRY_PATH, data: manifestBuf },
    { path: dbFilename, data: input.dbDump },
    ...sortedUploads.map((f) => ({ path: `uploads/${f.path}`, data: f.data })),
  ];

  const encoded = encodeEntries(entries);
  const compressed = gzipSync(encoded, { level: 6 });
  const container = Buffer.concat([BACKUP_MAGIC, compressed]);
  const encryptedArchive = sealBytes(BACKUP_ENCRYPTION_PURPOSE, container);
  const archiveSha256 = sha256Hex(encryptedArchive);
  const encryptionKeyVersion = detectEncryptionKeyVersion(encryptedArchive);

  return {
    encryptedArchive,
    archiveSizeBytes: encryptedArchive.length,
    archiveSha256,
    manifest,
    manifestSha256,
    encryptionKeyVersion,
  };
}

/**
 * Non-destructive restore dry-run verification:
 * checks archive hash (optional), AES-256-GCM decryption, container format,
 * manifest validity, DB dump checksum & parseability, every upload file SHA-256,
 * and schema compatibility against the live database migration state.
 */
export function decryptAndVerifyBackupArchive(
  encryptedArchive: Uint8Array,
  options: {
    expectedArchiveSha256?: string | null;
    currentSchemaVersion?: string | null;
  } = {},
): BackupVerificationResult {
  const rawBuf = Buffer.from(encryptedArchive);
  const archiveSha256 = sha256Hex(rawBuf);
  const baseFailure = (errorCode: string): BackupVerificationResult => ({
    ok: false,
    errorCode,
    archiveSizeBytes: rawBuf.length,
    archiveSha256,
    manifestSha256: null,
    encryptionKeyVersion: rawBuf.length > 0 ? detectEncryptionKeyVersion(rawBuf) : null,
    manifest: null,
    schemaCompatibility: "unknown",
    checkedUploadFiles: 0,
    mismatchedFiles: [],
    missingFiles: [],
    unexpectedFiles: [],
    dbIntegrityOk: false,
  });

  if (rawBuf.length === 0) {
    return baseFailure("EMPTY_ARCHIVE");
  }

  if (
    options.expectedArchiveSha256 &&
    options.expectedArchiveSha256 !== archiveSha256
  ) {
    return baseFailure("ARCHIVE_SHA256_MISMATCH");
  }

  if (!canEncryptSecrets()) {
    return baseFailure("BACKUP_ENCRYPTION_KEY_UNAVAILABLE");
  }

  const encryptionKeyVersion = detectEncryptionKeyVersion(rawBuf);
  const decrypted = openBytes(BACKUP_ENCRYPTION_PURPOSE, rawBuf);
  if (!decrypted) {
    return baseFailure("DECRYPTION_FAILED");
  }

  if (
    decrypted.length <= BACKUP_MAGIC.length ||
    !decrypted.subarray(0, BACKUP_MAGIC.length).equals(BACKUP_MAGIC)
  ) {
    return baseFailure("INVALID_CONTAINER_MAGIC");
  }

  let decompressed: Buffer;
  try {
    decompressed = gunzipSync(decrypted.subarray(BACKUP_MAGIC.length), {
      maxOutputLength: MAX_DECOMPRESSED_BUNDLE_BYTES,
    });
  } catch {
    return baseFailure("DECOMPRESSION_FAILED");
  }

  const entries = decodeEntries(decompressed);
  if (!entries) {
    return baseFailure("CORRUPT_BUNDLE_STRUCTURE");
  }

  const manifestBuf = entries.get(MANIFEST_ENTRY_PATH);
  if (!manifestBuf) {
    return baseFailure("MANIFEST_MISSING");
  }

  const manifestSha256 = sha256Hex(manifestBuf);
  let parsedManifest: BackupManifest;
  try {
    const rawJson = JSON.parse(manifestBuf.toString("utf8"));
    const validated = backupManifestSchema.safeParse(rawJson);
    if (!validated.success) {
      return {
        ...baseFailure("MANIFEST_INVALID"),
        manifestSha256,
        encryptionKeyVersion,
      };
    }
    parsedManifest = validated.data;
  } catch {
    return {
      ...baseFailure("MANIFEST_PARSE_FAILED"),
      manifestSha256,
      encryptionKeyVersion,
    };
  }

  const schemaCompatibility = compareSchemaVersions(
    parsedManifest.schemaVersion,
    options.currentSchemaVersion,
  );

  // Verify database dump presence, size, sha256, and basic structural parseability
  const dbBuf = entries.get(parsedManifest.dbFilename);
  let dbIntegrityOk = false;
  if (
    dbBuf &&
    dbBuf.length === parsedManifest.dbDumpBytes &&
    sha256Hex(dbBuf) === parsedManifest.dbDumpSha256
  ) {
    if (parsedManifest.dbMode === "pg_logical") {
      try {
        const snapshot = JSON.parse(dbBuf.toString("utf8")) as {
          tables?: Record<string, unknown>;
        };
        dbIntegrityOk =
          typeof snapshot === "object" &&
          snapshot !== null &&
          typeof snapshot.tables === "object" &&
          snapshot.tables !== null;
      } catch {
        dbIntegrityOk = false;
      }
    } else {
      dbIntegrityOk = dbBuf.length > 0;
    }
  }

  const expectedUploadPaths = new Set<string>();
  const mismatchedFiles: string[] = [];
  const missingFiles: string[] = [];
  let checkedUploadFiles = 0;

  for (const fileSpec of parsedManifest.files) {
    if (!isSafeBackupRelativePath(fileSpec.path)) {
      mismatchedFiles.push(fileSpec.path);
      continue;
    }
    const entryKey = `uploads/${fileSpec.path}`;
    expectedUploadPaths.add(entryKey);
    const data = entries.get(entryKey);
    if (!data) {
      missingFiles.push(fileSpec.path);
      continue;
    }
    checkedUploadFiles += 1;
    if (data.length !== fileSpec.size || sha256Hex(data) !== fileSpec.sha256) {
      mismatchedFiles.push(fileSpec.path);
    }
  }

  const unexpectedFiles: string[] = [];
  for (const entryPath of entries.keys()) {
    if (
      entryPath === MANIFEST_ENTRY_PATH ||
      entryPath === parsedManifest.dbFilename
    ) {
      continue;
    }
    if (!expectedUploadPaths.has(entryPath)) {
      unexpectedFiles.push(entryPath);
    }
  }

  const referencedMissing =
    dbIntegrityOk && dbBuf
      ? findMissingReferencedUploads(
          extractReferencedUploadPathsFromDbDump(parsedManifest.dbMode, dbBuf),
          parsedManifest.files,
        )
      : [];
  for (const refPath of referencedMissing) {
    if (!missingFiles.includes(refPath)) {
      missingFiles.push(refPath);
    }
  }

  const allOk =
    dbIntegrityOk &&
    mismatchedFiles.length === 0 &&
    missingFiles.length === 0 &&
    unexpectedFiles.length === 0 &&
    parsedManifest.uploadFileCount === parsedManifest.files.length;

  let errorCode: string | null = null;
  if (!dbIntegrityOk) errorCode = "DB_DUMP_INTEGRITY_FAILED";
  else if (missingFiles.length > 0) errorCode = "MISSING_UPLOAD_FILES";
  else if (mismatchedFiles.length > 0) errorCode = "UPLOAD_CHECKSUM_MISMATCH";
  else if (unexpectedFiles.length > 0) errorCode = "UNEXPECTED_ARCHIVE_ENTRIES";
  else if (parsedManifest.uploadFileCount !== parsedManifest.files.length) {
    errorCode = "MANIFEST_COUNT_MISMATCH";
  }

  return {
    ok: allOk,
    errorCode,
    archiveSizeBytes: rawBuf.length,
    archiveSha256,
    manifestSha256,
    encryptionKeyVersion,
    manifest: parsedManifest,
    schemaCompatibility,
    checkedUploadFiles,
    mismatchedFiles,
    missingFiles,
    unexpectedFiles,
    dbIntegrityOk,
  };
}

const UPLOAD_PATH_COLUMNS = new Set([
  "storagePath",
  "pdfStoragePath",
  "logoPath",
  "screenshotPath",
]);

const EXCLUDED_UPLOAD_TABLES = new Set([
  "system_backups",
  "SystemBackup",
]);

function unquotePgIdentifier(ident: string): string {
  const trimmed = ident.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }
  return trimmed;
}

function unescapePgCopyField(raw: string): string {
  return raw.replace(/\\(.)/g, (_match, ch: string) => {
    switch (ch) {
      case "t":
        return "\t";
      case "n":
        return "\n";
      case "r":
        return "\r";
      case "b":
        return "\b";
      case "f":
        return "\f";
      case "\\":
        return "\\";
      default:
        return ch;
    }
  });
}

/**
 * Extracts UPLOAD_DIR-relative file paths referenced by the captured DB dump
 * (excluding `system_backups` archives themselves) so backup creation and restore
 * verification can prove DB ↔ UPLOAD_DIR referential completeness.
 */
export function extractReferencedUploadPathsFromDbDump(
  dbMode: "pg_dump" | "pg_logical",
  dbDump: Buffer,
): string[] {
  const referenced = new Set<string>();

  if (dbMode === "pg_logical") {
    try {
      const parsed = JSON.parse(dbDump.toString("utf8")) as {
        tables?: Record<string, { rows?: Array<Record<string, unknown>> }>;
      };
      const tables = parsed?.tables;
      if (!tables || typeof tables !== "object") return [];

      for (const [tableName, tableEntry] of Object.entries(tables)) {
        if (EXCLUDED_UPLOAD_TABLES.has(tableName)) continue;
        const rows = tableEntry?.rows;
        if (!Array.isArray(rows)) continue;
        for (const row of rows) {
          if (!row || typeof row !== "object") continue;
          for (const col of UPLOAD_PATH_COLUMNS) {
            const val = row[col];
            if (typeof val === "string") {
              const trimmed = val.trim();
              if (trimmed.length > 0 && isSafeBackupRelativePath(trimmed)) {
                referenced.add(trimmed);
              }
            }
          }
        }
      }
    } catch {
      return [];
    }
    return [...referenced].sort((a, b) => a.localeCompare(b));
  }

  // Plain SQL pg_dump: scan `COPY public.<table> (<cols>) FROM stdin;` blocks.
  const lines = dbDump.toString("utf8").split(/\r?\n/);
  let activeIndices: number[] | null = null;

  for (const line of lines) {
    if (activeIndices !== null) {
      if (line === "\\.") {
        activeIndices = null;
        continue;
      }
      if (activeIndices.length === 0) continue;
      const fields = line.split("\t");
      for (const idx of activeIndices) {
        const raw = fields[idx];
        if (raw === undefined || raw === "\\N") continue;
        const val = unescapePgCopyField(raw).trim();
        if (val.length > 0 && isSafeBackupRelativePath(val)) {
          referenced.add(val);
        }
      }
      continue;
    }

    if (!line.startsWith("COPY ")) continue;
    const match = /^COPY\s+(?:[a-zA-Z0-9_"]+\.)?("[^"]+"|[^\s(]+)\s*\(([^)]+)\)\s+FROM\s+stdin;\s*$/.exec(
      line,
    );
    if (!match) continue;
    const tableName = unquotePgIdentifier(match[1] ?? "");
    if (EXCLUDED_UPLOAD_TABLES.has(tableName)) {
      activeIndices = [];
      continue;
    }
    const cols = (match[2] ?? "").split(",").map(unquotePgIdentifier);
    const indices: number[] = [];
    for (let i = 0; i < cols.length; i += 1) {
      if (UPLOAD_PATH_COLUMNS.has(cols[i] ?? "")) {
        indices.push(i);
      }
    }
    activeIndices = indices;
  }

  return [...referenced].sort((a, b) => a.localeCompare(b));
}

export function findMissingReferencedUploads(
  referencedPaths: readonly string[],
  uploadFiles: ReadonlyArray<{ path: string }>,
): string[] {
  if (referencedPaths.length === 0) return [];
  const captured = new Set(uploadFiles.map((f) => f.path));
  return referencedPaths.filter((p) => !captured.has(p));
}

