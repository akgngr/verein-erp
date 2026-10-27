import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { Letterhead, type LetterheadProfile } from "@/shared/pdf/letterhead";

import type { ReceiptStrings } from "./strings";

/**
 * Aidat makbuzu PDF (Faz 4, 4.3): A4 dikey, Noto Sans, antet + logo. İptal
 * edilmiş ödemede üstte STORNIERT / İPTAL EDİLDİ işareti ve neden satırı;
 * altta § 10b EStG disclaimer'ı (her dil kendi metniyle — KARAR).
 */

export type ReceiptPdfData = {
  organization: LetterheadProfile;
  lang: "de" | "tr";
  strings: ReceiptStrings;
  receiptNumber: string;
  memberName: string;
  memberNumber: string;
  dueYear: number;
  /** "1.234,56 €" — handler formatPdfMoney ile üretir. */
  amountLabel: string;
  paidAtLabel: string;
  methodLabel: string;
  reference: string | null;
  voidedAtLabel: string | null;
  voidReason: string | null;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontFamily: "NotoSans",
    fontWeight: 400,
    fontSize: 10,
    lineHeight: 1.5,
    color: "#111111",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderBottomWidth: 1.5,
    borderBottomColor: "#111111",
    paddingBottom: 8,
    marginBottom: 14,
  },
  headerTitle: { fontSize: 13, fontWeight: 700, letterSpacing: 1 },
  voidedMark: {
    fontSize: 10,
    fontWeight: 700,
    color: "#b91c1c",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#b91c1c",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  receiptNo: { fontSize: 10, color: "#555555", marginBottom: 10 },
  body: { marginTop: 14, marginBottom: 18 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 2 },
  infoRow: { flexDirection: "row", width: "50%", paddingRight: 8, marginBottom: 2 },
  infoLabel: { width: 110, color: "#555555" },
  infoValue: { flex: 1, fontWeight: 700 },
  footerLeft: {
    position: "absolute",
    bottom: 28,
    left: 44,
    fontSize: 8.5,
    color: "#555555",
  },
  disclaimer: {
    position: "absolute",
    bottom: 44,
    left: 44,
    right: 44,
    fontSize: 8.5,
    color: "#555555",
  },
});

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function ReceiptDocument({ data }: { data: ReceiptPdfData }) {
  return (
    <Document
      title={`${data.strings.headerTitle} ${data.receiptNumber}`}
      author={data.organization.name}
      language={data.lang}
    >
      <Page size="A4" style={styles.page}>
        <Letterhead profile={data.organization} />
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{data.strings.headerTitle}</Text>
          {data.voidedAtLabel ? (
            <Text style={styles.voidedMark}>{data.strings.voidedMark}</Text>
          ) : null}
        </View>

        <Text style={styles.receiptNo}>
          {data.strings.labelReceiptNumber}: {data.receiptNumber}
        </Text>

        <Text style={styles.body}>
          {data.strings.bodyLine(data.memberName, data.memberNumber, data.dueYear, data.amountLabel)}
        </Text>

        {data.voidedAtLabel ? (
          <Text style={{ color: "#b91c1c", fontWeight: 700, marginBottom: 14 }}>
            {data.strings.voidedLine(data.voidedAtLabel, data.voidReason ?? data.strings.none)}
          </Text>
        ) : null}

        <View style={styles.infoGrid}>
          <InfoRow label={data.strings.labelPaidAt} value={data.paidAtLabel} />
          <InfoRow label={data.strings.labelMethod} value={data.methodLabel} />
          <InfoRow
            label={data.strings.labelReference}
            value={data.reference ?? data.strings.none}
          />
        </View>

        <Text style={styles.disclaimer}>{data.strings.disclaimer}</Text>
        <Text style={styles.footerLeft}>{data.receiptNumber}</Text>
      </Page>
    </Document>
  );
}
