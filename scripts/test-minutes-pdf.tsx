/**
 * Tutanak PDF bileşenini dev sunucusu OLMADAN doğrudan render eder (Faz 4 4.3
 * denetimi): hem DE hem TR sürümünü üretir. Kullanım: bun scripts/test-minutes-pdf.tsx
 * (KARAR: tsx CJS'te top-level await + @react-pdf/hyphenate alt yolu çözümlenemediği
 * için doğrudan bun ile çalıştırılır.)
 */
try {
  process.loadEnvFile();
} catch {
  // .env yoksa sorun değil; bileşen ortam değişkeni kullanmaz.
}

import { renderToBuffer } from "@react-pdf/renderer";
import { writeFileSync } from "node:fs";

import { registerMinutesFonts } from "../src/modules/meetings/pdf/fonts";
import { MinutesDocument, type MinutesPdfData } from "../src/modules/meetings/pdf/minutes-document";
import { MINUTES_STRINGS } from "../src/modules/meetings/pdf/strings";
import type { LetterheadProfile } from "../src/shared/pdf/letterhead";

const organization: LetterheadProfile = {
  name: "Türk-Alman Kültür Derneği e.V.",
  street: "Musterstraße 12",
  postalCode: "60311",
  city: "Frankfurt am Main",
  registerCourt: "Frankfurt am Main",
  registerNumber: "VR 12345",
  taxNumber: "045 123 45678",
  taxOffice: "Frankfurt am Main I",
  exemptionNoticeDate: new Date("2024-12-01T00:00:00Z"),
  exemptionNoticePeriod: "2022–2024",
  // KARAR: standalone testte logo yok (DB erişimi yok); logo E2E'de doğrulanır.
  logoDataUri: null,
};

void main();
async function main(): Promise<void> {
  for (const lang of ["de", "tr"] as const) {
    await renderLang(lang);
  }
}

async function renderLang(lang: "de" | "tr"): Promise<void> {
  const strings = MINUTES_STRINGS[lang];
  const data: MinutesPdfData = {
    organization,
    lang,
    strings,
    headerTitle: strings.headerTitle,
    chairRoleLabel: strings.attendeeRole.chairSession,
    meetingNumber: "TOP-2026-001",
    typeLabel: strings.meetingType.BOARD,
    title: lang === "de" ? "Vorstandssitzung November" : "Kasım Yönetim Kurulu Toplantısı",
    dateLabel: "26.10.2026",
    timeLabel: "14:00 - 15:30",
    invitationSentAtLabel: null,
    locationLabel: lang === "de" ? "Vereinsheim" : "Dernek Merkezi",
    isDraft: true,
    approvedLine: null,
    attendees: [
      {
        name: "Ayşe Yılmaz",
        roleLabel: strings.attendeeRole.chairSession,
        attendanceLabel: strings.attendance.PRESENT,
        isPresent: true,
      },
      {
        name: "Mehmet Demir",
        roleLabel: strings.attendeeRole.secretary,
        attendanceLabel: strings.attendance.PRESENT,
        isPresent: true,
      },
      {
        name: "Ali Veli",
        roleLabel: strings.attendeeRole.member,
        attendanceLabel: strings.attendance.ABSENT_EXCUSED,
        isPresent: false,
      },
    ],
    quorumSentence: strings.quorumReached(2, 2),
    agenda: [
      {
        position: 1,
        title: lang === "de" ? "Eröffnung" : "Açılış",
        description: null,
        discussion: "İlk satır\nİkinci satır: İ ı Ş ş Ğ ğ Ç ç Ö ö Ü ü — Ä ä ß ß",
        decisionNumbers: ["2026/1"],
      },
    ],
    decisions: [
      {
        decisionNumber: "2026/1",
        text: lang === "de" ? "Testbeschluss." : "Test kararı.",
        resultLabel: strings.decisionResultLabels.ACCEPTED,
        votesLine: strings.votesLine(3, 0, 1),
      },
    ],
    actionItems: [
      {
        description: lang === "de" ? "Testaufgabe" : "Test görevi",
        assigneeLabel: "Ali Veli",
        dueDateLabel: "01.12.2026",
        statusLabel: strings.actionStatusLabel.OPEN,
      },
    ],
    signatureNames: [
      { name: "Ayşe Yılmaz", roleLabel: strings.attendeeRole.chairSession },
      { name: "Mehmet Demir", roleLabel: strings.attendeeRole.secretary },
    ],
  };

  registerMinutesFonts();
  const buffer = await renderToBuffer(<MinutesDocument data={data} />);
  const file = `/tmp/minutes-test-${lang}.pdf`;
  writeFileSync(file, buffer);
  console.log(`PDF yazıldı (${lang}):`, file, buffer.length, "bayt");
}
