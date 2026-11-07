import "server-only";

import { getMemberContacts } from "@/modules/members/automation";
import { getDb } from "@/shared/db";
import { defineRecipients } from "@/shared/mailings/define";

import { eventsPermissions } from "./permissions";

const STATUSES = ["REGISTERED", "ATTENDED", "CANCELLED"];

/** Seçim listesi etiketi = değer: "2026-12-15 · Yaz şenliği" (kişi verisi yok). */
export const eventLabel = (row: { startDate: Date; title: string }) => `${row.startDate.toISOString().slice(0, 10)} · ${row.title}`.slice(0, 40);

/**
 * Etkinlik katılımcıları. Üyeye bağlı katılımcıda üyenin itiraz ve kanal izinleri geçerlidir; üye
 * olmayan katılımcılara yalnız e-posta gider (kayıt sırasında verdikleri adres; SMS/WhatsApp izni yok).
 */
export const recipients = defineRecipients("events", [
  {
    key: "attendees",
    permission: { definition: eventsPermissions, action: "view" },
    placeholders: ["firstName", "lastName", "fullName", "eventTitle", "eventDate"],
    filters: [
      {
        key: "event",
        options: [],
        loadOptions: async () => (await getDb().event.findMany({
          where: { status: { not: "CANCELLED" } },
          select: { startDate: true, title: true },
          orderBy: { startDate: "desc" },
          take: 60,
        })).map(eventLabel),
      },
      { key: "status", options: STATUSES, defaults: ["REGISTERED", "ATTENDED"] },
    ],
    sampleVars: { firstName: "Anna", lastName: "Muster", fullName: "Anna Muster", eventTitle: "Sommerfest", eventDate: "15.12.2026" },
    resolve: async (filter) => {
      const labels = new Set((filter.event ?? []).slice(0, 60));
      if (!labels.size) return [];
      const statuses = (filter.status ?? []).filter((value) => STATUSES.includes(value));
      const events = (await getDb().event.findMany({ select: { id: true, startDate: true, title: true }, orderBy: { startDate: "desc" }, take: 300 }))
        .filter((row) => labels.has(eventLabel(row)));
      const attendees = await getDb().eventAttendee.findMany({
        where: { eventId: { in: events.map((row) => row.id) }, ...(statuses.length ? { status: { in: statuses } } : {}) },
        select: { id: true, eventId: true, memberId: true, firstName: true, lastName: true, email: true, phone: true },
      });
      const contacts = await getMemberContacts(attendees.flatMap((row) => (row.memberId ? [row.memberId] : [])));
      const seen = new Set<string>();
      return attendees.flatMap((row) => {
        const member = row.memberId ? contacts.get(row.memberId) : undefined;
        const email = (member?.email ?? row.email)?.trim().toLowerCase() || null;
        const key = member?.id ?? email ?? row.id;
        if (seen.has(key)) return [];
        seen.add(key);
        const event = events.find((item) => item.id === row.eventId)!;
        const fullName = `${row.firstName} ${row.lastName}`.trim();
        return [{
          id: row.id,
          email,
          phone: member?.phone ?? row.phone,
          consents: member ? Object.fromEntries(member.messagingConsents.map((channel) => [channel, true])) : {},
          name: fullName,
          optOut: member?.bulkMailOptOut ?? false,
          vars: { firstName: row.firstName, lastName: row.lastName, fullName, eventTitle: event.title, eventDate: event.startDate.toLocaleDateString("de-DE") },
        }];
      });
    },
  },
]);
