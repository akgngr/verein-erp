import path from "node:path";

import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI yapılandırması (package.json → "prisma" alanının yerine; Prisma 7'de zorunlu).
 *
 * KARAR: Bu dosya varken Prisma `.env` dosyalarını KENDİLİĞİNDEN yüklemez. Next.js ile aynı
 * kuralla yüklüyoruz (.env, .env.local, .env.development …; ortamda tanımlı değişkenler önceliklidir),
 * böylece `pnpm prisma migrate deploy` ve uygulama aynı DATABASE_URL'i görür.
 */
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

export default defineConfig({
  // Çok dosyalı şema: her modülün schema.prisma'sı prisma/schema altına bağlanır (pnpm module:sync).
  schema: path.join("prisma", "schema"),
  migrations: {
    path: path.join("prisma", "schema", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
});
