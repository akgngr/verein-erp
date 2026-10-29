#!/usr/bin/env node
// A-1.5: `prisma db push` ile kurulmuş bir veritabanını migration geçmişine bağlar.
//
// Adımlar:
//   1. Güvenlik: _prisma_migrations tablosu VARSA ve doluysa durur (baseline gereksiz).
//   2. Şema farkı kontrolü: veritabanı ↔ prisma/schema farkı BOŞ olmalı
//      (`prisma migrate diff --exit-code`). Fark varsa hiçbir şey yapmadan durur.
//   3. Trigger yeniden tanımlama migration'ı HARİÇ tüm migration'ları
//      `prisma migrate resolve --applied` ile "uygulandı" olarak işaretler
//      (tablolar zaten var; tekrar çalıştırmak "already exists" hatası verir).
//   4. `prisma migrate deploy` → yalnızca *_reassert_integrity_triggers çalışır
//      ve değişmezlik trigger'larını gerçekten kurar.
//   5. `verify-db-integrity` ile sonucu doğrular.
//
// Kullanım: pnpm db:baseline -- --yes   (önce MUTLAKA yedek alın)

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import prismaClientPackage from "@prisma/client";

const { PrismaClient } = prismaClientPackage;

const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "schema", "migrations");
const SCHEMA_DIR = path.join(process.cwd(), "prisma", "schema");
const REASSERT_SUFFIX = "_reassert_integrity_triggers";

function run(command, args, { allowFailure = false, quiet = false } = {}) {
  const result = spawnSync(command, args, {
    stdio: quiet ? "pipe" : "inherit",
    shell: process.platform === "win32",
    encoding: "utf8",
  });
  if (!allowFailure && result.status !== 0) {
    if (quiet) process.stderr.write(result.stderr ?? "");
    console.error(`[db:baseline] Command failed: ${command} ${args.join(" ")}`);
    process.exit(1);
  }
  return result;
}

async function migrationsTableRowCount() {
  const db = new PrismaClient();
  try {
    const rows = await db.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "_prisma_migrations"`);
    return rows[0]?.count ?? 0;
  } catch {
    return null; // tablo yok
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("[db:baseline] DATABASE_URL is not set.");
    process.exit(1);
  }
  if (!process.argv.includes("--yes")) {
    console.error(
      [
        "[db:baseline] This marks existing migrations as applied on a database created with `db push`",
        "              and then installs the integrity triggers.",
        "              1) Take a backup first (pg_dump).",
        "              2) Re-run with:  pnpm db:baseline -- --yes",
      ].join("\n"),
    );
    process.exit(1);
  }

  // 1) Zaten migration geçmişi var mı?
  const existing = await migrationsTableRowCount();
  if (existing !== null && existing > 0) {
    console.log(
      `[db:baseline] _prisma_migrations already has ${existing} rows — baseline not needed. Run \`pnpm db:deploy\`.`,
    );
    process.exit(0);
  }

  // 2) Şema farkı = 0 olmalı
  console.log("[db:baseline] Checking that the database matches prisma/schema exactly…");
  const diff = run(
    "prisma",
    ["migrate", "diff", "--from-url", process.env.DATABASE_URL, "--to-schema-datamodel", SCHEMA_DIR, "--exit-code", "--script"],
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

  // 3) Trigger migration'ı hariç hepsini "uygulandı" işaretle
  const migrations = fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const toResolve = migrations.filter((name) => !name.endsWith(REASSERT_SUFFIX));
  console.log(`[db:baseline] Marking ${toResolve.length} migrations as applied…`);
  for (const name of toResolve) {
    run("prisma", ["migrate", "resolve", "--applied", name], { quiet: true });
  }

  // 4) Kalan migration'ları (trigger kurulumu) gerçekten çalıştır
  console.log("[db:baseline] Applying remaining migrations (integrity triggers)…");
  run("prisma", ["migrate", "deploy"]);

  // 5) Doğrula
  run("node", [path.join("scripts", "verify-db-integrity.mjs")]);
  console.log("[db:baseline] Done. From now on use `pnpm db:deploy`.");
}

main().catch((error) => {
  console.error("[db:baseline] Unexpected error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
