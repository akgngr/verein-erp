import type { z } from "zod";

import type { Role } from "../roles";
import type { PermissionRequirement } from "../types/module";

/**
 * Kişisel sekreter sözleşmesi (docs/specs/PERSONAL_SECRETARY.md §3.1).
 * Modüller `src/modules/<modül>/secretary.ts` içinde `export const secretary = defineModuleSecretary({...})`
 * ile sabah özetine katkı verir; `pnpm module:sync` bunları src/secretary-registry.ts içinde toplar.
 * Sekreter modülü hiçbir modülü import etmez; yalnız bu kayıt üzerinden okur.
 */
export type BriefingSeverity = "info" | "warning" | "danger";

export type BriefingItem = {
  /** Stabil kimlik: "<modül>:<tür>[:<kaynakId>]" — kapat/ertele durumu bu kimliğe bağlanır. */
  id: string;
  module: string;
  kind: string;
  severity: BriefingSeverity;
  /** Çevrilmiş kısa başlık (sağlayıcı kendi i18n ad alanından üretir). */
  title: string;
  detail?: string;
  /** ISO tarih veya tarih-saat; sıralama ve "bugün/yaklaşan" ayrımı için. */
  dueAt?: string;
  count?: number;
  amountCents?: number;
  /** Kaynağa giden uygulama içi bağlantı (yalnız sağlayıcının kendi modülünün sayfaları). */
  href: string;
  /**
   * Yalnız sunucu: kural kaynaklı öneri (ADR 0005). Toplayıcı bunu şifreli bir `SecretaryProposal`a
   * çevirir ve istemciye yalnız `proposalId` gider; payload tarayıcıya ulaşmaz.
   */
  suggestion?: { action: string; payload: unknown };
  /** Bu öğe için bekleyen öneri (onay kutusu). */
  proposalId?: string;
};

export type SecretaryContext = {
  user: { id: string; role: Role };
  /** "Şimdi"; tarih karşılaştırmaları Europe/Berlin takvim gününe göre yapılır. */
  now: Date;
  /** Sağlayıcının modül ad alanında çeviri: t("secretary.overdue") → <modül>.secretary.overdue */
  t: (key: string, values?: Record<string, string | number>) => string;
};

export type SecretaryProvider = {
  /** Modül içinde benzersiz anahtar. */
  key: string;
  /** Görüntüleme yetkisi yoksa sağlayıcı hiç çağrılmaz. */
  permission: PermissionRequirement;
  collect: (context: SecretaryContext) => Promise<BriefingItem[]>;
};

/** "external": e-posta, ödeme, beyan gibi dışa etkili eylem — UI ek onay ister, sunucu da zorunlu kılar. */
export type SecretaryActionRisk = "internal" | "external";

export type SecretaryActionContext = { user: { id: string; role: Role }; now: Date };

/**
 * Onaylanan önerinin çalıştırdığı hedef modül eylemi (ADR 0005). Modülün mevcut servis veya
 * eylemini kullanır; yetki çalışma anında yeniden denetlenir. Hiçbir eylem otomatik onaylanmaz.
 */
export type SecretaryAction<P = unknown> = {
  /** Modül içinde benzersiz anahtar. */
  key: string;
  permission: PermissionRequirement;
  risk: SecretaryActionRisk;
  schema: z.ZodType<P>;
  /** Önizleme: kullanıcının zaten görebildiği kısa metin (modül ad alanında çevrilmiş). */
  preview: (payload: P, context: SecretaryContext) => Promise<{ title: string; detail?: string }>;
  /** Kaynağın şimdiki durumu; öneri sonrası değiştiyse öneri bayattır. null: kaynak artık yok. */
  snapshot?: (payload: P) => Promise<unknown>;
  execute: (payload: P, context: SecretaryActionContext) => Promise<{ href?: string }>;
  /**
   * İsteğe bağlı "düzenle" yolu: kaynağın kendi yetkili düzenleme sayfası (uygulama içi göreli yol).
   * Sunucu doğrular (`/` ile başlar, `//` veya şema yok); payload istemciye gitmez. #296
   */
  editHref?: (payload: P) => string | null;
};

export type ModuleSecretary = { module: string; providers: SecretaryProvider[]; actions?: SecretaryAction[] };

export const defineModuleSecretary = (definition: ModuleSecretary): ModuleSecretary => definition;

/** Tip güvenli eylem tanımı (payload tipi şemadan). */
export const defineSecretaryAction = <P>(action: SecretaryAction<P>): SecretaryAction =>
  action as unknown as SecretaryAction;

/** Toplayıcı (T1.1) çıktısı. */
export type Briefing = {
  generatedAt: string;
  /** Kapatılmış/ertelenmiş öğeler süzülmüş. */
  sections: { module: string; items: BriefingItem[] }[];
  /** Hata veren veya zaman aşımına uğrayan sağlayıcıların "<modül>.<anahtar>" kimlikleri (içerik yok). */
  failures: string[];
};

/** Sağlayıcı başına sınırlar (T1.1 toplayıcısı uygular). */
export const SECRETARY_LIMITS = { providerTimeoutMs: 3000, maxItemsPerProvider: 20 } as const;

/** BriefingItem.id biçimi: "<modül>:<tür>[:<kaynakId>]". */
export const BRIEFING_ITEM_ID_PATTERN = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*(?::[A-Za-z0-9_-]{1,64})?$/;

/**
 * Sözleşme denetimi (kayıt testinde ve toplayıcıda kullanılır). Hata kodları döner, boş = geçerli.
 * - sağlayıcı anahtarları benzersiz, tanım `module` alanı modül klasörüyle aynı
 * - öğe kimliği "<modül>:<tür>[:<id>]" biçiminde ve kendi modülüyle başlar
 * - bağlantı uygulama içi göreli yol (dış bağlantı yok)
 */
export function validateModuleSecretary(moduleKey: string, definition: ModuleSecretary): string[] {
  const errors: string[] = [];
  if (definition.module !== moduleKey) errors.push(`module-mismatch:${definition.module}`);
  const keys = new Set<string>();
  for (const provider of definition.providers) {
    if (!/^[a-z][a-zA-Z0-9-]*$/.test(provider.key)) errors.push(`provider-key:${provider.key}`);
    if (keys.has(provider.key)) errors.push(`provider-duplicate:${provider.key}`);
    keys.add(provider.key);
  }
  const actions = new Set<string>();
  for (const action of definition.actions ?? []) {
    if (!/^[a-z][a-zA-Z0-9-]*$/.test(action.key)) errors.push(`action-key:${action.key}`);
    if (actions.has(action.key)) errors.push(`action-duplicate:${action.key}`);
    if (action.risk !== "internal" && action.risk !== "external") errors.push(`action-risk:${action.key}`);
    actions.add(action.key);
  }
  return errors;
}

export function validateBriefingItem(moduleKey: string, item: BriefingItem): string[] {
  const errors: string[] = [];
  if (!BRIEFING_ITEM_ID_PATTERN.test(item.id) || !item.id.startsWith(`${moduleKey}:`)) errors.push(`item-id:${item.id}`);
  if (item.module !== moduleKey) errors.push(`item-module:${item.id}`);
  if (!item.href.startsWith("/") || item.href.startsWith("//")) errors.push(`item-href:${item.id}`);
  if (!item.title.trim()) errors.push(`item-title:${item.id}`);
  if (item.dueAt !== undefined && Number.isNaN(Date.parse(item.dueAt))) errors.push(`item-due:${item.id}`);
  if (item.proposalId !== undefined) errors.push(`item-proposal:${item.id}`); // yalnız toplayıcı atar
  return errors;
}
