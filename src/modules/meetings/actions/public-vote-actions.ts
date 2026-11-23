"use server";

import { z } from "zod";

import { castBallot, loadBallot } from "../services/secret-ballot";

/**
 * OTURUMSUZ oy kabini (/oy). Bilinçli olarak oturum, çerez, IP veya tarayıcı bilgisi OKUNMAZ ve kaydedilmez:
 * tek girdi oy kodu ve seçimdir. Bilinmeyen/kullanılmış kodlar aynı hata biçimini döner.
 */
const code = z.string().trim().min(10).max(60);

export async function loadBallotAction(input: unknown): Promise<{ ok: true; question: string; options: string[] } | { ok: false; error: "invalidCode" }> {
  const parsed = z.object({ code }).safeParse(input);
  const ballot = parsed.success ? await loadBallot(parsed.data.code) : null;
  return ballot ? { ok: true, ...ballot } : { ok: false, error: "invalidCode" };
}

export async function castBallotAction(input: unknown): Promise<{ ok: true; receipt: string } | { ok: false; error: "invalidCode" | "invalidChoice" }> {
  const parsed = z.object({ code, choice: z.string().trim().min(1).max(120) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalidCode" };
  const result = await castBallot(parsed.data.code, parsed.data.choice);
  if (result.ok) return result;
  return { ok: false, error: result.error === "invalidChoice" ? "invalidChoice" : "invalidCode" };
}
