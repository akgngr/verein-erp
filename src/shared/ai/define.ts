import type { Role } from "@prisma/client";
import type { z } from "zod";

/**
 * MODÜL AI STANDARDI — her modül, asistanın kendisiyle neler yapabileceğini KENDİ klasöründeki
 * `ai.ts` dosyasında `defineModuleAi` ile bildirir. `pnpm module:sync` bu dosyaları bulup
 * `src/ai-registry.ts`'i üretir; AI modülü araçları ve önerileri yalnızca oradan toplar.
 *
 * Güvenlik kapıları (AI modülü uygular, modül yazarı ayrıca bir şey yapmaz):
 *  1. Yöneticinin izin matrisi: modül + işlem (read/create/update/delete) açık olmalı.
 *  2. Modül kurulu/etkin olmalı.
 *  3. `allowed(user)` — kullanıcının kendi rol yetkisi.
 *  4. Yazma işlemleri ASLA doğrudan yapılmaz: araç `propose` ile bir onay kartı üretir;
 *     kullanıcı onaylayınca `actions[action].execute` çalışır (matris yeniden denetlenir,
 *     payload şemayla yeniden doğrulanır, modül eylemi kullanıcının yetkisini yine denetler).
 *
 * KVKK/DSGVO: araçlar kişi adı, iletişim, adres, banka veya kimlik verisi DÖNDÜRMEZ.
 */
export const AI_OPERATIONS = ["read", "create", "update", "delete"] as const;
export type AiOperation = (typeof AI_OPERATIONS)[number];

export type AiUser = { id: string; name: string; email: string; role: Role };
export type JsonSchema = Record<string, unknown>;

/** Onay kartı: `details` kartta gösterilen kısa satırlardır (kişisel veri içermemeli). */
export type ModuleAiProposalInput = { action: string; title: string; details?: string[]; payload: unknown };

export type ModuleAiContext = {
  user: AiUser;
  /** Bir onay kartı önerir; hiçbir veri değişmez. */
  propose: (proposal: ModuleAiProposalInput) => void;
};

export type ModuleAiTool<S extends z.ZodType = z.ZodType> = {
  /** Modele görünen ad; tüm modüllerde benzersiz olmalı (snake_case). */
  name: string;
  operation: AiOperation;
  /** Modele yönelik açıklama (İngilizce). */
  description: string;
  schema: S;
  inputSchema: JsonSchema;
  allowed: (user: AiUser) => boolean;
  run: (input: z.infer<S>, context: ModuleAiContext) => Promise<unknown>;
};

export type ModuleAiActionResult = { ok: boolean; error?: string };

export type ModuleAiAction<S extends z.ZodType = z.ZodType> = {
  operation: AiOperation;
  /** Onay sonrası payload bu şemayla yeniden doğrulanır. */
  schema: S;
  execute: (payload: z.infer<S>) => Promise<ModuleAiActionResult>;
};

export type ModuleAi = {
  module: string;
  tools: ModuleAiTool[];
  actions: Record<string, ModuleAiAction>;
};

/** Tip çıkarımı için yardımcılar. */
export const aiTool = <S extends z.ZodType>(tool: ModuleAiTool<S>) => tool as unknown as ModuleAiTool;
export const aiAction = <S extends z.ZodType>(action: ModuleAiAction<S>) => action as unknown as ModuleAiAction;
export const defineModuleAi = (definition: ModuleAi): ModuleAi => definition;

/** Yaygın not: öneri yapıldıktan sonra modele dönen sonuç. */
export const PROPOSED = { status: "proposed", note: "A confirmation card was shown to the user; nothing changes until they confirm." } as const; // i18n-ignore (model-facing tool text)
