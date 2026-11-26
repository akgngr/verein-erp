import "server-only";

import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { createPgClient, stripPrismaOnlyParams } from "@/shared/db-client";
import { getUploadRoot, openReadStream, resolveSafePath } from "@/shared/files";
import { canEncryptSecrets } from "@/shared/security/secret-box";

import {
  BACKUP_STORAGE_PREFIX,
  decryptAndVerifyBackupArchive,
  isSafeBackupRelativePath,
  packAndEncryptBackup,
  type BackupUploadEntry,
  type BackupVerificationResult,
  type SchemaCompatibility,
} from "./backup-bundle";

const execFileAsync = promisify(execFile);

export const BACKUP_CONFIG_SETTING_KEY = "system.backup.config";
const MAX_UPLOAD_BACKUP_BYTES = 250 * 1024 * 1024; // 250 MiB upload archive cap
const MAX_SINGLE_UPLOAD_FILE_BYTES = 50 * 1024 * 1024; // 50 MiB per file cap

export const backupConfigSchema = z.object({
  enabled: z.boolean(),
  retentionCount: z.number().int().min(1).max(90),
  intervalHours: z.number().int().min(6).max(168),
});

export type BackupConfig = z.infer<typeof backupConfigSchema>;

export const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  enabled: true,
  retentionCount: 14,
  intervalHours: 24,
};

export interface BackupActor {
  id: string | null;
  label: string;
}

export interface BackupRecordItem {
  id: string;
  status: string;
  trigger: string;
  archiveSizeBytes: number;
  archiveSha256: string | null;
  manifestSha256: string | null;
  dbMode: string | null;
  dbTableCount: number;
  dbRowCount: number;
  uploadFileCount: number;
  uploadTotalBytes: number;
  appVersion: string | null;
  schemaVersion: string | null;
  migrationCount: number;
  encryptionKeyVersion: string | null;
  verifiedAt: string | null;
  verificationStatus: string | null;
  schemaCompatibility: SchemaCompatibility | null;
  errorCode: string | null;
  createdByLabel: string | null;
  createdAt: string;
  hasArchive: boolean;
}

export interface BackupOverview {
  encryptionReady: boolean;
  appVersion: string;
  currentSchemaVersion: string | null;
  currentMigrationCount: number;
  config: BackupConfig;
  stats: {
    totalCount: number;
    readyCount: number;
    totalBytes: number;
    lastBackupAt: string | null;
    lastVerifiedAt: string | null;
    lastVerificationStatus: string | null;
  };
  backups: BackupRecordItem[];
}

export interface SchemaMetadata {
  schemaVersion: string | null;
  migrationCount: number;
}

function getAppVersion(): string {
  return process.env.npm_package_version || "0.41.0";
}

function sanitizeErrorCode(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.startsWith("BACKUP_")) {
      return error.message.split(":")[0] ?? "BACKUP_ERROR";
    }
    const maybeCode = (error as { code?: unknown }).code;
    if (typeof maybeCode === "string" && /^[A-Z0-9_]{2,40}$/.test(maybeCode)) {
      return maybeCode;
    }
  }
  return "BACKUP_FAILED";
}

export async function getBackupConfig(): Promise<BackupConfig> {
  const row = await getDb().systemSetting.findUnique({
    where: { key: BACKUP_CONFIG_SETTING_KEY },
  });
  if (!row) return { ...DEFAULT_BACKUP_CONFIG };
  try {
    const parsed = backupConfigSchema.safeParse(JSON.parse(row.value));
    if (parsed.success) return parsed.data;
  } catch {
    // Fall back to safe defaults if setting JSON is malformed.
  }
  return { ...DEFAULT_BACKUP_CONFIG };
}

export async function saveBackupConfig(
  input: BackupConfig,
  actor: BackupActor,
): Promise<BackupConfig> {
  const validated = backupConfigSchema.parse(input);
  const previous = await getBackupConfig();

  await getDb().systemSetting.upsert({
    where: { key: BACKUP_CONFIG_SETTING_KEY },
    create: {
      key: BACKUP_CONFIG_SETTING_KEY,
      value: JSON.stringify(validated),
      description: "Automated encrypted backup schedule and retention policy", // i18n-ignore (internal DB metadata)
    },
    update: {
      value: JSON.stringify(validated),
    },
  });

  await writeAudit({
    userId: actor.id,
    userLabel: actor.label,
    action: "BACKUP_SETTINGS_UPDATE",
    entity: "SystemSetting",
    entityId: BACKUP_CONFIG_SETTING_KEY,
    before: previous,
    after: validated,
  });

  return validated;
}

export async function getCurrentSchemaMetadata(): Promise<SchemaMetadata> {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return { schemaVersion: null, migrationCount: 0 };

  const client = createPgClient(rawUrl);
  try {
    await client.connect();
    const res = await client.query<{
      latest: string | null;
      total: string;
    }>(`
      SELECT
        (SELECT migration_name FROM "_prisma_migrations"
         WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
         ORDER BY migration_name DESC LIMIT 1) AS latest,
        (SELECT COUNT(*)::text FROM "_prisma_migrations"
         WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS total
    `);
    const row = res.rows[0];
    return {
      schemaVersion: row?.latest ?? null,
      migrationCount: Number(row?.total ?? 0),
    };
  } catch {
    return { schemaVersion: null, migrationCount: 0 };
  } finally {
    await client.end().catch(() => {});
  }
}

interface DatabaseSnapshot {
  dbMode: "pg_dump" | "pg_logical";
  dbDump: Buffer;
  dbTableCount: number;
  dbRowCount: number;
  schemaVersion: string | null;
  migrationCount: number;
}

function quotePgIdent(ident: string): string {
  return `"${ident.replace(/"/g, '""')}"`;
}

async function tryPgDump(connectionString: string): Promise<Buffer | null> {
  try {
    const { stdout } = await execFileAsync(
      "pg_dump",
      ["--format=plain", "--no-owner", "--no-acl", `--dbname=${connectionString}`],
      {
        encoding: "buffer",
        maxBuffer: 256 * 1024 * 1024,
        timeout: 120_000,
      },
    );
    if (stdout && stdout.length > 0) {
      return Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout);
    }
    return null;
  } catch {
    return null;
  }
}

async function collectDatabaseSnapshot(): Promise<DatabaseSnapshot> {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error("BACKUP_DATABASE_URL_MISSING");
  }
  const connectionString = stripPrismaOnlyParams(rawUrl);
  const client = createPgClient(rawUrl);
  await client.connect();

  try {
    const schemaMeta = await getCurrentSchemaMetadata();
    const tablesRes = await client.query<{ tablename: string }>(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename ASC
    `);
    const tableNames = tablesRes.rows.map((r) => r.tablename);

    // Prefer native pg_dump when installed; fall back to consistent REPEATABLE READ
    // logical JSON dump so slim Alpine production containers work reliably without pg_dump.
    const sqlDump = await tryPgDump(connectionString);
    if (sqlDump) {
      let totalRows = 0;
      for (const table of tableNames) {
        const countRes = await client.query<{ c: string }>(
          `SELECT COUNT(*)::text AS c FROM public.${quotePgIdent(table)}`,
        );
        totalRows += Number(countRes.rows[0]?.c ?? 0);
      }
      return {
        dbMode: "pg_dump",
        dbDump: sqlDump,
        dbTableCount: tableNames.length,
        dbRowCount: totalRows,
        schemaVersion: schemaMeta.schemaVersion,
        migrationCount: schemaMeta.migrationCount,
      };
    }

    await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    try {
      const tablesPayload: Record<
        string,
        { rowCount: number; rows: Record<string, unknown>[] }
      > = {};
      let totalRows = 0;

      for (const table of tableNames) {
        const dataRes = await client.query(
          `SELECT * FROM public.${quotePgIdent(table)}`,
        );
        tablesPayload[table] = {
          rowCount: dataRes.rows.length,
          rows: dataRes.rows,
        };
        totalRows += dataRes.rows.length;
      }

      const logicalSnapshot = {
        format: "verein-erp-pg-logical-v1",
        capturedAt: new Date().toISOString(),
        schemaVersion: schemaMeta.schemaVersion,
        migrationCount: schemaMeta.migrationCount,
        tableCount: tableNames.length,
        rowCount: totalRows,
        tables: tablesPayload,
      };

      const dbDump = Buffer.from(JSON.stringify(logicalSnapshot), "utf8");
      return {
        dbMode: "pg_logical",
        dbDump,
        dbTableCount: tableNames.length,
        dbRowCount: totalRows,
        schemaVersion: schemaMeta.schemaVersion,
        migrationCount: schemaMeta.migrationCount,
      };
    } finally {
      await client.query("ROLLBACK").catch(() => {});
    }
  } finally {
    await client.end().catch(() => {});
  }
}

export async function collectUploadFiles(
  uploadRoot: string = getUploadRoot(),
): Promise<BackupUploadEntry[]> {
  const results: BackupUploadEntry[] = [];
  let totalBytes = 0;

  async function walk(currentDir: string, relPrefix: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(currentDir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
      // Never recursively include encrypted backups or temporary staging files.
      if (relPrefix === "" && entry.name === BACKUP_STORAGE_PREFIX) continue;
      if (entry.name.endsWith(".tmp")) continue;
      if (entry.isSymbolicLink()) continue;

      const absPath = path.join(/* turbopackIgnore: true */ currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(absPath, relPath);
      } else if (entry.isFile()) {
        if (!isSafeBackupRelativePath(relPath)) continue;
        const info = await stat(absPath);
        if (info.size > MAX_SINGLE_UPLOAD_FILE_BYTES) {
          throw new Error("BACKUP_UPLOAD_FILE_TOO_LARGE");
        }
        totalBytes += info.size;
        if (totalBytes > MAX_UPLOAD_BACKUP_BYTES) {
          throw new Error("BACKUP_UPLOAD_LIMIT_EXCEEDED");
        }
        const data = await readFile(absPath);
        results.push({ path: relPath, data });
      }
    }
  }

  await walk(uploadRoot, "");
  return results;
}

export async function pruneExpiredBackups(
  retentionCount: number,
  actor: BackupActor,
): Promise<number> {
  const readyBackups = await getDb().systemBackup.findMany({
    where: { status: "READY" },
    orderBy: { createdAt: "desc" },
    select: { id: true, storagePath: true },
  });

  if (readyBackups.length <= retentionCount) return 0;
  const toPrune = readyBackups.slice(retentionCount);

  for (const item of toPrune) {
    if (item.storagePath) {
      try {
        const abs = resolveSafePath(item.storagePath);
        await unlink(abs);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          // Proceed with DB cleanup even if disk file is already missing.
        }
      }
    }
    await getDb().systemBackup.delete({ where: { id: item.id } });
  }

  await writeAudit({
    userId: actor.id,
    userLabel: actor.label,
    action: "BACKUP_PRUNE",
    entity: "SystemBackup",
    entityId: "retention",
    after: { prunedCount: toPrune.length, retentionCount },
  });

  return toPrune.length;
}

export async function createSystemBackup(options: {
  trigger: "manual" | "scheduled";
  actor: BackupActor;
}): Promise<{ backup: BackupRecordItem; prunedCount: number }> {
  const { trigger, actor } = options;

  if (!canEncryptSecrets()) {
    await writeAudit({
      userId: actor.id,
      userLabel: actor.label,
      action: "BACKUP_CREATE_FAILED",
      entity: "SystemBackup",
      entityId: "unavailable",
      after: { trigger, errorCode: "BACKUP_ENCRYPTION_KEY_UNAVAILABLE" },
    });
    throw new Error("BACKUP_ENCRYPTION_KEY_UNAVAILABLE");
  }

  const config = await getBackupConfig();
  const backupId = `bk_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const storagePath = `${BACKUP_STORAGE_PREFIX}/${backupId}.vbak`;
  const appVersion = getAppVersion();

  try {
    const [dbSnapshot, uploadFiles] = await Promise.all([
      collectDatabaseSnapshot(),
      collectUploadFiles(),
    ]);

    const packed = packAndEncryptBackup({
      appVersion,
      schemaVersion: dbSnapshot.schemaVersion,
      migrationCount: dbSnapshot.migrationCount,
      dbMode: dbSnapshot.dbMode,
      dbDump: dbSnapshot.dbDump,
      dbTableCount: dbSnapshot.dbTableCount,
      dbRowCount: dbSnapshot.dbRowCount,
      uploadFiles,
    });

    // Self-verify freshly encrypted archive before committing to disk & DB.
    const selfCheck = decryptAndVerifyBackupArchive(packed.encryptedArchive, {
      expectedArchiveSha256: packed.archiveSha256,
      currentSchemaVersion: dbSnapshot.schemaVersion,
    });
    if (!selfCheck.ok) {
      throw new Error(selfCheck.errorCode ?? "BACKUP_SELF_VERIFY_FAILED");
    }

    const targetAbs = resolveSafePath(storagePath);
    await mkdir(path.dirname(targetAbs), { recursive: true });
    const tempAbs = `${targetAbs}.tmp`;
    await writeFile(tempAbs, packed.encryptedArchive, { mode: 0o600 });
    await rename(tempAbs, targetAbs);

    const now = new Date();
    const record = await getDb().systemBackup.create({
      data: {
        id: backupId,
        status: "READY",
        trigger,
        storagePath,
        archiveSizeBytes: packed.archiveSizeBytes,
        archiveSha256: packed.archiveSha256,
        manifestSha256: packed.manifestSha256,
        dbMode: dbSnapshot.dbMode,
        dbTableCount: dbSnapshot.dbTableCount,
        dbRowCount: dbSnapshot.dbRowCount,
        uploadFileCount: packed.manifest.uploadFileCount,
        uploadTotalBytes: packed.manifest.uploadTotalBytes,
        appVersion,
        schemaVersion: dbSnapshot.schemaVersion,
        migrationCount: dbSnapshot.migrationCount,
        encryptionKeyVersion: packed.encryptionKeyVersion,
        verifiedAt: now,
        verificationStatus: "PASSED",
        verificationDetails: {
          schemaCompatibility: selfCheck.schemaCompatibility,
          checkedUploadFiles: selfCheck.checkedUploadFiles,
          dbIntegrityOk: selfCheck.dbIntegrityOk,
        },
        createdById: actor.id,
        createdByLabel: actor.label,
      },
    });

    await writeAudit({
      userId: actor.id,
      userLabel: actor.label,
      action: "BACKUP_CREATE",
      entity: "SystemBackup",
      entityId: record.id,
      after: {
        trigger,
        archiveSizeBytes: record.archiveSizeBytes,
        archiveSha256: record.archiveSha256,
        dbMode: record.dbMode,
        dbTableCount: record.dbTableCount,
        dbRowCount: record.dbRowCount,
        uploadFileCount: record.uploadFileCount,
        schemaVersion: record.schemaVersion,
        encryptionKeyVersion: record.encryptionKeyVersion,
      },
    });

    const prunedCount = await pruneExpiredBackups(config.retentionCount, actor);
    return { backup: serializeBackupRecord(record), prunedCount };
  } catch (error) {
    const errorCode = sanitizeErrorCode(error);
    await getDb()
      .systemBackup.create({
        data: {
          id: backupId,
          status: "FAILED",
          trigger,
          appVersion,
          errorCode,
          createdById: actor.id,
          createdByLabel: actor.label,
        },
      })
      .catch(() => {});

    await writeAudit({
      userId: actor.id,
      userLabel: actor.label,
      action: "BACKUP_CREATE_FAILED",
      entity: "SystemBackup",
      entityId: backupId,
      after: { trigger, errorCode },
    });
    throw error;
  }
}

export async function verifySystemBackup(
  id: string,
  actor: BackupActor,
): Promise<BackupVerificationResult> {
  const record = await getDb().systemBackup.findUnique({ where: { id } });
  if (!record || !record.storagePath) {
    throw new Error("BACKUP_NOT_FOUND");
  }

  const schemaMeta = await getCurrentSchemaMetadata();
  let encryptedArchive: Buffer;
  try {
    encryptedArchive = await readFile(resolveSafePath(record.storagePath));
  } catch {
    const missingResult: BackupVerificationResult = {
      ok: false,
      errorCode: "ARCHIVE_FILE_MISSING",
      archiveSizeBytes: 0,
      archiveSha256: "",
      manifestSha256: null,
      encryptionKeyVersion: record.encryptionKeyVersion,
      manifest: null,
      schemaCompatibility: "unknown",
      checkedUploadFiles: 0,
      mismatchedFiles: [],
      missingFiles: [],
      unexpectedFiles: [],
      dbIntegrityOk: false,
    };
    await getDb().systemBackup.update({
      where: { id: record.id },
      data: {
        verifiedAt: new Date(),
        verificationStatus: "FAILED",
        verificationDetails: { errorCode: missingResult.errorCode },
      },
    });
    await writeAudit({
      userId: actor.id,
      userLabel: actor.label,
      action: "BACKUP_VERIFY",
      entity: "SystemBackup",
      entityId: record.id,
      after: { ok: false, errorCode: missingResult.errorCode },
    });
    return missingResult;
  }

  const result = decryptAndVerifyBackupArchive(encryptedArchive, {
    expectedArchiveSha256: record.archiveSha256,
    currentSchemaVersion: schemaMeta.schemaVersion,
  });

  await getDb().systemBackup.update({
    where: { id: record.id },
    data: {
      verifiedAt: new Date(),
      verificationStatus: result.ok ? "PASSED" : "FAILED",
      verificationDetails: {
        errorCode: result.errorCode,
        schemaCompatibility: result.schemaCompatibility,
        checkedUploadFiles: result.checkedUploadFiles,
        mismatchedCount: result.mismatchedFiles.length,
        missingCount: result.missingFiles.length,
        unexpectedCount: result.unexpectedFiles.length,
        dbIntegrityOk: result.dbIntegrityOk,
      },
    },
  });

  await writeAudit({
    userId: actor.id,
    userLabel: actor.label,
    action: "BACKUP_VERIFY",
    entity: "SystemBackup",
    entityId: record.id,
    after: {
      ok: result.ok,
      errorCode: result.errorCode,
      schemaCompatibility: result.schemaCompatibility,
      checkedUploadFiles: result.checkedUploadFiles,
      dbIntegrityOk: result.dbIntegrityOk,
    },
  });

  return result;
}

export async function verifyUploadedSystemBackup(
  archiveBytes: Buffer,
  actor: BackupActor,
): Promise<BackupVerificationResult> {
  const schemaMeta = await getCurrentSchemaMetadata();
  const result = decryptAndVerifyBackupArchive(archiveBytes, {
    currentSchemaVersion: schemaMeta.schemaVersion,
  });

  await writeAudit({
    userId: actor.id,
    userLabel: actor.label,
    action: "BACKUP_VERIFY_UPLOAD",
    entity: "SystemBackup",
    entityId: result.archiveSha256.slice(0, 16) || "upload",
    after: {
      ok: result.ok,
      errorCode: result.errorCode,
      archiveSizeBytes: result.archiveSizeBytes,
      schemaCompatibility: result.schemaCompatibility,
      checkedUploadFiles: result.checkedUploadFiles,
      dbIntegrityOk: result.dbIntegrityOk,
    },
  });

  return result;
}

export async function getSystemBackupDownload(
  id: string,
  actor: BackupActor,
): Promise<{
  stream: ReadableStream<Uint8Array>;
  filename: string;
  sizeBytes: number;
} | null> {
  const record = await getDb().systemBackup.findUnique({ where: { id } });
  if (!record || record.status !== "READY" || !record.storagePath) {
    return null;
  }

  const absPath = resolveSafePath(record.storagePath);
  let info;
  try {
    info = await stat(absPath);
  } catch {
    return null;
  }

  await writeAudit({
    userId: actor.id,
    userLabel: actor.label,
    action: "BACKUP_DOWNLOAD",
    entity: "SystemBackup",
    entityId: record.id,
    after: { archiveSizeBytes: info.size, archiveSha256: record.archiveSha256 },
  });

  const dateSlug = record.createdAt.toISOString().slice(0, 10);
  return {
    stream: openReadStream(record.storagePath),
    filename: `verein-erp-backup-${dateSlug}-${record.id}.vbak`,
    sizeBytes: info.size,
  };
}

export async function deleteSystemBackup(
  id: string,
  actor: BackupActor,
): Promise<void> {
  const record = await getDb().systemBackup.findUnique({ where: { id } });
  if (!record) throw new Error("BACKUP_NOT_FOUND");

  if (record.storagePath) {
    try {
      await unlink(resolveSafePath(record.storagePath));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  await getDb().systemBackup.delete({ where: { id: record.id } });

  await writeAudit({
    userId: actor.id,
    userLabel: actor.label,
    action: "BACKUP_DELETE",
    entity: "SystemBackup",
    entityId: record.id,
    before: {
      status: record.status,
      archiveSizeBytes: record.archiveSizeBytes,
      archiveSha256: record.archiveSha256,
    },
  });
}

function serializeBackupRecord(record: {
  id: string;
  status: string;
  trigger: string;
  storagePath: string | null;
  archiveSizeBytes: number;
  archiveSha256: string | null;
  manifestSha256: string | null;
  dbMode: string | null;
  dbTableCount: number;
  dbRowCount: number;
  uploadFileCount: number;
  uploadTotalBytes: number;
  appVersion: string | null;
  schemaVersion: string | null;
  migrationCount: number;
  encryptionKeyVersion: string | null;
  verifiedAt: Date | null;
  verificationStatus: string | null;
  verificationDetails: unknown;
  errorCode: string | null;
  createdByLabel: string | null;
  createdAt: Date;
}): BackupRecordItem {
  const details =
    record.verificationDetails && typeof record.verificationDetails === "object"
      ? (record.verificationDetails as { schemaCompatibility?: SchemaCompatibility })
      : null;

  return {
    id: record.id,
    status: record.status,
    trigger: record.trigger,
    archiveSizeBytes: record.archiveSizeBytes,
    archiveSha256: record.archiveSha256,
    manifestSha256: record.manifestSha256,
    dbMode: record.dbMode,
    dbTableCount: record.dbTableCount,
    dbRowCount: record.dbRowCount,
    uploadFileCount: record.uploadFileCount,
    uploadTotalBytes: record.uploadTotalBytes,
    appVersion: record.appVersion,
    schemaVersion: record.schemaVersion,
    migrationCount: record.migrationCount,
    encryptionKeyVersion: record.encryptionKeyVersion,
    verifiedAt: record.verifiedAt ? record.verifiedAt.toISOString() : null,
    verificationStatus: record.verificationStatus,
    schemaCompatibility: details?.schemaCompatibility ?? null,
    errorCode: record.errorCode,
    createdByLabel: record.createdByLabel,
    createdAt: record.createdAt.toISOString(),
    hasArchive: record.status === "READY" && Boolean(record.storagePath),
  };
}

export async function getBackupOverview(): Promise<BackupOverview> {
  const [config, schemaMeta, rows] = await Promise.all([
    getBackupConfig(),
    getCurrentSchemaMetadata(),
    getDb().systemBackup.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const backups = rows.map(serializeBackupRecord);
  const readyBackups = backups.filter((b) => b.status === "READY");
  const totalBytes = readyBackups.reduce((sum, b) => sum + b.archiveSizeBytes, 0);
  const latestReady = readyBackups[0] ?? null;
  const latestVerified = backups.find((b) => b.verifiedAt !== null) ?? null;

  return {
    encryptionReady: canEncryptSecrets(),
    appVersion: getAppVersion(),
    currentSchemaVersion: schemaMeta.schemaVersion,
    currentMigrationCount: schemaMeta.migrationCount,
    config,
    stats: {
      totalCount: backups.length,
      readyCount: readyBackups.length,
      totalBytes,
      lastBackupAt: latestReady?.createdAt ?? null,
      lastVerifiedAt: latestVerified?.verifiedAt ?? null,
      lastVerificationStatus: latestVerified?.verificationStatus ?? null,
    },
    backups,
  };
}

export async function runScheduledBackupIfDue(): Promise<{
  ran: boolean;
  reason?: string;
  backupId?: string;
  prunedCount?: number;
}> {
  const config = await getBackupConfig();
  if (!config.enabled) {
    return { ran: false, reason: "disabled" };
  }
  if (!canEncryptSecrets()) {
    return { ran: false, reason: "encryption_key_unavailable" };
  }

  const latest = await getDb().systemBackup.findFirst({
    where: { status: "READY" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (latest) {
    const elapsedMs = Date.now() - latest.createdAt.getTime();
    const minMs = config.intervalHours * 60 * 60 * 1000;
    if (elapsedMs < minMs) {
      return { ran: false, reason: "not_due" };
    }
  }

  const { backup, prunedCount } = await createSystemBackup({
    trigger: "scheduled",
    actor: { id: null, label: "system:scheduler" }, // i18n-ignore (internal audit actor ID)
  });
  return { ran: true, backupId: backup.id, prunedCount };
}
