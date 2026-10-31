/**
 * İlk yöneticiyi oluşturur (idempotent). `pnpm db:seed` ile tsx üzerinden çalışır.
 *
 * KARAR: Seed; env.ts veya "server-only" içeren dosyaları import ETMEZ — ortam
 * değişkenlerini kendi zod şemasıyla doğrular, kendi PrismaClient'ını oluşturur
 * ve yalnızca src/shared/security/password.ts dosyasını göreli yolla kullanır.
 *
 * KARAR: tsx, .env dosyasını otomatik yüklemez; Node'un process.loadEnvFile()
 * API'si (ek bağımlılık gerektirmeden) kullanılır.
 */
try {
  process.loadEnvFile();
} catch {
  // .env dosyası yoksa ortam değişkenleri dışarıdan verilmiş olmalıdır.
}

import { z } from "zod";

import { hashPassword } from "../src/shared/security/password";
import { createPrismaClient } from "../src/shared/db-client";

const seedEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL gerekli (.env dosyasını hazırlayın)."),
  ADMIN_EMAIL: z.email("ADMIN_EMAIL geçerli bir e-posta olmalıdır."),
  ADMIN_PASSWORD: z.string().min(10, "ADMIN_PASSWORD en az 10 karakter olmalıdır."),
  ADMIN_NAME: z.string().min(1, "ADMIN_NAME gerekli."),
});

function loadSeedEnv() {
  const parsed = seedEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(
      "Seed ortam değişkenleri geçersiz:\n" +
        parsed.error.issues
          .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
          .join("\n"),
    );
    process.exit(1);
  }
  return parsed.data;
}

const seedEnv = loadSeedEnv();

const prisma = createPrismaClient();

/** Evrak kategorileri (Faz 1): idempotent upsert ile oluşur; ad benzersizdir. */
const DOCUMENT_CATEGORIES = [
  "Resmi Yazı",
  "Dilekçe",
  "Fatura/Belge",
  "Sözleşme",
  "Davet/Duyuru",
  "Bildirim",
  "Diğer",
] as const;

async function main() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = seedEnv;
  const email = ADMIN_EMAIL.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Yönetici zaten mevcut (${email}); seed değişiklik yapmadı.`);
  } else {
    await prisma.user.create({
      data: {
        name: ADMIN_NAME,
        email,
        passwordHash: await hashPassword(ADMIN_PASSWORD),
        role: "ADMIN",
        mustChangePassword: true,
      },
    });

    console.log(`İlk yönetici oluşturuldu: ${email}`);
    console.log("İlk girişte parola değişikliği istenecek (mustChangePassword = true).");
  }

  for (const name of DOCUMENT_CATEGORIES) {
    await prisma.documentCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Evrak kategorileri hazır (${DOCUMENT_CATEGORIES.length} adet).`);

  // Üyelik türü konfigürasyonları (Faz 3 eklemeleri): idempotent upsert.
  // KARAR: ASIL ve DESTEKCI için aidat tutarı null bırakılır (yönetici türler
  // ekranından belirler; null iken tür aidat üretimine dahil edilmez). ONURSAL
  // ve FAHRI 0 = aidat yok (iş emri seed kuralı: onursal/fahri aidatsızdır).
  const membershipTypeConfigs = [
    { type: "ASIL", annualDue: null, isActive: true },
    { type: "ONURSAL", annualDue: "0", isActive: true },
    { type: "FAHRI", annualDue: "0", isActive: true },
    { type: "DESTEKCI", annualDue: null, isActive: true },
  ] as const;
  for (const config of membershipTypeConfigs) {
    await prisma.membershipTypeConfig.upsert({
      where: { type: config.type },
      update: {},
      create: config,
    });
  }
  console.log(`Üyelik türü konfigürasyonları hazır (${membershipTypeConfigs.length} adet).`);
}

main()
  .catch((error) => {
    console.error("Seed başarısız:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
