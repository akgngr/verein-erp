import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import type {
  AttendanceStatus,
  AttendeeRole,
  DecisionResult,
  MeetingStatus,
  MeetingType,
} from "@prisma/client";

import { formatPdfDate } from "@/shared/pdf/format";
import type { PdfLang } from "@/shared/pdf/i18n";
import { Letterhead, type LetterheadProfile } from "@/shared/pdf/letterhead";

import { registerMinutesFonts } from "./fonts";
import { MINUTES_STRINGS, type MinutesStrings } from "./strings";

/**
 * Toplantı tutanağı PDF'i (9. bölüm + Faz 4 §4.3): A4 dikey; Almanca varsayılan,
 * `?lang=tr` ile Türkçe (sözlük: pdf/strings.ts).
 * - Antet: dernek profili (shared/pdf/letterhead) + başlık; onaysız toplantıda taslak damgası.
 * - Bilgi bloğu, katılımcı tablosu, yeter sayısı cümlesi, gündem (+görüşmeler ve
 *   bağlı kararlar), kararlar bölümü, görev tablosu, imza bloğu, onay satırı.
 * - Her sayfanın altbilgisi: toplantı numarası (sol), "Sayfa X / Y" (sağ).
 */

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 42,
    fontSize: 10,
    fontFamily: "NotoSans",
    color: "#111111",
  },
  org: { fontSize: 16, fontFamily: "NotoSans", fontWeight: 700 },
  title: { fontSize: 13, fontFamily: "NotoSans", fontWeight: 700, marginTop: 4 },
  draftBadge: {
    marginTop: 6,
    alignSelf: "flex-start",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#b45309",
    color: "#b45309",
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 10,
    fontFamily: "NotoSans",
    fontWeight: 700,
  },
  hr: { borderBottomWidth: 1, borderBottomColor: "#333333", marginTop: 10 },
  infoTable: { marginTop: 12 },
  infoRow: { flexDirection: "row", marginBottom: 3 },
  infoLabel: { width: 120, fontFamily: "NotoSans", fontWeight: 700 },
  infoValue: { flex: 1 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "NotoSans",
    fontWeight: 700,
    marginTop: 14,
    marginBottom: 6,
  },
  table: { display: "flex", width: "auto" },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#999999" },
  tableHeader: { backgroundColor: "#eeeeee", fontFamily: "NotoSans", fontWeight: 700 },
  cellName: { width: "40%", padding: 4 },
  cellRole: { width: "30%", padding: 4 },
  cellAttendance: { width: "30%", padding: 4 },
  cellAction: { width: "46%", padding: 4 },
  cellAssignee: { width: "18%", padding: 4 },
  cellDue: { width: "18%", padding: 4 },
  cellStatus: { width: "18%", padding: 4 },
  quorum: { marginTop: 8 },
  agendaItem: { marginBottom: 8 },
  agendaTitle: { fontFamily: "NotoSans", fontWeight: 700 },
  agendaMeta: { marginTop: 2 },
  discussion: { marginTop: 3, paddingLeft: 10, whiteSpace: "pre-wrap" },
  decisionBox: {
    marginTop: 4,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: "#555555",
  },
  decisionNumber: { fontFamily: "NotoSans", fontWeight: 700 },
  votes: { marginTop: 2 },
  signatureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },
  signatureCell: { width: "50%", padding: 10, paddingBottom: 24 },
  signatureLine: { borderTopWidth: 0.5, borderTopColor: "#333333", marginBottom: 3 },
  signatureName: { fontSize: 9 },
  approvedLine: { marginTop: 14, fontFamily: "NotoSans", fontWeight: 700 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 42,
    right: 42,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    color: "#444444",
  },
});

export type MinutesPdfData = {
  lang: PdfLang;
  organization: LetterheadProfile;
  invitationSentAt: Date | null;
  meetingNumber: string;
  type: MeetingType;
  title: string;
  meetingDate: Date;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  status: MeetingStatus;
  approvedAt: Date | null;
  approvedByLabel: string | null;
  quorumRequired: number | null;
  presentCount: number;
  attendees: {
    name: string;
    role: AttendeeRole;
    attendance: AttendanceStatus;
  }[];
  agendaItems: {
    position: number;
    title: string;
    description: string | null;
    discussion: string | null;
    decisions: {
      decisionNumber: string;
      text: string;
      result: DecisionResult;
      votesFor: number | null;
      votesAgainst: number | null;
      votesAbstain: number | null;
    }[];
  }[];
  unlinkedDecisions: {
    decisionNumber: string;
    text: string;
    result: DecisionResult;
    votesFor: number | null;
    votesAgainst: number | null;
    votesAbstain: number | null;
  }[];
  actionItems: {
    description: string;
    assigneeLabel: string | null;
    dueDate: Date | null;
    status: string;
  }[];
};

function formatDateOnly(value: Date): string {
  return formatPdfDate(value);
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

/** Karar satırı: numara, metin, sonuç, oylar (9. bölüm md. 5). */
function DecisionLines({
  decisions,
  strings,
}: {
  decisions: MinutesPdfData["unlinkedDecisions"];
  strings: MinutesStrings;
}) {
  if (decisions.length === 0) return null;
  return (
    <View>
      {decisions.map((decision) => (
        <View key={decision.decisionNumber} style={styles.decisionBox}>
          <Text style={styles.decisionNumber}>{strings.decisionNumber(decision.decisionNumber)}</Text>
          <Text>{decision.text}</Text>
          <Text style={styles.agendaMeta}>
            {strings.result}: {strings.resultLabels[decision.result]}
            {decision.votesFor !== null
              ? ` — ${strings.votes(decision.votesFor, decision.votesAgainst ?? 0, decision.votesAbstain ?? 0)}`
              : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function MinutesDocument({ data }: { data: MinutesPdfData }) {
  registerMinutesFonts();
  const strings = MINUTES_STRINGS[data.lang];
  const role = (value: AttendeeRole) => strings.roleLabel(value, data.type);
  const isDraft = data.status !== "APPROVED";

  const timeRange =
    data.startTime && data.endTime
      ? `${data.startTime}–${data.endTime}`
      : (data.startTime ?? "-");

  const signaturePeople = [
    ...data.attendees
      .filter((attendee) => attendee.role === "CHAIRPERSON")
      .map((attendee) => ({ name: attendee.name, role: role(attendee.role) })),
    ...data.attendees
      .filter((attendee) => attendee.role === "SECRETARY")
      .map((attendee) => ({ name: attendee.name, role: role(attendee.role) })),
    ...data.attendees
      .filter(
        (attendee) =>
          attendee.attendance === "PRESENT" &&
          attendee.role !== "CHAIRPERSON" &&
          attendee.role !== "SECRETARY",
      )
      .map((attendee) => ({ name: attendee.name, role: role(attendee.role) })),
  ];

  return (
    <Document title={`${strings.subtitle(data.type)} ${data.meetingNumber}`} language={data.lang}>
      <Page size="A4" style={styles.page}>
        <Letterhead profile={data.organization} />
        <Text style={styles.org}>{strings.documentTitle}</Text>
        <Text style={styles.title}>{strings.subtitle(data.type)}</Text>
        {isDraft ? <Text style={styles.draftBadge}>{strings.draft}</Text> : null}
        <View style={styles.hr} />

        <View style={styles.infoTable}>
          <InfoRow label={strings.meetingNumber} value={data.meetingNumber} />
          <InfoRow label={strings.type} value={strings.meetingTypes[data.type]} />
          <InfoRow label={strings.title} value={data.title} />
          <InfoRow label={strings.date} value={formatDateOnly(data.meetingDate)} />
          <InfoRow label={strings.time} value={timeRange} />
          <InfoRow label={strings.location} value={data.location ?? "-"} />
          {data.invitationSentAt ? (
            <InfoRow label={strings.invitationSent} value={formatDateOnly(data.invitationSentAt)} />
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>{strings.attendees}</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.cellName}>{strings.name}</Text>
            <Text style={styles.cellRole}>{strings.role}</Text>
            <Text style={styles.cellAttendance}>{strings.attendance}</Text>
          </View>
          {data.attendees.map((attendee) => (
            <View key={`${attendee.name}-${attendee.role}`} style={styles.tableRow}>
              <Text style={styles.cellName}>{attendee.name}</Text>
              <Text style={styles.cellRole}>{role(attendee.role)}</Text>
              <Text style={styles.cellAttendance}>{strings.attendanceLabels[attendee.attendance]}</Text>
            </View>
          ))}
          {data.attendees.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={{ padding: 4 }}>{strings.noAttendees}</Text>
            </View>
          ) : null}
        </View>
        {data.quorumRequired !== null ? (
          <Text style={styles.quorum}>
            {data.presentCount >= data.quorumRequired
              ? strings.quorumMet(data.presentCount, data.quorumRequired)
              : strings.quorumNotMet(data.presentCount, data.quorumRequired)}
          </Text>
        ) : null}

        <Text style={styles.sectionTitle}>{strings.agenda}</Text>
        {data.agendaItems.length === 0 ? (
          <Text>{strings.noAgenda}</Text>
        ) : (
          data.agendaItems.map((item) => (
            <View key={`${item.position}-${item.title}`} style={styles.agendaItem} wrap={false}>
              <Text style={styles.agendaTitle}>
                {item.position}. {item.title}
              </Text>
              {item.description ? (
                <Text style={styles.agendaMeta}>{strings.planned}: {item.description}</Text>
              ) : null}
              {item.discussion ? (
                <View>
                  <Text style={styles.agendaMeta}>{strings.discussion}:</Text>
                  <Text style={styles.discussion}>{item.discussion}</Text>
                </View>
              ) : null}
              <DecisionLines decisions={item.decisions} strings={strings} />
            </View>
          ))
        )}

        {data.unlinkedDecisions.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>{strings.decisions}</Text>
            <DecisionLines decisions={data.unlinkedDecisions} strings={strings} />
          </>
        ) : null}

        {data.actionItems.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>{strings.actionItems}</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={styles.cellAction}>{strings.task}</Text>
                <Text style={styles.cellAssignee}>{strings.assignee}</Text>
                <Text style={styles.cellDue}>{strings.dueDate}</Text>
                <Text style={styles.cellStatus}>{strings.status}</Text>
              </View>
              {data.actionItems.map((actionItem) => (
                <View key={`${actionItem.description.slice(0, 12)}`} style={styles.tableRow} wrap={false}>
                  <Text style={styles.cellAction}>{actionItem.description}</Text>
                  <Text style={styles.cellAssignee}>{actionItem.assigneeLabel ?? "-"}</Text>
                  <Text style={styles.cellDue}>
                    {actionItem.dueDate ? formatDateOnly(actionItem.dueDate) : "-"}
                  </Text>
                  <Text style={styles.cellStatus}>
                    {actionItem.status === "DONE" ? strings.actionDone : strings.actionOpen}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>{strings.signatures}</Text>
        <View style={styles.signatureGrid}>
          {signaturePeople.map((person) => (
            <View key={`${person.name}-${person.role}`} style={styles.signatureCell} wrap={false}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>
                {person.name} — {person.role}
              </Text>
            </View>
          ))}
        </View>

        {!isDraft && data.approvedAt ? (
          <Text style={styles.approvedLine}>
            {strings.approved(formatDateOnly(data.approvedAt), data.approvedByLabel ?? "")}
          </Text>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>{data.meetingNumber}</Text>
          <Text
            render={({ pageNumber, totalPages }) => strings.page(pageNumber, totalPages)}
          />
        </View>
      </Page>
    </Document>
  );
}
