/**
 * Faz 2 E2E test kullanıcıları (sandbox'ta bırakılır; Faz 1 uygulamasıyla aynı).
 *
 * KARAR: seed.ts ile aynı desen — env.ts / "server-only" import EDİLMEZ;
 * kendi PrismaClient'ı oluşturulur, password.ts göreli yolla kullanılır.
 * Kullanım: set -a && . ./.env.local && set +a && pnpm exec tsx scripts/create-test-users.ts
 */
try {
  process.loadEnvFile();
} catch {
  // .env yoksa ortam değişkenleri dışarıdan verilmiş olmalıdır.
}

import bcrypt from "bcryptjs";
import { createPrismaClient } from "../src/shared/db-client";

const prisma = createPrismaClient();

const USERS = [
  { email: "sekreter@dernek.local", name: "Test Sekreter", role: "SECRETARY" as const },
  { email: "baskan@dernek.local", name: "Test Başkan", role: "BOARD" as const },
  { email: "izleyici@dernek.local", name: "Test İzleyici", role: "VIEWER" as const },
];

async function main() {
  const passwordHash = await bcrypt.hash("Test@12345", 12);
  for (const user of USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { role: user.role, isActive: true, passwordHash, mustChangePassword: false },
      create: { ...user, passwordHash, mustChangePassword: false },
    });
    console.log(`hazır: ${user.email} / Test@12345 (${user.role})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
