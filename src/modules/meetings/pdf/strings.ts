/**
 * Tutanak PDF metinleri (Faz 4, 4.3): de VARSAYILAN, tr opsiyonel. Tek arayüz
 * (MinutesStrings) ile iki dil — eksik çeviri DERLEME HATASIDIR. Sözlük:
 * §1 tablosu + §4.3 madde metinleri (PROTOKOLL / Sitzung / Beschluss...).
 */

export type MinutesStrings = {
  /** Kısa belge başlığı (antet altı büyük başlık). */
  headerTitle: string;
  /** GA için uzun başlık — handler tür bilgisiyle seçer. */
  headerTitleAssembly: string;
  infoNumber: string;
  infoType: string;
  infoTitle: string;
  infoDate: string;
  infoTime: string;
  infoLocation: string;
  /** Faz 4 (4.5): davet gönderim tarihi etiketi — yalnızca doluysa basılır. */
  invitationSentAt: string;
  sectionAttendees: string;
  colName: string;
  colRole: string;
  colAttendance: string;
  sectionAgenda: string;
  agendaEmpty: string;
  agendaPlanned: string;
  agendaDiscussions: string;
  agendaLinkedDecisions: string;
  sectionDecisions: string;
  decisionsEmpty: string;
  decisionNo: string;
  decisionResult: string;
  sectionActionItems: string;
  colTask: string;
  colAssignee: string;
  colDueDate: string;
  colStatus: string;
  sectionSignatures: string;
  footerPage: (page: number, total: number) => string;
  draftMark: string;
  approvedLine: (date: string, by: string) => string;
  quorumReached: (present: number, required: number) => string;
  quorumNotReached: (present: number, required: number) => string;
  votesLine: (forCount: number, against: number, abstain: number) => string;
  attendance: Record<"INVITED" | "PRESENT" | "ABSENT_EXCUSED" | "ABSENT", string>;
  attendeeRole: {
    /** Genel Kurul için başkan etiketi (§4.3: Versammlungsleiter/in). */
    chairAssembly: string;
    /** Diğer toplantılar (§4.3: Sitzungsleiter/in). */
    chairSession: string;
    secretary: string;
    member: string;
    guest: string;
  };
  decisionResultLabels: Record<"ACCEPTED" | "REJECTED" | "POSTPONED", string>;
  actionStatusLabel: Record<"OPEN" | "DONE", string>;
  /** Toplantı türü etiketleri — PDF bilgi bloğu (TYPE_LABELS TR kalır, PDF dil izler). */
  meetingType: Record<"BOARD" | "GENERAL_ASSEMBLY" | "COMMITTEE" | "OTHER", string>;
  none: string;
};

export const MINUTES_STRINGS: { de: MinutesStrings; tr: MinutesStrings } = {
  de: {
    headerTitle: "SITZUNGSPROTOKOLL",
    headerTitleAssembly: "PROTOKOLL DER MITGLIEDERVERSAMMLUNG",
    infoNumber: "Sitzungs-Nr.",
    infoType: "Art",
    infoTitle: "Titel",
    infoDate: "Datum",
    infoTime: "Uhrzeit",
    infoLocation: "Ort",
    invitationSentAt: "Einladung versandt am",
    sectionAttendees: "Teilnehmer",
    colName: "Name",
    colRole: "Funktion",
    colAttendance: "Anwesenheit",
    sectionAgenda: "Tagesordnung",
    agendaEmpty: "Keine Tagesordnungspunkte.",
    agendaPlanned: "Geplant:",
    agendaDiscussions: "Diskussion:",
    agendaLinkedDecisions: "Zugehörige Beschlüsse:",
    sectionDecisions: "Beschlüsse",
    decisionsEmpty: "Es wurden keine Beschlüsse gefasst.",
    decisionNo: "Beschluss Nr.",
    decisionResult: "Ergebnis:",
    sectionActionItems: "Aufgaben",
    colTask: "Aufgabe",
    colAssignee: "Verantwortlich",
    colDueDate: "Frist",
    colStatus: "Status",
    sectionSignatures: "Unterschriften",
    footerPage: (page, total) => `Seite ${page} von ${total}`,
    draftMark: "ENTWURF",
    approvedLine: (date, by) => `Genehmigt am ${date} – ${by}`,
    quorumReached: (present, required) =>
      `Die Beschlussfähigkeit wurde festgestellt (${present}/${required}).`,
    quorumNotReached: (present, required) =>
      `Die Beschlussfähigkeit war nicht gegeben (${present}/${required}).`,
    votesLine: (forCount, against, abstain) =>
      `Ja ${forCount} / Nein ${against} / Enthaltungen ${abstain}`,
    attendance: {
      INVITED: "Eingeladen",
      PRESENT: "Anwesend",
      ABSENT_EXCUSED: "Entschuldigt",
      ABSENT: "Nicht anwesend",
    },
    attendeeRole: {
      chairAssembly: "Versammlungsleiter/in",
      chairSession: "Sitzungsleiter/in",
      secretary: "Protokollführer/in",
      member: "Mitglied",
      guest: "Gast",
    },
    decisionResultLabels: {
      ACCEPTED: "angenommen",
      REJECTED: "abgelehnt",
      POSTPONED: "vertagt",
    },
    actionStatusLabel: { OPEN: "Offen", DONE: "Erledigt" },
    meetingType: {
      BOARD: "Vorstandssitzung",
      GENERAL_ASSEMBLY: "Mitgliederversammlung",
      COMMITTEE: "Ausschuss",
      OTHER: "Sonstiges",
    },
    none: "–",
  },
  tr: {
    headerTitle: "TOPLANTI TUTANAĞI",
    headerTitleAssembly: "GENEL KURUL TOPLANTI TUTANAĞI",
    infoNumber: "Toplantı No",
    infoType: "Tür",
    infoTitle: "Başlık",
    infoDate: "Tarih",
    infoTime: "Saat",
    infoLocation: "Yer",
    invitationSentAt: "Davet gönderim tarihi (Einladung versandt am)",
    sectionAttendees: "Katılımcılar",
    colName: "Ad Soyad",
    colRole: "Görev",
    colAttendance: "Katılım",
    sectionAgenda: "Gündem",
    agendaEmpty: "Gündem maddesi yok.",
    agendaPlanned: "Planlanan:",
    agendaDiscussions: "Görüşmeler:",
    agendaLinkedDecisions: "Bağlı kararlar:",
    sectionDecisions: "Kararlar",
    decisionsEmpty: "Karar alınmamıştır.",
    decisionNo: "Karar No:",
    decisionResult: "Sonuç:",
    sectionActionItems: "Görevler",
    colTask: "Görev",
    colAssignee: "Sorumlu",
    colDueDate: "Son Tarih",
    colStatus: "Durum",
    sectionSignatures: "İmzalar",
    footerPage: (page, total) => `Sayfa ${page} / ${total}`,
    draftMark: "TASLAK",
    approvedLine: (date, by) => `Onaylandı: ${date} - ${by}`,
    quorumReached: (present, required) =>
      `Toplantı yeter sayısı sağlanmıştır (${present}/${required}).`,
    quorumNotReached: (present, required) =>
      `Toplantı yeter sayısı sağlanamamıştır (${present}/${required}).`,
    votesLine: (forCount, against, abstain) =>
      `Kabul ${forCount} / Ret ${against} / Çekimser ${abstain}`,
    attendance: {
      INVITED: "Davetli",
      PRESENT: "Katıldı",
      ABSENT_EXCUSED: "Mazeretli",
      ABSENT: "Katılmadı",
    },
    attendeeRole: {
      chairAssembly: "Genel Kurul Başkanı",
      chairSession: "Başkan",
      secretary: "Sekreter",
      member: "Üye",
      guest: "Konuk",
    },
    decisionResultLabels: {
      ACCEPTED: "Kabul edildi",
      REJECTED: "Reddedildi",
      POSTPONED: "Ertelendi",
    },
    actionStatusLabel: { OPEN: "Açık", DONE: "Tamamlandı" },
    meetingType: {
      BOARD: "Yönetim Kurulu",
      GENERAL_ASSEMBLY: "Genel Kurul",
      COMMITTEE: "Komisyon",
      OTHER: "Diğer",
    },
    none: "-",
  },
};
