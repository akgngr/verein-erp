import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatPdfDate } from "@/shared/pdf/format";
import type { PdfLang } from "@/shared/pdf/i18n";
import { Letterhead, type LetterheadProfile } from "@/shared/pdf/letterhead";

import type { AttendanceSummary, ProgressAssessmentType } from "../types";
import { REPORT_STRINGS } from "./strings";

export type ReportPdfData = {
  lang: PdfLang;
  organization: LetterheadProfile;
  generatedAt: Date;
  student: { name: string; number: string };
  course: { code: string; title: string; startDate: Date; endDate: Date | null; teachers: string[] };
  attendance: AttendanceSummary;
  grades: { date: Date; title: string; type: ProgressAssessmentType; points: number | null; maxPoints: number | null; grade: string | null; comment: string | null }[];
  notes: { date: Date; rating: number | null; text: string; goals: string | null }[];
};

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "NotoSans", fontSize: 10, color: "#111111" },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 10 },
  meta: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  metaItem: { width: "50%", marginBottom: 4 },
  label: { fontSize: 8, color: "#666666" },
  h2: { fontSize: 12, fontWeight: 700, marginTop: 12, marginBottom: 6 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#cccccc", paddingVertical: 3 },
  head: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#999999", paddingBottom: 3 },
  cDate: { width: "15%" },
  cTitle: { width: "30%" },
  cType: { width: "15%" },
  cResult: { width: "15%" },
  cComment: { width: "25%" },
  note: { marginBottom: 6, paddingBottom: 6, borderBottomWidth: 0.5, borderBottomColor: "#dddddd" },
  muted: { color: "#666666" },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7, color: "#888888" },
});

function result(grade: ReportPdfData["grades"][number], lang: PdfLang): string {
  const number = (value: number) => value.toLocaleString(lang === "de" ? "de-DE" : "tr-TR", { maximumFractionDigits: 2 });
  const points = grade.points !== null ? `${number(grade.points)}${grade.maxPoints !== null ? ` / ${number(grade.maxPoints)}` : ""}` : null;
  return [points, grade.grade ? `(${grade.grade})` : null].filter(Boolean).join(" ") || "—";
}

/** Veli raporu: devam durumu, sınav/ödev sonuçları ve gelişim gözlemleri. */
export function ReportDocument({ data }: { data: ReportPdfData }) {
  const s = REPORT_STRINGS[data.lang];
  const period = `${formatPdfDate(data.course.startDate, data.lang)}${data.course.endDate ? ` – ${formatPdfDate(data.course.endDate, data.lang)}` : ""}`;
  return (
    <Document title={`${s.title} – ${data.student.name}`} language={data.lang}>
      <Page size="A4" style={styles.page}>
        <Letterhead profile={data.organization} />
        <Text style={styles.title}>{s.title}</Text>
        <View style={styles.meta}>
          {[
            [s.student, `${data.student.name} (${data.student.number})`],
            [s.course, `${data.course.code} · ${data.course.title}`],
            [s.period, period],
            [s.teachers, data.course.teachers.join(", ") || "—"],
            [s.generatedAt, formatPdfDate(data.generatedAt, data.lang)],
          ].map(([label, value]) => (
            <View key={label} style={styles.metaItem}>
              <Text style={styles.label}>{label}</Text>
              <Text>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.h2}>{s.attendance}</Text>
        {data.attendance.recorded === 0 ? (
          <Text style={styles.muted}>{s.noAttendance}</Text>
        ) : (
          <>
            <Text>{s.attendanceLine(data.attendance)}</Text>
            {data.attendance.rate !== null ? (
              <Text>
                {s.attendanceRate}: {data.attendance.rate}%
              </Text>
            ) : null}
          </>
        )}

        <Text style={styles.h2}>{s.grades}</Text>
        {data.grades.length === 0 ? (
          <Text style={styles.muted}>{s.noGrades}</Text>
        ) : (
          <View>
            <View style={styles.head}>
              <Text style={styles.cDate}>{s.colDate}</Text>
              <Text style={styles.cTitle}>{s.colTitle}</Text>
              <Text style={styles.cType}>{s.colType}</Text>
              <Text style={styles.cResult}>{s.colResult}</Text>
              <Text style={styles.cComment}>{s.colComment}</Text>
            </View>
            {data.grades.map((grade, index) => (
              <View key={index} style={styles.row} wrap={false}>
                <Text style={styles.cDate}>{formatPdfDate(grade.date, data.lang)}</Text>
                <Text style={styles.cTitle}>{grade.title}</Text>
                <Text style={styles.cType}>{s.assessmentType[grade.type]}</Text>
                <Text style={styles.cResult}>{result(grade, data.lang)}</Text>
                <Text style={styles.cComment}>{grade.comment ?? ""}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.h2}>{s.notes}</Text>
        {data.notes.length === 0 ? (
          <Text style={styles.muted}>{s.noNotes}</Text>
        ) : (
          data.notes.map((note, index) => (
            <View key={index} style={styles.note} wrap={false}>
              <Text style={styles.label}>
                {formatPdfDate(note.date, data.lang)}
                {note.rating ? ` · ${s.rating}: ${note.rating}/5` : ""}
              </Text>
              <Text>{note.text}</Text>
              {note.goals ? (
                <Text>
                  {s.goals}: {note.goals}
                </Text>
              ) : null}
            </View>
          ))
        )}
        <Text style={styles.footer} fixed>
          {s.footer}
        </Text>
      </Page>
    </Document>
  );
}
