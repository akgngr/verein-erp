import type { PdfLang } from "@/shared/pdf/i18n";

import type { ProgressAssessmentType } from "../types";

/** Veli raporu PDF metinleri (Almanca varsayılan, ?lang=tr ile Türkçe). */
export const REPORT_STRINGS: Record<
  PdfLang,
  {
    title: string;
    student: string;
    course: string;
    period: string;
    teachers: string;
    generatedAt: string;
    attendance: string;
    attendanceLine: (args: { present: number; late: number; excused: number; absent: number; recorded: number }) => string;
    attendanceRate: string;
    noAttendance: string;
    grades: string;
    noGrades: string;
    colDate: string;
    colTitle: string;
    colType: string;
    colResult: string;
    colComment: string;
    notes: string;
    noNotes: string;
    goals: string;
    rating: string;
    assessmentType: Record<ProgressAssessmentType, string>;
    footer: string;
  }
> = {
  de: {
    title: "Lernstandsbericht",
    student: "Schüler/in",
    course: "Kurs",
    period: "Zeitraum",
    teachers: "Lehrkraft",
    generatedAt: "Erstellt am",
    attendance: "Anwesenheit",
    attendanceLine: (a) => `Anwesend: ${a.present} · verspätet: ${a.late} · entschuldigt: ${a.excused} · unentschuldigt: ${a.absent} (von ${a.recorded} erfassten Terminen)`,
    attendanceRate: "Anwesenheitsquote",
    noAttendance: "Noch keine Anwesenheit erfasst.",
    grades: "Leistungen",
    noGrades: "Noch keine Leistungen erfasst.",
    colDate: "Datum",
    colTitle: "Leistung",
    colType: "Art",
    colResult: "Ergebnis",
    colComment: "Bemerkung",
    notes: "Beobachtungen zur Lernentwicklung",
    noNotes: "Keine Einträge.",
    goals: "Ziele",
    rating: "Bewertung",
    assessmentType: { EXAM: "Test", HOMEWORK: "Hausaufgabe", ORAL: "Mündlich", PROJECT: "Projekt", OTHER: "Sonstiges" },
    footer: "Dieser Bericht enthält personenbezogene Daten und ist nur für die Erziehungsberechtigten bestimmt.",
  },
  tr: {
    title: "Öğrenci gelişim raporu",
    student: "Öğrenci",
    course: "Kurs",
    period: "Dönem",
    teachers: "Öğretmen",
    generatedAt: "Oluşturma tarihi",
    attendance: "Devam durumu",
    attendanceLine: (a) => `Katıldı: ${a.present} · geç: ${a.late} · mazeretli: ${a.excused} · mazeretsiz: ${a.absent} (kaydedilen ${a.recorded} dersten)`,
    attendanceRate: "Devam oranı",
    noAttendance: "Henüz yoklama kaydı yok.",
    grades: "Sınav ve ödevler",
    noGrades: "Henüz not girilmemiş.",
    colDate: "Tarih",
    colTitle: "Değerlendirme",
    colType: "Tür",
    colResult: "Sonuç",
    colComment: "Açıklama",
    notes: "Gelişim gözlemleri",
    noNotes: "Kayıt yok.",
    goals: "Hedefler",
    rating: "Değerlendirme",
    assessmentType: { EXAM: "Sınav", HOMEWORK: "Ödev", ORAL: "Sözlü", PROJECT: "Proje", OTHER: "Diğer" },
    footer: "Bu rapor kişisel veri içerir ve yalnızca veliler içindir.",
  },
};
