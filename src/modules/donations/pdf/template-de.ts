/**
 * RESMİ ŞABLON METİNLERİ (Faz 5, § 13) — BMF bağlayıcı örnekleri.
 *
 * Source: BMF-Schreiben vom 07.11.2013 (BStBl I S. 1333), amtliche Muster.
 * Must be compared with the official PDF at bundesfinanzministerium.de before use.
 *
 * KARAR: Resmi bildirim PDF'leri YALNIZCA ALMANCA'dır (hukuki şablon Almanca);
 * Türkçe sürüm ve ?lang= seçeneği YOKTUR (§ 1). Her metin değişikliğinde
 * TEMPLATE_VERSION artırılır — eski onay otomatik geçersizleşir (§ 14).
 */

export const TEMPLATE_VERSION = "BMF-2013-11-07/Geld-Mitgliedsbeitrag+Sammel/1";

export type ExemptionDocumentTypeKey =
  | "EXEMPTION_NOTICE"
  | "TAX_ASSESSMENT_ANNEX"
  | "SPECIAL_ASSESSMENT_60A";

/** Başlık (§ 13 md. 2). */
export const TITLE_SINGLE_DONATION = "Bestätigung über Geldzuwendungen";
export const TITLE_SINGLE_FEE = "Bestätigung über Mitgliedsbeitrag";
export const TITLE_COLLECTIVE_DONATION = "Sammelbestätigung über Geldzuwendungen";
export const TITLE_COLLECTIVE_FEE = "Sammelbestätigung über Mitgliedsbeiträge";

/** Başlık altı ortak cümle (§ 13 md. 2). */
export const SUBTITLE_10B =
  "im Sinne des § 10b des Einkommensteuergesetzes an eine der in § 5 Abs. 1 Nr. 9 des Körperschaftsteuergesetzes bezeichneten Körperschaften, Personenvereinigungen oder Vermögensmassen";

/** Bölüm etiketleri (§ 13 md. 1, 3, 4). */
export const LABEL_ISSUER =
  "Aussteller (Bezeichnung und Anschrift der steuerbegünstigten Einrichtung)";
export const LABEL_RECIPIENT = "Name und Anschrift des Zuwendenden";
export const LABEL_AMOUNT_DIGITS = "Betrag der Zuwendung – in Ziffern –";
export const LABEL_AMOUNT_WORDS = "– in Buchstaben –";
export const LABEL_DAY_OF_DONATION = "Tag der Zuwendung";
export const LABEL_TOTAL_DIGITS = "Gesamtsumme der Zuwendung – in Ziffern –";
export const LABEL_PERIOD = "Zeitraum der Sammelbestätigung";
export const LABEL_KIND_SEE_ATTACHMENT = "Art der Zuwendung: siehe Anlage zur Sammelbestätigung";
export const LABEL_DAY_SEE_ATTACHMENT = "Tag der Zuwendung: siehe Anlage zur Sammelbestätigung";

/** Aufwandsspende satırı (§ 13 md. 5) — HER para bildiriminde zorunlu. */
export const LABEL_WAIVER = "Es handelt sich um den Verzicht auf Erstattung von Aufwendungen";
export const WAIVER_YES = "Ja";
export const WAIVER_NO = "Nein";

/** Muafiyet paragrafı (§ 13 md. 6) — belge türüne göre. */
export function exemptionParagraph(args: {
  exemptionDocumentType: "EXEMPTION_NOTICE" | "TAX_ASSESSMENT_ANNEX" | "SPECIAL_ASSESSMENT_60A";
  purposes: string;
  taxOffice: string;
  taxNumber: string;
  noticeDate: string; // dd.MM.yyyy
  period: string | null; // "2022 bis 2024"
}): string {
  if (args.exemptionDocumentType === "SPECIAL_ASSESSMENT_60A") {
    return (
      `Die Einhaltung der satzungsmäßigen Voraussetzungen nach den §§ 51, 59, 60 und 61 AO ` +
      `wurde vom Finanzamt ${args.taxOffice}, StNr. ${args.taxNumber}, mit Bescheid vom ${args.noticeDate} ` +
      `nach § 60a AO gesondert festgestellt. Wir fördern nach unserer Satzung ${args.purposes}.`
    );
  }
  const authority =
    args.exemptionDocumentType === "TAX_ASSESSMENT_ANNEX"
      ? "nach der Anlage zum Körperschaftsteuerbescheid des Finanzamtes"
      : "nach dem Freistellungsbescheid des Finanzamtes";
  return (
    `Wir sind wegen Förderung ${args.purposes} ${authority} ${args.taxOffice}, ` +
    `StNr. ${args.taxNumber}, vom ${args.noticeDate}` +
    (args.period ? ` für den letzten Veranlagungszeitraum ${args.period}` : "") +
    ` nach § 5 Abs. 1 Nr. 9 des Körperschaftsteuergesetzes von der Körperschaftsteuer ` +
    `und nach § 3 Nr. 6 des Gewerbesteuergesetzes von der Gewerbesteuer befreit.`
  );
}

/** Kullanım cümlesi (§ 13 md. 7) — tekil/çoğul. */
export const USAGE_SINGLE = (purposes: string) =>
  `Es wird bestätigt, dass die Zuwendung nur zur Förderung ${purposes} verwendet wird.`;
export const USAGE_COLLECTIVE = (purposes: string) =>
  `Es wird bestätigt, dass die Zuwendungen nur zur Förderung ${purposes} verwendet werden.`;

/** Sammelbestätigung ek cümlesi (§ 13 md. 8). */
export const COLLECTIVE_NO_OTHER_CONFIRMATIONS =
  "Es wird bestätigt, dass über die in der Gesamtsumme enthaltenen Zuwendungen keine weiteren Bestätigungen, weder formelle Zuwendungsbestätigungen noch Beitragsquittungen oder Ähnliches, ausgestellt wurden und werden.";

/** Aidat indirilemez bloğu (§ 13 md. 9) — content=DONATION ve bayrak false iken. */
export const NON_DEDUCTIBLE_HEADING =
  "Nur für steuerbegünstigte Einrichtungen, bei denen die Mitgliedsbeiträge steuerlich nicht abziehbar sind:";
export const NON_DEDUCTIBLE_TEXT =
  "Es wird bestätigt, dass es sich nicht um einen Mitgliedsbeitrag handelt, dessen Abzug nach § 10b Abs. 1 des Einkommensteuergesetzes ausgeschlossen ist.";

/** İmza alanı (§ 13 md. 10) — imza satırı ASLA kaldırılmaz. */
export const LABEL_PLACE_DATE = "(Ort, Datum und Unterschrift des Zuwendungsempfängers)";
export const LABEL_PLACE_DATE_DE = "(Ort, Datum und Unterschrift des Zuwendungsempfängers)";

/** Hinweis bloğu (§ 13 md. 11). */
export const NOTICE_HEADING = "Hinweis:";
export const NOTICE_LIABILITY =
  "Wer vorsätzlich oder grob fahrlässig eine unrichtige Zuwendungsbestätigung erstellt oder veranlasst, dass Zuwendungen nicht zu den in der Zuwendungsbestätigung angegebenen steuerbegünstigten Zwecken verwendet werden, haftet für die entgangene Steuer (§ 10b Abs. 4 EStG, § 9 Abs. 3 KStG, § 9 Nr. 5 GewStG).";
export const NOTICE_VALIDITY =
  "Diese Bestätigung wird nicht als Nachweis für die steuerliche Berücksichtigung der Zuwendung anerkannt, wenn das Datum des Freistellungsbescheides länger als 5 Jahre bzw. das Datum der Feststellung der Einhaltung der satzungsmäßigen Voraussetzungen nach § 60a Abs. 1 AO länger als 3 Jahre seit Ausstellung des Bescheides zurückliegt (§ 63 Abs. 5 AO).";

/** Anlage (Sammelbestätigung eki, § 13 md. 13). */
export const ATTACHMENT_TITLE = (issueDate: string) =>
  `Anlage zur Sammelbestätigung vom ${issueDate}`;
export const ATTACHMENT_COL_POSITION = "Lfd. Nr.";
export const ATTACHMENT_COL_DATE = "Datum der Zuwendung";
export const ATTACHMENT_COL_KIND = "Art der Zuwendung (Geldspende / Mitgliedsbeitrag)";
export const ATTACHMENT_COL_AMOUNT = "Betrag";
export const ATTACHMENT_COL_WAIVER = "Verzicht auf Erstattung von Aufwendungen (Ja/Nein)";
export const ATTACHMENT_TOTAL_ROW = "Gesamtsumme";

/** Önizleme üstü büyük işaret (§ 13: "MUSTER – KEINE GÜLTIGE BESTÄTIGUNG"). */
export const PREVIEW_MARK = "MUSTER – KEINE GÜLTIGE BESTÄTIGUNG";

/** Sammelbestätigung kelimesi (§ 1): "Bestätigung" yerine. */
export const SAMMEL_PREFIX = "Sammel";
