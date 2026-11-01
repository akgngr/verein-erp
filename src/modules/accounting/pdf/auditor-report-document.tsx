import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatPdfMoney } from "@/shared/pdf/format";
import { Letterhead, type LetterheadProfile } from "@/shared/pdf/letterhead";

/** ACC-8 Kassenprüfungsbericht: hesap başına açılış/gelir/gider/kapanış + kontroller + imza alanları. */
export type AuditorReportData = {
  organization: LetterheadProfile;
  lang: "de" | "tr";
  year: number;
  accounts: Array<{ name: string; openingCents: number; incomeCents: number; expenseCents: number; transferCents: number; closingCents: number }>;
  checks: Array<{ label: string; ok: boolean; detail: string }>;
  strings: { title: string; intro: string; account: string; opening: string; income: string; expense: string; transfer: string; closing: string; total: string; checks: string; result: string; resultText: string; auditor: string; place: string };
};

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 50, paddingHorizontal: 45, fontFamily: "NotoSans", fontSize: 9.5, lineHeight: 1.45 },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 6 },
  p: { marginBottom: 10 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#cccccc", paddingVertical: 3 },
  head: { fontWeight: 700, borderBottomColor: "#111111", borderBottomWidth: 1 },
  total: { fontWeight: 700, borderTopWidth: 1, borderTopColor: "#111111" },
  h2: { fontSize: 11, fontWeight: 700, marginTop: 14, marginBottom: 4 },
  sign: { flexDirection: "row", gap: 30, marginTop: 40 },
  line: { flex: 1, borderTopWidth: 0.7, borderTopColor: "#111111", paddingTop: 3, fontSize: 8, color: "#444444" },
});

export function AuditorReportDocument({ data }: { data: AuditorReportData }) {
  const s = data.strings;
  const money = (cents: number) => formatPdfMoney(cents, data.lang);
  const cols = [150, 75, 75, 75, 70, 75];
  const cell = (index: number, right = true) => ({ width: cols[index], textAlign: right ? ("right" as const) : ("left" as const), paddingHorizontal: 2 });
  const sum = (key: "openingCents" | "incomeCents" | "expenseCents" | "transferCents" | "closingCents") => data.accounts.reduce((total, account) => total + account[key], 0);
  return (
    <Document title={`${s.title} ${data.year}`} author={data.organization.name} language={data.lang}>
      <Page size="A4" style={styles.page}>
        <Letterhead profile={data.organization} />
        <Text style={styles.title}>{`${s.title} ${data.year}`}</Text>
        <Text style={styles.p}>{s.intro}</Text>
        <View style={[styles.row, styles.head]}>
          <Text style={cell(0, false)}>{s.account}</Text>
          <Text style={cell(1)}>{s.opening}</Text>
          <Text style={cell(2)}>{s.income}</Text>
          <Text style={cell(3)}>{s.expense}</Text>
          <Text style={cell(4)}>{s.transfer}</Text>
          <Text style={cell(5)}>{s.closing}</Text>
        </View>
        {data.accounts.map((account) => (
          <View key={account.name} style={styles.row}>
            <Text style={cell(0, false)}>{account.name}</Text>
            <Text style={cell(1)}>{money(account.openingCents)}</Text>
            <Text style={cell(2)}>{money(account.incomeCents)}</Text>
            <Text style={cell(3)}>{money(account.expenseCents)}</Text>
            <Text style={cell(4)}>{money(account.transferCents)}</Text>
            <Text style={cell(5)}>{money(account.closingCents)}</Text>
          </View>
        ))}
        <View style={[styles.row, styles.total]}>
          <Text style={cell(0, false)}>{s.total}</Text>
          <Text style={cell(1)}>{money(sum("openingCents"))}</Text>
          <Text style={cell(2)}>{money(sum("incomeCents"))}</Text>
          <Text style={cell(3)}>{money(sum("expenseCents"))}</Text>
          <Text style={cell(4)}>{money(sum("transferCents"))}</Text>
          <Text style={cell(5)}>{money(sum("closingCents"))}</Text>
        </View>
        <Text style={styles.h2}>{s.checks}</Text>
        {data.checks.map((check) => (
          <Text key={check.label} style={{ color: check.ok ? "#15803d" : "#b91c1c" }}>{`•  ${check.label}: ${check.detail}`}</Text>
        ))}
        <Text style={styles.h2}>{s.result}</Text>
        <Text style={styles.p}>{s.resultText}</Text>
        <View style={styles.sign}>
          <Text style={styles.line}>{s.place}</Text>
          <Text style={styles.line}>{`${s.auditor} 1`}</Text>
          <Text style={styles.line}>{`${s.auditor} 2`}</Text>
        </View>
      </Page>
    </Document>
  );
}
