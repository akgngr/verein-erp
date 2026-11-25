"use server";

import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";

import { consumeRateLimit, hashRateLimitSubject, type RateLimitConfig } from "@/shared/security/rate-limit";

import { queueSignedPdf } from "../services/pdf-queue";
import { submitSchema } from "../lib/schemas";
import { markPublicFormOpened, submitPublicForm } from "../services/requests";

/**
 * #580: Oturumsuz uç için hız sınırı (IP ve belirteç başına). İmza resmi büyük olduğundan gönderim
 * pahalıdır; sınır kaba kuvvet ve kötüye kullanımı engeller.
 */
const SUBMIT_PER_IP: RateLimitConfig = { limit: 20, windowMs: 15 * 60 * 1000 };
const SUBMIT_PER_TOKEN: RateLimitConfig = { limit: 5, windowMs: 15 * 60 * 1000 };
const OPENED_PER_IP: RateLimitConfig = { limit: 60, windowMs: 15 * 60 * 1000 };

async function clientIpHash(): Promise<string> {
  const h = await headers();
  return hashRateLimitSubject(h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown");
}

/**
 * OTURUMSUZ: yalnız geçerli, süresi dolmamış, bekleyen bir belirteçle çalışır. Kimlik doğrulaması
 * belirtecin kendisidir (32 bayt rastgele; kişinin kendi e-posta/telefonuna gider).
 */
export async function submitOnlineFormAction(input: unknown): Promise<{ ok: true } | { ok: false; error: string; fields?: Record<string, string> }> {
  const ip = await clientIpHash();
  const token = typeof input === "object" && input && "token" in input && typeof input.token === "string" ? input.token.slice(0, 100) : "";
  const [perIp, perToken] = await Promise.all([
    consumeRateLimit(`online-forms:submit:ip:${ip}`, SUBMIT_PER_IP),
    consumeRateLimit(`online-forms:submit:token:${hashRateLimitSubject(token)}`, SUBMIT_PER_TOKEN),
  ]);
  if (!perIp.allowed || !perToken.allowed) return { ok: false, error: "online-forms.errors.rateLimited" };
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join(".")] ??= issue.message;
    return { ok: false, error: "online-forms.errors.invalid", fields };
  }
  const t = await getTranslations("online-forms");
  const result = await submitPublicForm(parsed.data, (name) => t("updatedBy", { name }), (org) => ({
    privacy: t("public.privacy", { org }),
    photo: t(parsed.data.student && !parsed.data.member && parsed.data.guardian ? "public.photoChild" : "public.photo"),
    sepa: t("public.sepaMandate", { org }),
  }));
  if (result === "textsChanged") return { ok: false, error: "online-forms.errors.textsChanged" };
  if (!result) return { ok: false, error: "online-forms.errors.linkInvalid" };
  // PDF arka planda (worker) üretilip saklanır; kuyruk yoksa burada üretilir. İndirmede yoksa kanıt kaydından üretilir.
  await queueSignedPdf(result);
  return { ok: true };
}

/** #580: Form tarayıcıda gösterildi (açılma zamanı). Belirteç dışında girdi yok; hız sınırlı. */
export async function markOnlineFormOpenedAction(token: unknown): Promise<void> {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{20,100}$/.test(token)) return;
  const limited = await consumeRateLimit(`online-forms:opened:ip:${await clientIpHash()}`, OPENED_PER_IP);
  if (!limited.allowed) return;
  await markPublicFormOpened(token);
}
