import type { PdfLang } from "@/shared/pdf/i18n";

import type { AttendanceStatus, AttendeeRole, DecisionResult, MeetingType } from "@prisma/client";

/**
 * Tutanak PDF sözlüğü (Faz 4, 4.3): Almanca varsayılan, Türkçe isteğe bağlı.
 * Ortak arayüz sayesinde eksik çeviri derleme hatasıdır. Kullanıcının yazdığı
 * serbest metinler (başlık, gündem, görüşme, karar metni) olduğu gibi basılır.
 */
export type MinutesStrings = {
  documentTitle: string;
  /** Genel kurul ve diğer toplantılar için alt başlık. */
  subtitle: (type: MeetingType) => string;
  draft: string;
  meetingNumber: string;
  type: string;
  title: string;
  date: string;
  time: string;
  location: string;
  invitationSent: string;
  attendees: string;
  name: string;
  role: string;
  attendance: string;
  noAttendees: string;
  quorumMet: (present: number, required: number) => string;
  quorumNotMet: (present: number, required: number) => string;
  agenda: string;
  noAgenda: string;
  planned: string;
  discussion: string;
  decisions: string;
  decisionNumber: (number: string) => string;
  result: string;
  votes: (yes: number, no: number, abstain: number) => string;
  actionItems: string;
  task: string;
  assignee: string;
  dueDate: string;
  status: string;
  actionDone: string;
  actionOpen: string;
  signatures: string;
  approved: (date: string, label: string) => string;
  page: (current: number, total: number) => string;
  meetingTypes: Record<MeetingType, string>;
  /** Rol etiketi toplantı türüne bağlıdır (Versammlungsleiter/in vs Sitzungsleiter/in). */
  roleLabel: (role: AttendeeRole, type: MeetingType) => string;
  attendanceLabels: Record<AttendanceStatus, string>;
  resultLabels: Record<DecisionResult, string>;
  fileName: string;
};

export const MINUTES_STRINGS: Record<PdfLang, MinutesStrings> = {
  de: {
    documentTitle: "PROTOKOLL",
    subtitle: (type) =>
      type === "GENERAL_ASSEMBLY" ? "Protokoll der Mitgliederversammlung" : "Sitzungsprotokoll",
    draft: "ENTWURF",
    meetingNumber: "Sitzungs-Nr.",
    type: "Art",
    title: "Titel",
    date: "Datum",
    time: "Uhrzeit",
    location: "Ort",
    invitationSent: "Einladung versandt am",
    attendees: "Teilnehmende",
    name: "Name",
    role: "Funktion",
    attendance: "Anwesenheit",
    noAttendees: "Keine Teilnehmenden erfasst.",
    quorumMet: (present, required) =>
      `Die Beschlussfähigkeit wurde festgestellt (${present}/${required}).`,
    quorumNotMet: (present, required) =>
      `Die Beschlussfähigkeit war nicht gegeben (${present}/${required}).`,
    agenda: "Tagesordnung",
    noAgenda: "Keine Tagesordnungspunkte.",
    planned: "Vorgesehen",
    discussion: "Beratung",
    decisions: "Beschlüsse",
    decisionNumber: (number) => `Beschluss Nr. ${number}`,
    result: "Ergebnis",
    votes: (yes, no, abstain) => `Ja ${yes} / Nein ${no} / Enthaltungen ${abstain}`,
    actionItems: "Aufgaben",
    task: "Aufgabe",
    assignee: "Verantwortlich",
    dueDate: "Frist",
    status: "Status",
    actionDone: "Erledigt",
    actionOpen: "Offen",
    signatures: "Unterschriften",
    approved: (date, label) => `Genehmigt am ${date} – ${label}`,
    page: (current, total) => `Seite ${current} von ${total}`,
    meetingTypes: {
      BOARD: "Vorstandssitzung",
      GENERAL_ASSEMBLY: "Mitgliederversammlung",
      COMMITTEE: "Ausschusssitzung",
      OTHER: "Sonstige Sitzung",
    },
    roleLabel: (role, type) => {
      if (role === "CHAIRPERSON") {
        return type === "GENERAL_ASSEMBLY" ? "Versammlungsleiter/in" : "Sitzungsleiter/in";
      }
      if (role === "SECRETARY") return "Protokollführer/in";
      return role === "GUEST" ? "Gast" : "Mitglied";
    },
    attendanceLabels: {
      INVITED: "Eingeladen",
      PRESENT: "Anwesend",
      ABSENT_EXCUSED: "Entschuldigt",
      ABSENT: "Nicht anwesend",
    },
    resultLabels: { ACCEPTED: "angenommen", REJECTED: "abgelehnt", POSTPONED: "vertagt" },
    fileName: "protokoll",
  },
  tr: {
    documentTitle: "TOPLANTI TUTANAĞI",
    subtitle: (type) => (type === "GENERAL_ASSEMBLY" ? "Genel Kurul Tutanağı" : "Toplantı Tutanağı"),
    draft: "TASLAK",
    meetingNumber: "Toplantı No",
    type: "Türü",
    title: "Başlık",
    date: "Tarih",
    time: "Saat",
    location: "Yer",
    invitationSent: "Davet gönderim tarihi",
    attendees: "Katılımcılar",
    name: "Ad Soyad",
    role: "Görev",
    attendance: "Katılım",
    noAttendees: "Katılımcı kaydı yok.",
    quorumMet: (present, required) => `Toplantı yeter sayısı sağlanmıştır (${present}/${required}).`,
    quorumNotMet: (present, required) =>
      `Toplantı yeter sayısı sağlanamamıştır (${present}/${required}).`,
    agenda: "Gündem",
    noAgenda: "Gündem maddesi yok.",
    planned: "Planlanan",
    discussion: "Görüşmeler",
    decisions: "Kararlar",
    decisionNumber: (number) => `Karar No: ${number}`,
    result: "Sonuç",
    votes: (yes, no, abstain) => `Kabul ${yes} / Ret ${no} / Çekimser ${abstain}`,
    actionItems: "Görevler",
    task: "Görev",
    assignee: "Sorumlu",
    dueDate: "Son Tarih",
    status: "Durum",
    actionDone: "Tamamlandı",
    actionOpen: "Açık",
    signatures: "İmza",
    approved: (date, label) => `Onaylandı: ${date} – ${label}`,
    page: (current, total) => `Sayfa ${current} / ${total}`,
    meetingTypes: {
      BOARD: "Yönetim Kurulu",
      GENERAL_ASSEMBLY: "Genel Kurul",
      COMMITTEE: "Komisyon",
      OTHER: "Diğer",
    },
    roleLabel: (role) =>
      ({ CHAIRPERSON: "Başkan", SECRETARY: "Sekreter", MEMBER: "Üye", GUEST: "Konuk" })[role],
    attendanceLabels: {
      INVITED: "Davetli",
      PRESENT: "Katıldı",
      ABSENT_EXCUSED: "Mazeretli",
      ABSENT: "Katılmadı",
    },
    resultLabels: { ACCEPTED: "Kabul edildi", REJECTED: "Reddedildi", POSTPONED: "Ertelendi" },
    fileName: "tutanak",
  },
};
