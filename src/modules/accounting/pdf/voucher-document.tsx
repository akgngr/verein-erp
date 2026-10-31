import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { amountToGermanWords } from "@/shared/german-number-words";
import { formatPdfDate, formatPdfMoney } from "@/shared/pdf/format";
import { Letterhead, type LetterheadProfile } from "@/shared/pdf/letterhead";

import type { BookingDetail } from "../types";
import type { DocumentStrings } from "./document-strings";

/**
 * Tek fiş belgesi: gelirde Quittung (ödeme alındı makbuzu), giderde Auszahlungsbeleg,
 * virmanda Umbuchungsbeleg. Tutar rakam + Almanca yazıyla; imza satırları türe göre.
 */
export type VoucherPdfData = {
  organization: LetterheadProfile;
  lang: "de" | "tr";
  strings: DocumentStrings;
  booking: BookingDetail;
};

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 56, paddingHorizontal: 50, fontFamily: "NotoSans", fontSize: 10, lineHeight: 1.5, color: "#111111" },
  title: { fontSize: 14, fontWeight: 700, letterSpacing: 1, borderBottomWidth: 1.5, borderBottomColor: "#111111", paddingBottom: 6, marginBottom: 10 },
  intro: { marginBottom: 12 },
  amountBox: { borderWidth: 1, borderColor: "#111111", padding: 10, marginBottom: 14 },
  amount: { fontSize: 16, fontWeight: 700 },
  words: { fontSize: 9, color: "#444444", marginTop: 2 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#cccccc", paddingVertical: 4 },
  label: { width: 150, color: "#555555" },
  value: { flex: 1 },
  reversed: { marginTop: 10, padding: 6, color: "#b91c1c", fontWeight: 700, borderWidth: 1, borderColor: "#b91c1c" },
  signatures: { flexDirection: "row", gap: 30, marginTop: 50 },
  signature: { flex: 1, borderTopWidth: 0.75, borderTopColor: "#111111", paddingTop: 4, fontSize: 8.5, color: "#555555" },
});

export function VoucherDocument({ data }: { data: VoucherPdfData }) {
  const { strings: s, booking, lang } = data;
  const amountCents = Math.abs(booking.amountCents);
  const rows: [string, string | null][] = [
    [s.number, booking.bookingNumber],
    [s.date, formatPdfDate(booking.bookingDate, lang)],
    [booking.type === "INCOME" ? s.payer : booking.type === "EXPENSE" ? s.payee : s.transfer, booking.type === "TRANSFER" ? booking.transferLine : booking.counterparty],
    [s.purpose, booking.description],
    [s.account, booking.type === "TRANSFER" ? null : booking.accountName],
    [s.category, booking.categoryName],
    [s.project, booking.project],
    [s.receiptReference, booking.receiptReference],
  ];
  const signatureLabels =
    booking.type === "INCOME"
      ? [s.signaturePayer, s.signatureTreasurer]
      : booking.type === "EXPENSE"
        ? [s.signatureReceiver, s.signatureTreasurer]
        : [s.signatureTreasurer];

  return (
    <Document title={`${s.voucherTitle[booking.type]} ${booking.bookingNumber}`} author={data.organization.name} language={lang}>
      <Page size="A4" style={styles.page}>
        <Letterhead profile={data.organization} />
        <Text style={styles.title}>{s.voucherTitle[booking.type]}</Text>
        <Text style={styles.intro}>{s.voucherIntro[booking.type]}</Text>
        <View style={styles.amountBox}>
          <Text style={styles.amount}>{formatPdfMoney(amountCents, lang)}</Text>
          <Text style={styles.words}>
            {s.amountInWords}: {amountToGermanWords(amountCents)}
          </Text>
        </View>
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value}</Text>
            </View>
          ))}
        {booking.reversedAt ? <Text style={styles.reversed}>{s.reversed(booking.reverseReason ?? "")}</Text> : null}
        <View style={styles.signatures}>
          <Text style={styles.signature}>{s.placeDate}</Text>
          {signatureLabels.map((label) => (
            <Text key={label} style={styles.signature}>
              {label}
            </Text>
          ))}
        </View>
      </Page>
    </Document>
  );
}
