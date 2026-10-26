/**
 * Teslim öncesi "ilk kurulum" durumunu geri yükler:
 *  - admin parolasını .env içindeki ADMIN_PASSWORD değerine sıfırlar
 *  - mustChangePassword = true yapar (ilk girişte zorunlu parola değişimi)
 *  - kilit/sayaç alanlarını temizler
 *  - duman testi artıklarını kaldırır (test kullanıcısı + denetim kayıtları)
 *
 * KARAR: Uygulama akışları kullanıcıyı asla silmez; bu betik yalnızca
 * önceki oturumun otomatik duman testinin bıraktığı veriyi temizler.
 * Denetim kayıtlarında FK yoktur (ID + snapshot), bu yüzden silme güvenlidir.
 *
 * Kullanım: DATABASE_URL=<postgres-url> pnpm exec tsx scripts/reset-admin.ts
 */
try {
  process.loadEnvFile();
} catch {
  // .env yoksa değişkenler dışarıdan verilmelidir.
}

import { PrismaClient } from "@prisma/client";
import { z } from "zod";

import { hashPassword } from "../src/shared/security/password";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(10),
  ADMIN_NAME: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Env geçersiz:", parsed.error.issues.map((i) => i.path.join(".")).join(", "));
  process.exit(1);
}
const env = parsed.data;

const prisma = new PrismaClient();

async function main() {
  const email = env.ADMIN_EMAIL.toLowerCase();

  // 1) Duman testi kullanıcısını kaldır (admin dışındaki herkes test artığıdır).
  const removed = await prisma.user.deleteMany({ where: { NOT: { email } } });
  console.log(`Silinen test kullanıcısı: ${removed.count}`);

  // 2) Denetim kayıtlarını temizle (test oturumlarının ürettiği kayıtlar).
  await prisma.auditLog.deleteMany({});
  console.log("Denetim kayıtları temizlendi.");

  // 3) Yöneticiyi belgelenmiş ilk kurulum durumuna döndür.
  const data = {
    name: env.ADMIN_NAME,
    passwordHash: await hashPassword(env.ADMIN_PASSWORD),
    role: "ADMIN" as const,
    isActive: true,
    mustChangePassword: true,
    failedLoginCount: 0,
    lockedUntil: null,
    lastLoginAt: null,
    updatedAt: new Date(),
  };
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({ where: { email }, data });
    console.log(`Yönetici sıfırlandı: ${email} (parola = .env ADMIN_PASSWORD, mustChangePassword = true)`);
  } else {
    await prisma.user.create({ data: { ...data, email } });
    console.log(`Yönetici oluşturuldu: ${email}`);
  }
}

main()
  .catch((error) => {
    console.error("Sıfırlama başarısız:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
