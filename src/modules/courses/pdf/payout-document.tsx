import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatPdfDate, formatPdfMoney } from "@/shared/pdf/format";
import type { PdfLang } from "@/shared/pdf/i18n";
import { Letterhead, type LetterheadProfile } from "@/shared/pdf/letterhead";

import type { PayoutLine } from "../services/payout-calc";

type Compensation = "NONE" | "HONORAR" | "UEBUNGSLEITER" | "EHRENAMT";

export type PayoutPdfData = {
  lang: PdfLang;
  organization: LetterheadProfile;
  number: string | null;
  period: string;
  issuedAt: Date;
  compensation: Compensation;
  rateCents: number;
  rateUnit: "HOUR" | "SESSION";
  amountCents: number;
  minutes: number;
  lines: PayoutLine[];
  recipient: {
    name: string;
    businessName: string | null;
    accountHolder: string | null;
    iban: string | null;
    bic: string | null;
    taxNumber: string | null;
    vatId: string | null;
    isSmallBusiness: boolean;
  };
};

const STRINGS: Record<PdfLang, {
  title: string; draft: string; number: string; period: string; date: string; recipient: string; rate: string; perHour: string; perSession: string;
  colDate: string; colCourse: string; colMinutes: string; colAmount: string; total: string; hours: string; payTo: string; noBank: string; taxNumber: string; vatId: string;
  notes: Record<Compensation | "SMALL", string>; footer: string;
}> = {
  de: {
    title: "Honorarabrechnung (Gutschrift)", draft: "ENTWURF", number: "Nr.", period: "Leistungszeitraum", date: "Datum", recipient: "Empfänger", rate: "Vergütungssatz", perHour: "pro Stunde", perSession: "pro Unterrichtseinheit",
    colDate: "Datum", colCourse: "Kurs", colMinutes: "Minuten", colAmount: "Betrag", total: "Gesamtbetrag", hours: "Stunden", payTo: "Überweisung an", noBank: "Keine Bankverbindung hinterlegt — bitte im Profil ergänzen.", taxNumber: "Steuernummer", vatId: "USt-IdNr.",
    notes: {
      NONE: "",
      HONORAR: "Abrechnung im Gutschriftverfahren. Der Empfänger ist für die Versteuerung der Einkünfte selbst verantwortlich.",
      SMALL: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.",
      UEBUNGSLEITER: "Aufwandsentschädigung nach § 3 Nr. 26 EStG (Übungsleiterpauschale), steuer- und sozialversicherungsfrei im Rahmen des Jahresfreibetrags. Bitte teilen Sie uns mit, falls Sie den Freibetrag bereits anderweitig nutzen.",
      EHRENAMT: "Aufwandsentschädigung nach § 3 Nr. 26a EStG (Ehrenamtspauschale), steuer- und sozialversicherungsfrei im Rahmen des Jahresfreibetrags.",
    },
    footer: "Bitte prüfen Sie die Abrechnung. Widerspricht der Empfänger nicht innerhalb von 14 Tagen, gilt die Gutschrift als anerkannt.",
  },
  tr: {
    title: "Ücret hakedişi (Gutschrift)", draft: "TASLAK", number: "No", period: "Hizmet dönemi", date: "Tarih", recipient: "Alıcı", rate: "Ücret", perHour: "saat başı", perSession: "ders başı",
    colDate: "Tarih", colCourse: "Kurs", colMinutes: "Dakika", colAmount: "Tutar", total: "Toplam", hours: "saat", payTo: "Havale bilgisi", noBank: "Banka bilgisi yok — lütfen profilde tamamlayın.", taxNumber: "Vergi numarası", vatId: "KDV kimlik no",
    notes: {
      NONE: "",
      HONORAR: "Gutschrift usulüyle düzenlenmiştir. Gelirin vergilendirilmesinden alıcı sorumludur.",
      SMALL: "§ 19 UStG gereği KDV hesaplanmamıştır.",
      UEBUNGSLEITER: "§ 3 Nr. 26 EStG kapsamında masraf karşılığı (Übungsleiterpauschale); yıllık muafiyet sınırı içinde vergi ve sosyal sigortadan muaftır.",
      EHRENAMT: "§ 3 Nr. 26a EStG kapsamında masraf karşılığı (Ehrenamtspauschale); yıllık muafiyet sınırı içinde vergi ve sosyal sigortadan muaftır.",
    },
    footer: "Lütfen hakedişi kontrol edin. 14 gün içinde itiraz edilmezse kabul edilmiş sayılır.",
  },
};

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "NotoSans", fontSize: 10, color: "#111111" },
  title: { fontSize: 15, fontWeight: 700, marginBottom: 8 },
  draft: { fontSize: 10, color: "#b45309", marginBottom: 6 },
  meta: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  metaItem: { width: "50%", marginBottom: 4 },
  label: { fontSize: 8, color: "#666666" },
  head: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#999999", paddingBottom: 3, marginTop: 8 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#cccccc", paddingVertical: 3 },
  cDate: { width: "18%" },
  cCourse: { width: "52%" },
  cMin: { width: "12%", textAlign: "right" },
  cAmt: { width: "18%", textAlign: "right" },
  total: { flexDirection: "row", justifyContent: "flex-end", marginTop: 6, fontWeight: 700 },
  box: { marginTop: 14, padding: 8, borderWidth: 0.5, borderColor: "#cccccc" },
  note: { marginTop: 10, fontSize: 9, color: "#333333" },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7, color: "#888888" },
});

/** Öğretmen hakedişi (Gutschrift): öğretmenin ödeme profilindeki bilgilerle. */
export function PayoutDocument({ data }: { data: PayoutPdfData }) {
  const s = STRINGS[data.lang];
  const money = (cents: number) => formatPdfMoney(cents, data.lang);
  const r = data.recipient;
  const notes = [data.compensation === "HONORAR" && r.isSmallBusiness ? s.notes.SMALL : null, s.notes[data.compensation] || null].filter(Boolean) as string[];
  return (
    <Document title={`${s.title} ${data.number ?? ""}`} language={data.lang}>
      <Page size="A4" style={styles.page}>
        <Letterhead profile={data.organization} />
        {!data.number ? <Text style={styles.draft}>{s.draft}</Text> : null}
        <Text style={styles.title}>{s.title}</Text>
        <View style={styles.meta}>
          {[
            [s.number, data.number ?? "—"],
            [s.date, formatPdfDate(data.issuedAt, data.lang)],
            [s.recipient, [r.businessName, r.name].filter(Boolean).join(" · ")],
            [s.period, `${data.period.slice(5)}/${data.period.slice(0, 4)}`],
            [s.rate, `${money(data.rateCents)} ${data.rateUnit === "HOUR" ? s.perHour : s.perSession}`],
            ...(r.taxNumber ? [[s.taxNumber, r.taxNumber]] : []),
            ...(r.vatId ? [[s.vatId, r.vatId]] : []),
          ].map(([label, value]) => (
            <View key={label} style={styles.metaItem}>
              <Text style={styles.label}>{label}</Text>
              <Text>{value}</Text>
            </View>
          ))}
        </View>
        <View style={styles.head}>
          <Text style={styles.cDate}>{s.colDate}</Text>
          <Text style={styles.cCourse}>{s.colCourse}</Text>
          <Text style={styles.cMin}>{s.colMinutes}</Text>
          <Text style={styles.cAmt}>{s.colAmount}</Text>
        </View>
        {data.lines.map((line) => (
          <View key={line.sessionId} style={styles.row} wrap={false}>
            <Text style={styles.cDate}>{formatPdfDate(new Date(`${line.date}T00:00:00Z`), data.lang)}</Text>
            <Text style={styles.cCourse}>{`${line.courseCode} · ${line.courseTitle}`}</Text>
            <Text style={styles.cMin}>{line.minutes}</Text>
            <Text style={styles.cAmt}>{money(line.amountCents)}</Text>
          </View>
        ))}
        <View style={styles.total}>
          <Text>{`${s.total} (${(data.minutes / 60).toLocaleString(data.lang === "de" ? "de-DE" : "tr-TR", { maximumFractionDigits: 2 })} ${s.hours}): ${money(data.amountCents)}`}</Text>
        </View>
        <View style={styles.box}>
          <Text style={styles.label}>{s.payTo}</Text>
          {r.iban ? (
            <Text>{`${r.accountHolder || r.businessName || r.name} · IBAN ${r.iban}${r.bic ? ` · BIC ${r.bic}` : ""}`}</Text>
          ) : (
            <Text>{s.noBank}</Text>
          )}
        </View>
        {notes.map((note) => (
          <Text key={note} style={styles.note}>
            {note}
          </Text>
        ))}
        <Text style={styles.footer} fixed>
          {s.footer}
        </Text>
      </Page>
    </Document>
  );
}
