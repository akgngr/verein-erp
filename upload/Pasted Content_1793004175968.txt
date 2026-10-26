# TASK: Association Management System — Phase 2: Meetings & Minutes Module

Phase 0 (core infrastructure, modular architecture) and Phase 1 (incoming/outgoing documents module) are complete and working. In this phase you will turn the `meetings` module from its placeholder skeleton into a fully working meeting-minutes system: meetings, agenda, attendees, discussion notes, decisions, action items, attachments, minutes approval workflow, and minutes PDF export.

All decisions in this document are final. Do not ask questions, do not propose alternatives, do not add libraries that are not explicitly allowed in Section 2. If something is ambiguous, choose the simplest and safest option and leave a short `// KARAR:` comment in the code.

LANGUAGE RULES (unchanged from Phase 0): all user-facing UI text, labels, toasts, validation messages and the PDF content are in TURKISH. All code, identifiers, file names, table and column names are in ENGLISH. The Turkish UI strings you must use are given in quotes throughout this document.

BEFORE YOU START: read the existing code. Especially `src/shared/*`, `src/modules/auth/*`, `src/modules/users/*`, `src/modules/documents/*` (the Phase 1 reference implementation for numbering, optimistic concurrency, soft delete, file upload/download, audit, filters, stats), `src/registry.ts`, the ESLint boundary rules and `README.md`. New code must follow the same patterns, naming and style exactly (`createAction`, `requirePermission`, `parseListParams`, `useListQueryState`, `DataTable`, form components, `ActionResult`, `writeAudit`, `listActiveUserOptions`).

## 1. SCOPE

Build: Prisma schema, meeting and decision numbering, meeting CRUD (soft delete), agenda items with ordering and discussion notes, attendees with attendance and quorum indicator, decisions with voting counts, action items with a cross-meeting task list, attachments (including signed minutes scans), status/approval workflow with locking, minutes PDF export, dashboard card, audit integration, and a refactor that moves generic file handling into `shared`.

## 2. ARCHITECTURE RULES AND PERMITTED CHANGES

- All Phase 0 architecture rules apply unchanged: three layers, dependency direction, public entry points (`index.ts`, `server.ts`, `ui.ts`), ESLint boundary rules, thin route files. `pnpm lint` must stay clean.
- The `meetings` module depends only on `auth` (and `shared`). Do NOT import `documents`, `users` or `audit` modules. Do NOT create Prisma foreign keys to other modules' tables: reference users by plain `...Id` + snapshot `...Label` string fields (same approach as Phase 1).
- PERMITTED changes outside the `meetings` module (nothing else may change):
  1. `shared/permissions/define.ts`: extend `PermissionAction` with `"approve"`. Existing modules are unaffected.
  2. `shared/files/`: extract generic file handling from the `documents` module (Section 8) and refactor `documents` to use it with NO behavior change.
  3. `shared/env.ts` and `.env.example`: add `ORGANIZATION_NAME` (default `"Dernek"`).
  4. Dependency: `@react-pdf/renderer` (PDF export only). Font files per Section 10.
  5. `next.config` and `Dockerfile`: only what is needed so the PDF route and its font files work in the `standalone` build (Section 10).
  6. Dashboard page (`src/app/(dashboard)/page.tsx`): update the Meetings card (Section 11).
  7. `prisma/seed.ts`: no change required in this phase.
- The module's standard structure from Phase 0 (Section 3.3) applies. As in Phase 1, route-handler logic lives in `handlers/` and is exported via `server.ts`; files under `src/app/api/...` are thin wrappers.

## 3. FILE STRUCTURE

```
prisma/schema/meetings.prisma
src/shared/files/
  file-types.ts                  # registry: extension -> mime types + signature check
  validation.ts                  # validateUpload({ file, allowedExtensions, maxBytes })
  storage.ts                     # saveFile, openReadStream, resolveSafePath (import "server-only")
  http.ts                        # parseSingleFileUpload(request), buildDownloadResponse(...)
src/modules/meetings/
  index.ts                       # types, zod schemas, meetingsPermissions, moduleConfig, constants
  server.ts                      # queries, services, actions, handlers (import "server-only")
  ui.ts                          # views
  module.config.ts
  permissions.ts
  types.ts
  constants.ts                   # Turkish labels, colors, status transition map, file limits
  schemas/
    meeting.ts
    agenda-item.ts
    attendee.ts
    decision.ts
    action-item.ts
  queries/
    list-meetings.ts
    get-meeting.ts               # full detail: agenda, attendees, decisions, action items, files
    list-action-items.ts         # cross-meeting task list
    get-meeting-stats.ts
    list-copy-sources.ts         # previous meetings of same type for "copy from"
  services/
    meeting-number.ts            # meeting + decision number generation (transactional)
    meeting-guards.ts            # assertMeetingEditable, assertTransitionAllowed
    quorum.ts                    # computeQuorum(meeting)
  actions/
    meeting-actions.ts           # create, update, delete
    change-status.ts             # status transitions incl. approve / reopen
    agenda-actions.ts            # add, update, delete, move, update discussion
    attendee-actions.ts          # add user, add guest, update, remove, mark all present
    decision-actions.ts          # add, update, delete
    action-item-actions.ts       # add, update, delete, set status
    delete-file.ts
  handlers/
    upload-file.ts
    download-file.ts
    export-minutes-pdf.ts
  pdf/
    minutes-document.tsx         # @react-pdf/renderer document component
    fonts.ts                     # font registration (Turkish glyph support)
  assets/fonts/                  # committed TTF files
  components/
    meeting-form.tsx
    status-badge.tsx
    type-badge.tsx
    status-menu.tsx              # shows only transitions the user may perform
    quorum-banner.tsx
    stats-cards.tsx
    list-filters.tsx
    agenda-tab.tsx
    agenda-item-modal.tsx
    discussion-editor.tsx
    attendees-tab.tsx
    attendee-add-modal.tsx
    decisions-tab.tsx
    decision-modal.tsx
    action-items-tab.tsx
    action-item-modal.tsx
    files-tab.tsx                # uses shared file-uploader pattern from Phase 1 (module-local copy or adapt)
  views/
    meeting-list-view.tsx
    meeting-create-view.tsx
    meeting-detail-view.tsx
    meeting-edit-view.tsx
    action-item-list-view.tsx
src/app/(dashboard)/toplantilar/page.tsx
src/app/(dashboard)/toplantilar/yeni/page.tsx
src/app/(dashboard)/toplantilar/[id]/page.tsx
src/app/(dashboard)/toplantilar/[id]/duzenle/page.tsx
src/app/(dashboard)/toplantilar/gorevler/page.tsx
src/app/api/meetings/[id]/files/route.ts           # POST upload
src/app/api/meetings/files/[fileId]/route.ts       # GET download/preview
src/app/api/meetings/[id]/minutes-pdf/route.ts     # GET PDF
```
The Phase 0 placeholder view and `toplantilar/page.tsx` content are replaced. If a Phase 1 component (file uploader, status badge pattern) is needed in `meetings`, you may NOT import it from `documents`; either build a module-local component or, if it is fully generic, move it to `shared/components` as part of the shared files refactor and update `documents` to use it.

## 4. DATABASE (`prisma/schema/meetings.prisma`)

```prisma
enum MeetingType {
  BOARD              // Yönetim Kurulu
  GENERAL_ASSEMBLY   // Genel Kurul
  COMMITTEE          // Komisyon
  OTHER              // Diğer
}

enum MeetingStatus {
  PLANNED     // Planlandı
  HELD        // Yapıldı (tutanak taslağı)
  APPROVED    // Onaylandı
  CANCELLED   // İptal edildi
}

enum AttendeeRole {
  CHAIRPERSON  // Başkan
  SECRETARY    // Sekreter
  MEMBER       // Üye
  GUEST        // Konuk
}

enum AttendanceStatus {
  INVITED         // Davetli
  PRESENT         // Katıldı
  ABSENT_EXCUSED  // Mazeretli
  ABSENT          // Katılmadı
}

enum DecisionResult {
  ACCEPTED   // Kabul edildi
  REJECTED   // Reddedildi
  POSTPONED  // Ertelendi
}

enum ActionItemStatus {
  OPEN  // Açık
  DONE  // Tamamlandı
}

enum MeetingCounterKind {
  MEETING
  DECISION
}

model MeetingCounter {
  kind    MeetingCounterKind
  year    Int
  lastSeq Int                @default(0)

  @@id([kind, year])
}

model Meeting {
  id               String        @id @default(cuid())
  year             Int
  sequence         Int
  meetingNumber    String        @unique        // TOP-2026-001
  type             MeetingType
  title            String
  meetingDate      DateTime      @db.Date
  startTime        String?                      // "HH:mm" local (Europe/Berlin)
  endTime          String?
  location         String?
  description      String?                      // purpose / notes before the meeting
  quorumRequired   Int?                         // minimum number of PRESENT attendees
  status           MeetingStatus @default(PLANNED)

  approvedAt       DateTime?
  approvedById     String?
  approvedByLabel  String?

  createdById      String
  createdByLabel   String
  updatedById      String?
  updatedByLabel   String?

  deletedAt        DateTime?
  deletedById      String?
  deletedByLabel   String?

  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  agendaItems      AgendaItem[]
  attendees        MeetingAttendee[]
  decisions        MeetingDecision[]
  actionItems      ActionItem[]
  files            MeetingFile[]

  @@unique([year, sequence])
  @@index([type])
  @@index([status])
  @@index([meetingDate])
  @@index([deletedAt])
}

model AgendaItem {
  id          String   @id @default(cuid())
  meetingId   String
  meeting     Meeting  @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  position    Int                            // 1-based, contiguous per meeting
  title       String
  description String?                        // planned content
  discussion  String?                        // minutes text: what was discussed
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  decisions   MeetingDecision[]

  @@index([meetingId, position])
}

model MeetingAttendee {
  id         String           @id @default(cuid())
  meetingId  String
  meeting    Meeting          @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  userId     String?                          // FK DEĞİL; null = external guest
  name       String                           // snapshot of display name
  role       AttendeeRole     @default(MEMBER)
  attendance AttendanceStatus @default(INVITED)
  note       String?
  createdAt  DateTime         @default(now())

  @@unique([meetingId, userId])
  @@index([meetingId])
}

model MeetingDecision {
  id             String         @id @default(cuid())
  meetingId      String
  meeting        Meeting        @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  agendaItemId   String?
  agendaItem     AgendaItem?    @relation(fields: [agendaItemId], references: [id], onDelete: SetNull)
  year           Int
  sequence       Int
  decisionNumber String                       // "2026/7"
  text           String
  result         DecisionResult
  votesFor       Int?
  votesAgainst   Int?
  votesAbstain   Int?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  actionItems    ActionItem[]

  @@unique([year, sequence])
  @@index([meetingId])
}

model ActionItem {
  id                 String           @id @default(cuid())
  meetingId          String
  meeting            Meeting          @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  decisionId         String?
  decision           MeetingDecision? @relation(fields: [decisionId], references: [id], onDelete: SetNull)
  description        String
  assigneeId         String?                    // FK DEĞİL
  assigneeLabel      String?                    // user label snapshot OR free-text name
  dueDate            DateTime?        @db.Date
  status             ActionItemStatus @default(OPEN)
  completedAt        DateTime?
  completedById      String?
  completedByLabel   String?
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  @@index([meetingId])
  @@index([status])
  @@index([dueDate])
  @@index([assigneeId])
}

model MeetingFile {
  id              String    @id @default(cuid())
  meetingId       String
  meeting         Meeting   @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  originalName    String
  storedName      String    @unique
  storagePath     String               // relative to UPLOAD_DIR: meetings/<year>/<meetingId>/<storedName>
  mimeType        String
  size            Int
  uploadedById    String
  uploadedByLabel String
  createdAt       DateTime  @default(now())
  deletedAt       DateTime?

  @@index([meetingId])
}
```
- Date-only fields (`meetingDate`, `dueDate`) are handled exactly as in Phase 1 (no timezone shift; displayed `dd.MM.yyyy`).
- Create the migration. Existing Phase 0/1 migrations stay untouched.

## 5. BUSINESS RULES

1. **Meeting number**: `TOP-<year>-<sequence padded to 3 digits>` (pads grow beyond 999). `year` = calendar year of `meetingDate`. Sequence is per year across all meeting types. Generated atomically in a `prisma.$transaction` with `MeetingCounter` upsert (`kind: MEETING`, `lastSeq: { increment: 1 }`), the same technique and `P2002` retry (max 3) as Phase 1. The number is immutable: it is not editable and stays unchanged even if `meetingDate` later moves to another year (`// KARAR:` note).
2. **Decision number**: `<year>/<sequence>` (example `2026/7`), `year` = year of the meeting's date, sequence per year across all meetings (`MeetingCounter` kind `DECISION`), generated atomically inside the transaction that creates the decision. Deleting a decision never frees its number (gaps are acceptable).
3. **Status workflow** (`constants.ts` holds the transition map; `meeting-guards.ts` enforces it on the server):

   | From | To | Required permission | Extra conditions |
   |---|---|---|---|
   | PLANNED | HELD | update | none |
   | PLANNED | CANCELLED | update | none |
   | CANCELLED | PLANNED | update | none |
   | HELD | APPROVED | approve | at least 1 agenda item and at least 1 attendee with attendance PRESENT |
   | APPROVED | HELD (reopen) | approve | mandatory `reason` (5–500 chars), stored in the audit record |

   Any other transition is rejected. Approving sets `approvedAt`, `approvedById`, `approvedByLabel`. Reopening clears them. If `quorumRequired` is set and not reached, approval is still allowed but the UI confirmation dialog must warn: "Toplantı yeter sayısı sağlanmamış. Yine de onaylamak istiyor musunuz?".
4. **Locking** (`assertMeetingEditable(meeting, scope)`, called by EVERY action; UI hiding is not sufficient):
   - Scope `content` (meeting fields, agenda, discussion notes, attendees, decisions, action item add/edit/delete): allowed only when status is PLANNED or HELD.
   - Scope `actionStatus` (marking an action item DONE/OPEN): allowed in every status except when the meeting is soft-deleted (follow-up continues after approval).
   - Scope `files` (upload): allowed in every status except soft-deleted (signed scans are uploaded after approval). File deletion: when status is APPROVED it requires the `delete` permission (ADMIN); otherwise `update`.
   - Soft-deleted meetings accept no operation and are treated as not found.
   - Locked-state violations return an `ActionResult` error such as "Onaylanmış toplantı tutanağı düzenlenemez. Önce yeniden açın.".
5. **Delete**: `delete` permission (ADMIN) only. Soft delete (`deletedAt`, `deletedById`, `deletedByLabel`). Not allowed while status is APPROVED (must be reopened first). A deleted meeting disappears from lists, search, stats, action-item list and the dashboard. Its numbers are not reused. Files stay on disk.
6. **Optimistic concurrency**: only for the main meeting edit form (hidden `updatedAt`, mismatch error "Bu kayıt başka biri tarafından değiştirildi. Sayfayı yenileyip tekrar deneyin."). Child records (agenda, attendees, decisions, action items) use last-write-wins (`// KARAR:` note).
7. **Agenda**: `position` is 1-based and contiguous. Add appends at the end. Move up/down swaps positions inside a transaction. Delete renumbers the remaining items in the same transaction (decisions linked to the deleted item keep existing with `agendaItemId = null`). The planned content (`description`) and the minutes text (`discussion`) are separate fields; discussion is saved by its own action `updateAgendaDiscussion` and is editable in PLANNED and HELD.
8. **Attendees**:
   - Add internal attendees from `listActiveUserOptions()` (can add several at once). A user can be added once per meeting. Add external guests by free-text name (role forced to `GUEST` by default, but may be set to MEMBER).
   - At most one CHAIRPERSON and one SECRETARY per meeting; assigning a second returns an error "Bu toplantıda zaten bir başkan var." / "…sekreter var.".
   - `attendance` and `role` can be changed per attendee (inline select). "Tümünü katıldı işaretle" sets all INVITED attendees to PRESENT.
   - Quorum (`services/quorum.ts`): `presentCount` = attendees with attendance PRESENT; if `quorumRequired` is set, `reached = presentCount >= quorumRequired`. Shown in `QuorumBanner`: "Toplantı yeter sayısı sağlandı (X/Y)" (green) or "Toplantı yeter sayısı sağlanmadı (X/Y)" (amber); no banner when `quorumRequired` is null.
9. **Decisions**: `text`, `result`, optional `agendaItemId` (must belong to the same meeting), optional votes. Votes are all-or-nothing in the form: either all three fields empty (stored null) or all three numbers (0–1000, empty treated as 0 once any is filled). Add/edit/delete only in PLANNED or HELD.
10. **Action items**: `description`, optional assignee, optional `dueDate`, optional `decisionId` (must belong to the same meeting). Assignee is EITHER an active user (`assigneeId` + `assigneeLabel`) OR free-text name (`assigneeId = null`, `assigneeLabel` = text) OR none. Setting status DONE sets `completedAt`, `completedById`, `completedByLabel`; reopening clears them. Overdue = `dueDate` before today (Europe/Berlin) and status OPEN.
11. **Copy from previous meeting** (create form, optional `copyFromMeetingId`): the new meeting receives copies of the source's attendees (role kept, attendance reset to INVITED, user attendees only if the user is still active, guests kept) and agenda items (title and description only; discussion NOT copied). Decisions and action items are never copied. The source must be a non-deleted meeting of the same type.
12. **Validation (zod)**:
    - Meeting: `type` (required, create only), `title` (3–200), `meetingDate` (required), `startTime` (optional, `HH:mm` regex), `endTime` (optional, requires `startTime`, must be later than it), `location` (≤200), `quorumRequired` (optional integer 1–500), `description` (≤2000), `copyFromMeetingId` (create only, optional), `updatedAt` (update only).
    - Agenda item: `title` (2–200), `description` (≤2000), `discussion` (≤10000).
    - Attendee: guest `name` (2–120), `note` (≤200).
    - Decision: `text` (3–3000), `votes*` (0–1000).
    - Action item: `description` (3–1000), free-text assignee name (2–120).
    - Empty strings become `null`; all text is trimmed. Free text is plain text: render with `whitespace-pre-wrap`, never as HTML.

## 6. PERMISSIONS (`permissions.ts`)

```ts
meetingsPermissions = definePermissions("meetings", {
  ADMIN:     ["view", "create", "update", "delete", "approve"],
  BOARD:     ["view", "create", "update", "approve"],
  SECRETARY: ["view", "create", "update"],
  VIEWER:    ["view"],
});
```
- View everything (list, detail, tasks list, file download, PDF): `view`. Create a meeting: `create`. Edit meeting content, change non-approval statuses, add/edit agenda, attendees, decisions, action items, set action status, upload files: `update`. Approve / reopen: `approve`. Soft delete meeting, delete files of an approved meeting: `delete`.
- Every view, action and handler checks its permission with `requirePermission`. UI hides controls by permission, but security is enforced on the server.
- `module.config.ts`: one nav item "Toplantılar" (`/toplantilar`, group `main`, `meetingsPermissions` + `view`).

## 7. SCREENS

All screens use the existing `PageHeader`, `DataTable`, form components, `ConfirmDialog`, `EmptyState`, `AccessDenied`, toasts and HeroUI components.

### 7.1 List (`/toplantilar`, `meeting-list-view.tsx`)
- `StatsCards` on top (from `getMeetingStats`): "Planlanan toplantılar", "Onay bekleyen tutanaklar", "Açık görevler", "Gecikmiş görevler". Clicking applies the matching list filter, or for the task cards navigates to `/toplantilar/gorevler` with the matching `filter.*` params.
- `PageHeader` actions: "Yeni toplantı" (`create`), "Görevler" (link to `/toplantilar/gorevler`).
- Columns: Toplantı No, Tür (badge), Başlık, Tarih (with start time if present), Yer, Durum (badge), Karar sayısı, Açık görev sayısı.
- Search `q` (`contains`, `insensitive`): `meetingNumber`, `title`, `location`, agenda item titles (`agendaItems: { some }`), decision texts (`decisions: { some }`).
- Filters: Tür, Durum, date range (`filter.from`, `filter.to`, on `meetingDate`) via `list-filters.tsx` using `useListQueryState`.
- Sortable: `meetingNumber`, `meetingDate`, `title`, `status`. Default `meetingDate desc`.
- Row click opens detail. Row actions: Görüntüle, Düzenle (`update` and status PLANNED/HELD), Sil (`delete` and status not APPROVED, `ConfirmDialog`).

### 7.2 Create (`/toplantilar/yeni`) and edit (`/toplantilar/[id]/duzenle`)
- One shared `meeting-form.tsx`. Fields: Tür, Başlık, Tarih, Başlangıç saati, Bitiş saati, Yer, Yeter sayısı, Açıklama; on create also "Önceki toplantıdan kopyala" (select, appears after a type is chosen, options from `list-copy-sources` = last 10 meetings of that type, shown as `number – title – date`).
- On success redirect to detail with `?sekme=gundem`. Edit uses optimistic concurrency (rule 6) and is not available when status is APPROVED or CANCELLED (page shows an info message with a link back).

### 7.3 Detail (`/toplantilar/[id]`, `meeting-detail-view.tsx`)
- Tabs driven by URL `?sekme=` (server-rendered content per tab; default `genel`): `genel` "Genel", `gundem` "Gündem", `katilimcilar` "Katılımcılar", `kararlar` "Kararlar", `gorevler` "Görevler", `ekler` "Ekler". Tab labels show counts where useful.
- Header: meeting number, type badge, status badge, date/time, location. Approved meetings show "Onaylandı: dd.MM.yyyy – <approvedByLabel>". Draft (not approved) meetings show a subtle note "Tutanak taslak durumundadır.".
- Header actions (permission- and status-aware): "Düzenle", `status-menu` (only transitions the user may perform; approve and reopen open a `ConfirmDialog`, reopen asks for the reason in a textarea), "Tutanak (PDF)" (always visible; opens `/api/meetings/[id]/minutes-pdf` in a new tab), "Sil".
- **Genel**: all meeting fields, description, quorum banner, created/updated info.
- **Gündem**: ordered list. Each item shows number, title, description, and an expandable "Görüşmeler" section (`discussion-editor`: textarea with explicit Save button, shows saved text read-only when locked), plus the decisions linked to it. Controls (when editable): add item, edit (`agenda-item-modal`), move up/down, delete (`ConfirmDialog`), "Karar ekle" per item.
- **Katılımcılar**: table (name, "Kayıtlı kullanıcı"/"Konuk", role select, attendance select, note). Actions: "Kullanıcı ekle" (multi-select modal), "Konuk ekle", "Tümünü katıldı işaretle", remove. Quorum banner on top.
- **Kararlar**: list of all decisions (number, text, linked agenda item, result badge, votes "Kabul X / Ret Y / Çekimser Z"). Add/edit via `decision-modal`, delete with confirm.
- **Görevler**: this meeting's action items (description, assignee, due date with red overdue highlight, linked decision number, status). Add/edit via `action-item-modal`; a "Tamamlandı"/"Yeniden aç" toggle works even when the meeting is approved.
- **Ekler**: file list (name, size, uploader, date), download, preview for pdf/jpg/png, upload (drag-and-drop), delete per rule 4. Max 20 active files per meeting.
- Missing or deleted meeting: `notFound()`.

### 7.4 Action item list (`/toplantilar/gorevler`, `action-item-list-view.tsx`)
- `DataTable` of action items across all non-deleted meetings. Columns: Görev, Toplantı (link: number + title), Sorumlu, Son tarih (red when overdue), Durum, Karar No.
- Search `q`: description, assignee label, meeting number/title. Filters: Durum (default view shows OPEN only: when no `filter.status` is present, apply OPEN; provide an explicit "Tümü" option), Sorumlu (`listActiveUserOptions`), "Bana atananlar" (`filter.mine=1`, matches `assigneeId = current user`), "Süresi geçmişler" (`filter.overdue=1`), due date range. Sortable: `dueDate`, `status`, `createdAt`. Default: `dueDate asc` with nulls last.
- Row action: "Tamamlandı olarak işaretle" / "Yeniden aç" (`update`), "Toplantıya git".

## 8. SHARED FILE HANDLING REFACTOR (`shared/files/`)

Goal: both `documents` and `meetings` use the same hardened file code.
- `file-types.ts`: central registry mapping extension → allowed MIME types → magic-byte signature check. Include everything Phase 1 supported (pdf, jpg/jpeg, png, doc, docx, xls, xlsx, odt, ods, txt) plus `pptx` (zip signature). SVG, HTML, JS and executable types stay forbidden.
- `validation.ts`: `validateUpload({ file, allowedExtensions, maxBytes })`: extension in the caller's allowed subset, client MIME matches extension, signature check passes (same rules as Phase 1).
- `storage.ts`: `saveFile`, `openReadStream`, `removeFile`, `resolveSafePath(relativePath)` (path-traversal protection: resolved path must start with `UPLOAD_DIR`). Paths are always built from DB-stored `storagePath`; `storedName = crypto.randomUUID() + lowercase extension`; original file names are sanitized (control characters and path separators removed) and only stored in the DB.
- `http.ts`: `parseSingleFileUpload(request)` (multipart, field `file`) and `buildDownloadResponse({ stream, originalName, mimeType, inline })` implementing the Phase 1 header rules: `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`, RFC 5987 `Content-Disposition` with `filename*=UTF-8''...`; `inline` honored only for pdf/jpg/png, everything else always `attachment`.
- Refactor `documents` services/handlers to use these functions. Keep Phase 1 behavior identical: its allowed-extension subset, 20 MB default limit (`MAX_UPLOAD_MB`), 10 files per document, existing stored paths and DB records. Do not touch Phase 1 data.
- `meetings` uses the same allowed extensions as above including `pptx`, `MAX_UPLOAD_MB`, 20 files per meeting, storage path `meetings/<year>/<meetingId>/<storedName>`.
- Upload handler (`POST /api/meetings/[id]/files`): session (401 JSON) → `meetings.update` permission (403 JSON) → meeting exists and not deleted → file-limit and validation → write to disk → `MeetingFile` row → audit `FILE_UPLOAD` → JSON `{ ok: true, file }` or `{ ok: false, error }`. On any failure remove the already-written file. Download handler (`GET /api/meetings/files/[fileId]`): session + `meetings.view`, file and parent meeting not deleted, `?inline=1` rule as above. Handlers never redirect.

## 9. MINUTES PDF (`GET /api/meetings/[id]/minutes-pdf`)

- Permission: `meetings.view`. Route exports `runtime = "nodejs"`. Uses `@react-pdf/renderer` (`renderToBuffer` or stream). File name: `tutanak-<meetingNumber>.pdf` (inline disposition so it opens in the browser; `Cache-Control: no-store`).
- Document layout (A4, portrait, Turkish text):
  1. Header: organization name (`ORGANIZATION_NAME`) and the title "TOPLANTI TUTANAĞI". Draft meetings (status not APPROVED) show a visible "TASLAK" mark in the header (not a heavy watermark that harms readability).
  2. Info block: Toplantı No, Tür, Başlık, Tarih, Saat (start–end if present), Yer.
  3. Attendees table: Ad Soyad, Görev (role), Katılım (attendance). Below: quorum sentence ("Toplantı yeter sayısı sağlanmıştır (X/Y)." or "…sağlanamamıştır (X/Y).") when `quorumRequired` is set.
  4. Agenda: numbered items; for each: title, planned description (if any), "Görüşmeler" text (if any), and the decisions linked to the item.
  5. Decisions section: "Kararlar" with each decision: "Karar No: 2026/7", text, result, and votes line if present. Decisions not linked to an agenda item are listed too.
  6. Action items table (if any): Görev, Sorumlu, Son Tarih, Durum.
  7. Signature block: lines with name and role for the chairperson, the secretary, and each attendee whose attendance is PRESENT (two-column grid, signature line above each name).
  8. Footer on every page: "<meetingNumber>" left, "Sayfa X / Y" right. Approved minutes also show "Onaylandı: dd.MM.yyyy – <approvedByLabel>" below the signature block.
- Fonts: standard PDF fonts cannot render Turkish glyphs (ğ, Ğ, ş, Ş, İ, ı). Use Noto Sans (OFL license), Regular and Bold. Obtain the full-coverage TTF files (for example from the `@expo-google-fonts/noto-sans` npm package: install it temporarily, copy `NotoSans_400Regular.ttf` and `NotoSans_700Bold.ttf` into `src/modules/meetings/assets/fonts/`, commit the files, then uninstall the package). Do NOT use the Fontsource latin / latin-ext split files (they cannot be combined into one family). `pdf/fonts.ts` registers the fonts (`Font.register`) resolving paths from `process.cwd()`. Verify that all of these render correctly in a generated PDF: `İ ı Ş ş Ğ ğ Ç ç Ö ö Ü ü`.
- Long text must wrap and paginate properly (no clipped content); use `wrap` and `break` behavior appropriately; preserve line breaks in discussion text.
- Standalone build: make sure the PDF route works in the production `standalone` output. Add `outputFileTracingIncludes` for the PDF route so `src/modules/meetings/assets/fonts/**` is included, and make the Dockerfile copy that directory into the runner image if tracing alone is not enough. If bundling problems appear with `@react-pdf/renderer`, add it to `serverExternalPackages` in `next.config` (`// KARAR:` note). You must verify with `pnpm build` followed by running the standalone server (`node .next/standalone/server.js` with static/public copied as the Dockerfile does) and downloading a PDF.

## 10. AUDIT

All write operations are audited (via `createAction`'s `audit` or `writeAudit` in handlers). Each record includes the meeting number in `changes`.

| Operation | action | entity |
|---|---|---|
| Create meeting (incl. copy source id) | CREATE | Meeting |
| Update meeting (changed fields only, before/after) | UPDATE | Meeting |
| Status change | STATUS_CHANGE | Meeting |
| Approve | APPROVE | Meeting |
| Reopen (with `reason`) | REOPEN | Meeting |
| Delete | DELETE | Meeting |
| Agenda add / update / delete / move / discussion update | AGENDA_ADD / AGENDA_UPDATE / AGENDA_DELETE / AGENDA_MOVE / AGENDA_DISCUSSION | AgendaItem |
| Attendee add / update / remove / mark all present | ATTENDEE_ADD / ATTENDEE_UPDATE / ATTENDEE_REMOVE / ATTENDEE_MARK_ALL | MeetingAttendee |
| Decision add / update / delete | DECISION_ADD / DECISION_UPDATE / DECISION_DELETE | MeetingDecision |
| Action item add / update / delete / status | ACTION_ADD / ACTION_UPDATE / ACTION_DELETE / ACTION_STATUS | ActionItem |
| File upload / delete | FILE_UPLOAD / FILE_DELETE | MeetingFile |

For discussion updates log only the character count and agenda item id, not the full text. File downloads and PDF exports are not logged.

## 11. STATS AND DASHBOARD

- `queries/get-meeting-stats.ts` → `getMeetingStats()`: `{ plannedCount, nextMeeting: { id, meetingNumber, title, meetingDate } | null, draftMinutesCount, openActionItems, overdueActionItems }`. `plannedCount` = PLANNED with `meetingDate >= today`; `nextMeeting` = earliest of those; `draftMinutesCount` = status HELD; task counts from non-deleted meetings; "today" = Europe/Berlin.
- Dashboard Meetings card (composition layer): if the user has `meetingsPermissions.view`, show next meeting (number, title, `dd.MM.yyyy`), "Onay bekleyen tutanak: X", "Açık görev: Y (gecikmiş: Z)", linking to `/toplantilar`. Hide the card without permission. Other cards unchanged.

## 12. ENVIRONMENT AND DEPLOYMENT

- `.env.example` and `shared/env.ts` (zod): `ORGANIZATION_NAME=Dernek`. `UPLOAD_DIR` and `MAX_UPLOAD_MB` already exist from Phase 1.
- README additions: meeting and decision number formats; approval workflow and locking rules; how to set `ORGANIZATION_NAME`; the font files and their license (Noto Sans, OFL); backup note (database and `UPLOAD_DIR` together); how the shared file module is used by both modules.

## 13. OUT OF SCOPE (DO NOT BUILD)

Members module and member-based attendee selection (Phase 3); linking meetings to documents; confidential/restricted meetings; calendar/ICS export; email invitations or reminders; recurring meetings; drag-and-drop agenda reordering; rich-text/Markdown editing; electronic signatures; voting per attendee; minutes versioning/history; Excel export of meetings; restoring deleted meetings; tests; any library other than those explicitly allowed.

## 14. WORK ORDER

Work strictly in this order. After every step `pnpm typecheck` and `pnpm lint` must pass. Do not start the next step before the current one is done.

1. Read Phase 0 and Phase 1 code; write down 5–6 bullet points of the patterns you will reuse. Install `@react-pdf/renderer`.
2. Shared changes: add `"approve"` to `PermissionAction`; create `shared/files/*`; refactor `documents` to use it; add `ORGANIZATION_NAME` env. Run the Phase 1 acceptance checks again (upload, validation rejection, download, preview) to prove no regression.
3. Write `meetings.prisma` and the migration.
4. Module foundation: `permissions.ts`, `constants.ts` (labels, transition map, limits), `types.ts`, `schemas/*`, `module.config.ts`, `index.ts`.
5. Services: `meeting-number.ts`, `meeting-guards.ts`, `quorum.ts`.
6. Queries: `list-meetings`, `get-meeting`, `list-action-items`, `get-meeting-stats`, `list-copy-sources`.
7. Actions: meeting, change-status, agenda, attendee, decision, action-item, delete-file.
8. Handlers and thin API routes: upload, download.
9. PDF: font files, `fonts.ts`, `minutes-document.tsx`, `export-minutes-pdf.ts`, thin route, `next.config` / `Dockerfile` adjustments. Verify the standalone build can produce the PDF.
10. Components, then views and thin route files: list, create, detail (all tabs), edit, action item list.
11. Dashboard card, README updates, final check of `server.ts` / `ui.ts` / `index.ts` exports, `pnpm build`.

## 15. ACCEPTANCE CRITERIA

- `pnpm build`, `pnpm typecheck`, `pnpm lint` pass; `meetings` imports only `auth` and `shared`; no module imports another module's internals; route files under `src/app` contain no business logic.
- Phase 1 still works exactly as before after the shared files refactor (upload, rejection of fake/oversized/forbidden files, 401/403 responses, download, inline preview, Excel export).
- A SECRETARY creates a meeting: number `TOP-<year>-001`; the next one `TOP-<year>-002`; two concurrent creations never produce duplicates. The number cannot be changed through the UI or API.
- Creating a meeting with "Önceki toplantıdan kopyala" copies attendees (attendance reset to INVITED) and agenda items without discussion, and copies no decisions or action items.
- Agenda items can be added, edited, moved up/down and deleted with positions staying contiguous; discussion text is saved independently and preserved with line breaks.
- Attendees can be added (users and guests), roles and attendance changed, "Tümünü katıldı işaretle" works; a second chairperson or secretary is rejected; the quorum banner is correct, and absent when `quorumRequired` is empty.
- Decisions get numbers `<year>/<n>` that never repeat, even after deletion; votes validation works; decisions can be linked to an agenda item.
- Action items can be added with a user assignee, a free-text assignee or none; marking DONE records who and when; the cross-meeting list defaults to OPEN, filters and "Bana atananlar" / "Süresi geçmişler" work; overdue items are highlighted in red.
- Status workflow: only the transitions in the table succeed; approval needs at least 1 agenda item and 1 PRESENT attendee; SECRETARY cannot approve or reopen (action and API rejected); BOARD and ADMIN can; reopening requires a reason and the reason appears in the audit log.
- Locking: for an APPROVED or CANCELLED meeting every content-changing action is rejected on the server with the Turkish error message, even when called directly; marking action items DONE/OPEN and uploading files still work for APPROVED meetings; deleting a file of an approved meeting is possible for ADMIN only.
- VIEWER can view everything, download files and PDF, but sees no create/edit/delete/status/approve controls, and direct action or API calls are rejected.
- Only ADMIN can delete a meeting, only when it is not APPROVED; the deleted meeting vanishes from list, search, stats, task list and dashboard.
- Meeting edit shows the concurrency error when another session saved first.
- The minutes PDF opens in the browser; Turkish characters (İ ı Ş ş Ğ ğ Ç ç Ö ö Ü ü) render correctly; long discussion texts paginate without clipping; header shows organization name; draft meetings show "TASLAK"; approved meetings show approval line; page numbers "Sayfa X / Y" are correct; signature block lists the chairperson, secretary and PRESENT attendees. The same PDF is produced from the production `standalone` build.
- Dashboard Meetings card shows real numbers for roles with `view` permission and is hidden otherwise.
- The audit log screen shows all operations from Section 10 with correct action/entity; no file content, full discussion text or `passwordHash` is ever logged.
- Without Docker, using Homebrew PostgreSQL, `pnpm db:migrate && pnpm db:seed && pnpm dev` works.

When finished, summarize: the list of created and changed files, the changes made outside the `meetings` module (shared files refactor, permission action, env, dashboard, next.config/Dockerfile), the commands to run, and every point marked with `// KARAR:`.