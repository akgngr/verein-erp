/**
 * Almanya'ya özgü adres sabitleri. Bundesland adları resmî Almanca adlarıyla saklanır (dil bağımsız);
 * ülke ISO 3166-1 alpha-2 kodu veya Almanca adıyla tutulabilir (modüle göre).
 */
export const BUNDESLAENDER = [
  "Baden-Württemberg",
  "Bayern",
  "Berlin",
  "Brandenburg",
  "Bremen",
  "Hamburg",
  "Hessen",
  "Mecklenburg-Vorpommern",
  "Niedersachsen",
  "Nordrhein-Westfalen",
  "Rheinland-Pfalz",
  "Saarland",
  "Sachsen",
  "Sachsen-Anhalt",
  "Schleswig-Holstein",
  "Thüringen",
] as const;

export const DEFAULT_COUNTRY_CODE = "DE";
export const DEFAULT_COUNTRY_NAME = "Deutschland";

/** Seçim listesi: önce DACH ve komşular, sonra sık görülen menşe ülkeleri; diğerleri alfabetik. */
export const COUNTRY_CODES = [
  "DE", "AT", "CH", "NL", "BE", "LU", "FR", "DK", "PL", "CZ",
  "TR", "IT", "ES", "PT", "GR", "HR", "BA", "RS", "XK", "AL", "MK", "BG", "RO", "HU", "SK", "SI",
  "GB", "IE", "SE", "NO", "FI", "UA", "RU", "SY", "IQ", "IR", "AF", "AZ", "MA", "TN", "DZ", "EG",
  "US", "CA",
] as const;

/** Ülke kodunun Almanca adı (kayıtta "name" biçimi için). */
export function countryNameDe(code: string): string {
  try {
    return new Intl.DisplayNames(["de"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Almanca ülke adından koda (bilinmiyorsa null). */
export function countryCodeFromName(name: string | null | undefined): string | null {
  if (!name) return null;
  const value = name.trim().toLocaleLowerCase("de");
  if (/^(deutschland|germany|almanya)$/.test(value)) return "DE";
  return COUNTRY_CODES.find((code) => countryNameDe(code).toLocaleLowerCase("de") === value) ?? null;
}

/** Serbest metin ülke adını listedeki Almanca ada çevirir; bilinmiyorsa olduğu gibi bırakır. */
export function normalizeCountryName(name: string | null | undefined): string {
  if (!name) return "";
  const code = countryCodeFromName(name);
  return code ? countryNameDe(code) : name;
}
