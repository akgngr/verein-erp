import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { EInvoiceViewLabels } from "../lib/einvoice-view-labels";
import type { EInvoiceDocument, EInvoiceParty } from "../services/einvoice-document";

const money = (cents: number, currency: string) => (cents / 100).toLocaleString("de-DE", { style: "currency", currency });
const day = (value: string | null) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split("-").reverse().join(".") : (value ?? "—"));
const days = (value: string) => value.replace(/\d{4}-\d{2}-\d{2}/g, (match) => day(match));

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 50, paddingHorizontal: 40, fontFamily: "NotoSans", fontSize: 9, lineHeight: 1.4, color: "#111111" },
  head: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#111111", paddingBottom: 8, marginBottom: 12 },
  small: { fontSize: 7.5, color: "#666666" },
  title: { fontSize: 15, fontWeight: 700 },
  metaRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  parties: { flexDirection: "row", gap: 20, marginBottom: 14 },
  party: { flex: 1 },
  h3: { fontSize: 10, fontWeight: 700, marginBottom: 4, marginTop: 6 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#cccccc", paddingVertical: 3 },
  th: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#111111", paddingVertical: 3, fontWeight: 700 },
  right: { textAlign: "right" },
  totals: { marginLeft: "auto", width: 220, marginTop: 8 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  strong: { fontWeight: 700, borderTopWidth: 1, borderTopColor: "#111111" },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7, color: "#888888" },
});

/** EI-3: gelen e-faturanın PDF görünümü (saklama/denetim); orijinal XML'den üretilir. */
export function EInvoiceViewDocument({ document: doc, labels: l }: { document: EInvoiceDocument; labels: EInvoiceViewLabels }) {
  const cur = doc.currency;
  const meta = ([
    [l.number, doc.number],
    [l.issueDate, day(doc.issueDate)],
    [l.dueDate, doc.dueDate ? day(doc.dueDate) : null],
    [l.servicePeriod, doc.servicePeriod ? days(doc.servicePeriod) : null],
    [l.buyerReference, doc.buyerReference],
    [l.orderReference, doc.orderReference],
    [l.precedingInvoice, doc.precedingInvoice],
  ] as Array<[string, string | null]>).filter(([, value]) => value);
  const totals = ([
    [l.totalLines, doc.totals.lineCents, false],
    [l.totalAllowance, -doc.totals.allowanceCents, false, !doc.totals.allowanceCents],
    [l.totalCharge, doc.totals.chargeCents, false, !doc.totals.chargeCents],
    [l.totalNet, doc.totals.netCents, false],
    [l.totalTax, doc.totals.taxCents, false],
    [l.totalGross, doc.totals.grossCents, true],
    [l.totalPrepaid, -doc.totals.prepaidCents, false, !doc.totals.prepaidCents],
    [l.totalPayable, doc.totals.payableCents, true],
  ] as Array<[string, number, boolean, boolean?]>).filter(([, , , hidden]) => !hidden);
  const payment = ([
    [l.means, l.meansLabel], [l.iban, doc.payment.iban], [l.bic, doc.payment.bic], [l.accountName, doc.payment.accountName],
    [l.reference, doc.payment.reference], [l.mandate, doc.payment.mandateReference], [l.creditorId, doc.payment.creditorId], [l.terms, doc.payment.terms],
  ] as Array<[string, string | null]>).filter(([, value]) => value);
  const col = { pos: { width: "8%" }, item: { width: "40%" }, qty: { width: "14%" }, price: { width: "14%" }, rate: { width: "9%" }, net: { width: "15%" } };
  return (
    <Document title={`${l.documentType} ${doc.number ?? ""}`} author={doc.seller.name ?? ""}>
      <Page size="A4" style={styles.page}>
        <View style={styles.head}>
          <View>
            <Text style={styles.small}>{l.title}</Text>
            <Text style={styles.title}>{l.documentType}</Text>
          </View>
          <View>
            {meta.map(([label, value]) => (
              <View key={label} style={styles.metaRow}>
                <Text style={styles.small}>{label}</Text>
                <Text>{value}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.parties}>
          <PartyBlock title={l.seller} party={doc.seller} labels={l} />
          <PartyBlock title={l.buyer} party={doc.buyer} labels={l} />
        </View>

        <Text style={styles.h3}>{l.lines}</Text>
        <View style={styles.th}>
          <Text style={col.pos}>{l.position}</Text>
          <Text style={col.item}>{l.item}</Text>
          <Text style={[col.qty, styles.right]}>{l.quantity}</Text>
          <Text style={[col.price, styles.right]}>{l.unitPrice}</Text>
          <Text style={[col.rate, styles.right]}>{l.rate}</Text>
          <Text style={[col.net, styles.right]}>{l.net}</Text>
        </View>
        {doc.lines.map((line, index) => (
          <View key={index} style={styles.tr} wrap={false}>
            <Text style={col.pos}>{line.id ?? index + 1}</Text>
            <View style={col.item}>
              <Text>{line.name}</Text>
              {line.description ? <Text style={styles.small}>{line.description}</Text> : null}
            </View>
            <Text style={[col.qty, styles.right]}>{line.quantity ?? "—"} {line.unitCode ?? ""}</Text>
            <Text style={[col.price, styles.right]}>{line.unitPriceCents === null ? "—" : money(line.unitPriceCents, cur)}</Text>
            <Text style={[col.rate, styles.right]}>{line.rate === null ? "—" : `${line.rate} %`}</Text>
            <Text style={[col.net, styles.right]}>{money(line.netCents, cur)}</Text>
          </View>
        ))}

        <View style={styles.totals} wrap={false}>
          {totals.map(([label, value, strong]) => (
            <View key={label} style={strong ? [styles.totalRow, styles.strong] : styles.totalRow}>
              <Text>{label}</Text>
              <Text>{money(value, cur)}</Text>
            </View>
          ))}
        </View>

        <View wrap={false}>
          <Text style={styles.h3}>{l.taxes}</Text>
          {doc.taxes.map((tax, index) => (
            <View key={index} style={styles.tr}>
              <Text style={{ width: "40%" }}>{tax.category ?? "—"}{tax.exemptionReason ? ` · ${l.exemption}: ${tax.exemptionReason}` : ""}</Text>
              <Text style={[{ width: "15%" }, styles.right]}>{tax.rate} %</Text>
              <Text style={[{ width: "22%" }, styles.right]}>{money(tax.netCents, cur)}</Text>
              <Text style={[{ width: "23%" }, styles.right]}>{money(tax.taxCents, cur)}</Text>
            </View>
          ))}
        </View>

        {payment.length ? (
          <View wrap={false}>
            <Text style={styles.h3}>{l.payment}</Text>
            {payment.map(([label, value]) => <Text key={label}>{label}: {value}</Text>)}
          </View>
        ) : null}

        {doc.notes.length ? (
          <View>
            <Text style={styles.h3}>{l.notes}</Text>
            {doc.notes.map((note, index) => <Text key={index}>{note}</Text>)}
          </View>
        ) : null}

        <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `${l.source} · ${pageNumber}/${totalPages}`} />
      </Page>
    </Document>
  );
}

function PartyBlock({ title, party, labels: l }: { title: string; party: EInvoiceParty; labels: EInvoiceViewLabels }) {
  return (
    <View style={styles.party}>
      <Text style={styles.small}>{title}</Text>
      <Text style={{ fontWeight: 700 }}>{party.name ?? "—"}</Text>
      {party.addressLines.map((line) => <Text key={line}>{line}</Text>)}
      {party.countryCode ? <Text>{party.countryCode}</Text> : null}
      {party.vatId ? <Text>{l.vatId}: {party.vatId}</Text> : null}
      {party.taxNumber ? <Text>{l.taxNumber}: {party.taxNumber}</Text> : null}
      {party.contactName || party.phone || party.email ? <Text>{l.contact}: {[party.contactName, party.phone, party.email].filter(Boolean).join(" · ")}</Text> : null}
    </View>
  );
}
