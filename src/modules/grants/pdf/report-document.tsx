import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { Letterhead, type LetterheadProfile } from "@/shared/pdf/letterhead";

import type { GrantDetail, GrantReport } from "../services/grants";

export type ReportPdfLabels = {
  title: string; funder: string; fileNumber: string; period: string; purpose: string; narrative: string; numbers: string; financing: string; vouchers: string;
  line: string; planned: string; actual: string; diff: string; total: string; date: string; number: string; lineCol: string; description: string; amount: string; receipt: string;
  financingKeys: Record<string, string>; overpaid: string; netNote: string; grossNote: string; deviationHint: string; signature: string; place: string; created: string;
};

const s = StyleSheet.create({
  page: { padding: 36, fontFamily: "NotoSans", fontSize: 9, color: "#111827" },
  h1: { fontSize: 14, fontWeight: 700, marginBottom: 6 },
  h2: { fontSize: 11, fontWeight: 700, marginTop: 14, marginBottom: 5, borderBottomWidth: 0.5, borderBottomColor: "#d1d5db", paddingBottom: 2 },
  row: { flexDirection: "row" },
  label: { width: 170, color: "#4b5563" },
  value: { flex: 1 },
  th: { flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: "#6b7280", paddingBottom: 2, fontWeight: 700 },
  tr: { flexDirection: "row", borderBottomWidth: 0.25, borderBottomColor: "#e5e7eb", paddingVertical: 1.5 },
  total: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#111827", paddingTop: 2, fontWeight: 700 },
  num: { textAlign: "right" },
  small: { fontSize: 7, color: "#6b7280" },
  text: { lineHeight: 1.4 },
  flag: { color: "#b45309" },
});

const cols = { line: { flex: 3 }, money: { flex: 1.2 } };
const vcols = [{ width: 52 }, { width: 62 }, { width: 90 }, { flex: 1 }, { width: 64, paddingRight: 6 }, { width: 34, textAlign: "center" as const }];

/** Verwendungsnachweis: Sachbericht + zahlenmäßiger Nachweis + Belegliste. */
export function GrantReportDocument({ grant, report, organization, labels, money, date }: { grant: GrantDetail; report: GrantReport; organization: LetterheadProfile; labels: ReportPdfLabels; money: (cents: number) => string; date: (value: string) => string }) {
  return (
    <Document title={`${labels.title} – ${grant.name}`}>
      <Page size="A4" style={s.page}>
        <Letterhead profile={organization} />
        <Text style={s.h1}>{labels.title}: {grant.name}</Text>
        <View style={s.row}><Text style={s.label}>{labels.funder}</Text><Text style={s.value}>{grant.funder}</Text></View>
        {grant.fileNumber ? <View style={s.row}><Text style={s.label}>{labels.fileNumber}</Text><Text style={s.value}>{grant.fileNumber}</Text></View> : null}
        <View style={s.row}><Text style={s.label}>{labels.period}</Text><Text style={s.value}>{date(grant.periodStart)} – {date(grant.periodEnd)}</Text></View>
        {grant.purpose ? <View style={s.row}><Text style={s.label}>{labels.purpose}</Text><Text style={s.value}>{grant.purpose}</Text></View> : null}

        <Text style={s.h2}>{labels.narrative}</Text>
        <Text style={s.text}>{grant.reportText || "—"}</Text>

        <Text style={s.h2}>{labels.numbers}</Text>
        <Text style={s.small}>{grant.useNetAmounts ? labels.netNote : labels.grossNote}</Text>
        <View style={s.th}><Text style={cols.line}>{labels.line}</Text><Text style={[cols.money, s.num]}>{labels.planned}</Text><Text style={[cols.money, s.num]}>{labels.actual}</Text><Text style={[cols.money, s.num]}>{labels.diff}</Text></View>
        {report.lines.map((line) => (
          <View key={line.id ?? "other"} style={s.tr} wrap={false}>
            <Text style={cols.line}>{line.label}</Text>
            <Text style={[cols.money, s.num]}>{money(line.plannedCents)}</Text>
            <Text style={[cols.money, s.num]}>{money(line.actualCents)}</Text>
            <Text style={[cols.money, s.num, line.flagged ? s.flag : {}]}>{money(line.diffCents)}{line.diffRatio !== null ? ` (${(line.diffRatio * 100).toFixed(1)} %)` : ""}</Text>
          </View>
        ))}
        <View style={s.total}><Text style={cols.line}>{labels.total}</Text><Text style={[cols.money, s.num]}>{money(report.totals.plannedCents)}</Text><Text style={[cols.money, s.num]}>{money(report.totals.actualCents)}</Text><Text style={[cols.money, s.num]}>{money(report.totals.actualCents - report.totals.plannedCents)}</Text></View>
        <Text style={s.small}>{labels.deviationHint}</Text>

        <Text style={s.h2}>{labels.financing}</Text>
        {Object.entries(labels.financingKeys).map(([key, label]) => (
          <View key={key} style={s.row}><Text style={[s.label, { width: 220 }]}>{label}</Text><Text style={s.num}>{money(report.financing[key as keyof GrantReport["financing"]])}</Text></View>
        ))}
        {report.financing.overpaidCents ? <Text style={[s.flag, { marginTop: 4 }]}>{labels.overpaid}</Text> : null}

        <Text style={s.h2}>{labels.vouchers}</Text>
        <View style={s.th}>{[labels.date, labels.number, labels.lineCol, labels.description, labels.amount, labels.receipt].map((head, index) => <Text key={head} style={[vcols[index], index === 4 ? s.num : {}]}>{head}</Text>)}</View>
        {report.vouchers.map((row) => (
          <View key={row.id} style={s.tr} wrap={false}>
            <Text style={vcols[0]}>{date(row.date)}</Text><Text style={vcols[1]}>{row.bookingNumber}</Text><Text style={vcols[2]}>{row.lineLabel}</Text>
            <Text style={vcols[3]}>{row.description}{row.counterparty ? ` · ${row.counterparty}` : ""}{row.receiptReference ? ` (${row.receiptReference})` : ""}</Text>
            <Text style={[vcols[4], s.num]}>{money(row.counted)}</Text><Text style={vcols[5]}>{row.fileCount ? "✓" : "–"}</Text>
          </View>
        ))}

        <View style={{ marginTop: 36, flexDirection: "row", gap: 40 }} wrap={false}>
          <View style={{ flex: 1, borderTopWidth: 0.75, borderTopColor: "#111827", paddingTop: 2 }}><Text>{labels.place}</Text></View>
          <View style={{ flex: 1, borderTopWidth: 0.75, borderTopColor: "#111827", paddingTop: 2 }}><Text>{labels.signature}</Text></View>
        </View>
        <Text style={[s.small, { marginTop: 8 }]} fixed render={({ pageNumber, totalPages }) => `${labels.created} · ${pageNumber}/${totalPages}`} />
      </Page>
    </Document>
  );
}
