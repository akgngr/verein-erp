export type FeeExemptionLetterParams = {
  personName: string;
  birthDate?: string;
  address?: string;
  role?: string;
  organizationName?: string;
  organizationCity?: string;
  dateStr?: string;
};

/**
 * § 30a Abs. 1 BZRG i.V.m. § 72a SGB VIII uyarınca genişletilmiş adli sicil belgesi
 * (erweitertes Führungszeugnis) başvuru teyidi ve § 12 JVKostG uyarınca harç muafiyet talep yazısı.
 *
 * Almanya'da kamu yararına çalışan dernekler (Vereine) bünyesindeki eğitmen ve gönüllüler için
 * yetkili makamlara (Bürgeramt / Meldebehörde) ibraz edilmek üzere resmi standart Almanca metin üretir.
 */
export function buildFeeExemptionLetterText(params: FeeExemptionLetterParams): string {
  const org = params.organizationName?.trim() || "Unser Verein e.V.";
  const city = params.organizationCity?.trim() || "Berlin";
  const date = params.dateStr?.trim() || new Intl.DateTimeFormat("de-DE").format(new Date());
  const role = params.role?.trim() || "ehrenamtliche(r) Betreuer(in) / Trainer(in) / Übungsleiter(in)";

  const lines = [
    org,
    `${city}, den ${date}`,
    "",
    "An die zuständige Meldebehörde / das Bürgeramt",
    "",
    "Betreff: Bestätigung zur Beantragung eines erweiterten Führungszeugnisses gemäß § 30a Abs. 1 BZRG",
    "        in Verbindung mit § 72a SGB VIII und Antrag auf Gebührenbefreiung gemäß § 12 JVKostG",
    "",
    "Sehr geehrte Damen und Herren,",
    "",
    "hiermit bestätigen wir, dass",
    "",
    `Frau / Herr: ${params.personName}`,
  ];

  if (params.birthDate?.trim()) {
    lines.push(`Geburtsdatum: ${params.birthDate.trim()}`);
  }
  if (params.address?.trim()) {
    lines.push(`Anschrift: ${params.address.trim()}`);
  }

  lines.push(
    "",
    `in unserer Organisation im Bereich der Kinder- und Jugendhilfe bzw. Kinder- und Jugendarbeit als ${role} ehrenamtlich tätig ist oder eine solche Tätigkeit zeitnah aufnehmen wird.`,
    "",
    "Gemäß § 72a SGB VIII (Tätigkeitsausschluss einschlägig vorbestrafter Personen) sind wir als Träger der freien Jugendhilfe bzw. gemeinnütziger Verein gesetzlich verpflichtet, vor Beginn der Tätigkeit und in regelmäßigen Abständen Einsicht in ein erweitertes Führungszeugnis nach § 30a Abs. 1 Bundeszentralregistergesetz (BZRG) zu nehmen.",
    "",
    "Da die genannte Person diese Tätigkeit ehrenamtlich bzw. unentgeltlich (oder im Rahmen einer steuerfreien Aufwandsentschädigung nach § 3 Nr. 26/26a EStG) ausübt, beantragen wir hiermit gemäß § 12 Abs. 1 Nr. 1 Justizverwaltungskostengesetz (JVKostG) in Verbindung mit dem Merkblatt des Bundesamts für Justiz die GEBÜHRENBEFREIUNG für die Erteilung des erweiterten Führungszeugnisses.",
    "",
    "Wir bitten höflich um gebührenfreie Ausstellung und direkte Aushändigung des erweiterten Führungszeugnisses an die antragstellende Person.",
    "",
    "Mit freundlichen Grüßen,",
    "",
    org,
    "Der Vorstand / Die Jugendleitung",
    "",
    "_____________________________________________________",
    "(Rechtsverbindliche Unterschrift / Vereinsstempel)",
  );

  return lines.join("\n");
}
