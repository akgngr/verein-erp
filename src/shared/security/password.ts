import { compare, hash } from "bcryptjs";
import { z } from "zod";

/**
 * Parola kuralı (tek noktadan): en az 10 karakter, en az 1 büyük harf,
 * 1 küçük harf ve 1 rakam. Bu şema istemci ve sunucu tarafında ortak kullanılır
 * ve seed (prisma/seed.ts) tarafından da göreli yolla import edilir.
 *
 * NOT: Bu dosya bilinçli olarak "server-only" içermez; izomorfiktir.
 */
export const passwordSchema = z
  .string()
  .min(10, "Parola en az 10 karakter olmalıdır.")
  .regex(/[A-ZĞÜŞİÖÇ]/, "Parola en az bir büyük harf içermelidir.")
  .regex(/[a-zğüşiöç]/, "Parola en az bir küçük harf içermelidir.")
  .regex(/[0-9]/, "Parola en az bir rakam içermelidir.");

// Spesifikasyon: bcrypt cost 12
const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  return compare(plain, passwordHash);
}
