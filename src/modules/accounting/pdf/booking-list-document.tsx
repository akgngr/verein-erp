import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatPdfDate, formatPdfMoney } from "@/shared/pdf/format";
import { Letterhead, type LetterheadProfile } from "@/shared/pdf/letterhead";

import type { BookingListItem } from "../types";
import type { DocumentStrings } from "./document-strings";

/** Filtrelenmiş gelir/gider kayıtlarının listesi (yatay A4); iptal edilenler toplamlara girmez. */
export type BookingListPdfData = {
  organization: LetterheadProfile;
  lang: "de" | "tr";
  strings: DocumentStrings;
  year: string;
  rows: BookingListItem[];
  truncatedAt: number | null;
};

const styles = StyleSheet.create({
  page: { paddingTop: 30, paddingBottom: 48, paddingHorizontal: 36, fontFamily: "NotoSans", fontSize: 8.5, color: "#111111" },
  title: { fontSize: 13, fontWeight: 700, letterSpacing: 1, borderBottomWidth: 1.5, borderBottomColor: "#111111", paddingBottom: 5, marginBottom: 4 },
  meta: { color: "#555555", marginBottom: 8 },
  table: { borderWidth: 0.75, borderColor: "#999999" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#bbbbbb" },
  header: { backgroundColor: "#eeeeee", fontWeight: 700 },
  cell: { paddingHorizontal: 3, paddingVertical: 2 },
  reversed: { color: "#888888", textDecoration: "line-through" },
  total: { backgroundColor: "#f5f5f5", fontWeight: 700 },
  note: { marginTop: 6, color: "#b45309" },
  footer: { position: "absolute", bottom: 22, right: 36, fontSize: 8, color: "#555555" },
});

const W = { date: 52, number: 66, type: 52, description: 250, category: 120, account: 100, income: 64, expense: 64 };

export function BookingListDocument({ data }: { data: BookingListPdfData }) {
  const { strings: s, lang } = data;
  const active = data.rows.filter((row) => !row.reversedAt);
  const income = active.filter((row) => row.type === "INCOME").reduce((sum, row) => sum + Math.abs(row.amountCents), 0);
  const expense = active.filter((row) => row.type === "EXPENSE").reduce((sum, row) => sum + Math.abs(row.amountCents), 0);
  const cell = (width: number, align: "left" | "right" = "left") => [styles.cell, { width, textAlign: align }];

  return (
    <Document title={s.listTitle} author={data.organization.name} language={lang}>
      <Page size="A4" orientation="landscape" style={styles.page} wrap>
        <Letterhead profile={data.organization} />
        <Text style={styles.title}>{s.listTitle}</Text>
        <Text style={styles.meta}>{s.listPeriod(data.year)}</Text>
        <View style={styles.table}>
          <View style={[styles.row, styles.header]} fixed>
            <Text style={cell(W.date)}>{s.colDate}</Text>
            <Text style={cell(W.number)}>{s.colNumber}</Text>
            <Text style={cell(W.type)}>{s.colType}</Text>
            <Text style={cell(W.description)}>{s.colDescription}</Text>
            <Text style={cell(W.category)}>{s.colCategory}</Text>
            <Text style={cell(W.account)}>{s.colAccount}</Text>
            <Text style={cell(W.income, "right")}>{s.colIncome}</Text>
            <Text style={cell(W.expense, "right")}>{s.colExpense}</Text>
          </View>
          {data.rows.map((row) => {
            const amount = formatPdfMoney(Math.abs(row.amountCents), lang);
            return (
              <View key={row.id} style={[styles.row, row.reversedAt ? styles.reversed : {}]} wrap={false}>
                <Text style={cell(W.date)}>{formatPdfDate(row.bookingDate, lang)}</Text>
                <Text style={cell(W.number)}>{row.bookingNumber}</Text>
                <Text style={cell(W.type)}>{s.typeLabels[row.type]}</Text>
                <Text style={cell(W.description)}>
                  {row.description}
                  {row.counterparty ? ` · ${row.counterparty}` : ""}
                </Text>
                <Text style={cell(W.category)}>{row.categoryName ?? s.none}</Text>
                <Text style={cell(W.account)}>{row.transferLine ?? row.accountName}</Text>
                <Text style={cell(W.income, "right")}>{row.type === "INCOME" ? amount : ""}</Text>
                <Text style={cell(W.expense, "right")}>{row.type === "EXPENSE" ? amount : ""}</Text>
              </View>
            );
          })}
          <View style={[styles.row, styles.total]}>
            <Text style={cell(W.date + W.number + W.type + W.description + W.category + W.account)}>{s.totals}</Text>
            <Text style={cell(W.income, "right")}>{formatPdfMoney(income, lang)}</Text>
            <Text style={cell(W.expense, "right")}>{formatPdfMoney(expense, lang)}</Text>
          </View>
          <View style={[styles.row, styles.total]}>
            <Text style={cell(W.date + W.number + W.type + W.description + W.category + W.account)}>{s.balance}</Text>
            <Text style={cell(W.income + W.expense, "right")}>{formatPdfMoney(income - expense, lang)}</Text>
          </View>
        </View>
        {data.truncatedAt ? <Text style={styles.note}>{s.truncated(data.truncatedAt)}</Text> : null}
        <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => s.footerPage(pageNumber, totalPages)} />
      </Page>
    </Document>
  );
}
