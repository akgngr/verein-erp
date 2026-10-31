#!/usr/bin/env node
// A-1.5: `prisma db push` ile (tamamen ya da KISMEN) kurulmuş bir veritabanını
// migration geçmişine bağlar.
//
// Desteklenen durumlar:
//   a) Hiç migration geçmişi yok (_prisma_migrations yok/boş) — tamamen db push.
//   b) Geçmiş var ama bazı migration'ların tabloları db push ile önceden
//      oluşturulmuş; `migrate deploy` "already exists" (P3018) ile başarısız olmuş.
//
// Adımlar:
//   1. Bekleyen (uygulanmamış) ve başarısız migration'ları bulur. Yoksa çıkar.
//   2. Güvenlik: veritabanı ↔ prisma/schema farkı BOŞ olmalı
//      (`prisma migrate diff --exit-code`). Fark varsa hiçbir şeye dokunmadan durur.
//   3. Güvenlik: "uygulandı" işaretlenecek migration'lar veri değiştiren SQL
//      (INSERT/UPDATE/DELETE) içeriyorsa durur — bunlar elle değerlendirilmelidir.
//   4. Başarısız kayıtları `migrate resolve --rolled-back` ile temizler.
//   5. Trigger migration'ı (*_reassert_integrity_triggers) HARİÇ bekleyenleri
//      `migrate resolve --applied` ile işaretler (tabloları zaten var).
//   6. `prisma migrate deploy` → trigger migration'ı gerçekten çalışır.
//   7. `verify-db-integrity` ile doğrular.
//
// Kullanım: pnpm db:baseline -- --yes   (önce MUTLAKA yedek alın)

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import prismaClientPackage from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import nextEnv from "@next/env";

// .env / .env.local, Next.js ve prisma.config.ts ile aynı kuralla (ortamdaki değişkenler önceliklidir).
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const { PrismaClient } = prismaClientPackage;

const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "schema", "migrations");
const SCHEMA_DIR = path.join(process.cwd(), "prisma", "schema");
const REASSERT_SUFFIX = "_reassert_integrity_triggers";
const DATA_CHANGE_PATTERN = /^\s*(INSERT|UPDATE|DELETE)\b/im;

/**
 * Veri değiştiren ama TEKRAR ÇALIŞTIRILMASI GÜVENLİ (koşullu, idempotent) migration'lar.
 * "Uygulandı" işaretlendikten sonra bu SQL gerçekten çalıştırılır; db push bu veriyi
 * hiç üretmediği için atlanmamalıdır. Listede olmayan veri migration'ı → script durur.
 */
const IDEMPOTENT_BACKFILLS = {
  "20261027103000_f5_step5_accounting_donation_category": `
    UPDATE "AccountingSettings"
    SET "donationCategoryId" = (SELECT id FROM "AccountingCategory" WHERE name = 'Bağışlar (Spenden)')
    WHERE id = 'singleton' AND "donationCategoryId" IS NULL
      AND EXISTS (SELECT 1 FROM "AccountingCategory" WHERE name = 'Bağışlar (Spenden)')`,
};

function run(command, args, { allowFailure = false, quiet = false } = {}) {
  const result = spawnSync(command, args, {
    stdio: quiet ? "pipe" : "inherit",
    shell: process.platform === "win32",
    encoding: "utf8",
  });
  if (!allowFailure && result.status !== 0) {
    if (quiet) process.stderr.write((result.stdout ?? "") + (result.stderr ?? ""));
    console.error(`[db:baseline] Command failed: ${command} ${args.join(" ")}`);
    process.exit(1);
  }
  return result;
}

/** _prisma_migrations satırları; tablo yoksa null. */
async function readMigrationRows() {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    return await db.$queryRawUnsafe(
      `SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"`,
    );
  } catch {
    return null;
  } finally {
    await db.$disconnect();
  }
}

function listMigrationDirs() {
  return fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(MIGRATIONS_DIR, name, "migration.sql")))
    .sort();
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("[db:baseline] DATABASE_URL is not set.");
    process.exit(1);
  }

  // 1) Bekleyen / başarısız migration'lar
  const rows = (await readMigrationRows()) ?? [];
  const appliedOk = new Set(
    rows.filter((row) => row.finished_at !== null && row.rolled_back_at === null).map((row) => row.migration_name),
  );
  const failed = [
    ...new Set(
      rows.filter((row) => row.finished_at === null && row.rolled_back_at === null).map((row) => row.migration_name),
    ),
  ];
  const pending = listMigrationDirs().filter((name) => !appliedOk.has(name));
  const toMarkApplied = pending.filter((name) => !name.endsWith(REASSERT_SUFFIX));

  if (pending.length === 0 && failed.length === 0) {
    console.log("[db:baseline] No pending or failed migrations — baseline not needed. Run `pnpm db:deploy`.");
    process.exit(0);
  }

  console.log("[db:baseline] Plan:");
  for (const name of failed) console.log(`  - clear failed record:  ${name}`);
  for (const name of toMarkApplied) {
    const note = name in IDEMPOTENT_BACKFILLS ? "  (+ idempotent data backfill)" : "";
    console.log(`  - mark as applied:      ${name}${note}`);
  }
  for (const name of pending.filter((n) => n.endsWith(REASSERT_SUFFIX))) {
    console.log(`  - run for real:         ${name}`);
  }

  if (!process.argv.includes("--yes")) {
    console.error(
      [
        "",
        "[db:baseline] Nothing was changed. Take a backup first, then re-run with:",
        "              pnpm db:baseline -- --yes",
      ].join("\n"),
    );
    process.exit(1);
  }

  // 2) Şema farkı = 0 olmalı
  console.log("[db:baseline] Checking that the database matches prisma/schema exactly…");
  const diff = run(
    "prisma",
    ["migrate", "diff", "--from-config-datasource", "--to-schema", SCHEMA_DIR, "--exit-code", "--script"],
    { allowFailure: true, quiet: true },
  );
  if (diff.status === 2) {
    console.error("[db:baseline] The database differs from prisma/schema. Nothing was changed. Differences:");
    console.error(diff.stdout);
    process.exit(1);
  }
  if (diff.status !== 0) {
    process.stderr.write(diff.stderr ?? "");
    console.error("[db:baseline] Could not compare the database with the schema. Nothing was changed.");
    process.exit(1);
  }

  // 3) Veri değiştiren migration'lar "uygulandı" sayılamaz
  const withDataChanges = toMarkApplied.filter(
    (name) =>
      !(name in IDEMPOTENT_BACKFILLS) &&
      DATA_CHANGE_PATTERN.test(fs.readFileSync(path.join(MIGRATIONS_DIR, name, "migration.sql"), "utf8")),
  );
  if (withDataChanges.length > 0) {
    console.error(
      `[db:baseline] These migrations change data and cannot be skipped automatically: ${withDataChanges.join(", ")}. Nothing was changed.`,
    );
    process.exit(1);
  }

  // 4) Başarısız kayıtları temizle
  for (const name of failed) {
    run("prisma", ["migrate", "resolve", "--rolled-back", name], { quiet: true });
  }

  // 5) Tabloları zaten var olan migration'ları işaretle
  for (const name of toMarkApplied) {
    run("prisma", ["migrate", "resolve", "--applied", name], { quiet: true });
  }

  // 5b) Atlanan migration'ların idempotent veri tamamlamalarını çalıştır
  const backfills = toMarkApplied.filter((name) => name in IDEMPOTENT_BACKFILLS);
  if (backfills.length > 0) {
    const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
    try {
      for (const name of backfills) {
        const affected = await db.$executeRawUnsafe(IDEMPOTENT_BACKFILLS[name]);
        console.log(`[db:baseline] Backfill ${name}: ${affected} row(s) updated`);
      }
    } finally {
      await db.$disconnect();
    }
  }

  // 6) Kalanları (trigger kurulumu) gerçekten çalıştır
  console.log("[db:baseline] Applying remaining migrations (integrity triggers)…");
  run("prisma", ["migrate", "deploy"]);

  // 7) Doğrula
  run("node", [path.join("scripts", "verify-db-integrity.mjs")]);
  console.log("[db:baseline] Done. From now on use `pnpm db:deploy`.");
}

main().catch((error) => {
  console.error("[db:baseline] Unexpected error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
