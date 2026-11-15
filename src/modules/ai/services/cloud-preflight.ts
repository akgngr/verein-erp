/**
 * Bulut gönderimi öncesi tarama (docs/architecture/ai-cloud-pseudonym-relay.md, PS2).
 * Saf fonksiyonlar; DB/ağ yok. Kullanıcı metni buluta gitmeden önce:
 *  1. Kayıtlı kişilerin adları/numaraları konuşmanın takma adına ([[Kn]]) çevrilir.
 *  2. Kalan metinde bilinmeyen kişisel veri aranır (e-posta, telefon, IBAN, vergi no, adres,
 *     doğum tarihi, hitaplı ad, yaygın ad + soyad). Bulunursa metin GÖNDERİLMEZ (fail-closed).
 *  3. Özel nitelikli veri (sağlık, din, …) bir kişiyle birlikte geçerse metin gönderilmez.
 * KARAR: Bu bir anonimlik garantisi değildir; kazayla sızmayı önleyen sunucu kapısıdır.
 * Yanlış alarm, sızıntıya tercih edilir.
 */

export type KnownPerson = { label: string; references?: string[]; key: string };
export type FindingKind = "EMAIL" | "PHONE" | "IBAN" | "TAXID" | "ADDRESS" | "BIRTHDATE" | "TITLED_NAME" | "LIKELY_NAME" | "SPECIAL_CATEGORY";
export type Finding = { kind: FindingKind; start: number; end: number };
export type PreflightResult =
  | { ok: true; text: string; persons: string[] }
  | { ok: false; findings: Finding[]; persons: string[] };

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const fold = (value: string) => value.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();
const ALIAS = /\[\[K\d+\]\]/g;

const DIRECT: Array<{ kind: FindingKind; pattern: RegExp }> = [
  { kind: "EMAIL", pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { kind: "IBAN", pattern: /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){3,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g },
  { kind: "PHONE", pattern: /(?<![\w.])(?:\+|00)\d{1,3}[\s/-]?(?:\(?\d{2,5}\)?[\s/-]?){1,4}\d{2,}(?!\w|\.\d)|(?<![\w.])0\d{2,5}[\s/-]?\d{3,}(?:[\s/-]?\d{2,})*(?!\w|\.\d)/g },
  { kind: "TAXID", pattern: /\b\d{2}\s?\d{3}\s?\d{3}\s?\d{3}\b|\b\d{2,3}\/\d{3,4}\/\d{4,5}\b/g },
  // Sokak + kapı numarası (DE/TR) ve PLZ + şehir.
  {
    kind: "ADDRESS",
    pattern: /[\p{L}ß.-]*(?:straße|strasse|str\.|weg|allee|platz|gasse|ring|damm|ufer|chaussee|sokak|sokağı|sok\.|cadde|caddesi|cad\.|bulvarı|mahallesi|mah\.)\s+(?:no[:.]?\s*)?\d+[a-z]?\b|\b\d{5}\s+(?!(?:euro|eur|tl|lira|mark|stück|adet|kişi|personen|mitglieder|üye)\b)\p{Lu}\p{Ll}{2,}/giu,
  },
  // Tam tarih + doğum bağlamı; ya da 1900–2019 arası gg.aa.yyyy (doğum tarihi biçimi).
  { kind: "BIRTHDATE", pattern: /(?:geb(?:oren|\.)?|doğum(?:\s+tarihi)?|d\.\s?t\.)\s*(?:am\s*)?:?\s*\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\b\d{1,2}\.\d{1,2}\.(?:19\d{2}|200\d|201\d)\b/giu },
];

const TITLE = /(?<![\p{L}])(?:[Hh]err|[Ff]rau|[Hh]r\.|[Ff]r\.|[Dd]r\.|[Pp]rof\.|[Bb]ay|[Bb]ayan|[Ss]ayın|[Ss]n\.)\s+\p{Lu}[\p{L}'-]+/gu;

/** Yaygın ön adlar (DE/TR); ad + büyük harfli sözcük → olası kişi adı. Bilinçli olarak geniş tutulmaz. */
const FIRST_NAMES = new Set(
  (
    "anna maria emma mia sophie sofia lena lea hannah laura julia lisa sarah katharina christina sabine petra andrea claudia " +
    "monika susanne nicole stefanie anja birgit karin ursula renate ingrid helga gabriele barbara elisabeth martina " +
    "peter thomas michael andreas stefan christian markus martin klaus jürgen wolfgang frank uwe bernd hans werner " +
    "dieter manfred jan tim tobias florian alexander daniel sebastian lukas jonas leon felix paul maximilian david " +
    "mehmet mustafa ahmet ali hüseyin hasan ibrahim ismail osman yusuf murat ömer ramazan halil süleyman abdullah " +
    "mahmut recep emre burak can cem deniz kemal serkan fatih hakan kadir orhan selim yasin enes furkan berk " +
    "ayşe fatma emine hatice zeynep elif meryem şerife sultan hülya esra merve büşra derya özlem selin ebru " +
    "gül leyla aylin dilek songül gamze tuğba yasemin nur sevgi hacer havva kübra nazlı"
  ).split(" "),
);
const NAME_PAIR = /(?<![\p{L}])(\p{Lu}[\p{Ll}]+)\s+(\p{Lu}[\p{L}'-]{1,})/gu;

/** Özel nitelikli veri anahtar kökleri (DSGVO Art. 9; TR/DE). Kök eşleşmesi; yanlış alarm kabul edilir. */
const SPECIAL =
  /\b(?:krank|diagnos|therapie|behinder|schwanger|depress|psych|medikament|operation|krebs|diabet|hiv|religi|konfession|muslim|jüdisch|christlich|ethni|herkunft|gewerkschaft|politisch|partei|sexuell|vorstraf|straftat|hasta|teşhis|tanı|tedavi|terapi|engelli|hamile|gebe|depresyon|ilaç|ameliyat|kanser|diyabet|din[iîı]|mezhep|etnik|sendika|siyasi|parti|cinsel|sabıka|suç)\p{L}*/giu;

function collect(text: string, pattern: RegExp, kind: FindingKind, findings: Finding[]) {
  for (const match of text.matchAll(pattern)) findings.push({ kind, start: match.index ?? 0, end: (match.index ?? 0) + match[0].length });
}

/**
 * Metni tarar. `aliasFor(key)` bilinen kişi için konuşmanın takma adını döndürür (ör. "[[K3]]");
 * sunucu tarafı bunu kalıcı referans deposundan üretir. Dönen `persons` takma adı verilen kişi anahtarlarıdır.
 */
export function preflightCloudText(input: string, known: KnownPerson[], aliasFor: (key: string) => string): PreflightResult {
  let text = input.normalize("NFC");
  const persons: string[] = [];

  // 1. Bilinen kişiler → takma ad (uzun adlar önce; ad ve numara aynı kişiye gider).
  const entries: Array<{ value: string; key: string }> = [];
  for (const person of known) {
    const label = person.label.trim().replace(/\s+/g, " ");
    if (label.includes(" ") && label.length >= 5) entries.push({ value: label, key: person.key });
    for (const reference of person.references ?? []) if (reference.trim().length >= 3) entries.push({ value: reference.trim(), key: person.key });
  }
  if (entries.length) {
    const byValue = new Map(entries.map((entry) => [fold(entry.value), entry.key]));
    const alternatives = [...byValue.keys()].sort((a, b) => b.length - a.length).map((value) => escape(value).replace(/ /g, "\\s+"));
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}-])(?:${alternatives.join("|")})(?![\\p{L}\\p{N}])`, "giu");
    text = text.replace(pattern, (match) => {
      const key = byValue.get(fold(match));
      if (!key) return match;
      if (!persons.includes(key)) persons.push(key);
      return aliasFor(key);
    });
  }

  // 2. Kalan metinde bilinmeyen kişisel veri (takma adlar hariç tutulur).
  const scan = text.replace(ALIAS, (alias) => " ".repeat(alias.length));
  const findings: Finding[] = [];
  for (const rule of DIRECT) collect(scan, rule.pattern, rule.kind, findings);
  collect(scan, TITLE, "TITLED_NAME", findings);
  for (const match of scan.matchAll(NAME_PAIR)) {
    if (FIRST_NAMES.has(match[1].toLocaleLowerCase("tr"))) findings.push({ kind: "LIKELY_NAME", start: match.index ?? 0, end: (match.index ?? 0) + match[0].length });
  }

  // 3. Özel nitelikli veri yalnız bir kişiyle birlikte geçtiğinde engellenir (genel konu sorusu serbest).
  const mentionsPerson = persons.length > 0 || findings.some((finding) => finding.kind === "TITLED_NAME" || finding.kind === "LIKELY_NAME");
  if (mentionsPerson) collect(scan, SPECIAL, "SPECIAL_CATEGORY", findings);

  if (findings.length) return { ok: false, findings: findings.sort((a, b) => a.start - b.start), persons };
  return { ok: true, text, persons };
}

/** Kullanıcıya gösterilecek ret sebepleri (tekil türler; metin parçası değil). */
export function findingKinds(findings: Finding[]): FindingKind[] {
  return [...new Set(findings.map((finding) => finding.kind))];
}

/** Metinde özel nitelikli veri (DSGVO Art. 9) anahtar kökü var mı? (evrak maskelemesi için). */
export function hasSpecialCategory(text: string): boolean {
  SPECIAL.lastIndex = 0;
  const found = SPECIAL.test(text);
  SPECIAL.lastIndex = 0;
  return found;
}
