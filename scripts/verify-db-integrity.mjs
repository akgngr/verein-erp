#!/usr/bin/env node
// A-1.4: Veritabanı bütünlük doğrulaması.
//
// 1. prisma/schema/migrations altındaki her migration _prisma_migrations'ta
//    başarıyla uygulanmış olmalı (finished_at dolu, rolled_back_at boş).
// 2. Değişmezlik (append-only / GoBD) trigger'ları ve fonksiyonları mevcut olmalı.
//    `prisma db push` bunları OLUŞTURMAZ; eksiklerse bu script exit 1 ile durur.
//
// Düz Node.js (ESM) ile çalışır; üretim imajında tsx gerekmez.
// Kullanım: `node scripts/verify-db-integrity.mjs` (DATABASE_URL gerekir).
// Docker CMD'de `prisma migrate deploy` sonrasında çalıştırılır.

import fs from "node:fs";
import path from "node:path";

// @prisma/client CommonJS olduğu için ESM'de varsayılan import ile alınır.
import prismaClientPackage from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import nextEnv from "@next/env";

// .env / .env.local, Next.js ve prisma.config.ts ile aynı kuralla (ortamdaki değişkenler önceliklidir).
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const { PrismaClient } = prismaClientPackage;

const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "schema", "migrations");

/** Beklenen trigger → tablo eşlemesi (20261029120100_reassert_integrity_triggers ile aynı liste). */
export const REQUIRED_TRIGGERS = {
  audit_log_no_update: "AuditLog",
  audit_log_no_delete: "AuditLog",
  accounting_booking_no_delete: "AccountingBooking",
  accounting_booking_file_no_delete: "AccountingBookingFile",
  accounting_booking_no_renumber: "AccountingBooking",
  donations_no_delete: "Donation",
  zuwendung_confirmation_no_delete: "ZuwendungConfirmation",
  zuwendung_confirmation_item_no_delete: "ZuwendungConfirmationItem",
  zuwendung_confirmation_protected: "ZuwendungConfirmation",
  zuwendung_confirmation_item_protected: "ZuwendungConfirmationItem",
};

export const REQUIRED_FUNCTIONS = [
  "prevent_mutation",
  "accounting_booking_protected_columns",
  "confirmation_protected_columns",
  "confirmation_item_protected",
];

function listMigrationDirs() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(MIGRATIONS_DIR, name, "migration.sql")))
    .sort();
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("[verify-db] DATABASE_URL is not set.");
    process.exit(1);
  }

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const problems = [];

  try {
    // 1) Migration durumu
    const expected = listMigrationDirs();
    let applied = [];
    let hasMigrationsTable = true;
    try {
      applied = await db.$queryRawUnsafe(
        `SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"`,
      );
    } catch {
      hasMigrationsTable = false;
      problems.push(
        'Table "_prisma_migrations" not found: the database was not created with `prisma migrate deploy` (see docs/operations/MIGRATION_BASELINE.md).',
      );
    }

    const appliedOk = new Set(
      applied
        .filter((row) => row.finished_at !== null && row.rolled_back_at === null)
        .map((row) => row.migration_name),
    );
    const failed = applied
      .filter((row) => row.finished_at === null && row.rolled_back_at === null)
      .map((row) => row.migration_name);

    for (const name of failed) problems.push(`Migration failed or incomplete: ${name}`);
    if (hasMigrationsTable) {
      for (const name of expected) {
        if (!appliedOk.has(name)) problems.push(`Migration not applied: ${name}`);
      }
    }

    // 2) Trigger'lar
    const triggers = await db.$queryRawUnsafe(
      `SELECT t.tgname AS name, c.relname AS "table"
         FROM pg_trigger t
         JOIN pg_class c ON c.oid = t.tgrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE NOT t.tgisinternal AND n.nspname = current_schema()`,
    );
    const present = new Map(triggers.map((row) => [row.name, row.table]));
    for (const [name, table] of Object.entries(REQUIRED_TRIGGERS)) {
      const actualTable = present.get(name);
      if (!actualTable) problems.push(`Missing trigger: ${name} (on "${table}")`);
      else if (actualTable !== table) {
        problems.push(`Trigger ${name} is on "${actualTable}", expected "${table}"`);
      }
    }

    // 3) Fonksiyonlar
    const functions = await db.$queryRawUnsafe(
      `SELECT p.proname AS name
         FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = current_schema()`,
    );
    const functionNames = new Set(functions.map((row) => row.name));
    for (const name of REQUIRED_FUNCTIONS) {
      if (!functionNames.has(name)) problems.push(`Missing function: ${name}()`);
    }
  } finally {
    await db.$disconnect();
  }

  if (problems.length > 0) {
    console.error("[verify-db] Database integrity check FAILED:");
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error(
      "[verify-db] Run `pnpm db:deploy`. For databases created with `db push`, follow docs/operations/MIGRATION_BASELINE.md.",
    );
    process.exit(1);
  }

  console.log(
    `[verify-db] OK — ${Object.keys(REQUIRED_TRIGGERS).length} triggers, ${REQUIRED_FUNCTIONS.length} functions, all migrations applied.`,
  );
}

main().catch((error) => {
  console.error("[verify-db] Unexpected error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
