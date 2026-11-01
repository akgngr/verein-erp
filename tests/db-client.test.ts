import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { stripPrismaOnlyParams } from "../src/shared/db-client";

describe("Prisma 7 bağlantı adresi", () => {
  test("eski sorgu motoruna özgü parametreler pg sürücüsüne gitmez", () => {
    const url = stripPrismaOnlyParams("postgresql://u:p@ep-x.neon.tech/db?sslmode=require&pgbouncer=true&connection_limit=5&pool_timeout=10");
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get("sslmode"), "verify-full", "require → verify-full (pg uyarısı olmadan aynı güvenli davranış)");
    for (const key of ["pgbouncer", "connection_limit", "pool_timeout"]) assert.equal(parsed.searchParams.has(key), false);
    assert.equal(parsed.hostname, "ep-x.neon.tech");
  });
  test("parametresiz ve geçersiz adresler olduğu gibi döner", () => {
    assert.equal(stripPrismaOnlyParams("postgresql://u:p@localhost:5432/db"), "postgresql://u:p@localhost:5432/db");
    assert.equal(stripPrismaOnlyParams("not a url"), "not a url");
  });
  test("libpq uyumluluğu bilinçli seçildiyse sslmode değiştirilmez", () => {
    const parsed = new URL(stripPrismaOnlyParams("postgresql://u:p@h/db?uselibpqcompat=true&sslmode=require"));
    assert.equal(parsed.searchParams.get("sslmode"), "require");
    assert.equal(new URL(stripPrismaOnlyParams("postgresql://u:p@h/db?sslmode=disable")).searchParams.get("sslmode"), "disable");
  });
});
