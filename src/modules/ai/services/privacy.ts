/**
 * KVKK/DSGVO koruma katmanı: modele giden HER metin (kullanıcı mesajları ve araç çıktıları)
 * buradan geçer. Doğrudan tanımlayıcılar (e-posta, IBAN, telefon, posta kodu + şehir dışındaki
 * sokak adresleri, doğum tarihi biçimli tarihler hariç) yer tutucuyla değiştirilir; eşleme
 * yalnızca sunucu belleğinde, tek istek boyunca yaşar ve yanıt kullanıcıya dönerken geri çözülür.
 *
 * KARAR: Bu katman ikinci savunma hattıdır. Birinci hat araçların tasarımıdır: araçlar kişi
 * adı, iletişim bilgisi veya kimlik numarası DÖNDÜRMEZ; yalnızca toplam/sayım ve kurumsal veri.
 */

type Rule = { kind: string; pattern: RegExp };

// Sıra önemlidir: IBAN rakam dizileri telefon kuralına yakalanmadan önce maskelenir.
const RULES: Rule[] = [
  { kind: "EMAIL", pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { kind: "IBAN", pattern: /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){3,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g },
  { kind: "PHONE", pattern: /(?<![\w.])(?:\+|00)\d{1,3}[\s/-]?(?:\(?\d{2,5}\)?[\s/-]?){1,4}\d{2,}(?!\w|\.\d)|(?<![\w.])0\d{2,5}[\s/-]?\d{3,}(?:[\s/-]?\d{2,})*(?!\w|\.\d)/g },
  { kind: "TAXID", pattern: /\b\d{2}\s?\d{3}\s?\d{3}\s?\d{3}\b/g },
];

const PLACEHOLDER = /\[(EMAIL|IBAN|PHONE|TAXID|PERSON|REF)_(\d+)\]/g;

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Tek istek boyunca tutarlı yer tutucular: aynı değer her yerde aynı belirteci alır. */
export class PseudonymVault {
  private byValue = new Map<string, string>();
  private byToken = new Map<string, string>();
  private counters = new Map<string, number>();
  private known: Rule[] = [];

  /**
   * Sistemde kayıtlı kişi adları (tam ad) ve üye numaraları: metinde geçerse [PERSON_n] / [REF_n]
   * ile değiştirilir. Liste yalnızca sunucu belleğinde kullanılır, modele gönderilmez.
   */
  constructor(known: { names?: string[]; references?: string[] } = {}) {
    const names = [...new Set((known.names ?? []).map((name) => name.trim().replace(/\s+/g, " ")).filter((name) => name.includes(" ") && name.length >= 5))];
    const references = [...new Set((known.references ?? []).map((ref) => ref.trim()).filter((ref) => ref.length >= 3))];
    const byLength = (a: string, b: string) => b.length - a.length;
    if (names.length) {
      const alternatives = names.sort(byLength).map((name) => escape(name).replace(/ /g, "\\s+"));
      this.known.push({ kind: "PERSON", pattern: new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives.join("|")})(?![\\p{L}\\p{N}])`, "giu") });
    }
    if (references.length) {
      this.known.push({ kind: "REF", pattern: new RegExp(`(?<![\\p{L}\\p{N}-])(?:${references.sort(byLength).map(escape).join("|")})(?![\\p{L}\\p{N}])`, "giu") });
    }
  }

  redact(text: string): string {
    let output = text;
    for (const rule of this.known) {
      output = output.replace(rule.pattern, (match) => this.tokenFor(rule.kind, match.toLocaleLowerCase("tr").replace(/\s+/g, " "), match));
    }
    for (const rule of RULES) {
      output = output.replace(rule.pattern, (match) => this.tokenFor(rule.kind, match));
    }
    return output;
  }

  /** JSON değerlerinin içindeki tüm metinleri maskeler (araç çıktıları için). */
  redactValue<T>(value: T): T {
    if (typeof value === "string") return this.redact(value) as T;
    if (Array.isArray(value)) return value.map((item) => this.redactValue(item)) as T;
    if (value && typeof value === "object" && !(value instanceof Date)) {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, this.redactValue(item)])) as T;
    }
    return value;
  }

  restore(text: string): string {
    return text.replace(PLACEHOLDER, (token) => this.byToken.get(token) ?? token);
  }

  /** Yer tutucu sayısı (denetim kaydına yalnızca sayı yazılır, değer asla). */
  get size(): number {
    return this.byToken.size;
  }

  private tokenFor(kind: string, value: string, original = value): string {
    const existing = this.byValue.get(value);
    if (existing) return existing;
    const next = (this.counters.get(kind) ?? 0) + 1;
    this.counters.set(kind, next);
    const token = `[${kind}_${next}]`;
    this.byValue.set(value, token);
    this.byToken.set(token, original);
    return token;
  }
}
