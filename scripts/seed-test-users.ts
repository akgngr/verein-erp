/**
 * Faz 2 kabul testleri için rol test kullanıcılarını oluşturur (idempotent).
 * KARAR: Admin hesabına DOKUNMAZ — kullanıcı kendi parolasını seçmiş olabilir.
 * Kullanım: set -a && source .env.local && set +a && pnpm exec tsx scripts/seed-test-users.ts
 */
try {
  process.loadEnvFile();
} catch {
  // .env yoksa değişkenler dışarıdan verilmelidir.
}


import { hashPassword } from "../src/shared/security/password";
import { createPrismaClient } from "../src/shared/db-client";

const prisma = createPrismaClient();

const TEST_USERS = [
  { email: "sekreter@dernek.local", name: "Test Sekreter", role: "SECRETARY" as const, password: "Sekreter1234" },
  { email: "board@dernek.local", name: "Test Yönetim", role: "BOARD" as const, password: "Board12345" },
  { email: "viewer@dernek.local", name: "Test Görüntüleyici", role: "VIEWER" as const, password: "Viewer12345" },
];

async function main() {
  for (const spec of TEST_USERS) {
    const data = {
      name: spec.name,
      role: spec.role,
      isActive: true,
      mustChangePassword: false, // test kullanıcıları; ilk girişte zorlama yok
      passwordHash: await hashPassword(spec.password),
    };
    const existing = await prisma.user.findUnique({ where: { email: spec.email } });
    if (existing) {
      await prisma.user.update({ where: { email: spec.email }, data });
      console.log(`güncellendi: ${spec.email} (${spec.role})`);
    } else {
      await prisma.user.create({ data: { ...data, email: spec.email } });
      console.log(`oluşturuldu: ${spec.email} (${spec.role})`);
    }
  }
}

main()
  .catch((error) => {
    console.error("Test kullanıcıları oluşturulamadı:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
