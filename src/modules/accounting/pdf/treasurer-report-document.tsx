import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatPdfMoney } from "@/shared/pdf/format";
import { Letterhead, type LetterheadProfile } from "@/shared/pdf/letterhead";

import type { TreasurerReportResult } from "../services/treasurer-report";
import { ACCOUNTING_STRINGS } from "./strings";

export interface TreasurerReportPdfData {
  organization: LetterheadProfile;
  lang: "de" | "tr";
  report: TreasurerReportResult;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 50,
    paddingHorizontal: 45,
    fontFamily: "NotoSans",
    fontSize: 9,
    lineHeight: 1.4,
  },
  headerBlock: { marginBottom: 12 },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 9, color: "#555555", marginBottom: 12 },
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: 700,
    marginTop: 12,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#111111",
    paddingBottom: 2,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 2.5,
  },
  headRow: {
    fontWeight: 700,
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
    backgroundColor: "#f9f9f9",
    paddingVertical: 3,
  },
  totalRow: {
    fontWeight: 700,
    borderTopWidth: 1,
    borderTopColor: "#111111",
    paddingVertical: 3,
    marginTop: 2,
  },
  summaryBox: {
    marginTop: 10,
    padding: 8,
    backgroundColor: "#f4f6f8",
    borderRadius: 3,
  },
  summaryText: { fontSize: 8.5, marginBottom: 3, color: "#222222" },
  recommendationBox: {
    marginTop: 6,
    padding: 6,
    backgroundColor: "#eef5f0",
    borderLeftWidth: 2,
    borderLeftColor: "#1b7340",
  },
  recommendationText: { fontSize: 8.5, fontWeight: 700, color: "#1b7340" },
  kpiContainer: { flexDirection: "row", gap: 10, marginTop: 8, marginBottom: 10 },
  kpiCard: {
    flex: 1,
    padding: 6,
    backgroundColor: "#ffffff",
    borderWidth: 0.5,
    borderColor: "#cccccc",
    borderRadius: 3,
  },
  kpiLabel: { fontSize: 7.5, color: "#666666", marginBottom: 2 },
  kpiValue: { fontSize: 11, fontWeight: 700 },
  footerSign: { flexDirection: "row", gap: 30, marginTop: 30 },
  signLine: {
    flex: 1,
    borderTopWidth: 0.7,
    borderTopColor: "#111111",
    paddingTop: 3,
    fontSize: 8,
    color: "#555555",
  },
});

export function TreasurerReportDocument({ data }: { data: TreasurerReportPdfData }) {
  const { organization, lang, report } = data;
  const money = (cents: number) => formatPdfMoney(cents, lang);
  const t = ACCOUNTING_STRINGS[lang].treasurerReport;
  const sphereLabels = t.sphereLabelsNumbered;

  const isSurplus = report.totals.netAnnualSurplusCents >= 0;
  const ideellNetCents = report.spheres.find((s) => s.sphere === "IDEELL")?.netCents ?? 0;

  const summaryLines: string[] = [
    isSurplus
      ? t.summaryIncomeSurplus(
          report.year,
          money(report.totals.totalIncomeCents),
          money(report.totals.totalExpenseCents),
          money(report.totals.netAnnualSurplusCents),
        )
      : t.summaryIncomeDeficit(
          report.year,
          money(report.totals.totalIncomeCents),
          money(report.totals.totalExpenseCents),
          money(Math.abs(report.totals.netAnnualSurplusCents)),
        ),
    t.summaryIdeell(money(ideellNetCents)),
    report.projects.length > 0
      ? t.summaryProjects(report.projects.length, money(report.reserves.earmarkedFundsCents))
      : t.summaryNoProjects,
    t.summaryReserves(money(report.reserves.closingReservesCents), money(report.reserves.freeReservesCents)),
  ];

  if (report.reserves.totalRecordedReservesCents > 0) {
    summaryLines.push(t.summaryRecordedReserves(money(report.reserves.totalRecordedReservesCents)));
  }

  const recommendation = t.recommendation(report.year);
  const docTitle = t.title(report.year);

  return (
    <Document title={docTitle} author={organization.name} language={lang}>
      <Page size="A4" style={styles.page}>
        <Letterhead profile={organization} />

        <View style={styles.headerBlock}>
          <Text style={styles.title}>{docTitle}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>
        </View>

        {/* KPI Özeti */}
        <View style={styles.kpiContainer}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>{t.colIncome}</Text>
            <Text style={styles.kpiValue}>{money(report.totals.totalIncomeCents)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>{t.colExpense}</Text>
            <Text style={styles.kpiValue}>{money(report.totals.totalExpenseCents)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>{t.netAnnualSurplus}</Text>
            <Text
              style={[
                styles.kpiValue,
                { color: report.totals.netAnnualSurplusCents >= 0 ? "#1b7340" : "#b3261e" },
              ]}
            >
              {money(report.totals.netAnnualSurplusCents)}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>{t.closingReserves}</Text>
            <Text style={styles.kpiValue}>{money(report.reserves.closingReservesCents)}</Text>
          </View>
        </View>

        {/* Alanlar Tablosu */}
        <Text style={styles.sectionTitle}>{t.spheresSection}</Text>
        <View style={[styles.row, styles.headRow]}>
          <Text style={{ width: 175, paddingHorizontal: 2 }}>{t.colSphere}</Text>
          <Text style={{ width: 75, textAlign: "right", paddingHorizontal: 2 }}>{t.colIncome}</Text>
          <Text style={{ width: 75, textAlign: "right", paddingHorizontal: 2 }}>{t.colExpense}</Text>
          <Text style={{ width: 75, textAlign: "right", paddingHorizontal: 2 }}>{t.colNet}</Text>
          <Text style={{ width: 55, textAlign: "right", paddingHorizontal: 2 }}>{t.colChange}</Text>
        </View>
        {report.spheres.map((s) => (
          <View key={s.sphere} style={styles.row}>
            <Text style={{ width: 175, paddingHorizontal: 2 }}>{sphereLabels[s.sphere]}</Text>
            <Text style={{ width: 75, textAlign: "right", paddingHorizontal: 2 }}>{money(s.incomeCents)}</Text>
            <Text style={{ width: 75, textAlign: "right", paddingHorizontal: 2 }}>{money(s.expenseCents)}</Text>
            <Text style={{ width: 75, textAlign: "right", paddingHorizontal: 2 }}>{money(s.netCents)}</Text>
            <Text style={{ width: 55, textAlign: "right", paddingHorizontal: 2 }}>
              {s.yearOnYearChangePercent !== null
                ? `${s.yearOnYearChangePercent > 0 ? "+" : ""}${s.yearOnYearChangePercent} %`
                : "-"}
            </Text>
          </View>
        ))}

        {/* Rezerv ve Fon Özeti */}
        <Text style={styles.sectionTitle}>{t.reservesSection}</Text>
        <View style={{ marginTop: 4, marginBottom: 8 }}>
          <View style={styles.row}>
            <Text style={{ width: 260 }}>{t.openingReserves}</Text>
            <Text style={{ width: 120, textAlign: "right" }}>{money(report.reserves.openingReservesCents)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ width: 260 }}>{t.earmarkedFunds}</Text>
            <Text style={{ width: 120, textAlign: "right" }}>{money(report.reserves.earmarkedFundsCents)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ width: 260 }}>{t.freeReserves}</Text>
            <Text style={{ width: 120, textAlign: "right" }}>{money(report.reserves.freeReservesCents)}</Text>
          </View>
          <View style={[styles.row, styles.totalRow]}>
            <Text style={{ width: 260 }}>{t.closingReserves}</Text>
            <Text style={{ width: 120, textAlign: "right" }}>{money(report.reserves.closingReservesCents)}</Text>
          </View>
        </View>

        {/* Projeler Tablosu (Varsa) */}
        {report.projects.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t.projectsSection}</Text>
            <View style={[styles.row, styles.headRow]}>
              <Text style={{ width: 230, paddingHorizontal: 2 }}>{t.colProject}</Text>
              <Text style={{ width: 75, textAlign: "right", paddingHorizontal: 2 }}>{t.colIncome}</Text>
              <Text style={{ width: 75, textAlign: "right", paddingHorizontal: 2 }}>{t.colExpense}</Text>
              <Text style={{ width: 75, textAlign: "right", paddingHorizontal: 2 }}>{t.colNet}</Text>
            </View>
            {report.projects.map((p) => (
              <View key={p.projectId} style={styles.row}>
                <Text style={{ width: 230, paddingHorizontal: 2 }}>{p.projectName || t.unknownProject}</Text>
                <Text style={{ width: 75, textAlign: "right", paddingHorizontal: 2 }}>{money(p.incomeCents)}</Text>
                <Text style={{ width: 75, textAlign: "right", paddingHorizontal: 2 }}>{money(p.expenseCents)}</Text>
                <Text style={{ width: 75, textAlign: "right", paddingHorizontal: 2 }}>{money(p.netCents)}</Text>
              </View>
            ))}
          </>
        )}

        {/* Düz Metin Özet */}
        <View style={styles.summaryBox}>
          <Text style={[styles.summaryText, { fontWeight: 700, marginBottom: 5 }]}>{t.summaryTitle}</Text>
          {summaryLines.map((line, i) => (
            <Text key={i} style={styles.summaryText}>• {line}</Text>
          ))}
          {recommendation ? (
            <View style={styles.recommendationBox}>
              <Text style={styles.recommendationText}>
                {recommendation}
              </Text>
            </View>
          ) : null}
        </View>

        {/* İmza */}
        <View style={styles.footerSign}>
          <Text style={styles.signLine}>{t.placeDate}</Text>
          <Text style={styles.signLine}>{t.treasurerSign}</Text>
          <Text style={styles.signLine}>{t.auditorSign}</Text>
        </View>
      </Page>
    </Document>
  );
}
