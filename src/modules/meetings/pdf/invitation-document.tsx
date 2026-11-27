import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { MeetingType } from "@prisma/client";

import { formatPdfDate } from "@/shared/pdf/format";
import type { PdfLang } from "@/shared/pdf/i18n";
import { Letterhead, type LetterheadProfile } from "@/shared/pdf/letterhead";

import { registerMinutesFonts } from "./fonts";
import { MINUTES_STRINGS } from "./strings";
import type { NoticePeriodEvaluation } from "../services/notice-period";

export interface InvitationPdfData {
  lang: PdfLang;
  organization: LetterheadProfile;
  meetingNumber: string;
  type: MeetingType;
  title: string;
  meetingDate: Date;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  description: string | null;
  quorumRequired: number | null;
  invitationSentAt: Date | null;
  noticeEvaluation: NoticePeriodEvaluation;
  agendaItems: Array<{
    position: number;
    title: string;
    description: string | null;
  }>;
}

export const INVITATION_PDF_STRINGS = {
  de: {
    filenamePrefix: "einladung",
    heading: "EINLADUNG & TAGESORDNUNG",
    salutation: "Sehr geehrte Mitglieder / Damen und Herren,",
    intro: "hiermit laden wir Sie herzlich zur folgenden Sitzung ein:",
    date: "Datum",
    time: "Uhrzeit",
    location: "Ort",
    meetingType: "Sitzungsart",
    meetingNumber: "Sitzungsnummer",
    quorum: "Beschlussfähigkeit",
    quorumValue: (n: number) => `Mindestens ${n} stimmberechtigte Teilnehmende`,
    invitationDate: "Einladungsdatum",
    noticeLeadTime: "Ladungsfrist",
    noticeCompliant: (actual: number, req: number) =>
      `${actual} Tage vor Sitzungstermin (satzungskonform, mind. ${req} Tage)`,
    noticeShort: (actual: number, req: number) =>
      `Hinweis: ${actual} Tage Vorlauf (Satzungsrichtwert: ${req} Tage)`,
    noticeNotSent: (req: number) =>
      `Noch nicht versandt (Satzungsrichtwert: mind. ${req} Tage vorher)`,
    agendaTitle: "Tagesordnung (TOP)",
    noAgenda: "Für diese Sitzung wurden noch keine Tagesordnungspunkte hinterlegt.",
    closingNote:
      "Anträge zur Ergänzung der Tagesordnung bitten wir fristgerecht schriftlich beim Vorstand einzureichen. Wir freuen uns auf Ihre Teilnahme.",
    regards: "Mit freundlichen Grüßen",
    boardLabel: "Der Vorstand",
    pageFooter: (page: number, total: number) => `Seite ${page} / ${total}`,
  },
  tr: {
    filenamePrefix: "davetiye",
    heading: "TOPLANTI DAVETİYESİ VE GÜNDEM",
    salutation: "Sayın Üyelerimiz / İlgililer,",
    intro: "Aşağıda bilgileri yer alan toplantımıza katılımınızı saygıyla rica ederiz:",
    date: "Tarih",
    time: "Saat",
    location: "Yer",
    meetingType: "Toplantı türü",
    meetingNumber: "Toplantı no",
    quorum: "Toplantı yeter sayısı",
    quorumValue: (n: number) => `En az ${n} oy hakkına sahip katılımcı`,
    invitationDate: "Davet tarihi",
    noticeLeadTime: "Davet süresi",
    noticeCompliant: (actual: number, req: number) =>
      `Toplantıdan ${actual} gün önce (tüzüğe uygun, en az ${req} gün)`,
    noticeShort: (actual: number, req: number) =>
      `Uyarı: ${actual} gün önceden (tüzük ölçütü: ${req} gün)`,
    noticeNotSent: (req: number) =>
      `Henüz gönderilmedi (tüzük ölçütü: en az ${req} gün önce)`,
    agendaTitle: "Gündem Maddeleri",
    noAgenda: "Bu toplantı için henüz gündem maddesi eklenmemiştir.",
    closingNote:
      "Gündem ekleme önerilerinizi süresi içinde yönetim kuruluna yazılı olarak iletebilirsiniz. Katılımınız için teşekkür ederiz.",
    regards: "Saygılarımızla,",
    boardLabel: "Yönetim Kurulu",
    pageFooter: (page: number, total: number) => `Sayfa ${page} / ${total}`,
  },
} as const;

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 42,
    fontSize: 10,
    fontFamily: "NotoSans",
    color: "#111111",
  },
  heading: {
    fontSize: 14,
    fontFamily: "NotoSans",
    fontWeight: 700,
    marginTop: 8,
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "NotoSans",
    fontWeight: 700,
    marginTop: 3,
    color: "#334155",
  },
  hr: { borderBottomWidth: 1, borderBottomColor: "#cbd5e1", marginVertical: 10 },
  salutation: { marginTop: 6, marginBottom: 4 },
  paragraph: { marginBottom: 8, lineHeight: 1.45 },
  infoBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 10,
    marginVertical: 8,
  },
  infoRow: { flexDirection: "row", marginBottom: 4 },
  infoLabel: { width: 130, fontFamily: "NotoSans", fontWeight: 700, color: "#334155" },
  infoValue: { flex: 1, color: "#0f172a" },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "NotoSans",
    fontWeight: 700,
    marginTop: 12,
    marginBottom: 6,
    color: "#0f172a",
  },
  agendaItem: {
    flexDirection: "row",
    marginBottom: 6,
    paddingBottom: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
  },
  agendaPos: { width: 36, fontFamily: "NotoSans", fontWeight: 700, color: "#334155" },
  agendaBody: { flex: 1 },
  agendaTitle: { fontFamily: "NotoSans", fontWeight: 700 },
  agendaDesc: { fontSize: 9, color: "#475569", marginTop: 2, lineHeight: 1.4 },
  closing: { marginTop: 14, lineHeight: 1.45 },
  signatureBlock: { marginTop: 22 },
  footer: {
    position: "absolute",
    left: 42,
    right: 42,
    bottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#64748b",
  },
});

export function InvitationDocument({ data }: { data: InvitationPdfData }) {
  registerMinutesFonts();
  const s = INVITATION_PDF_STRINGS[data.lang];
  const commonStrings = MINUTES_STRINGS[data.lang];

  const timeRange =
    data.startTime && data.endTime
      ? `${data.startTime} – ${data.endTime}`
      : (data.startTime ?? "—");

  const noticeText =
    data.noticeEvaluation.status === "compliant" &&
    data.noticeEvaluation.actualDays !== null
      ? s.noticeCompliant(
          data.noticeEvaluation.actualDays,
          data.noticeEvaluation.requiredDays,
        )
      : data.noticeEvaluation.status === "short_notice" &&
          data.noticeEvaluation.actualDays !== null
        ? s.noticeShort(
            data.noticeEvaluation.actualDays,
            data.noticeEvaluation.requiredDays,
          )
        : s.noticeNotSent(data.noticeEvaluation.requiredDays);

  return (
    <Document title={`${s.heading} ${data.meetingNumber}`}>
      <Page size="A4" style={styles.page}>
        <Letterhead profile={data.organization} />
        <Text style={styles.heading}>{s.heading}</Text>
        <Text style={styles.subtitle}>{data.title}</Text>
        <View style={styles.hr} />

        <Text style={styles.salutation}>{s.salutation}</Text>
        <Text style={styles.paragraph}>{s.intro}</Text>
        {data.description ? (
          <Text style={styles.paragraph}>{data.description}</Text>
        ) : null}

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{s.meetingNumber}:</Text>
            <Text style={styles.infoValue}>{data.meetingNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{s.meetingType}:</Text>
            <Text style={styles.infoValue}>{commonStrings.subtitle(data.type)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{s.date}:</Text>
            <Text style={styles.infoValue}>
              {formatPdfDate(data.meetingDate, data.lang)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{s.time}:</Text>
            <Text style={styles.infoValue}>{timeRange}</Text>
          </View>
          {data.location ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{s.location}:</Text>
              <Text style={styles.infoValue}>{data.location}</Text>
            </View>
          ) : null}
          {data.quorumRequired ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{s.quorum}:</Text>
              <Text style={styles.infoValue}>
                {s.quorumValue(data.quorumRequired)}
              </Text>
            </View>
          ) : null}
          {data.invitationSentAt ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{s.invitationDate}:</Text>
              <Text style={styles.infoValue}>
                {formatPdfDate(data.invitationSentAt, data.lang)}
              </Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{s.noticeLeadTime}:</Text>
            <Text style={styles.infoValue}>{noticeText}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{s.agendaTitle}</Text>
        {data.agendaItems.length === 0 ? (
          <Text style={styles.paragraph}>{s.noAgenda}</Text>
        ) : (
          data.agendaItems.map((item) => (
            <View key={item.position} style={styles.agendaItem} wrap={false}>
              <Text style={styles.agendaPos}>TOP {item.position}</Text>
              <View style={styles.agendaBody}>
                <Text style={styles.agendaTitle}>{item.title}</Text>
                {item.description ? (
                  <Text style={styles.agendaDesc}>{item.description}</Text>
                ) : null}
              </View>
            </View>
          ))
        )}

        <Text style={styles.closing}>{s.closingNote}</Text>
        <View style={styles.signatureBlock}>
          <Text>{s.regards}</Text>
          <Text style={{ marginTop: 4, fontFamily: "NotoSans", fontWeight: 700 }}>
            {s.boardLabel} — {data.organization.name}
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>{data.meetingNumber}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              s.pageFooter(pageNumber, totalPages)
            }
          />
        </View>
      </Page>
    </Document>
  );
}
