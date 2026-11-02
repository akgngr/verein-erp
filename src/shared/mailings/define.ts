import type { PermissionRequirement } from "@/shared/types/module";

/**
 * TOPLU E-POSTA ALICI KAYNAĞI SÖZLEŞMESİ. Bir modül, src/modules/<modül>/recipients.ts içinde
 * `export const recipients = defineRecipients("<modül>", [ ... ])` dışa aktararak "Toplu e-posta"
 * modülüne alıcı listesi sunar; `pnpm module:sync` src/recipient-registry.ts'i üretir.
 *
 * - Kaynağı yalnızca `permission` yetkisi olan kullanıcı görür ve kullanır; modül kapalıysa listelenmez.
 * - KVKK/DSGVO: itiraz edenler (`optOut`) ve e-postası olmayanlar gönderimde atlanır.
 * - Metin/etiketler modülün mesajlarındadır: <modül>.recipients.<kaynak>.label, ...filters.<filtre>.label,
 *   ...filters.<filtre>.options.<değer>.
 */
export type RecipientFilter = {
  key: string;
  /** Sabit seçenekler (etiketleri mesajlarda: ...filters.<filtre>.options.<değer>). */
  options: string[];
  /** Seçilmezse hepsi. Varsayılan seçili değerler. */
  defaults?: string[];
  /**
   * Dinamik seçenekler (ör. verideki şehirler): değer aynı zamanda etikettir. Verilirse `options` yerine
   * kullanılır; KVKK: yalnızca gruplama değerleri dönmeli (kişi adı vb. değil).
   */
  loadOptions?: () => Promise<string[]>;
};

export type Recipient = {
  /** Kaynaktaki kayıt kimliği (gönderim kaydı/MailLog referansı için). */
  id: string;
  email: string | null;
  name: string;
  optOut: boolean;
  /** Yer tutucu değerleri ({firstName} vb.). */
  vars: Record<string, string>;
};

export type RecipientSource = {
  key: string;
  permission: PermissionRequirement;
  /** Bu kaynağın sunduğu yer tutucular. */
  placeholders: string[];
  filters: RecipientFilter[];
  resolve: (filter: Record<string, string[]>) => Promise<Recipient[]>;
  /** Test gönderiminde kullanılacak örnek değerler (alıcı yoksa). */
  sampleVars: Record<string, string>;
};

export type ModuleRecipients = { moduleKey: string; sources: RecipientSource[] };

export const defineRecipients = (moduleKey: string, sources: RecipientSource[]): ModuleRecipients => ({ moduleKey, sources });

/** Yer tutucu doldurma; bilinmeyenler olduğu gibi kalır. */
export function renderMailTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? vars[key] : match));
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** HTML gövde için: değerler kaçışlanır (ör. "<b>" adlı kişi HTML enjekte edemez). */
export function renderMailTemplateHtml(html: string, vars: Record<string, string>): string {
  return html.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? vars[key].replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]) : match));
}
