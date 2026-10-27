import { Image, Text, View, StyleSheet } from "@react-pdf/renderer";

/**
 * PDF antet (Faz 4, 4.2): tüm resmi PDF'lerin başlığı. shared/pdf bu modülü
 * import EDEMEZ (katman kuralı); çağıran taraf getOrganizationProfile() sonucunu
 * yapısal nesne olarak geçirir. Yalnızca verisi olan satırlar basılır.
 *
 * Logo (kullanıcı isteği): logoDataUri doluysa metin bloğunun soluna sabit
 * kutuda (84×56 pt) objectFit contain ile çizilir; boşsa düzen değişmez.
 * KARAR: react-pdf Image yalnızca PNG/JPEG destekler — yükleme katmanı zaten
 * yalnızca PNG/JPG kabul eder.
 */

export type LetterheadProfile = {
  name: string;
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  registerCourt?: string | null;
  registerNumber?: string | null;
  taxNumber?: string | null;
  taxOffice?: string | null;
  exemptionNoticeDate?: Date | null;
  exemptionNoticePeriod?: string | null;
  /** Faz 5 (§ 4): muafiyet belgesi türü — antet metni buna göre seçilir. */
  exemptionDocumentType?: "EXEMPTION_NOTICE" | "TAX_ASSESSMENT_ANNEX" | "SPECIAL_ASSESSMENT_60A" | null;
  /** data:image/...;base64 — logo yüklüyse doludur (getOrganizationLogoDataUri). */
  logoDataUri?: string | null;
};

const styles = StyleSheet.create({
  root: { marginBottom: 16 },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  logo: { width: 84, height: 56, objectFit: "contain" },
  textBlock: { flex: 1 },
  name: { fontSize: 14, fontFamily: "NotoSans", fontWeight: 700, marginBottom: 2 },
  line: { fontSize: 9, fontFamily: "NotoSans", color: "#333333", marginBottom: 1 },
  separator: { borderBottomWidth: 1, borderBottomColor: "#999999", marginTop: 6, marginBottom: 14 },
});

/** Veri doluysa "01.12.2024" biçiminde tarih (dd.MM.yyyy — 4.3). */
function formatAntetDate(date: Date): string {
  const iso = date.toISOString().slice(0, 10);
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

export function Letterhead({ profile }: { profile: LetterheadProfile }) {
  const addressLine =
    profile.street || profile.postalCode || profile.city
      ? [profile.street, [profile.postalCode, profile.city].filter(Boolean).join(" ")]
          .filter(Boolean)
          .join(", ")
      : null;

  const registerLine =
    profile.registerCourt || profile.registerNumber
      ? `Vereinsregister: ${[profile.registerCourt ? `AG ${profile.registerCourt}` : null, profile.registerNumber]
          .filter(Boolean)
          .join(", ")}`
      : null;

  const taxLine =
    profile.taxNumber || profile.taxOffice
      ? `Steuernummer: ${profile.taxNumber ?? "–"}${profile.taxOffice ? ` – Finanzamt ${profile.taxOffice}` : ""}`
      : null;

  // Faz 5 (§ 4): belge türüne göre antet metni (yalnızca tarih + Finanzamt doluysa).
  // KARAR: tür girilmemişse eski varsayılan (Freistellungsbescheid) kullanılır —
  // mevcut davranış bozulmaz.
  const exemptionKind =
    profile.exemptionDocumentType === "TAX_ASSESSMENT_ANNEX"
      ? "Anlage zum Körperschaftsteuerbescheid"
      : profile.exemptionDocumentType === "SPECIAL_ASSESSMENT_60A"
        ? "Feststellungsbescheid nach § 60a AO"
        : "Freistellungsbescheid";
  const exemptionLine =
    profile.exemptionNoticeDate && profile.taxOffice
      ? `Gemeinnützigkeit: ${exemptionKind} des Finanzamts ${profile.taxOffice} vom ${formatAntetDate(profile.exemptionNoticeDate)}${
          profile.exemptionNoticePeriod && profile.exemptionDocumentType !== "SPECIAL_ASSESSMENT_60A"
            ? ` (${profile.exemptionNoticePeriod})`
            : ""
        }`
      : null;

  return (
    <View style={styles.root} fixed>
      <View style={styles.topRow}>
        {profile.logoDataUri ? (
          // react-pdf <Image> HTML öğesi değildir; jsx-a11y yanlış pozitif.
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image style={styles.logo} src={profile.logoDataUri} />
        ) : null}
        <View style={styles.textBlock}>
          <Text style={styles.name}>{profile.name}</Text>
          {addressLine ? <Text style={styles.line}>{addressLine}</Text> : null}
          {registerLine ? <Text style={styles.line}>{registerLine}</Text> : null}
          {taxLine ? <Text style={styles.line}>{taxLine}</Text> : null}
          {exemptionLine ? <Text style={styles.line}>{exemptionLine}</Text> : null}
        </View>
      </View>
      <View style={styles.separator} />
    </View>
  );
}
