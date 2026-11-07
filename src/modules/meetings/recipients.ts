import "server-only";

import { getMemberContacts } from "@/modules/members/automation";
import { getDb } from "@/shared/db";
import { defineRecipients } from "@/shared/mailings/define";

import { meetingsPermissions } from "./permissions";

const ATTENDANCE = ["INVITED", "PRESENT", "ABSENT_EXCUSED", "ABSENT"];

/** Seçim listesi etiketi = değer: "TOP-2026-003 · Yönetim kurulu" (kişi verisi yok). */
export const meetingLabel = (row: { meetingNumber: string; title: string }) => `${row.meetingNumber} · ${row.title}`.slice(0, 40);

/**
 * Toplantı katılımcıları: üye olan katılımcıların iletişim bilgisi ve izinleri üyeler modülünden
 * (erişim onayıyla) okunur; üye olmayan konukların iletişim bilgisi tutulmadığı için atlanırlar.
 */
export const recipients = defineRecipients("meetings", [
  {
    key: "attendees",
    permission: { definition: meetingsPermissions, action: "view" },
    placeholders: ["firstName", "lastName", "fullName", "meetingTitle", "meetingDate"],
    filters: [
      {
        key: "meeting",
        options: [],
        loadOptions: async () => (await getDb().meeting.findMany({
          where: { deletedAt: null, status: { not: "CANCELLED" } },
          select: { meetingNumber: true, title: true },
          orderBy: { meetingDate: "desc" },
          take: 60,
        })).map(meetingLabel),
      },
      { key: "attendance", options: ATTENDANCE },
    ],
    sampleVars: { firstName: "Anna", lastName: "Muster", fullName: "Anna Muster", meetingTitle: "Vorstandssitzung", meetingDate: "15.12.2026" },
    resolve: async (filter) => {
      const labels = new Set((filter.meeting ?? []).slice(0, 60));
      if (!labels.size) return [];
      const attendance = (filter.attendance ?? []).filter((value) => ATTENDANCE.includes(value));
      const meetings = (await getDb().meeting.findMany({
        where: { deletedAt: null },
        select: { id: true, meetingNumber: true, title: true, meetingDate: true },
        orderBy: { meetingDate: "desc" },
        take: 200,
      })).filter((row) => labels.has(meetingLabel(row)));
      const attendees = await getDb().meetingAttendee.findMany({
        where: { meetingId: { in: meetings.map((row) => row.id) }, memberId: { not: null }, ...(attendance.length ? { attendance: { in: attendance as never } } : {}) },
        select: { meetingId: true, memberId: true },
      });
      const contacts = await getMemberContacts(attendees.map((row) => row.memberId as string));
      const seen = new Set<string>();
      return attendees.flatMap((row) => {
        const contact = contacts.get(row.memberId as string);
        if (!contact || seen.has(contact.id)) return [];
        seen.add(contact.id);
        const meeting = meetings.find((item) => item.id === row.meetingId)!;
        const fullName = `${contact.firstName} ${contact.lastName}`.trim();
        return [{
          id: contact.id,
          email: contact.email,
          phone: contact.phone,
          consents: Object.fromEntries(contact.messagingConsents.map((channel) => [channel, true])),
          name: fullName,
          optOut: contact.bulkMailOptOut,
          vars: { firstName: contact.firstName, lastName: contact.lastName, fullName, meetingTitle: meeting.title, meetingDate: meeting.meetingDate.toLocaleDateString("de-DE") },
        }];
      });
    },
  },
]);
