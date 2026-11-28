import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { MeetingType } from "@prisma/client";

import { formatPdfDate } from "@/shared/pdf/format";
import type { PdfLang } from "@/shared/pdf/i18n";
import { Letterhead, type LetterheadProfile } from "@/shared/pdf/letterhead";

import type { InvitationNoticeEvaluation } from "../services/notice-period";
import { registerMinutesFonts } from "./fonts";

export type InvitationPdfData = {
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
  notice: InvitationNoticeEvaluation;
  agendaItems: {
    position: number;
    title: string;
    description: string | null;
  }[];
};

const INVITATION_STRINGS = {
  de: {
    documentTitle: "Einladung & Tagesordnung",
    meetingNumber: "Sitzungs-Nr.",
    type: "Sitzungsart",
    date: "Datum",
    time: "Uhrzeit",
    location: "Ort",
    quorum: "Beschlussfähigkeit",
    quorumValue: "Mindestens {count} anwesende Mitglieder",
    invitationSent: "Einladung versandt am",
    noticeLabel: "Einladungsfrist",
    noticeCompliant: "Satzungsfrist eingehalten ({actual} / mind. {required} Tage)",
    noticeShort: "Frist unterschritten ({actual} / mind. {required} Tage)",
    noticeNotSent: "Versanddatum noch nicht erfasst (mind. {required} Tage erforderlich)",
    notesTitle: "Hinweise",
    agendaTitle: "Tagesordnung",
    noAgenda: "Noch keine Tagesordnungspunkte eingetragen.",
    duration: "{minutes} Min.",
    presenter: "Referent/in: {name}",
    page: "Seite",
    of: "/",
    types: {
      BOARD: "Vorstandssitzung",
      GENERAL_ASSEMBLY: "Mitgliederversammlung",
      COMMITTEE: "Ausschusssitzung",
      OTHER: "Sonstige Sitzung",
    } as Record<MeetingType, string>,
  },
  tr: {
    documentTitle: "Davetiye ve Gündem",
    meetingNumber: "Toplantı No",
    type: "Toplantı Türü",
    date: "Tarih",
    time: "Saat",
    location: "Yer",
    quorum: "Yeter Sayısı",
    quorumValue: "En az {count} katılımcı",
    invitationSent: "Davet Gönderimi",
    noticeLabel: "Davet Süresi",
    noticeCompliant: "Tüzük süresine uygun ({actual} / en az {required} gün)",
    noticeShort: "Davet süresi kısa ({actual} / en az {required} gün)",
    noticeNotSent: "Gönderim tarihi girilmedi (en az {required} gün gerekir)",
    notesTitle: "Açıklama",
    agendaTitle: "Gündem Maddeleri",
    noAgenda: "Henüz gündem maddesi eklenmemiş.",
    duration: "{minutes} dk",
    presenter: "Sunan: {name}",
    page: "Sayfa",
    of: "/",
    types: {
      BOARD: "Yönetim Kurulu Toplantısı",
      GENERAL_ASSEMBLY: "Genel Kurul",
      COMMITTEE: "Komisyon Toplantısı",
      OTHER: "Diğer Toplantı",
    } as Record<MeetingType, string>,
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
  title: { fontSize: 14, fontFamily: "NotoSans", fontWeight: 700, marginTop: 8 },
  subtitle: { fontSize: 11, color: "#333333", marginTop: 2 },
  hr: { borderBottomWidth: 1, borderBottomColor: "#333333", marginTop: 10, marginBottom: 10 },
  infoTable: { marginBottom: 12 },
  infoRow: { flexDirection: "row", marginBottom: 4 },
  infoLabel: { width: 135, fontFamily: "NotoSans", fontWeight: 700 },
  infoValue: { flex: 1 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "NotoSans",
    fontWeight: 700,
    marginTop: 10,
    marginBottom: 6,
  },
  agendaItem: {
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#dddddd",
  },
  agendaTitle: { fontFamily: "NotoSans", fontWeight: 700 },
  agendaMeta: { fontSize: 9, color: "#555555", marginTop: 2 },
  agendaDesc: { marginTop: 3, color: "#222222" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 42,
    right: 42,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#666666",
  },
});

export function InvitationDocument({ data }: { data: InvitationPdfData }) {
  registerMinutesFonts();
  const s = INVITATION_STRINGS[data.lang];
  const timeText = data.startTime
    ? data.endTime
      ? `${data.startTime} – ${data.endTime}`
      : data.startTime
    : "—";

  const noticeText =
    data.notice.status === "compliant"
      ? s.noticeCompliant
          .replace("{actual}", String(data.notice.actualDays ?? 0))
          .replace("{required}", String(data.notice.requiredDays))
      : data.notice.status === "short_notice"
        ? s.noticeShort
            .replace("{actual}", String(data.notice.actualDays ?? 0))
            .replace("{required}", String(data.notice.requiredDays))
        : s.noticeNotSent.replace("{required}", String(data.notice.requiredDays));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Letterhead profile={data.organization} />
        <Text style={styles.title}>{s.documentTitle}</Text>
        <Text style={styles.subtitle}>{data.title}</Text>
        <View style={styles.hr} />

        <View style={styles.infoTable}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{s.meetingNumber}:</Text>
            <Text style={styles.infoValue}>{data.meetingNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{s.type}:</Text>
            <Text style={styles.infoValue}>{s.types[data.type]}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{s.date}:</Text>
            <Text style={styles.infoValue}>{formatPdfDate(data.meetingDate, data.lang)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{s.time}:</Text>
            <Text style={styles.infoValue}>{timeText}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{s.location}:</Text>
            <Text style={styles.infoValue}>{data.location ?? "—"}</Text>
          </View>
          {data.quorumRequired !== null ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{s.quorum}:</Text>
              <Text style={styles.infoValue}>
                {s.quorumValue.replace("{count}", String(data.quorumRequired))}
              </Text>
            </View>
          ) : null}
          {data.invitationSentAt ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{s.invitationSent}:</Text>
              <Text style={styles.infoValue}>
                {formatPdfDate(data.invitationSentAt, data.lang)}
              </Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{s.noticeLabel}:</Text>
            <Text style={styles.infoValue}>{noticeText}</Text>
          </View>
        </View>

        {data.description ? (
          <View>
            <Text style={styles.sectionTitle}>{s.notesTitle}</Text>
            <Text>{data.description}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>{s.agendaTitle}</Text>
        {data.agendaItems.length === 0 ? (
          <Text>{s.noAgenda}</Text>
        ) : (
          data.agendaItems.map((item, idx) => (
            <View key={`${item.position}-${idx}`} style={styles.agendaItem}>
              <Text style={styles.agendaTitle}>
                {idx + 1}. {item.title}
              </Text>
              {item.description ? <Text style={styles.agendaDesc}>{item.description}</Text> : null}
            </View>
          ))
        )}

        <View style={styles.footer} fixed>
          <Text>{data.meetingNumber}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${s.page} ${pageNumber} ${s.of} ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
