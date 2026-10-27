import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { Letterhead, type LetterheadProfile } from "@/shared/pdf/letterhead";

import type { AccountingStrings } from "./strings";

/**
 * Yıllık Kasa Raporu (Kassenbericht) PDF (§ 11.8 md. 4): antet; başlık
 * "KASSENBERICHT <year>"; hesap başı/sonu bakiyeleri; EÜR (plan/gerçekleşen);
 * proje özeti; belgesiz fiş notu; ekonomik işletme uyarısı; imza blokları.
 */

export type AnnualReportPdfData = {
  organization: LetterheadProfile;
  lang: "de" | "tr";
  strings: AccountingStrings;
  year: number;
  accountBalances: Array<{
    accountId: string;
    name: string;
    openingCents: number;
    closingCents: number;
  }>;
  incomeExpense: {
    rows: Array<{
      sphere: "IDEELL" | "ASSET_MANAGEMENT" | "PURPOSE_OPERATION" | "ECONOMIC_OPERATION";
      categoryName: string;
      direction: "INCOME" | "EXPENSE";
      planCents: number;
      actualCents: number;
      previousYearCents: number;
    }>;
    economicOperationIncomeCents: number;
    economicOperationNotice: "none" | "warning" | "exceeded";
  };
  projectRows: Array<{
    projectId: string;
    projectName: string;
    incomeCents: number;
    expenseCents: number;
    balanceCents: number;
  }>;
  missingReceiptCount: number;
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
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 10.5, fontWeight: 700, marginTop: 12, marginBottom: 5 },
  table: { borderWidth: 0.75, borderColor: "#999999" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#bbbbbb" },
  headerRow: { backgroundColor: "#eeeeee" },
  cell: { padding: 3, fontSize: 8.5 },
  headerCell: { fontWeight: 700, fontSize: 8.5 },
  subtotalRow: { backgroundColor: "#f5f5f5" },
  subtotalLabel: { fontWeight: 700 },
  warning: { marginTop: 8, fontSize: 8.5, color: "#92400e", fontWeight: 700 },
  exceeded: { marginTop: 8, fontSize: 8.5, color: "#b91c1c", fontWeight: 700 },
  note: { marginTop: 8, fontSize: 8.5, color: "#555555" },
  signatureBlock: { marginTop: 30, flexDirection: "row", gap: 30 },
  signatureCell: { flex: 1 },
  signatureLine: { borderTopWidth: 0.75, borderTopColor: "#111111", marginTop: 30, marginBottom: 4 },
  signatureLabel: { fontSize: 8.5, color: "#555555" },
  footerLeft: { position: "absolute", bottom: 28, left: 44, fontSize: 8.5, color: "#555555" },
  footerRight: { position: "absolute", bottom: 28, right: 44, fontSize: 8.5, color: "#555555" },
});

function money(cents: number): string {
  return new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2 }).format(cents / 100);
}

export function AnnualReportDocument({ data }: { data: AnnualReportPdfData }) {
  const { strings } = data;

  const incomeTotal = data.incomeExpense.rows
    .filter((row) => row.direction === "INCOME")
    .reduce((sum, row) => sum + row.actualCents, 0);
  const expenseTotal = data.incomeExpense.rows
    .filter((row) => row.direction === "EXPENSE")
    .reduce((sum, row) => sum + row.actualCents, 0);

  const sphereRows = (sphere: string, direction: "INCOME" | "EXPENSE") =>
    data.incomeExpense.rows.filter(
      (row) => row.sphere === sphere && row.direction === direction,
    );

  const spheres = [
    "IDEELL",
    "ASSET_MANAGEMENT",
    "PURPOSE_OPERATION",
    "ECONOMIC_OPERATION",
  ] as const;

  return (
    <Document
      title={`${strings.annualTitle(data.year)} ${data.organization.name}`}
      author={data.organization.name}
      language={data.lang}
    >
      <Page size="A4" style={styles.page} wrap>
        <Letterhead profile={data.organization} />
        <Text style={styles.title}>{strings.annualTitle(data.year)}</Text>

        {/* 1) Hesap bakiyeleri */}
        <Text style={styles.sectionTitle}>{strings.sectionBalances}</Text>
        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.headerCell, { flex: 1 }]}>{strings.colAccount}</Text>
            <Text style={[styles.cell, styles.headerCell, { width: 90, textAlign: "right" }]}>{strings.colOpening}</Text>
            <Text style={[styles.cell, styles.headerCell, { width: 90, textAlign: "right" }]}>{strings.colClosing}</Text>
          </View>
          {data.accountBalances.map((account) => (
            <View key={account.accountId} style={styles.row} wrap={false}>
              <Text style={[styles.cell, { flex: 1 }]}>{account.name}</Text>
              <Text style={[styles.cell, { width: 90, textAlign: "right" }]}>{money(account.openingCents)} €</Text>
              <Text style={[styles.cell, { width: 90, textAlign: "right" }]}>{money(account.closingCents)} €</Text>
            </View>
          ))}
        </View>

        {/* 2) EÜR */}
        <Text style={styles.sectionTitle}>{strings.sectionIncomeExpense}</Text>
        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]} fixed>
            <Text style={[styles.cell, styles.headerCell, { flex: 1 }]}>
              {strings.colDescription}
            </Text>
            <Text style={[styles.cell, styles.headerCell, { width: 72, textAlign: "right" }]}>{strings.colPlan}</Text>
            <Text style={[styles.cell, styles.headerCell, { width: 78, textAlign: "right" }]}>{strings.colActual}</Text>
            <Text style={[styles.cell, styles.headerCell, { width: 78, textAlign: "right" }]}>{strings.colPreviousYear}</Text>
          </View>
          {spheres.map((sphere) =>
            (["INCOME", "EXPENSE"] as const).map((direction) => {
              const rows = sphereRows(sphere, direction);
              if (rows.length === 0) return null;
              const subtotal = rows.reduce((sum, row) => sum + row.actualCents, 0);
              return (
                <View key={`${sphere}-${direction}`}>
                  <View style={[styles.row, styles.subtotalRow]}>
                    <Text style={[styles.cell, styles.subtotalLabel, { flex: 1 }]}>
                      {strings.sphereLabels[sphere]} — {direction === "INCOME" ? strings.incomeTotal : strings.expenseTotal}
                    </Text>
                    <Text style={[styles.cell, { width: 72, textAlign: "right" }]} />
                    <Text style={[styles.cell, styles.subtotalLabel, { width: 78, textAlign: "right" }]}>
                      {money(subtotal)} €
                    </Text>
                    <Text style={[styles.cell, { width: 78, textAlign: "right" }]} />
                  </View>
                  {rows.map((row) => (
                    <View key={`${row.categoryName}-${direction}`} style={styles.row} wrap={false}>
                      <Text style={[styles.cell, { flex: 1 }]}>
                        {"  "}
                        {row.categoryName}
                      </Text>
                      <Text style={[styles.cell, { width: 72, textAlign: "right" }]}>
                        {row.planCents > 0 ? money(row.planCents) : strings.none}
                      </Text>
                      <Text style={[styles.cell, { width: 78, textAlign: "right" }]}>{money(row.actualCents)}</Text>
                      <Text style={[styles.cell, { width: 78, textAlign: "right" }]}>
                        {row.previousYearCents > 0 ? money(row.previousYearCents) : strings.none}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            }),
          )}
        </View>
        <Text style={{ marginTop: 5, fontWeight: 700 }}>
          {strings.surplusLabel}: {money(incomeTotal - expenseTotal)} €
        </Text>

        {data.incomeExpense.economicOperationNotice === "warning" ? (
          <Text style={styles.warning}>{strings.economicWarning80}</Text>
        ) : null}
        {data.incomeExpense.economicOperationNotice === "exceeded" ? (
          <Text style={styles.exceeded}>{strings.economicExceeded}</Text>
        ) : null}

        {/* 3) Projeler */}
        {data.projectRows.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>{strings.sectionProjects}</Text>
            <View style={styles.table}>
              <View style={[styles.row, styles.headerRow]}>
                <Text style={[styles.cell, styles.headerCell, { flex: 1 }]}>{strings.colProject}</Text>
                <Text style={[styles.cell, styles.headerCell, { width: 80, textAlign: "right" }]}>{strings.colProjectIncome}</Text>
                <Text style={[styles.cell, styles.headerCell, { width: 80, textAlign: "right" }]}>{strings.colProjectExpense}</Text>
                <Text style={[styles.cell, styles.headerCell, { width: 80, textAlign: "right" }]}>{strings.colProjectBalance}</Text>
              </View>
              {data.projectRows.map((row) => (
                <View key={row.projectId} style={styles.row} wrap={false}>
                  <Text style={[styles.cell, { flex: 1 }]}>{row.projectName}</Text>
                  <Text style={[styles.cell, { width: 80, textAlign: "right" }]}>{money(row.incomeCents)} €</Text>
                  <Text style={[styles.cell, { width: 80, textAlign: "right" }]}>{money(row.expenseCents)} €</Text>
                  <Text style={[styles.cell, { width: 80, textAlign: "right" }]}>{money(row.balanceCents)} €</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* 4) Belgesiz fiş notu */}
        <Text style={styles.note}>{strings.missingReceiptsNote(data.missingReceiptCount)}</Text>

        {/* 5) İmza blokları (§ 11.8 md. 4) */}
        <View style={styles.signatureBlock}>
          <View style={styles.signatureCell}>
            <Text style={styles.signatureLabel}>{strings.createdByLine}</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{"_______________________"}</Text>
          </View>
          <View style={styles.signatureCell}>
            <Text style={styles.signatureLabel}>{strings.cashAuditLine}</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{"_______________________"}</Text>
          </View>
        </View>

        <Text style={styles.footerLeft} fixed>
          {data.organization.name}
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
