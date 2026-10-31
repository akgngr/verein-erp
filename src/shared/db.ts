import "server-only";

import type { PrismaClient } from "@prisma/client";

import { createPrismaClient } from "./db-client";

import { getEnv } from "./env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * KARAR: Prisma client'ı modül yüklenirken değil, ilk kullanımda oluşturulur.
 * Böylece ortam değişkeni doğrulaması (getEnv) yalnızca sunucu çalışma zamanında
 * devreye girer; derleme (build) sırasında veritabanına erişilmez.
 */
export function getDb(): PrismaClient {
  getEnv(); // Eksik/geçersiz ortam değişkeninde açıklayıcı hata ile durur.

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient(process.env.DATABASE_URL);
  }
  return globalForPrisma.prisma;
}
