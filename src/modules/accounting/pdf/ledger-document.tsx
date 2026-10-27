import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { Letterhead, type LetterheadProfile } from "@/shared/pdf/letterhead";

import type { AccountingStrings } from "./strings";
import type { IncomeExpenseReport, LedgerReport } from "../types";

/**
 * Kasa defteri PDF (§ 11.8 md. 2): dönem başı bakiyesi, kronolojik satırlar
 * (gelir/gider + yürüyen bakiye), dönem sonu; iptaller üstü çizili işaretli,
 * yürüyen bakiyeye etkisiz. Footer: "Seite X von Y".
 */

export type LedgerPdfData = {
  organization: LetterheadProfile;
  lang: "de" | "tr";
  strings: AccountingStrings;
  report: LedgerReport;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontFamily: "NotoSans",
    fontWeight: 400,
    fontSize: 9,
    lineHeight: 1.45,
    color: "#111111",
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 1,
    borderBottomWidth: 1.5,
    borderBottomColor: "#111111",
    paddingBottom: 6,
    marginBottom: 4,
  },
  meta: { fontSize: 9, color: "#555555", marginBottom: 10 },
  table: { borderWidth: 0.75, borderColor: "#999999", marginTop: 4 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#bbbbbb" },
  headerRow: { backgroundColor: "#eeeeee" },
  cell: { padding: 3, fontSize: 8.5 },
  headerCell: { fontWeight: 700, fontSize: 8.5 },
  reversed: { color: "#888888" },
  negative: { color: "#b91c1c", fontWeight: 700 },
  totalRow: { flexDirection: "row", backgroundColor: "#f5f5f5" },
  totalLabel: { fontWeight: 700, fontSize: 9 },
  footerLeft: { position: "absolute", bottom: 28, left: 44, fontSize: 8.5, color: "#555555" },
  footerRight: { position: "absolute", bottom: 28, right: 44, fontSize: 8.5, color: "#555555" },
});

const W = {
  date: 58,
  number: 70,
  description: 200,
  receipt: 66,
  income: 62,
  expense: 62,
  balance: 70,
};

function money(cents: number): string {
  return new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2 }).format(cents / 100);
}

export function LedgerDocument({ data }: { data: LedgerPdfData }) {
  const { strings, report } = data;
  const dateLabel = (date: Date) => {
    const iso = date.toISOString().slice(0, 10);
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
  };

  const incomeTotal = report.rows
    .filter((row) => !row.reversedAt && row.amountCents > 0)
    .reduce((sum, row) => sum + row.amountCents, 0);
  const expenseTotal = report.rows
    .filter((row) => !row.reversedAt && row.amountCents < 0)
    .reduce((sum, row) => sum + Math.abs(row.amountCents), 0);

  return (
    <Document
      title={`${strings.ledgerTitle} ${report.accountName}`}
      author={data.organization.name}
      language={data.lang}
    >
      <Page size="A4" style={styles.page} wrap>
        <Letterhead profile={data.organization} />
        <Text style={styles.title}>{strings.ledgerTitle}</Text>
        <Text style={styles.meta}>
          {report.accountName} — {dateLabel(new Date(`${report.from}T00:00:00Z`))} –{" "}
          {dateLabel(new Date(`${report.to}T00:00:00Z`))}
        </Text>

        <View style={styles.table} wrap>
          <View style={[styles.row, styles.headerRow]} fixed>
            <Text style={[styles.cell, styles.headerCell, { width: W.date }]}>{strings.colDate}</Text>
            <Text style={[styles.cell, styles.headerCell, { width: W.number }]}>{strings.colNumber}</Text>
            <Text style={[styles.cell, styles.headerCell, { width: W.description }]}>{strings.colDescription}</Text>
            <Text style={[styles.cell, styles.headerCell, { width: W.receipt }]}>{strings.colReceipt}</Text>
            <Text style={[styles.cell, styles.headerCell, { width: W.income, textAlign: "right" }]}>{strings.colIncome}</Text>
            <Text style={[styles.cell, styles.headerCell, { width: W.expense, textAlign: "right" }]}>{strings.colExpense}</Text>
            <Text style={[styles.cell, styles.headerCell, { width: W.balance, textAlign: "right" }]}>{strings.colBalance}</Text>
          </View>

          <View style={[styles.row, styles.totalRow]}>
            <Text style={[styles.cell, styles.totalLabel, { width: W.date + W.number + W.description + W.receipt }]}>
              {strings.openingBalance}
            </Text>
            <Text style={[styles.cell, styles.totalLabel, { width: W.income, textAlign: "right" }]} />
            <Text style={[styles.cell, styles.totalLabel, { width: W.expense, textAlign: "right" }]} />
            <Text style={[styles.cell, styles.totalLabel, { width: W.balance, textAlign: "right" }]}>
              {money(report.openingBalanceCents)} €
            </Text>
          </View>

          {report.rows.map((row) => (
            <View key={row.id} style={styles.row} wrap={false}>
              <Text style={[styles.cell, { width: W.date }, row.reversedAt ? styles.reversed : undefined]}>
                {dateLabel(row.bookingDate)}
              </Text>
              <Text style={[styles.cell, { width: W.number }, row.reversedAt ? styles.reversed : undefined]}>
                {row.bookingNumber}
              </Text>
              <Text style={[styles.cell, { width: W.description }, row.reversedAt ? styles.reversed : undefined]}>
                {row.reversedAt ? `${row.description} (${strings.reversedMark})` : row.description}
              </Text>
              <Text style={[styles.cell, { width: W.receipt }, row.reversedAt ? styles.reversed : undefined]}>
                {row.receiptReference ?? strings.none}
              </Text>
              <Text style={[styles.cell, { width: W.income, textAlign: "right" }, row.reversedAt ? styles.reversed : undefined]}>
                {!row.reversedAt && row.amountCents > 0 ? money(row.amountCents) : ""}
              </Text>
              <Text style={[styles.cell, { width: W.expense, textAlign: "right" }, row.reversedAt ? styles.reversed : undefined]}>
                {!row.reversedAt && row.amountCents < 0 ? money(Math.abs(row.amountCents)) : ""}
              </Text>
              <Text
                style={[
                  styles.cell,
                  { width: W.balance, textAlign: "right" },
                  row.runningBalanceCents < 0 ? styles.negative : undefined,
                  row.reversedAt ? styles.reversed : undefined,
                ]}
              >
                {money(row.runningBalanceCents)}
              </Text>
            </View>
          ))}

          <View style={[styles.row, styles.totalRow]}>
            <Text style={[styles.cell, styles.totalLabel, { width: W.date + W.number + W.description + W.receipt }]}>
              {strings.closingBalance}
            </Text>
            <Text style={[styles.cell, styles.totalLabel, { width: W.income, textAlign: "right" }]}>
              {money(incomeTotal)}
            </Text>
            <Text style={[styles.cell, styles.totalLabel, { width: W.expense, textAlign: "right" }]}>
              {money(expenseTotal)}
            </Text>
            <Text style={[styles.cell, styles.totalLabel, { width: W.balance, textAlign: "right" }]}>
              {money(report.closingBalanceCents)} €
            </Text>
          </View>
        </View>

        <Text style={styles.footerLeft} fixed>
          {report.accountName}
        </Text>
        <Text
          style={styles.footerRight}
          fixed
          render={({ pageNumber, totalPages }) => strings.footerPage(pageNumber, totalPages)}
        />
      </Page>
    </Document>
  );
}

/** (Tür denetimi) Kullanılmasa da IncomeExpenseReport buradan taşınır — annual belgesiyle ortak. */
export type _IncomeExpenseRef = IncomeExpenseReport;
