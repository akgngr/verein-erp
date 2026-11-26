import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  compareSchemaVersions,
  decryptAndVerifyBackupArchive,
  isSafeBackupRelativePath,
  packAndEncryptBackup,
} from "../../src/modules/system/services/backup-bundle";
import { collectUploadFiles } from "../../src/modules/system/services/backups";

const SAVED_ENV_KEYS = [
  "DATA_ENCRYPTION_KEYS",
  "DATA_ENCRYPTION_CURRENT_KEY",
  "DATA_ENCRYPTION_LEGACY_SECRET",
  "AUTH_SECRET",
  "NEXTAUTH_SECRET",
] as const;

describe("System encrypted backup & restore verification (#617)", () => {
  const savedEnv: Partial<Record<(typeof SAVED_ENV_KEYS)[number], string>> = {};

  beforeEach(() => {
    for (const key of SAVED_ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    process.env.DATA_ENCRYPTION_KEYS = JSON.stringify({
      k2026: "test-backup-encryption-key-with-more-than-32-chars!!",
    });
    process.env.DATA_ENCRYPTION_CURRENT_KEY = "k2026";
  });

  afterEach(() => {
    for (const key of SAVED_ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  it("fails closed when no encryption key is configured", () => {
    delete process.env.DATA_ENCRYPTION_KEYS;
    delete process.env.DATA_ENCRYPTION_CURRENT_KEY;

    assert.throws(
      () =>
        packAndEncryptBackup({
          appVersion: "0.41.0",
          schemaVersion: "20270116090000_system_backups",
          migrationCount: 10,
          dbMode: "pg_logical",
          dbDump: Buffer.from(JSON.stringify({ tables: {} }), "utf8"),
          dbTableCount: 0,
          dbRowCount: 0,
          uploadFiles: [],
        }),
      /BACKUP_ENCRYPTION_KEY_UNAVAILABLE/,
    );
  });

  it("packs, encrypts (v2 keyring), and verifies DB + UPLOAD_DIR bundle end-to-end", () => {
    const dbDump = Buffer.from(
      JSON.stringify({
        format: "verein-erp-pg-logical-v1",
        tables: { users: { rowCount: 1, rows: [{ id: "u1" }] } },
      }),
      "utf8",
    );
    const pdfBytes = Buffer.from("%PDF-1.4\n% synthetic receipt\n", "utf8");
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    const packed = packAndEncryptBackup({
      appVersion: "0.41.0",
      schemaVersion: "20270116090000_system_backups",
      migrationCount: 42,
      dbMode: "pg_logical",
      dbDump,
      dbTableCount: 1,
      dbRowCount: 1,
      uploadFiles: [
        { path: "donations/2026/rec.pdf", data: pdfBytes },
        { path: "org/logo.png", data: pngBytes },
      ],
    });

    assert.equal(packed.encryptionKeyVersion, "v2:k2026");
    assert.equal(packed.manifest.uploadFileCount, 2);
    assert.equal(packed.manifest.uploadTotalBytes, pdfBytes.length + pngBytes.length);
    // Ciphertext must not leak plaintext table or PDF headers.
    assert.equal(packed.encryptedArchive.includes(Buffer.from("%PDF-1.4")), false);
    assert.equal(packed.encryptedArchive.includes(Buffer.from("verein-erp-pg-logical")), false);

    const verified = decryptAndVerifyBackupArchive(packed.encryptedArchive, {
      expectedArchiveSha256: packed.archiveSha256,
      currentSchemaVersion: "20270116090000_system_backups",
    });

    assert.equal(verified.ok, true);
    assert.equal(verified.errorCode, null);
    assert.equal(verified.dbIntegrityOk, true);
    assert.equal(verified.checkedUploadFiles, 2);
    assert.equal(verified.schemaCompatibility, "compatible");
    assert.equal(verified.mismatchedFiles.length, 0);
    assert.equal(verified.missingFiles.length, 0);
    assert.equal(verified.unexpectedFiles.length, 0);
  });

  it("detects ciphertext tampering, SHA-256 mismatch, and wrong decryption key", () => {
    const packed = packAndEncryptBackup({
      appVersion: "0.41.0",
      schemaVersion: "20270116090000_system_backups",
      migrationCount: 1,
      dbMode: "pg_dump",
      dbDump: Buffer.from("-- PostgreSQL database dump\nSELECT 1;\n", "utf8"),
      dbTableCount: 1,
      dbRowCount: 0,
      uploadFiles: [],
    });

    const wrongHash = decryptAndVerifyBackupArchive(packed.encryptedArchive, {
      expectedArchiveSha256: "0".repeat(64),
    });
    assert.equal(wrongHash.ok, false);
    assert.equal(wrongHash.errorCode, "ARCHIVE_SHA256_MISMATCH");

    const tampered = Buffer.from(packed.encryptedArchive);
    tampered[tampered.length - 1] ^= 0xff;
    const tamperedRes = decryptAndVerifyBackupArchive(tampered);
    assert.equal(tamperedRes.ok, false);
    assert.equal(tamperedRes.errorCode, "DECRYPTION_FAILED");

    process.env.DATA_ENCRYPTION_KEYS = JSON.stringify({
      k2026: "different-secret-key-with-more-than-32-characters!!",
    });
    const wrongKeyRes = decryptAndVerifyBackupArchive(packed.encryptedArchive);
    assert.equal(wrongKeyRes.ok, false);
    assert.equal(wrongKeyRes.errorCode, "DECRYPTION_FAILED");
  });

  it("rejects path traversal, backslashes, and recursive backups/ paths", () => {
    assert.equal(isSafeBackupRelativePath("documents/2026/a.pdf"), true);
    assert.equal(isSafeBackupRelativePath("../secret.env"), false);
    assert.equal(isSafeBackupRelativePath("/etc/passwd"), false);
    assert.equal(isSafeBackupRelativePath("a\\b.pdf"), false);
    assert.equal(isSafeBackupRelativePath("backups/bk_1.vbak"), false);
    assert.equal(isSafeBackupRelativePath("docs/\x00evil.pdf"), false);
  });

  it("compares schema migration versions accurately", () => {
    assert.equal(
      compareSchemaVersions("20270116090000_a", "20270116090000_a"),
      "compatible",
    );
    assert.equal(
      compareSchemaVersions("20270115090000_a", "20270116090000_b"),
      "older",
    );
    assert.equal(
      compareSchemaVersions("20270117090000_c", "20270116090000_b"),
      "newer",
    );
    assert.equal(compareSchemaVersions(null, "20270116090000_b"), "unknown");
  });

  it("collectUploadFiles skips backups/ directory and .tmp staging files", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "verein-backup-test-"));
    try {
      await mkdir(path.join(tmpDir, "documents", "2026"), { recursive: true });
      await mkdir(path.join(tmpDir, "backups"), { recursive: true });
      await writeFile(path.join(tmpDir, "documents", "2026", "inv.pdf"), "pdf-bytes");
      await writeFile(path.join(tmpDir, "documents", "2026", "partial.tmp"), "tmp-bytes");
      await writeFile(path.join(tmpDir, "backups", "old.vbak"), "encrypted-bytes");

      const collected = await collectUploadFiles(tmpDir);
      assert.equal(collected.length, 1);
      assert.equal(collected[0]?.path, "documents/2026/inv.pdf");
      assert.equal(collected[0]?.data.toString("utf8"), "pdf-bytes");
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});
