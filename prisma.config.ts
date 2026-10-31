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
  // Prisma 7: Migrate/Studio bağlantısı burada (şemadaki datasource.url kaldırıldı).
  // KARAR: env() yerine process.env — `prisma generate` (derleme, Docker) veritabanı adresi olmadan
  // da çalışmalı; adres gerektiren komutlar (migrate, studio) değişken yoksa kendileri hata verir.
  // Gölge veritabanı yalnızca `migrate diff --from-migrations` (CI'daki migration/şema uyumu) için.
  // Neon: migration'lar havuzsuz (direct) adresle çalışmalı → DIRECT_URL varsa o kullanılır;
  // uygulama her zaman DATABASE_URL (havuzlu/pooled) kullanır (src/shared/db-client.ts).
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
    ...(process.env.SHADOW_DATABASE_URL ? { shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL } : {}),
  },
  migrations: {
    path: path.join("prisma", "schema", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
});
