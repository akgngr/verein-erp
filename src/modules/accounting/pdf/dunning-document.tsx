import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatPdfDate, formatPdfMoney } from "@/shared/pdf/format";
import { Letterhead, type LetterheadProfile } from "@/shared/pdf/letterhead";

import type { DocumentStrings } from "./document-strings";

/** ACC-6 ihtar mektubu: açık tutar + ücret + § 288 BGB faizi (+ B2B götürü), yeni ödeme tarihi. */
export type DunningPdfData = {
  organization: LetterheadProfile;
  lang: "de" | "tr";
  strings: DocumentStrings;
  recipientName: string;
  recipientAddress: string | null;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  level: number;
  dunningDate: Date;
  newDueDate: Date;
  openCents: number;
  feeCents: number;
  interestCents: number;
  interestRate: number;
  flatFeeCents: number;
  bankDetails: string | null;
};

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 60, paddingHorizontal: 50, fontFamily: "NotoSans", fontSize: 10, lineHeight: 1.5, color: "#111111" },
  head: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  recipient: { width: 260 },
  date: { textAlign: "right" },
  title: { fontSize: 15, fontWeight: 700, letterSpacing: 1, marginBottom: 10 },
  paragraph: { marginBottom: 10 },
  table: { marginVertical: 8, borderTopWidth: 1, borderTopColor: "#111111" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: "#cccccc" },
  total: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, fontWeight: 700, borderTopWidth: 1, borderTopColor: "#111111" },
});

export function DunningDocument({ data }: { data: DunningPdfData }) {
  const { strings: s, lang } = data;
  const money = (cents: number) => formatPdfMoney(cents, lang);
  const total = data.openCents + data.feeCents + data.interestCents + data.flatFeeCents;
  const title = s.dunningTitles[Math.min(Math.max(data.level, 1), 3) - 1];
  return (
    <Document title={`${title} ${data.invoiceNumber}`} author={data.organization.name} language={lang}>
      <Page size="A4" style={styles.page}>
        <Letterhead profile={data.organization} />
        <View style={styles.head}>
          <View style={styles.recipient}>
            <Text style={{ fontWeight: 700 }}>{data.recipientName}</Text>
            {data.recipientAddress ? <Text>{data.recipientAddress}</Text> : null}
          </View>
          <Text style={styles.date}>{formatPdfDate(data.dunningDate, lang)}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={{ marginBottom: 6 }}>{s.dunningSalutation}</Text>
        <Text style={styles.paragraph}>{s.dunningIntro(data.invoiceNumber, formatPdfDate(data.invoiceDate, lang))}</Text>
        <View style={styles.table}>
          <View style={styles.row}>
            <Text>{`${s.dunningInvoiceOpen} (${s.dueDate} ${formatPdfDate(data.dueDate, lang)})`}</Text>
            <Text>{money(data.openCents)}</Text>
          </View>
          {data.feeCents ? (
            <View style={styles.row}>
              <Text>{s.dunningFee}</Text>
              <Text>{money(data.feeCents)}</Text>
            </View>
          ) : null}
          {data.interestCents ? (
            <View style={styles.row}>
              <Text>{s.dunningInterest(data.interestRate.toFixed(2).replace(".", lang === "de" ? "," : "."), formatPdfDate(data.dueDate, lang))}</Text>
              <Text>{money(data.interestCents)}</Text>
            </View>
          ) : null}
          {data.flatFeeCents ? (
            <View style={styles.row}>
              <Text>{s.dunningFlatFee}</Text>
              <Text>{money(data.flatFeeCents)}</Text>
            </View>
          ) : null}
          <View style={styles.total}>
            <Text>{s.dunningTotal}</Text>
            <Text>{money(total)}</Text>
          </View>
        </View>
        <Text style={styles.paragraph}>{s.dunningPayBy(formatPdfDate(data.newDueDate, lang))}</Text>
        {data.bankDetails ? <Text style={styles.paragraph}>{data.bankDetails}</Text> : null}
        <Text style={{ color: "#444444" }}>{s.dunningAlreadyPaid}</Text>
      </Page>
    </Document>
  );
}
