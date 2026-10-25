import { z } from "zod";

/**
 * Ortam değişkenleri tek noktadan zod ile doğrulanır.
 *
 * KARAR: Doğrulama tembel (lazy) yapılır — `getEnv()` ilk erişimde çalışır.
 * Böylece `pnpm build` (ortam değişkenlerinin bulunmadığı ortamlarda, örn.
 * Docker imaj derlemesi) sorunsuz tamamlanır; eksik ya da geçersiz değişken
 * durumunda uygulama ilk kullanımda açıklayıcı hata ile durur.
 */
const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL tanımlı değil. .env dosyasına postgresql:// bağlantı adresini yazın."),
  AUTH_SECRET: z
    .string()
    .min(16, "AUTH_SECRET tanımlı değil ya da çok kısa. `openssl rand -base64 32` komutuyla üretin."),
  AUTH_TRUST_HOST: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(kök)"}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Ortam değişkenleri eksik veya geçersiz, uygulama başlatılamıyor:\n${details}\n` +
        `.env dosyanızı hazırladığınızdan emin olun (bkz. .env.example).`,
    );
  }

  cached = result.data;
  return cached;
}
