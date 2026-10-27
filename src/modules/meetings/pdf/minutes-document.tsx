import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { getEnv } from "@/shared/env";

import {
  ATTENDEE_ROLE_LABELS,
  ATTENDANCE_LABELS,
  DECISION_RESULT_LABELS,
  MEETING_STATUS_LABELS,
  MEETING_TYPE_LABELS,
} from "../constants";
import { registerMinutesFonts } from "./fonts";

/**
 * Toplantı tutanağı PDF'i (9. bölüm): A4 dikey, Türkçe metin.
 * - Antet: ORGANIZATION_NAME + "TOPLANTI TUTANAĞI"; onaysız toplantıda TASLAK damgası.
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
  meetingNumber: string;
  type: keyof typeof MEETING_TYPE_LABELS;
  title: string;
  meetingDate: Date;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  status: keyof typeof MEETING_STATUS_LABELS;
  approvedAt: Date | null;
  approvedByLabel: string | null;
  quorumRequired: number | null;
  presentCount: number;
  attendees: {
    name: string;
    role: keyof typeof ATTENDEE_ROLE_LABELS;
    attendance: keyof typeof ATTENDANCE_LABELS;
  }[];
  agendaItems: {
    position: number;
    title: string;
    description: string | null;
    discussion: string | null;
    decisions: {
      decisionNumber: string;
      text: string;
      result: keyof typeof DECISION_RESULT_LABELS;
      votesFor: number | null;
      votesAgainst: number | null;
      votesAbstain: number | null;
    }[];
  }[];
  unlinkedDecisions: {
    decisionNumber: string;
    text: string;
    result: keyof typeof DECISION_RESULT_LABELS;
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
  const day = String(value.getUTCDate()).padStart(2, "0");
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${value.getUTCFullYear()}`;
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
}: {
  decisions: MinutesPdfData["unlinkedDecisions"];
}) {
  if (decisions.length === 0) return null;
  return (
    <View>
      {decisions.map((decision) => (
        <View key={decision.decisionNumber} style={styles.decisionBox}>
          <Text style={styles.decisionNumber}>Karar No: {decision.decisionNumber}</Text>
          <Text>{decision.text}</Text>
          <Text style={styles.agendaMeta}>
            Sonuç: {DECISION_RESULT_LABELS[decision.result]}
            {decision.votesFor !== null
              ? ` — Kabul ${decision.votesFor} / Ret ${decision.votesAgainst ?? 0} / Çekimser ${decision.votesAbstain ?? 0}`
              : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function MinutesDocument({ data }: { data: MinutesPdfData }) {
  registerMinutesFonts();
  const organizationName = getEnv().ORGANIZATION_NAME;
  const isDraft = data.status !== "APPROVED";

  const timeRange =
    data.startTime && data.endTime
      ? `${data.startTime}–${data.endTime}`
      : (data.startTime ?? "-");

  const signaturePeople = [
    ...data.attendees
      .filter((attendee) => attendee.role === "CHAIRPERSON")
      .map((attendee) => ({ name: attendee.name, role: ATTENDEE_ROLE_LABELS[attendee.role] })),
    ...data.attendees
      .filter((attendee) => attendee.role === "SECRETARY")
      .map((attendee) => ({ name: attendee.name, role: ATTENDEE_ROLE_LABELS[attendee.role] })),
    ...data.attendees
      .filter(
        (attendee) =>
          attendee.attendance === "PRESENT" &&
          attendee.role !== "CHAIRPERSON" &&
          attendee.role !== "SECRETARY",
      )
      .map((attendee) => ({ name: attendee.name, role: ATTENDEE_ROLE_LABELS[attendee.role] })),
  ];

  return (
    <Document title={`Tutanak-${data.meetingNumber}`} language="tr">
      <Page size="A4" style={styles.page}>
        <Text style={styles.org}>{organizationName}</Text>
        <Text style={styles.title}>TOPLANTI TUTANAĞI</Text>
        {isDraft ? <Text style={styles.draftBadge}>TASLAK</Text> : null}
        <View style={styles.hr} />

        <View style={styles.infoTable}>
          <InfoRow label="Toplantı No" value={data.meetingNumber} />
          <InfoRow label="Türü" value={MEETING_TYPE_LABELS[data.type]} />
          <InfoRow label="Başlık" value={data.title} />
          <InfoRow label="Tarih" value={formatDateOnly(data.meetingDate)} />
          <InfoRow label="Saat" value={timeRange} />
          <InfoRow label="Yer" value={data.location ?? "-"} />
        </View>

        <Text style={styles.sectionTitle}>Katılımcılar</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.cellName}>Ad Soyad</Text>
            <Text style={styles.cellRole}>Görev</Text>
            <Text style={styles.cellAttendance}>Katılım</Text>
          </View>
          {data.attendees.map((attendee) => (
            <View key={`${attendee.name}-${attendee.role}`} style={styles.tableRow}>
              <Text style={styles.cellName}>{attendee.name}</Text>
              <Text style={styles.cellRole}>{ATTENDEE_ROLE_LABELS[attendee.role]}</Text>
              <Text style={styles.cellAttendance}>{ATTENDANCE_LABELS[attendee.attendance]}</Text>
            </View>
          ))}
          {data.attendees.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={{ padding: 4 }}>Katılımcı kaydı yok.</Text>
            </View>
          ) : null}
        </View>
        {data.quorumRequired !== null ? (
          <Text style={styles.quorum}>
            {data.presentCount >= data.quorumRequired
              ? `Toplantı yeter sayısı sağlanmıştır (${data.presentCount}/${data.quorumRequired}).`
              : `Toplantı yeter sayısı sağlanamamıştır (${data.presentCount}/${data.quorumRequired}).`}
          </Text>
        ) : null}

        <Text style={styles.sectionTitle}>Gündem</Text>
        {data.agendaItems.length === 0 ? (
          <Text>Gündem maddesi yok.</Text>
        ) : (
          data.agendaItems.map((item) => (
            <View key={`${item.position}-${item.title}`} style={styles.agendaItem} wrap={false}>
              <Text style={styles.agendaTitle}>
                {item.position}. {item.title}
              </Text>
              {item.description ? (
                <Text style={styles.agendaMeta}>Planlanan: {item.description}</Text>
              ) : null}
              {item.discussion ? (
                <View>
                  <Text style={styles.agendaMeta}>Görüşmeler:</Text>
                  <Text style={styles.discussion}>{item.discussion}</Text>
                </View>
              ) : null}
              <DecisionLines decisions={item.decisions} />
            </View>
          ))
        )}

        {data.unlinkedDecisions.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Kararlar</Text>
            <DecisionLines decisions={data.unlinkedDecisions} />
          </>
        ) : null}

        {data.actionItems.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Görevler</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={styles.cellAction}>Görev</Text>
                <Text style={styles.cellAssignee}>Sorumlu</Text>
                <Text style={styles.cellDue}>Son Tarih</Text>
                <Text style={styles.cellStatus}>Durum</Text>
              </View>
              {data.actionItems.map((actionItem) => (
                <View key={`${actionItem.description.slice(0, 12)}`} style={styles.tableRow} wrap={false}>
                  <Text style={styles.cellAction}>{actionItem.description}</Text>
                  <Text style={styles.cellAssignee}>{actionItem.assigneeLabel ?? "-"}</Text>
                  <Text style={styles.cellDue}>
                    {actionItem.dueDate ? formatDateOnly(actionItem.dueDate) : "-"}
                  </Text>
                  <Text style={styles.cellStatus}>
                    {actionItem.status === "DONE" ? "Tamamlandı" : "Açık"}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>İmza</Text>
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
            Onaylandı: {formatDateOnly(data.approvedAt)} – {data.approvedByLabel ?? ""}
          </Text>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>{data.meetingNumber}</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Sayfa ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
