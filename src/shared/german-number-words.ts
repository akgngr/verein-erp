/**
 * Almanca tutar-yazısı (Faz 5, § 7): Zuwendungsbestätigung'daki
 * "Betrag der Zuwendung – in Buchstaben –" satırı için.
 * 9.999.999,99 €'ya kadar; bir milyonun altı TEK küçük harfli bileşik kelime,
 * bir milyondan itibaren "eine Million"/"zwei Millionen" + boşluk + kalan.
 *
 * KARAR: "ein" vs "eins" — "eins" yalnızca sayının en sonunda bağımsız 1 iken
 * kullanılır (101 → "einhunderteins"); para birimi önünde ASLA "eins" yoktur
 * (1 → "ein Euro", 1 → "ein Cent"). 16 → "sechzehn", 17 → "siebzehn",
 * 60 → "sechzig", 70 → "siebzig" düzensizlikleri burada sabitlenmiştir.
 */

const UNITS = ["", "ein", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun"] as const;

const TEENS = [
  "zehn",
  "elf",
  "zwölf",
  "dreizehn",
  "vierzehn",
  "fünfzehn",
  "sechzehn", // 16 (sechszehn değil)
  "siebzehn", // 17 (siebenzehn değil)
  "achtzehn",
  "neunzehn",
] as const;

const TENS = [
  "",
  "",
  "zwanzig",
  "dreißig", // 30 (ß)
  "vierzig",
  "fünfzig",
  "sechzig", // 60 (sechszig değil)
  "siebzig", // 70 (siebenzig değil)
  "achtzig",
  "neunzig",
] as const;

/** 1-99: bileşik parça. finalEins=true iken tam 1 → "eins" (hundert/tausend artığı). */
function below100(n: number, finalEins: boolean): string {
  if (n < 10) return n === 1 && finalEins ? "eins" : UNITS[n];
  if (n < 20) return TEENS[n - 10];
  const unit = n % 10;
  const ten = Math.floor(n / 10);
  const unitPart = unit === 0 ? "" : `${UNITS[unit]}und`;
  return unitPart + TENS[ten];
}

/** 1-999: yüz grubu. finalEins=true iken artık tam 1 → "eins" (101 → einhunderteins). */
function below1000(n: number, finalEins: boolean): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const prefix = hundreds > 0 ? `${UNITS[hundreds]}hundert` : "";
  return prefix + (rest === 0 ? "" : below100(rest, finalEins));
}

/**
 * 1-999.999: binlik grubu. KARAR: binlik ön eki "ein" kullanır (eintausend —
 * einstausend değil); yalnızca SON artık tam 1 iken "eins" olur (1001 →
 * eintausendeins, 21000 → einundzwanzigtausend).
 */
function belowMillion(n: number): string {
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  const thousandsPart = thousands > 0 ? `${below1000(thousands, false)}tausend` : "";
  return thousandsPart + (rest === 0 ? "" : below1000(rest, true));
}

/** Tam sayı (1-999.999.999) için sayı yazısı; 0 → "null". */
export function integerToGermanWords(value: number): string {
  if (value === 0) return "null";
  if (value < 0 || !Number.isInteger(value)) {
    throw new Error("Negatif veya ondalıklı değer desteklenmez.");
  }
  const millions = Math.floor(value / 1_000_000);
  const rest = value % 1_000_000;
  if (millions === 0) return belowMillion(value); // 1..999.999 (1 bağımsız → "eins"; para birimi katmanı "ein"e çevirir)

  // KARAR: Milyon sayısı 1 iken dişil "eine Million"; 2+ → "<sayı> Millionen".
  const millionPart = millions === 1 ? "eine Million" : `${belowMillion(millions)} Millionen`;
  return rest === 0 ? millionPart : `${millionPart} ${belowMillion(rest)}`;
}

/**
 * amountToGermanWords(cents): "ein Euro und zwanzig Cent" biçimi.
 * Kurallar: euro kısmı her zaman "… Euro"; cent > 0 iken " und … Cent" eklenir;
 * euro/cent tam 1 iken "ein" (asla "eins").
 */
export function amountToGermanWords(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error("Tutar cent olarak pozitif tam sayı olmalıdır.");
  }
  const euros = Math.floor(cents / 100);
  const centPart = cents % 100;

  // KARAR: "eins" para birimi önünde kullanılmaz — tam 1 → "ein".
  const euroWords = euros === 1 ? "ein" : integerToGermanWords(euros);
  let result = `${euroWords} Euro`;
  if (centPart > 0) {
    const centWords = centPart === 1 ? "ein" : integerToGermanWords(centPart);
    result += ` und ${centWords} Cent`;
  }
  return result;
}
