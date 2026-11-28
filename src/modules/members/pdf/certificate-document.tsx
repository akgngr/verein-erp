import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { MemberStatus } from "@prisma/client";

import { Letterhead, type LetterheadProfile } from "@/shared/pdf/letterhead";

export type CertificatePdfData = {
  organization: LetterheadProfile;
  lang: "de" | "tr";
  membershipNumber: string;
  fullName: string;
  type: string;
  status: MemberStatus;
  joinDateLabel: string;
  exitDateLabel: string | null;
  addressLabel: string | null;
  issuedAtLabel: string;
};

const CERTIFICATE_STRINGS = {
  de: {
    title: "Mitgliedsbescheinigung",
    subtitle: "Amtliche Bestätigung der Vereinsmitgliedschaft",
    introActive:
      "Hiermit wird bestätigt, dass die unten genannte Person ordentliches Mitglied unseres Vereins ist.",
    introInactive:
      "Hiermit wird die Mitgliedschaft der unten genannten Person in unserem Verein gemäß den gespeicherten Vereinsdaten bescheinigt.",
    memberName: "Name",
    membershipNumber: "Mitgliedsnummer",
    typeLabel: "Mitgliedsart",
    statusLabel: "Status",
    joinDate: "Eintrittsdatum",
    exitDate: "Austrittsdatum",
    address: "Anschrift",
    issuedAt: "Ausgestellt am",
    cardTitle: "Mitgliedsausweis",
    cardMemberSince: "Mitglied seit",
    signatureHint: "Dieses Dokument wurde elektronisch erstellt und ist ohne Unterschrift gültig.",
    types: {
      REGULAR: "Ordentliches Mitglied",
      HONORARY: "Ehrenmitglied",
      YOUTH: "Jugendmitglied",
      SUPPORTING: "Fördermitglied",
    } as Record<string, string>,
    statuses: {
      ACTIVE: "Aktiv",
      PASSIVE: "Passiv",
      RESIGNED: "Ausgetreten",
      DECEASED: "Verstorben",
    } as Record<MemberStatus, string>,
  },
  tr: {
    title: "Üyelik Belgesi",
    subtitle: "Resmî Dernek Üyelik Onayı",
    introActive:
      "Aşağıda bilgileri yer alan kişinin derneğimizin kayıtlı üyesi olduğu onaylanır.",
    introInactive:
      "Aşağıda bilgileri yer alan kişinin derneğimizdeki üyelik kaydına ilişkin durum bilgileri aşağıda sunulmuştur.",
    memberName: "Ad Soyad",
    membershipNumber: "Üye Numarası",
    typeLabel: "Üyelik Türü",
    statusLabel: "Durum",
    joinDate: "Katılım Tarihi",
    exitDate: "Ayrılış Tarihi",
    address: "Adres",
    issuedAt: "Düzenlenme Tarihi",
    cardTitle: "Üye Kartı",
    cardMemberSince: "Üyelik Başlangıcı",
    signatureHint: "Bu belge elektronik ortamda düzenlenmiştir; imza gerektirmez.",
    types: {
      REGULAR: "Asil Üye",
      HONORARY: "Onursal Üye",
      YOUTH: "Genç Üye",
      SUPPORTING: "Destekleyici Üye",
    } as Record<string, string>,
    statuses: {
      ACTIVE: "Aktif",
      PASSIVE: "Pasif",
      RESIGNED: "Ayrıldı",
      DECEASED: "Vefat",
    } as Record<MemberStatus, string>,
  },
} as const;

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 44,
    fontFamily: "NotoSans",
    fontSize: 10,
    lineHeight: 1.5,
    color: "#111827",
  },
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    marginTop: 10,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
    color: "#4b5563",
    marginBottom: 14,
  },
  intro: {
    marginBottom: 16,
  },
  table: {
    borderWidth: 0.75,
    borderColor: "#d1d5db",
    borderRadius: 4,
    padding: 12,
    marginBottom: 22,
  },
  row: {
    flexDirection: "row",
    marginBottom: 5,
  },
  label: {
    width: 150,
    fontWeight: 700,
    color: "#374151",
  },
  value: {
    flex: 1,
  },
  note: {
    fontSize: 8.5,
    color: "#6b7280",
    marginBottom: 28,
  },
  cardBox: {
    borderWidth: 1.25,
    borderColor: "#1f2937",
    borderStyle: "dashed",
    borderRadius: 6,
    padding: 14,
    width: 260,
    backgroundColor: "#f9fafb",
  },
  cardOrg: {
    fontSize: 9,
    fontWeight: 700,
    color: "#4b5563",
    marginBottom: 2,
  },
  cardHeader: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8,
    borderBottomWidth: 0.75,
    borderBottomColor: "#d1d5db",
    paddingBottom: 4,
  },
  cardName: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 9,
    color: "#374151",
    marginBottom: 2,
  },
});

export function MembershipCertificateDocument({ data }: { data: CertificatePdfData }) {
  const s = CERTIFICATE_STRINGS[data.lang];
  const isActive = data.status === "ACTIVE" || data.status === "PASSIVE";

  return (
    <Document title={`${s.title} – ${data.membershipNumber}`}>
      <Page size="A4" style={styles.page}>
        <Letterhead profile={data.organization} />
        <View style={styles.hr} />

        <Text style={styles.title}>{s.title}</Text>
        <Text style={styles.subtitle}>{s.subtitle}</Text>
        <Text style={styles.intro}>{isActive ? s.introActive : s.introInactive}</Text>

        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={styles.label}>{s.memberName}:</Text>
            <Text style={styles.value}>{data.fullName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{s.membershipNumber}:</Text>
            <Text style={styles.value}>{data.membershipNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{s.typeLabel}:</Text>
            <Text style={styles.value}>{s.types[data.type] ?? data.type}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{s.statusLabel}:</Text>
            <Text style={styles.value}>{s.statuses[data.status]}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{s.joinDate}:</Text>
            <Text style={styles.value}>{data.joinDateLabel}</Text>
          </View>
          {data.exitDateLabel ? (
            <View style={styles.row}>
              <Text style={styles.label}>{s.exitDate}:</Text>
              <Text style={styles.value}>{data.exitDateLabel}</Text>
            </View>
          ) : null}
          {data.addressLabel ? (
            <View style={styles.row}>
              <Text style={styles.label}>{s.address}:</Text>
              <Text style={styles.value}>{data.addressLabel}</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.label}>{s.issuedAt}:</Text>
            <Text style={styles.value}>{data.issuedAtLabel}</Text>
          </View>
        </View>

        <Text style={styles.note}>{s.signatureHint}</Text>

        <View style={styles.cardBox}>
          <Text style={styles.cardOrg}>{data.organization.name}</Text>
          <Text style={styles.cardHeader}>{s.cardTitle}</Text>
          <Text style={styles.cardName}>{data.fullName}</Text>
          <Text style={styles.cardMeta}>
            {s.membershipNumber}: {data.membershipNumber}
          </Text>
          <Text style={styles.cardMeta}>
            {s.cardMemberSince}: {data.joinDateLabel}
          </Text>
          <Text style={styles.cardMeta}>
            {s.statusLabel}: {s.statuses[data.status]}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
