#!/usr/bin/env node
// A-1.3: `prisma db push` yalnızca YEREL DENEME içindir.
//
// db push migration geçmişi oluşturmaz ve migration'lardaki elle yazılmış SQL'i
// (değişmezlik trigger'ları) UYGULAMAZ. Bu yüzden üretimde reddedilir; şema
// değişiklikleri her zaman `pnpm db:migrate` ile migration olarak üretilmelidir.

import { spawnSync } from "node:child_process";

if (process.env.NODE_ENV === "production") {
  console.error("[db:push:dev] Refused: NODE_ENV=production. Use `pnpm db:deploy` (prisma migrate deploy).");
  process.exit(1);
}

console.warn(
  [
    "",
    "  ⚠  prisma db push — LOCAL EXPERIMENTS ONLY",
    "  - No migration is recorded; production (`prisma migrate deploy`) will NOT get these changes.",
    "  - Integrity triggers from migrations are NOT created by db push.",
    "  - Before committing a schema change run: pnpm db:migrate --name <change>",
    "",
  ].join("\n"),
);

const result = spawnSync("prisma", ["db", "push", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
