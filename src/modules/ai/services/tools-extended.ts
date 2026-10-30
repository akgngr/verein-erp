import "server-only";

import { z } from "zod";

import { parseListParams } from "@/shared/list-params";
import { can } from "@/shared/permissions/define";

import { coursesPermissions } from "@/modules/courses";
import { getCourse, getCourseStats } from "@/modules/courses/server";
import { documentsPermissions } from "@/modules/documents";
import { DOCUMENT_DEFAULT_SORT, DOCUMENT_SORTABLE_FIELDS, getDocumentDetail, getDocumentFileText, listDocuments } from "@/modules/documents/server";
import { inventoryPermissions } from "@/modules/inventory";
import { getInventoryCategorySummary, getInventoryStats, listInventoryItems } from "@/modules/inventory/server";
import { meetingsPermissions } from "@/modules/meetings";
import { getMeeting, listMeetings, MEETING_DEFAULT_SORT, MEETING_SORTABLE_FIELDS } from "@/modules/meetings/server";
import { organizationPermissions } from "@/modules/organization";
import { getOrganizationProfile } from "@/modules/organization/server";
import { progressPermissions } from "@/modules/progress";
import { getProgressStats } from "@/modules/progress/server";
import { studentsPermissions } from "@/modules/students";
import { getStudentStats } from "@/modules/students/server";

import { define, euros } from "./tool-kit";

/**
 * Evrak, toplantı, envanter, kurs, öğrenci, öğrenci takibi ve dernek bilgisi araçları.
 * KVKK/DSGVO: kurs/öğrenci/devam araçları yalnızca istatistik döndürür (öğretmen, öğrenci, veli
 * adı yok); toplantılarda katılımcı listesi, envanterde zimmetli üye, evrakta sorumlu kişi
 * dönmez. Evrak karşı tarafı ve ek içerikleri modele gitmeden maskeleme katmanından geçer.
 */
const NO_INPUT = { type: "object", properties: {}, required: [], additionalProperties: false } as const;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const day = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : null);
const proposed = { status: "proposed", note: "A confirmation card was shown to the user; nothing changes until they confirm." }; // i18n-ignore (model-facing tool text)

export const EXTENDED_TOOLS = [
  // ── Evrak ───────────────────────────────────────────────────────────────
  define({
    name: "list_documents",
    module: "documents",
    operation: "read",
    allowed: (user) => can(user.role, documentsPermissions, "view"),
    description: "Search the correspondence register (incoming/outgoing letters). Returns id, registry number, dates, counterparty, subject, status, category and file count. Optional free-text query and filters.", // i18n-ignore (model-facing tool text)
    schema: z.object({ query: z.string().max(100).nullable(), status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]).nullable(), direction: z.enum(["INCOMING", "OUTGOING"]).nullable() }),
    inputSchema: {
      type: "object",
      properties: {
        query: { type: ["string", "null"] },
        status: { type: ["string", "null"], enum: ["OPEN", "IN_PROGRESS", "COMPLETED", "ARCHIVED", null] },
        direction: { type: ["string", "null"], enum: ["INCOMING", "OUTGOING", null] },
      },
      required: ["query", "status", "direction"],
      additionalProperties: false,
    },
    run: async ({ query, status, direction }, { user }) => {
      const params = parseListParams(
        { pageSize: "50", ...(query ? { q: query } : {}), ...(status ? { status } : {}), ...(direction ? { direction } : {}) },
        { sortableFields: DOCUMENT_SORTABLE_FIELDS, defaultSort: DOCUMENT_DEFAULT_SORT, defaultDir: "desc", filterKeys: ["direction", "status", "categoryId", "assigneeId", "from", "to", "mine", "overdue"] },
      );
      const result = await listDocuments(params, user.id);
      return {
        total: result.total,
        documents: result.rows.map((row) => ({
          id: row.id,
          registryNumber: row.registryNumber,
          direction: row.direction,
          documentDate: day(row.documentDate),
          counterparty: row.counterparty,
          subject: row.subject,
          status: row.status,
          dueDate: day(row.dueDate),
          overdue: row.isOverdue,
          category: row.categoryName,
          fileCount: row.fileCount,
        })),
      };
    },
  }),
  define({
    name: "get_document",
    module: "documents",
    operation: "read",
    allowed: (user) => can(user.role, documentsPermissions, "view"),
    description: "Details of one document: subject, summary, dates, status, category, reply chain and attached files (id, name, type). Use read_document_file to read an attachment.", // i18n-ignore (model-facing tool text)
    schema: z.object({ documentId: z.string().min(1).max(100) }),
    inputSchema: { type: "object", properties: { documentId: { type: "string" } }, required: ["documentId"], additionalProperties: false },
    run: async ({ documentId }) => {
      const doc = await getDocumentDetail(documentId);
      if (!doc) return { status: "not_found" };
      return {
        id: doc.id,
        registryNumber: doc.registryNumber,
        direction: doc.direction,
        documentDate: day(doc.documentDate),
        counterparty: doc.counterparty,
        referenceNumber: doc.referenceNumber,
        subject: doc.subject,
        summary: doc.summary,
        status: doc.status,
        dueDate: day(doc.dueDate),
        category: doc.categoryName,
        replyTo: doc.replyTo ? { registryNumber: doc.replyTo.registryNumber, subject: doc.replyTo.subject } : null,
        files: doc.files.map((file) => ({ id: file.id, name: file.originalName, mimeType: file.mimeType })),
      };
    },
  }),
  define({
    name: "read_document_file",
    module: "documents",
    operation: "read",
    allowed: (user) => can(user.role, documentsPermissions, "view"),
    description: "Reads the text of an attached file (PDF with text layer, Word .docx, Excel .xlsx) so you can summarise it or answer questions. Scanned PDFs and images have no text. Personal identifiers in the text are masked.", // i18n-ignore (model-facing tool text)
    schema: z.object({ fileId: z.string().min(1).max(100) }),
    inputSchema: { type: "object", properties: { fileId: { type: "string" } }, required: ["fileId"], additionalProperties: false },
    run: async ({ fileId }) => {
      const file = await getDocumentFileText(fileId);
      if (!file) return { status: "not_found" };
      return { name: file.originalName, mimeType: file.mimeType, text: file.text, truncated: file.truncated, unavailableReason: file.reason ?? null };
    },
  }),
  define({
    name: "propose_document",
    module: "documents",
    operation: "create",
    allowed: (user) => can(user.role, documentsPermissions, "create"),
    description: "PROPOSES registering a new incoming or outgoing document. Dates YYYY-MM-DD. Nothing is created until the user confirms.", // i18n-ignore (model-facing tool text)
    schema: z.object({
      direction: z.enum(["INCOMING", "OUTGOING"]),
      documentDate: z.string().regex(DATE),
      counterparty: z.string().min(2).max(200),
      subject: z.string().min(3).max(300),
      summary: z.string().max(2000).nullable(),
      dueDate: z.string().regex(DATE).nullable(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        direction: { type: "string", enum: ["INCOMING", "OUTGOING"] },
        documentDate: { type: "string" },
        counterparty: { type: "string" },
        subject: { type: "string" },
        summary: { type: ["string", "null"] },
        dueDate: { type: ["string", "null"] },
      },
      required: ["direction", "documentDate", "counterparty", "subject", "summary", "dueDate"],
      additionalProperties: false,
    },
    run: async ({ subject, ...rest }, { proposals }) => {
      proposals.push({ kind: "createDocument", title: subject, ...rest });
      return proposed;
    },
  }),
  define({
    name: "propose_document_status",
    module: "documents",
    operation: "update",
    allowed: (user) => can(user.role, documentsPermissions, "update"),
    description: "PROPOSES changing a document's status (id from list_documents).", // i18n-ignore (model-facing tool text)
    schema: z.object({ documentId: z.string().min(1).max(100), status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]) }),
    inputSchema: {
      type: "object",
      properties: { documentId: { type: "string" }, status: { type: "string", enum: ["OPEN", "IN_PROGRESS", "COMPLETED", "ARCHIVED"] } },
      required: ["documentId", "status"],
      additionalProperties: false,
    },
    run: async ({ documentId, status }, { proposals }) => {
      const doc = await getDocumentDetail(documentId);
      if (!doc) return { status: "not_found" };
      proposals.push({ kind: "changeDocumentStatus", documentId: doc.id, title: `${doc.registryNumber} – ${doc.subject}`, status });
      return proposed;
    },
  }),
  define({
    name: "propose_delete_document",
    module: "documents",
    operation: "delete",
    allowed: (user) => can(user.role, documentsPermissions, "delete"),
    description: "PROPOSES deleting a document (id from list_documents).", // i18n-ignore (model-facing tool text)
    schema: z.object({ documentId: z.string().min(1).max(100) }),
    inputSchema: { type: "object", properties: { documentId: { type: "string" } }, required: ["documentId"], additionalProperties: false },
    run: async ({ documentId }, { proposals }) => {
      const doc = await getDocumentDetail(documentId);
      if (!doc) return { status: "not_found" };
      proposals.push({ kind: "deleteDocument", documentId: doc.id, title: `${doc.registryNumber} – ${doc.subject}` });
      return proposed;
    },
  }),

  // ── Toplantılar ─────────────────────────────────────────────────────────
  define({
    name: "list_meetings",
    module: "meetings",
    operation: "read",
    allowed: (user) => can(user.role, meetingsPermissions, "view"),
    description: "Lists meetings (newest first): id, number, type, title, date, time, location, status, decision and open action item counts. Optional date range YYYY-MM-DD.", // i18n-ignore (model-facing tool text)
    schema: z.object({ from: z.string().regex(DATE).nullable(), to: z.string().regex(DATE).nullable() }),
    inputSchema: { type: "object", properties: { from: { type: ["string", "null"] }, to: { type: ["string", "null"] } }, required: ["from", "to"], additionalProperties: false },
    run: async ({ from, to }) => {
      const params = parseListParams(
        { pageSize: "50", ...(from ? { from } : {}), ...(to ? { to } : {}) },
        { sortableFields: MEETING_SORTABLE_FIELDS, defaultSort: MEETING_DEFAULT_SORT, defaultDir: "desc", filterKeys: ["type", "status", "from", "to"] },
      );
      const result = await listMeetings(params);
      return result.rows.map((row) => ({ id: row.id, number: row.meetingNumber, type: row.type, title: row.title, date: day(row.meetingDate), startTime: row.startTime, location: row.location, status: row.status, decisions: row.decisionCount, openActionItems: row.openActionItemCount }));
    },
  }),
  define({
    name: "get_meeting",
    module: "meetings",
    operation: "read",
    allowed: (user) => can(user.role, meetingsPermissions, "view"),
    description: "One meeting's agenda (titles, descriptions, discussion notes) and decisions (text, result, votes). Attendee names are not included.", // i18n-ignore (model-facing tool text)
    schema: z.object({ meetingId: z.string().min(1).max(100) }),
    inputSchema: { type: "object", properties: { meetingId: { type: "string" } }, required: ["meetingId"], additionalProperties: false },
    run: async ({ meetingId }) => {
      const meeting = await getMeeting(meetingId);
      if (!meeting) return { status: "not_found" };
      return {
        number: meeting.meetingNumber,
        type: meeting.type,
        title: meeting.title,
        date: day(meeting.meetingDate),
        status: meeting.status,
        attendeeCount: meeting.attendees.length,
        agenda: meeting.agendaItems.map((item) => ({ position: item.position, title: item.title, description: item.description, discussion: item.discussion })),
        decisions: meeting.decisions.map((decision) => ({ number: decision.decisionNumber, text: decision.text, result: decision.result, agendaItem: decision.agendaItemTitle, votesFor: decision.votesFor, votesAgainst: decision.votesAgainst, votesAbstain: decision.votesAbstain })),
      };
    },
  }),
  define({
    name: "propose_meeting",
    module: "meetings",
    operation: "create",
    allowed: (user) => can(user.role, meetingsPermissions, "create"),
    description: "PROPOSES creating a meeting. Date YYYY-MM-DD, time HH:mm. Nothing is created until the user confirms.", // i18n-ignore (model-facing tool text)
    schema: z.object({
      type: z.enum(["BOARD", "GENERAL_ASSEMBLY", "COMMITTEE", "OTHER"]),
      title: z.string().min(3).max(200),
      meetingDate: z.string().regex(DATE),
      startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
      location: z.string().max(200).nullable(),
      description: z.string().max(2000).nullable(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["BOARD", "GENERAL_ASSEMBLY", "COMMITTEE", "OTHER"] },
        title: { type: "string" },
        meetingDate: { type: "string" },
        startTime: { type: ["string", "null"] },
        location: { type: ["string", "null"] },
        description: { type: ["string", "null"] },
      },
      required: ["type", "title", "meetingDate", "startTime", "location", "description"],
      additionalProperties: false,
    },
    run: async (input, { proposals }) => {
      proposals.push({ kind: "createMeeting", ...input });
      return proposed;
    },
  }),
  define({
    name: "propose_meeting_status",
    module: "meetings",
    operation: "update",
    allowed: (user) => can(user.role, meetingsPermissions, "update"),
    description: "PROPOSES changing a meeting's status (PLANNED, HELD, APPROVED, CANCELLED). A reason (min. 5 chars) is required for cancelling.", // i18n-ignore (model-facing tool text)
    schema: z.object({ meetingId: z.string().min(1).max(100), status: z.enum(["PLANNED", "HELD", "APPROVED", "CANCELLED"]), reason: z.string().max(500).nullable() }),
    inputSchema: {
      type: "object",
      properties: { meetingId: { type: "string" }, status: { type: "string", enum: ["PLANNED", "HELD", "APPROVED", "CANCELLED"] }, reason: { type: ["string", "null"] } },
      required: ["meetingId", "status", "reason"],
      additionalProperties: false,
    },
    run: async ({ meetingId, status, reason }, { proposals }) => {
      const meeting = await getMeeting(meetingId);
      if (!meeting) return { status: "not_found" };
      proposals.push({ kind: "changeMeetingStatus", meetingId: meeting.id, title: `${meeting.meetingNumber} – ${meeting.title}`, status, reason });
      return proposed;
    },
  }),
  define({
    name: "propose_delete_meeting",
    module: "meetings",
    operation: "delete",
    allowed: (user) => can(user.role, meetingsPermissions, "delete"),
    description: "PROPOSES deleting a meeting (id from list_meetings).", // i18n-ignore (model-facing tool text)
    schema: z.object({ meetingId: z.string().min(1).max(100) }),
    inputSchema: { type: "object", properties: { meetingId: { type: "string" } }, required: ["meetingId"], additionalProperties: false },
    run: async ({ meetingId }, { proposals }) => {
      const meeting = await getMeeting(meetingId);
      if (!meeting) return { status: "not_found" };
      proposals.push({ kind: "deleteMeeting", meetingId: meeting.id, title: `${meeting.meetingNumber} – ${meeting.title}` });
      return proposed;
    },
  }),

  // ── Envanter ve demirbaş ────────────────────────────────────────────────
  define({
    name: "get_inventory_overview",
    module: "inventory",
    operation: "read",
    allowed: (user) => can(user.role, inventoryPermissions, "view"),
    description: "Inventory totals: item count, quantities in use / broken, and per-category summary.", // i18n-ignore (model-facing tool text)
    schema: z.object({}),
    inputSchema: NO_INPUT,
    run: async () => ({ totals: await getInventoryStats(), byCategory: await getInventoryCategorySummary() }),
  }),
  define({
    name: "list_inventory_items",
    module: "inventory",
    operation: "read",
    allowed: (user) => can(user.role, inventoryPermissions, "view"),
    description: "Lists inventory items: id, name, category, status, quantity, location, purchase date and price (EUR). Assigned member is not included.", // i18n-ignore (model-facing tool text)
    schema: z.object({ query: z.string().max(100).nullable(), status: z.enum(["IN_USE", "IDLE", "BROKEN", "SCRAPPED"]).nullable() }),
    inputSchema: {
      type: "object",
      properties: { query: { type: ["string", "null"] }, status: { type: ["string", "null"], enum: ["IN_USE", "IDLE", "BROKEN", "SCRAPPED", null] } },
      required: ["query", "status"],
      additionalProperties: false,
    },
    run: async ({ query, status }) => {
      const result = await listInventoryItems({ search: query ?? "", category: null, status, sort: "name", direction: "asc", requestedSort: null, requestedDirection: null, page: 1, pageSize: 100 });
      return {
        total: result.total,
        items: result.items.map((item) => ({ id: item.id, name: item.name, category: item.category, status: item.status, quantity: item.quantity, location: item.location, purchaseDate: item.purchaseDate, purchasePriceEur: item.purchasePrice })),
      };
    },
  }),
  define({
    name: "propose_inventory_item",
    module: "inventory",
    operation: "create",
    allowed: (user) => can(user.role, inventoryPermissions, "create"),
    description: "PROPOSES adding an inventory item. Nothing is created until the user confirms.", // i18n-ignore (model-facing tool text)
    schema: z.object({
      name: z.string().min(1).max(200),
      category: z.enum(["ELECTRONICS", "FURNITURE", "KITCHEN", "OFFICE", "SPORTS", "OTHER"]),
      quantity: z.number().int().min(1).max(100000),
      status: z.enum(["IN_USE", "IDLE", "BROKEN", "SCRAPPED"]),
      location: z.string().max(200).nullable(),
      description: z.string().max(2000).nullable(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        category: { type: "string", enum: ["ELECTRONICS", "FURNITURE", "KITCHEN", "OFFICE", "SPORTS", "OTHER"] },
        quantity: { type: "integer" },
        status: { type: "string", enum: ["IN_USE", "IDLE", "BROKEN", "SCRAPPED"] },
        location: { type: ["string", "null"] },
        description: { type: ["string", "null"] },
      },
      required: ["name", "category", "quantity", "status", "location", "description"],
      additionalProperties: false,
    },
    run: async ({ name, ...rest }, { proposals }) => {
      proposals.push({ kind: "createInventory", title: name, ...rest });
      return proposed;
    },
  }),
  define({
    name: "propose_inventory_status",
    module: "inventory",
    operation: "update",
    allowed: (user) => can(user.role, inventoryPermissions, "update"),
    description: "PROPOSES changing an inventory item's status (id from list_inventory_items).", // i18n-ignore (model-facing tool text)
    schema: z.object({ itemId: z.string().min(1).max(100), name: z.string().max(200), status: z.enum(["IN_USE", "IDLE", "BROKEN", "SCRAPPED"]) }),
    inputSchema: {
      type: "object",
      properties: { itemId: { type: "string" }, name: { type: "string", description: "Item name as listed" }, status: { type: "string", enum: ["IN_USE", "IDLE", "BROKEN", "SCRAPPED"] } }, // i18n-ignore (model-facing tool text)
      required: ["itemId", "name", "status"],
      additionalProperties: false,
    },
    run: async ({ itemId, name, status }, { proposals }) => {
      proposals.push({ kind: "changeInventoryStatus", itemId, title: name, status });
      return proposed;
    },
  }),
  define({
    name: "propose_delete_inventory_item",
    module: "inventory",
    operation: "delete",
    allowed: (user) => can(user.role, inventoryPermissions, "delete"),
    description: "PROPOSES deleting an inventory item (id from list_inventory_items).", // i18n-ignore (model-facing tool text)
    schema: z.object({ itemId: z.string().min(1).max(100), name: z.string().max(200) }),
    inputSchema: { type: "object", properties: { itemId: { type: "string" }, name: { type: "string" } }, required: ["itemId", "name"], additionalProperties: false },
    run: async ({ itemId, name }, { proposals }) => {
      proposals.push({ kind: "deleteInventory", itemId, title: name });
      return proposed;
    },
  }),

  // ── Kurslar (yalnızca istatistik) ───────────────────────────────────────
  define({
    name: "get_course_statistics",
    module: "courses",
    operation: "read",
    allowed: (user) => can(user.role, coursesPermissions, "view"),
    description: "Course statistics: courses by status, list of courses (id, code, title, kind, status, start date, number of active enrolments and teachers), active enrolments, upcoming sessions, open/paid fees (EUR). No teacher, student or guardian names.", // i18n-ignore (model-facing tool text)
    schema: z.object({}),
    inputSchema: NO_INPUT,
    run: async () => {
      const stats = await getCourseStats();
      return { ...stats, charges: { openEur: euros(stats.charges.openCents), paidEur: euros(stats.charges.paidCents), openCount: stats.charges.openCount } };
    },
  }),
  define({
    name: "propose_course",
    module: "courses",
    operation: "create",
    allowed: (user) => can(user.role, coursesPermissions, "create"),
    description: "PROPOSES creating a free course in PLANNED status (fees and teachers are set later in the course form). Dates YYYY-MM-DD.", // i18n-ignore (model-facing tool text)
    schema: z.object({
      kind: z.enum(["COURSE", "TUTORING"]),
      title: z.string().min(2).max(150),
      subject: z.string().max(80).nullable(),
      startDate: z.string().regex(DATE),
      endDate: z.string().regex(DATE).nullable(),
      description: z.string().max(2000).nullable(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["COURSE", "TUTORING"] },
        title: { type: "string" },
        subject: { type: ["string", "null"] },
        startDate: { type: "string" },
        endDate: { type: ["string", "null"] },
        description: { type: ["string", "null"] },
      },
      required: ["kind", "title", "subject", "startDate", "endDate", "description"],
      additionalProperties: false,
    },
    run: async ({ kind, ...rest }, { proposals }) => {
      proposals.push({ kind: "createCourse", courseKind: kind, ...rest });
      return proposed;
    },
  }),
  define({
    name: "propose_course_status",
    module: "courses",
    operation: "update",
    allowed: (user) => can(user.role, coursesPermissions, "update"),
    description: "PROPOSES changing a course's status (id from get_course_statistics).", // i18n-ignore (model-facing tool text)
    schema: z.object({ courseId: z.string().min(1).max(100), status: z.enum(["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"]) }),
    inputSchema: {
      type: "object",
      properties: { courseId: { type: "string" }, status: { type: "string", enum: ["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"] } },
      required: ["courseId", "status"],
      additionalProperties: false,
    },
    run: async ({ courseId, status }, { proposals }) => {
      const course = await getCourse(courseId);
      if (!course) return { status: "not_found" };
      proposals.push({ kind: "changeCourseStatus", courseId: course.id, title: `${course.code} – ${course.title}`, status });
      return proposed;
    },
  }),
  define({
    name: "propose_delete_course",
    module: "courses",
    operation: "delete",
    allowed: (user) => can(user.role, coursesPermissions, "delete"),
    description: "PROPOSES deleting a course (id from get_course_statistics).", // i18n-ignore (model-facing tool text)
    schema: z.object({ courseId: z.string().min(1).max(100) }),
    inputSchema: { type: "object", properties: { courseId: { type: "string" } }, required: ["courseId"], additionalProperties: false },
    run: async ({ courseId }, { proposals }) => {
      const course = await getCourse(courseId);
      if (!course) return { status: "not_found" };
      proposals.push({ kind: "deleteCourse", courseId: course.id, title: `${course.code} – ${course.title}` });
      return proposed;
    },
  }),

  // ── Öğrenciler, öğrenci takibi, dernek bilgileri (yalnızca okuma) ────────
  define({
    name: "get_student_statistics",
    module: "students",
    operation: "read",
    allowed: (user) => can(user.role, studentsPermissions, "view"),
    description: "Student statistics: active/inactive students, number of guardians and guardians with a SEPA mandate. Counts only.", // i18n-ignore (model-facing tool text)
    schema: z.object({}),
    inputSchema: NO_INPUT,
    run: async () => getStudentStats(),
  }),
  define({
    name: "get_progress_statistics",
    module: "progress",
    operation: "read",
    allowed: (user) => can(user.role, progressPermissions, "view"),
    description: "Student progress statistics for the last N days: attendance (present/late/absent/excused, rate %), number of assessments and notes. Counts only.", // i18n-ignore (model-facing tool text)
    schema: z.object({ days: z.number().int().min(1).max(365) }),
    inputSchema: { type: "object", properties: { days: { type: "integer" } }, required: ["days"], additionalProperties: false },
    run: async ({ days }) => getProgressStats(days),
  }),
  define({
    name: "get_organization_info",
    module: "organization",
    operation: "read",
    allowed: (user) => can(user.role, organizationPermissions, "view"),
    description: "The association's public master data: name, address, contact, register court/number, charitable purposes. Tax number and tax-office data are excluded.", // i18n-ignore (model-facing tool text)
    schema: z.object({}),
    inputSchema: NO_INPUT,
    run: async () => {
      const profile = await getOrganizationProfile();
      // KARAR: vergi numarası, vergi dairesi ve muafiyet belgesi ayrıntıları bilinçli olarak hariç.
      return {
        name: profile.name,
        address: [profile.street, [profile.postalCode, profile.city].filter(Boolean).join(" "), profile.country].filter(Boolean).join(", ") || null,
        email: profile.email,
        phone: profile.phone,
        website: profile.website,
        registerCourt: profile.registerCourt,
        registerNumber: profile.registerNumber,
        charitablePurposes: profile.charitablePurposes,
        membershipFeesDeductible: profile.membershipFeesDeductible,
      };
    },
  }),
];
