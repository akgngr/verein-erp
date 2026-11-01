import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatPdfDate, formatPdfMoney, formatPdfNumber } from "@/shared/pdf/format";
import { Letterhead, type LetterheadProfile } from "@/shared/pdf/letterhead";

import type { InvoiceDetail, InvoiceSettingsData } from "../queries/invoices";
import { calculateInvoiceTotals } from "../services/invoice-calc";
import type { DocumentStrings } from "./document-strings";

/**
 * Fatura / proforma PDF (§ 14 Abs. 4 UStG zorunlu alanları): düzenleyen ve alıcı adı-adresi,
 * vergi numarası (antet), fatura tarihi, sıra numarası, hizmet tarihi, kalemler, oran başına
 * net + vergi, toplam; vergi yoksa muafiyet notu (ör. § 19 UStG).
 */
export type InvoicePdfData = {
  organization: LetterheadProfile & { email?: string | null; phone?: string | null; website?: string | null };
  lang: "de" | "tr";
  strings: DocumentStrings;
  invoice: InvoiceDetail;
  settings: InvoiceSettingsData;
};

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 70, paddingHorizontal: 50, fontFamily: "NotoSans", fontSize: 9.5, lineHeight: 1.45, color: "#111111" },
  head: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  recipientLabel: { fontSize: 7.5, color: "#666666", marginBottom: 2 },
  recipient: { width: 250 },
  meta: { width: 200 },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  metaLabel: { color: "#555555" },
  title: { fontSize: 15, fontWeight: 700, letterSpacing: 1, marginBottom: 6 },
  subject: { fontWeight: 700, marginBottom: 8 },
  paragraph: { marginBottom: 10 },
  table: { borderTopWidth: 1, borderTopColor: "#111111" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#cccccc", paddingVertical: 3 },
  header: { fontWeight: 700, borderBottomColor: "#111111", borderBottomWidth: 1 },
  totals: { marginTop: 8, marginLeft: "auto", width: 230 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 },
  grand: { fontWeight: 700, fontSize: 11, borderTopWidth: 1, borderTopColor: "#111111", marginTop: 3, paddingTop: 3 },
  note: { marginTop: 14, color: "#333333" },
  stamp: { position: "absolute", top: 300, left: 120, fontSize: 48, color: "#dc2626", opacity: 0.25, transform: "rotate(-25deg)", fontWeight: 700 },
  footer: { position: "absolute", bottom: 24, left: 50, right: 50, borderTopWidth: 0.5, borderTopColor: "#999999", paddingTop: 4, flexDirection: "row", gap: 16, fontSize: 7.5, color: "#555555" },
  footerCol: { flex: 1 },
  page_no: { position: "absolute", bottom: 12, right: 50, fontSize: 7.5, color: "#555555" },
});

const W = { pos: 30, item: 205, qty: 55, price: 70, tax: 40, total: 75 };

export function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  const { strings: s, invoice, lang, settings, organization: org } = data;
  const isProforma = invoice.kind === "PROFORMA";
  const isQuote = invoice.kind === "QUOTE";
  const title = isQuote ? s.quoteTitle : isProforma ? s.proformaTitle : s.invoiceTitle;
  const totals = calculateInvoiceTotals(invoice.lines);
  const number = invoice.number ?? s.draftNumber;
  const cell = (width: number, align: "left" | "right" = "left") => ({ width, textAlign: align, paddingHorizontal: 2 });
  const hasTax = totals.taxCents > 0;

  return (
    <Document title={`${title} ${number}`} author={org.name} language={lang}>
      <Page size="A4" style={styles.page}>
        <Letterhead profile={org} />
        <View style={styles.head}>
          <View style={styles.recipient}>
            <Text style={styles.recipientLabel}>{s.recipient}</Text>
            <Text style={{ fontWeight: 700 }}>{invoice.recipientName}</Text>
            {invoice.recipientAddress ? <Text>{invoice.recipientAddress}</Text> : null}
          </View>
          <View style={styles.meta}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{isQuote ? s.quoteNumber : isProforma ? s.proformaNumber : s.invoiceNumber}</Text>
              <Text>{number}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{s.issueDate}</Text>
              <Text>{formatPdfDate(invoice.issueDate, lang)}</Text>
            </View>
            {invoice.serviceDate ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{s.serviceDate}</Text>
                <Text>{invoice.serviceDate}</Text>
              </View>
            ) : null}
            {invoice.dueDate ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{s.dueDate}</Text>
                <Text>{formatPdfDate(invoice.dueDate, lang)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <Text style={styles.title}>{title}</Text>
        {invoice.subject ? <Text style={styles.subject}>{invoice.subject}</Text> : null}
        {invoice.introText ? <Text style={styles.paragraph}>{invoice.introText}</Text> : null}

        <View style={styles.table}>
          <View style={[styles.row, styles.header]}>
            <Text style={cell(W.pos)}>{s.colPos}</Text>
            <Text style={cell(W.item)}>{s.colItem}</Text>
            <Text style={cell(W.qty, "right")}>{s.colQty}</Text>
            <Text style={cell(W.price, "right")}>{s.colUnitPrice}</Text>
            <Text style={cell(W.tax, "right")}>{s.colTax}</Text>
            <Text style={cell(W.total, "right")}>{s.colTotal}</Text>
          </View>
          {invoice.lines.map((line) => (
            <View key={line.id} style={styles.row} wrap={false}>
              <Text style={cell(W.pos)}>{line.position}</Text>
              <Text style={cell(W.item)}>{line.description}</Text>
              <Text style={cell(W.qty, "right")}>
                {formatPdfNumber(line.quantity, lang)}
                {line.unit ? ` ${line.unit}` : ""}
              </Text>
              <Text style={cell(W.price, "right")}>{formatPdfMoney(line.unitPriceCents, lang)}</Text>
              <Text style={cell(W.tax, "right")}>{line.taxRate} %</Text>
              <Text style={cell(W.total, "right")}>{formatPdfMoney(line.totalCents, lang)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          {hasTax ? (
            <>
              <View style={styles.totalRow}>
                <Text>{s.net}</Text>
                <Text>{formatPdfMoney(totals.netCents, lang)}</Text>
              </View>
              {totals.byRate
                .filter((row) => row.rate > 0)
                .map((row) => (
                  <View key={row.rate} style={styles.totalRow}>
                    <Text>{s.taxLine(String(row.rate))}</Text>
                    <Text>{formatPdfMoney(row.taxCents, lang)}</Text>
                  </View>
                ))}
            </>
          ) : null}
          <View style={[styles.totalRow, styles.grand]}>
            <Text>{s.gross}</Text>
            <Text>{formatPdfMoney(totals.grossCents, lang)}</Text>
          </View>
        </View>

        {invoice.taxNote ? <Text style={styles.note}>{invoice.taxNote}</Text> : null}
        {isProforma ? <Text style={styles.note}>{s.proformaNote}</Text> : null}
        {isQuote ? <Text style={styles.note}>{s.quoteNote}</Text> : null}
        {!isProforma && !isQuote && invoice.dueDate && invoice.number ? (
          <Text style={styles.note}>{s.paymentNote(formatPdfDate(invoice.dueDate, lang), invoice.number)}</Text>
        ) : null}
        {invoice.footerText ? <Text style={styles.note}>{invoice.footerText}</Text> : null}

        {invoice.status === "CANCELLED" ? <Text style={styles.stamp}>{s.cancelledStamp}</Text> : null}

        <View style={styles.footer} fixed>
          <View style={styles.footerCol}>
            <Text>{org.name}</Text>
            {org.taxNumber ? <Text>{`${s.taxNumber}: ${org.taxNumber}`}</Text> : null}
          </View>
          {org.email || org.phone || org.website ? (
            <View style={styles.footerCol}>
              <Text>{s.contact}</Text>
              {[org.email, org.phone, org.website].filter(Boolean).map((value) => (
                <Text key={value as string}>{value}</Text>
              ))}
            </View>
          ) : null}
          {settings.bankDetails ? (
            <View style={styles.footerCol}>
              <Text>{s.bank}</Text>
              <Text>{settings.bankDetails}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.page_no} fixed render={({ pageNumber, totalPages }) => s.footerPage(pageNumber, totalPages)} />
      </Page>
    </Document>
  );
}
