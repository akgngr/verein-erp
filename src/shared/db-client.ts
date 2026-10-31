import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma 7: istemci bir sürücü adaptörüyle oluşturulur (Rust sorgu motoru yok). PostgreSQL için
 * node-postgres (`pg`). Uygulama (src/shared/db.ts) ve betikler (seed, bakım) aynı fabrikayı kullanır.
 *
 * Neon/PgBouncer: adaptör adsız (unnamed) hazırlanmış ifadeler kullanır; havuzlu (pooled) bağlantı
 * adresiyle de çalışır. `pgbouncer=true` gibi Prisma'ya özgü parametreler gerekmez, zararsızdır.
 */
export function createPrismaClient(connectionString: string | undefined = process.env.DATABASE_URL): PrismaClient {
  if (!connectionString) throw new Error("DATABASE_URL is not set"); // i18n-ignore (geliştirici hatası)
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: stripPrismaOnlyParams(connectionString) }) });
}

/** Yalnızca eski Prisma sorgu motorunun anladığı parametreler pg sürücüsüne gönderilmez. */
export function stripPrismaOnlyParams(url: string): string {
  try {
    const parsed = new URL(url);
    for (const key of ["pgbouncer", "connection_limit", "pool_timeout", "statement_cache_size", "schema", "socket_timeout"]) parsed.searchParams.delete(key);
    return parsed.toString();
  } catch {
    return url;
  }
}
