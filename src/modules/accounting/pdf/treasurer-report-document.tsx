import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatPdfMoney } from "@/shared/pdf/format";
import { Letterhead, type LetterheadProfile } from "@/shared/pdf/letterhead";

import type { TreasurerReportResult } from "../services/treasurer-report";

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

const SPHERE_LABELS = {
  tr: {
    IDEELL: "1. İdeel Alan (Aidat & Bağışlar)",
    ASSET_MANAGEMENT: "2. Varlık Yönetimi (Faiz / Kira)",
    PURPOSE_OPERATION: "3. Amaca Bağlı İşletme (Zweckbetrieb)",
    ECONOMIC_OPERATION: "4. Ticari İşletme (Wirtschaftlich)",
  },
  de: {
    IDEELL: "1. Ideeller Bereich (Beiträge & Spenden)",
    ASSET_MANAGEMENT: "2. Vermögensverwaltung",
    PURPOSE_OPERATION: "3. Zweckbetrieb",
    ECONOMIC_OPERATION: "4. Wirtschaftlicher Geschäftsbetrieb",
  },
} as const;

export function TreasurerReportDocument({ data }: { data: TreasurerReportPdfData }) {
  const { organization, lang, report } = data;
  const money = (cents: number) => formatPdfMoney(cents, lang);

  const t = {
    tr: {
      title: `Kassenbericht (Kasa ve Bütçe Raporu) — ${report.year}`,
      subtitle: "Genel Kurul Sunumu için Toplulaştırılmış Finansal Rapor (Kişisel veri içermez)",
      spheres: "Faaliyet Alanlarına Göre Gelir ve Gider Dağılımı (§ 5)",
      sphere: "Faaliyet Alanı",
      income: "Gelir",
      expense: "Gider",
      net: "Net Sonuç",
      prevYear: "Önceki Yıl",
      change: "Yıllık Değişim",
      projects: "Proje Bazlı Fon ve Bütçe Durumu",
      project: "Proje Adı",
      reserves: "Fonlar ve Rezerv Durumu (§ 62 AO)",
      opening: "Dönem Başı Likit Rezerv:",
      closing: "Dönem Sonu Toplam Rezerv:",
      surplus: "Yıllık Net Bakiye:",
      earmarked: "Amaca Bağlı (Zweckgebunden) Proje Fonları:",
      free: "Serbest Rezervler (Freie Rücklagen):",
      summaryTitle: "Dönem Özeti ve Sayman Değerlendirmesi",
      recommendationTitle: "İbra Tavsiyesi",
      treasurerSign: "Sayman (Schatzmeister) İmzası",
      auditorSign: "Kasa Denetçisi (Kassenprüfer) İmzası",
      placeDate: "Tarih ve Yer:",
    },
    de: {
      title: `Kassenbericht für die Mitgliederversammlung — ${report.year}`,
      subtitle: "Aggregierter Finanz- und Tätigkeitsbericht (Ohne personenbezogene Daten)",
      spheres: "Einnahmen und Ausgaben nach steuerlichen Bereichen (§ 5)",
      sphere: "Tätigkeitsbereich",
      income: "Einnahmen",
      expense: "Ausgaben",
      net: "Netto",
      prevYear: "Vorjahr",
      change: "Veränderung",
      projects: "Projektbezogene Mittelverwendung",
      project: "Projekt",
      reserves: "Mittel- und Rücklagenstand (§ 62 AO)",
      opening: "Liquider Anfangsbestand:",
      closing: "Liquider Endbestand:",
      surplus: "Jahresergebnis:",
      earmarked: "Zweckgebundene Rücklagen:",
      free: "Freie Rücklagen:",
      summaryTitle: "Zusammenfassung des Schatzmeisters",
      recommendationTitle: "Entlastungsempfehlung",
      treasurerSign: "Unterschrift Schatzmeister / Vorstand",
      auditorSign: "Unterschrift Kassenprüfer",
      placeDate: "Ort, Datum:",
    },
  }[lang];

  const sphereLabels = SPHERE_LABELS[lang];

  return (
    <Document title={`${t.title}`} author={organization.name} language={lang}>
      <Page size="A4" style={styles.page}>
        <Letterhead profile={organization} />

        <View style={styles.headerBlock}>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>
        </View>

        {/* KPI Özeti */}
        <View style={styles.kpiContainer}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>{t.income}</Text>
            <Text style={styles.kpiValue}>{money(report.totals.totalIncomeCents)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>{t.expense}</Text>
            <Text style={styles.kpiValue}>{money(report.totals.totalExpenseCents)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>{t.surplus}</Text>
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
            <Text style={styles.kpiLabel}>{t.closing}</Text>
            <Text style={styles.kpiValue}>{money(report.reserves.closingReservesCents)}</Text>
          </View>
        </View>

        {/* Alanlar Tablosu */}
        <Text style={styles.sectionTitle}>{t.spheres}</Text>
        <View style={[styles.row, styles.headRow]}>
          <Text style={{ width: 175, paddingHorizontal: 2 }}>{t.sphere}</Text>
          <Text style={{ width: 75, textAlign: "right", paddingHorizontal: 2 }}>{t.income}</Text>
          <Text style={{ width: 75, textAlign: "right", paddingHorizontal: 2 }}>{t.expense}</Text>
          <Text style={{ width: 75, textAlign: "right", paddingHorizontal: 2 }}>{t.net}</Text>
          <Text style={{ width: 55, textAlign: "right", paddingHorizontal: 2 }}>{t.change}</Text>
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
        <Text style={styles.sectionTitle}>{t.reserves}</Text>
        <View style={{ marginTop: 4, marginBottom: 8 }}>
          <View style={styles.row}>
            <Text style={{ width: 260 }}>{t.opening}</Text>
            <Text style={{ width: 120, textAlign: "right" }}>{money(report.reserves.openingReservesCents)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ width: 260 }}>{t.earmarked}</Text>
            <Text style={{ width: 120, textAlign: "right" }}>{money(report.reserves.earmarkedFundsCents)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ width: 260 }}>{t.free}</Text>
            <Text style={{ width: 120, textAlign: "right" }}>{money(report.reserves.freeReservesCents)}</Text>
          </View>
          <View style={[styles.row, styles.totalRow]}>
            <Text style={{ width: 260 }}>{t.closing}</Text>
            <Text style={{ width: 120, textAlign: "right" }}>{money(report.reserves.closingReservesCents)}</Text>
          </View>
        </View>

        {/* Projeler Tablosu (Varsa) */}
        {report.projects.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t.projects}</Text>
            <View style={[styles.row, styles.headRow]}>
              <Text style={{ width: 230, paddingHorizontal: 2 }}>{t.project}</Text>
              <Text style={{ width: 75, textAlign: "right", paddingHorizontal: 2 }}>{t.income}</Text>
              <Text style={{ width: 75, textAlign: "right", paddingHorizontal: 2 }}>{t.expense}</Text>
              <Text style={{ width: 75, textAlign: "right", paddingHorizontal: 2 }}>{t.net}</Text>
            </View>
            {report.projects.map((p) => (
              <View key={p.projectId} style={styles.row}>
                <Text style={{ width: 230, paddingHorizontal: 2 }}>{p.projectName}</Text>
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
          {report.plainSummary[lang].map((line, i) => (
            <Text key={i} style={styles.summaryText}>• {line}</Text>
          ))}
          {report.plainSummary.recommendation ? (
            <View style={styles.recommendationBox}>
              <Text style={styles.recommendationText}>
                {report.plainSummary.recommendation[lang]}
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
