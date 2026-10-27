# TASK: Association Management System — Phase 3: Members & Dues Module

Phase 0 (core infrastructure), Phase 1 (documents) and Phase 2 (meetings & minutes) are complete and working. In this phase you will turn the `members` module from its placeholder skeleton into a fully working member-tracking system: member records, membership types, yearly dues (aidat) and payment tracking, payment receipts (PDF), Excel import/export, privacy tooling, and member-based attendee selection in the meetings module.

All decisions in this document are final. Do not ask questions, do not propose alternatives, do not add libraries that are not explicitly allowed in Section 2. If something is ambiguous, choose the simplest and safest option and leave a short `// KARAR:` comment in the code.

LANGUAGE RULES (unchanged): all user-facing UI text, labels, toasts, validation messages, Excel headers and PDF content are in TURKISH. All code, identifiers, file names, table and column names are in ENGLISH. The Turkish UI strings you must use are given in quotes throughout this document.

BEFORE YOU START: read the existing code. Especially `src/shared/*`, `src/modules/auth/*`, `src/modules/users/*`, `src/modules/documents/*` and `src/modules/meetings/*` (reference implementations for numbering, optimistic concurrency, soft delete, filters, stats, Excel export, PDF export, audit), `src/registry.ts`, the ESLint boundary rules and `README.md`. New code must follow the same patterns, naming and style exactly (`createAction`, `requirePermission`, `parseListParams`, `useListQueryState`, `DataTable`, form components, `ActionResult`, `writeAudit`, `listActiveUserOptions`).

## 1. SCOPE

Build: Prisma schema, member CRUD with status handling and soft delete, membership types, yearly dues generation, payments with receipt numbers and void handling, member list/detail/dues-report screens, Excel export and a two-step Excel import, receipt PDF, anonymization of personal data, audit integration, dashboard card, and meetings integration (attendees from members). Shared refactors: `shared/money.ts` and `shared/pdf/` (fonts and PDF helpers extracted from the meetings module).

## 2. ARCHITECTURE RULES AND PERMITTED CHANGES

- All Phase 0 architecture rules apply unchanged: three layers, dependency direction, public entry points (`index.ts`, `server.ts`, `ui.ts`), ESLint boundary rules, thin route files. `pnpm lint` must stay clean.
- The `members` module depends only on `auth` and `shared`. Do NOT import other modules. Do NOT create Prisma foreign keys to other modules' tables: reference users by plain `...Id` + snapshot `...Label` string fields.
- Module dependency map after this phase (update the README): `auth` → none; `users`, `audit`, `documents`, `members` → `auth`; `meetings` → `auth`, `members`. No cycles.
- PERMITTED changes outside the `members` module (nothing else may change):
  1. `shared/money.ts` (new): money helpers (Section 5, rule 12).
  2. `shared/pdf/` (new): move the font registration and font files out of `modules/meetings/pdf` and `modules/meetings/assets/fonts` into `shared/pdf/fonts.ts` and `shared/pdf/fonts/`; add small shared PDF helpers (Turkish date formatting). Refactor the meetings PDF to use them with NO visual or behavioral change. Update `outputFileTracingIncludes` and the Dockerfile so both PDF routes (meetings minutes, member receipts) find the fonts in the `standalone` build.
  3. `src/modules/meetings`: add member-based attendee selection (Section 10). This is the only permitted change inside meetings, plus its migration, README mention and tests of acceptance.
  4. `prisma/seed.ts`: seed default membership types.
  5. Dashboard page (`src/app/(dashboard)/page.tsx`): update the Members card (Section 11).
  6. `README.md`.
- No new dependencies in this phase (`exceljs` and `@react-pdf/renderer` already exist).
- The module's standard structure from Phase 0 (Section 3.3) applies. As in earlier phases, route-handler logic lives in `handlers/` and is exported via `server.ts`; files under `src/app/api/...` are thin wrappers.

## 3. FILE STRUCTURE

```
prisma/schema/members.prisma
src/shared/money.ts
src/shared/pdf/
  fonts.ts
  fonts/                         # moved from meetings (Noto Sans Regular + Bold TTF)
  format.ts                      # Turkish date/number formatting helpers for PDFs
src/modules/members/
  index.ts                       # types, zod schemas, permissions, moduleConfig, constants
  server.ts                      # queries, services, actions, handlers (import "server-only")
                                 #   must export: listActiveMemberOptions()
  ui.ts                          # views
  module.config.ts
  permissions.ts
  types.ts
  constants.ts                   # Turkish labels, colors, currency, limits, import column map
  schemas/
    member.ts
    member-type.ts
    dues.ts                      # generate dues, edit due
    payment.ts
    import.ts
  queries/
    list-members.ts
    get-member.ts                # detail incl. dues + payments
    list-dues.ts                 # dues report (cross-member) incl. filters
    list-member-types.ts
    get-member-stats.ts
    get-dues-stats.ts
    list-active-member-options.ts
  services/
    member-number.ts             # member number + receipt number generation
    dues-calculation.ts          # recalculateDue(), status derivation (uses integer cents)
    dues-generation.ts           # eligibility + preview + generate
    import-parser.ts             # exceljs parsing + row validation
    anonymize.ts
  actions/
    member-actions.ts            # create, update, delete
    change-member-status.ts
    anonymize-member.ts
    member-type-actions.ts       # create, update, toggle active
    dues-actions.ts              # generate, add single due, update due amount, delete due
    payment-actions.ts           # add payment, void payment
  handlers/
    export-members.ts            # GET xlsx
    export-dues.ts               # GET xlsx
    import-members.ts            # POST (dryRun / commit)
    import-template.ts           # GET xlsx template
    receipt-pdf.ts               # GET pdf
  pdf/
    receipt-document.tsx
  components/
    member-form.tsx
    member-status-badge.tsx
    dues-status-badge.tsx
    status-change-menu.tsx
    stats-cards.tsx
    list-filters.tsx
    dues-tab.tsx
    payment-modal.tsx
    void-payment-modal.tsx
    due-modal.tsx                # add / edit single due
    generate-dues-modal.tsx      # year, due date, preview, confirm
    type-form-modal.tsx
    import-wizard.tsx
    anonymize-dialog.tsx
  views/
    member-list-view.tsx
    member-create-view.tsx
    member-detail-view.tsx
    member-edit-view.tsx
    member-type-list-view.tsx
    dues-report-view.tsx
    import-view.tsx
src/app/(dashboard)/uyeler/page.tsx
src/app/(dashboard)/uyeler/yeni/page.tsx
src/app/(dashboard)/uyeler/[id]/page.tsx
src/app/(dashboard)/uyeler/[id]/duzenle/page.tsx
src/app/(dashboard)/uyeler/turler/page.tsx
src/app/(dashboard)/uyeler/aidat/page.tsx
src/app/(dashboard)/uyeler/ice-aktar/page.tsx
src/app/api/members/export/route.ts                     # GET
src/app/api/members/dues/export/route.ts               # GET
src/app/api/members/import/route.ts                    # POST
src/app/api/members/import-template/route.ts           # GET
src/app/api/members/payments/[id]/receipt-pdf/route.ts # GET
```
The Phase 0 placeholder view and `uyeler/page.tsx` content are replaced.

## 4. DATABASE (`prisma/schema/members.prisma`)

```prisma
enum MemberStatus {
  ACTIVE     // Aktif
  SUSPENDED  // Askıda
  LEFT       // Ayrıldı
}

enum DuesStatus {
  UNPAID   // Ödenmedi
  PARTIAL  // Kısmen ödendi
  PAID     // Ödendi
}

enum PaymentMethod {
  CASH           // Nakit
  BANK_TRANSFER  // Havale/EFT
  CARD           // Kart
  OTHER          // Diğer
}

enum MembersCounterKind {
  MEMBER_NUMBER   // year is always 0
  RECEIPT         // per year
}

model MembersCounter {
  kind    MembersCounterKind
  year    Int
  lastSeq Int                @default(0)

  @@id([kind, year])
}

model MemberType {
  id         String    @id @default(cuid())
  name       String    @unique
  duesAmount Decimal?  @db.Decimal(10, 2)   // null or 0 = no dues
  isActive   Boolean   @default(true)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  members    Member[]
}

model Member {
  id              String       @id @default(cuid())
  memberNumber    Int          @unique
  firstName       String
  lastName        String
  email           String?
  phone           String?
  street          String?
  postalCode      String?
  city            String?
  birthDate       DateTime?    @db.Date
  joinDate        DateTime     @db.Date
  leaveDate       DateTime?    @db.Date
  leaveReason     String?
  status          MemberStatus @default(ACTIVE)
  duesExempt      Boolean      @default(false)
  notes           String?

  typeId          String
  type            MemberType   @relation(fields: [typeId], references: [id], onDelete: Restrict)

  isAnonymized    Boolean      @default(false)
  anonymizedAt    DateTime?

  createdById     String
  createdByLabel  String
  updatedById     String?
  updatedByLabel  String?

  deletedAt       DateTime?
  deletedById     String?
  deletedByLabel  String?

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  dues            MemberDue[]
  payments        MemberPayment[]

  @@index([status])
  @@index([typeId])
  @@index([lastName, firstName])
  @@index([email])
  @@index([joinDate])
  @@index([deletedAt])
}

model MemberDue {
  id              String       @id @default(cuid())
  memberId        String
  member          Member       @relation(fields: [memberId], references: [id], onDelete: Cascade)
  year            Int
  amountDue       Decimal      @db.Decimal(10, 2)
  paidAmount      Decimal      @default(0) @db.Decimal(10, 2)   // denormalized: sum of non-voided payments
  status          DuesStatus   @default(UNPAID)                  // denormalized, maintained with paidAmount
  dueDate         DateTime     @db.Date
  note            String?
  createdById     String
  createdByLabel  String
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  payments        MemberPayment[]

  @@unique([memberId, year])
  @@index([year, status])
  @@index([dueDate])
}

model MemberPayment {
  id              String        @id @default(cuid())
  memberId        String
  member          Member        @relation(fields: [memberId], references: [id], onDelete: Cascade)
  dueId           String
  due             MemberDue     @relation(fields: [dueId], references: [id], onDelete: Restrict)
  receiptNumber   String        @unique            // MKB-2026-0001
  amount          Decimal       @db.Decimal(10, 2)
  paidAt          DateTime      @db.Date
  method          PaymentMethod
  reference       String?
  note            String?
  createdById     String
  createdByLabel  String
  voidedAt        DateTime?
  voidedById      String?
  voidedByLabel   String?
  voidReason      String?
  createdAt       DateTime      @default(now())

  @@index([memberId])
  @@index([dueId])
  @@index([paidAt])
}
```
- Date-only fields are handled exactly as in earlier phases (no timezone shift; displayed `dd.MM.yyyy`).
- Create the migration. Existing migrations stay untouched.
- Meetings change (Section 10) is a separate additive migration on `MeetingAttendee`.
- Seed (idempotent, `upsert`): membership types "Asil Üye" (`duesAmount` null; an admin sets the amount later), "Fahri Üye" (0), "Onursal Üye" (0).

## 5. BUSINESS RULES

1. **Member number**: integer, sequential starting at 1, from `MembersCounter` (`MEMBER_NUMBER`, `year = 0`) incremented atomically inside the creating transaction (same technique and `P2002` retry as earlier phases). Never reused, immutable, displayed zero-padded to 4 digits ("0012"). On import, a provided number is used only if unused; after import the counter is raised to at least the highest imported number.
2. **Member status**: ACTIVE, SUSPENDED, LEFT. Changes happen through a dedicated action `changeMemberStatus` (separate audit record `STATUS_CHANGE`). Moving to LEFT requires `leaveDate` (default today, not earlier than `joinDate`) and an optional `leaveReason` (≤300). Moving back from LEFT to ACTIVE/SUSPENDED clears `leaveDate` and `leaveReason`. All other transitions are free. The regular edit form does not change status.
3. **Membership types**: unique name (case-insensitive check), 2–60 chars, optional `duesAmount` (≥ 0, max 2 decimals). Types are never deleted, only deactivated; an inactive type cannot be chosen for new members but stays on existing ones. Changing a type's `duesAmount` does not change existing dues.
4. **Member validation (zod)**: `firstName`, `lastName` (1–60), `email` (optional, valid format, stored lowercase), `phone` (optional, ≤30), `street` (≤200), `postalCode` (≤10), `city` (≤60), `birthDate` (optional, not in the future), `joinDate` (required, default today), `typeId` (required, active type), `duesExempt` (boolean), `notes` (≤2000), `updatedAt` (update only, optimistic concurrency exactly as in Phase 1/2). Empty strings become `null`; text is trimmed. If `email` is provided it must be unique among non-deleted, non-anonymized members, otherwise error "Bu e-posta adresiyle kayıtlı bir üye var.". Do NOT store national ID numbers, bank account numbers or any other fields not listed above.
5. **Delete**: `delete` permission (ADMIN) only. Soft delete (`deletedAt`, `deletedById`, `deletedByLabel`). Rejected if the member has any dues or payments record (error "Aidat veya ödeme kaydı olan üye silinemez. Üyeyi 'Ayrıldı' olarak işaretleyin."). A deleted member disappears everywhere (lists, search, stats, dues report, exports, dashboard, attendee pickers). The member number is not reused.
6. **Yearly dues** (annual dues only; monthly or installment schedules are out of scope):
   - One `MemberDue` per member per year (`@@unique([memberId, year])`) with `amountDue`, `dueDate`, optional `note`.
   - **Bulk generation** (`services/dues-generation.ts`, action `generateDues({ year, dueDate, memberTypeId? })`): a member is eligible if: not deleted, not anonymized, status ACTIVE, `duesExempt = false`, `joinDate` on or before 31 Dec of `year`, the member's type has `duesAmount > 0`, and no due exists yet for that year. `amountDue` = type's `duesAmount` at generation time. The action supports `dryRun` returning `{ eligibleCount, totalAmount, skippedNoAmountCount, skippedExistingCount }`; the UI always shows this preview and requires confirmation before the real run. Running it twice never creates duplicates. Allowed `year` range: current year − 1 to current year + 1. Default `dueDate` = 31 Dec of the year (editable, must be within the year or later).
   - **Single due** (`addDue`): for one member and a year, with amount (≥ 0.01) and due date; rejected if one exists.
   - **Edit due** (`updateDue`): `amountDue` may be changed but never below `paidAmount`; `dueDate` and `note` editable. Status is recalculated afterwards.
   - **Delete due**: only if it has no non-voided payments (`update` permission); otherwise rejected.
7. **Dues status** is derived inside `dues-calculation.ts#recalculateDue(dueId, tx)`, which is the ONLY place that writes `paidAmount` and `status`: `paidAmount` = sum of non-voided payments; `status` = PAID if `paidAmount >= amountDue`, PARTIAL if `paidAmount > 0`, else UNPAID. It is called inside the same transaction as every payment add/void and every due amount edit. "Overdue" is not stored: it means `status != PAID` and `dueDate` before today (Europe/Berlin).
8. **Payments**:
   - A payment belongs to exactly one existing due (`dueId`) and member. Fields: `amount` (> 0, max 2 decimals), `paidAt` (date, not in the future), `method`, `reference` (≤100), `note` (≤500).
   - The amount may not exceed the remaining balance (`amountDue − paidAmount`): error "Ödeme tutarı kalan borcu aşamaz.". Partial payments are allowed.
   - Concurrency safety: inside the transaction, lock the due row first (`SELECT ... FOR UPDATE` through `$queryRaw`), then re-check the remaining balance, insert the payment, generate the receipt number, and call `recalculateDue`.
   - **Receipt number**: `MKB-<year>-<sequence 4 digits>`, `year` = year of `paidAt` (Europe/Berlin), sequence per year from `MembersCounter` (`RECEIPT`), atomic in the same transaction. Receipt numbers are immutable and never reused, even after a payment is voided.
   - **Void** (`voidPayment`, `memberPayments.delete` permission = ADMIN): requires a reason (5–300 chars). Sets `voidedAt`, `voidedById`, `voidedByLabel`, `voidReason`, then `recalculateDue`. Payments are never hard-deleted. A voided payment is excluded from all sums and shown struck-through with the reason.
9. **Anonymize** (`anonymizeMember`, `members.delete` permission): only for members with status LEFT; requires typing the member number as confirmation in the dialog. Sets `firstName = "Anonim"`, `lastName = "Üye <memberNumber padded>"`, clears `email`, `phone`, `street`, `postalCode`, `city`, `birthDate`, `notes`, `leaveReason`; sets `isAnonymized = true`, `anonymizedAt`. It is irreversible. Dues, payments, receipt numbers, type and dates are kept (accounting retention). Anonymized members cannot be edited except to change nothing (edit screen blocked with an info message) and are excluded from import duplicate checks and email uniqueness checks. Names already written into approved meeting minutes are legal records and stay (`// KARAR:` note and README mention).
10. **Duplicate detection (create and import)**: same non-null email (case-insensitive), or same `firstName` + `lastName` + `birthDate` (when birthDate is given), among non-deleted, non-anonymized members. On create via the form, an email duplicate is an error; a name+birthDate duplicate is also an error. On import, such rows are reported as errors ("Mükerrer kayıt").
11. **Privacy-safe audit** (applies to every audit write in this module): for personal fields (`firstName`, `lastName`, `email`, `phone`, `street`, `postalCode`, `city`, `birthDate`, `notes`, `leaveReason`) record only the NAMES of changed fields in `changes.changedFields`, never their values. Non-personal fields (status, typeId, joinDate, leaveDate, duesExempt, amounts, years, receipt numbers) may include before/after values. Always include `memberNumber` in `changes`. Exports and imports are audited too (Section 12).
12. **Money**: create `shared/money.ts` with: `toCents(input: string | number | Prisma.Decimal): number` (accepts Turkish and international input such as "12,50" or "12.50", rejects more than 2 decimals and non-numeric input), `fromCents(cents: number): string` (plain "12.50" for Prisma Decimal), `formatMoney(cents or decimal, currency?)` using `Intl.NumberFormat("tr-TR", { style: "currency", currency })`. Currency constant `CURRENCY = "EUR"` in `members/constants.ts` (`// KARAR:` note: association is in Germany; Phase 4 will reuse `shared/money.ts`). ALL money comparisons and sums in TypeScript are done in integer cents, never with floating-point arithmetic on raw numbers. Database sums use Prisma `aggregate` on Decimal columns.

## 6. PERMISSIONS (`permissions.ts`)

```ts
membersPermissions = definePermissions("members", {
  ADMIN:     ["view", "create", "update", "delete"],
  BOARD:     ["view", "create", "update"],
  SECRETARY: ["view", "create", "update"],
  VIEWER:    ["view"],
});

memberTypesPermissions = definePermissions("memberTypes", {
  ADMIN:     ["view", "create", "update"],
  BOARD:     ["view", "create", "update"],
  SECRETARY: ["view"],
  VIEWER:    ["view"],
});

memberPaymentsPermissions = definePermissions("memberPayments", {
  ADMIN:     ["view", "create", "update", "delete"],
  BOARD:     ["view", "create", "update"],
  SECRETARY: ["view", "create", "update"],
  VIEWER:    [],
});
```
- Members list/detail/export: `members.view`. Create member and import: `members.create`. Edit member, change status: `members.update`. Delete and anonymize: `members.delete`.
- Dues and payment data (the "Aidat" tab, dues report, dues export, receipts, dues column and dues filters in the member list, dues cards on the dashboard) require `memberPayments.view`; without it these UI parts are not rendered and the corresponding queries are not executed. Generate dues, add due, add payment: `memberPayments.create`. Edit/delete due: `memberPayments.update`. Void payment: `memberPayments.delete`.
- Types management: `memberTypes`.
- Every view, action and handler checks its permission with `requirePermission`. UI hides controls by permission, but security is enforced on the server.
- `module.config.ts`: one nav item "Üyeler" (`/uyeler`, group `main`, `membersPermissions` + `view`).

## 7. SCREENS

All screens use the existing `PageHeader`, `DataTable`, form components, `ConfirmDialog`, `EmptyState`, `AccessDenied`, toasts and HeroUI components.

### 7.1 Member list (`/uyeler`, `member-list-view.tsx`)
- `StatsCards` (from `getMemberStats`): "Aktif üye", "Askıda", "Bu yıl katılan", "Bu yıl ayrılan". Clicking applies the matching filter.
- `PageHeader` actions: "Yeni üye" (`create`), "İçe aktar" (`members.create`, links to `/uyeler/ice-aktar`), "Excel'e aktar" (current filters), "Aidat raporu" (`memberPayments.view`), "Üyelik türleri" (`memberTypes.view`).
- Columns: Üye No, Ad Soyad, Üyelik Türü, Durum (badge), Telefon, E-posta, Üyelik Başlangıcı, Aidat (current-year dues status chip: "Ödendi" / "Kısmen" / "Ödenmedi" / "Gecikmiş" / "Kayıt yok" / "Muaf"; only with `memberPayments.view`).
- Default filter: status = ACTIVE and SUSPENDED (hide LEFT unless the status filter says otherwise; the filter offers "Tümü").
- Search `q`: `firstName`, `lastName`, full name concatenation (first + last, case-insensitive), `email`, `phone`, `city`, and `memberNumber` (when `q` is numeric).
- Filters: Durum, Üyelik Türü, Aidat durumu for a selected year (`filter.dues` = `unpaid` | `partial` | `paid` | `overdue` | `none`, `filter.year` default current year; only with `memberPayments.view`; implement with relation filters on `dues` using the denormalized `status` and `dueDate`), join-date range (`filter.from`, `filter.to`).
- Sortable: `memberNumber`, `lastName` (then `firstName`), `joinDate`, `status`. Default `memberNumber asc`.
- Row click opens detail. Row actions: Görüntüle, Düzenle, Sil (`delete`, `ConfirmDialog`).
- Deleted members are always excluded; anonymized members are shown (name "Anonim").

### 7.2 Create / edit (`/uyeler/yeni`, `/uyeler/[id]/duzenle`)
- Shared `member-form.tsx`. Sections: Kişisel bilgiler (ad, soyad, doğum tarihi), İletişim (e-posta, telefon, adres, posta kodu, şehir), Üyelik (üyelik türü, başlangıç tarihi, "Aidattan muaf" switch), Notlar.
- On the create form, after the member is saved, show the assigned member number in the success toast.
- Edit: optimistic concurrency; blocked for anonymized members. Status is changed on the detail page.

### 7.3 Detail (`/uyeler/[id]`, `member-detail-view.tsx`)
- Tabs via URL `?sekme=` (default `genel`): "Genel", "Aidat" (only with `memberPayments.view`).
- Header: member number, full name, status badge, type. Actions (permission-aware): "Düzenle", `status-change-menu` (Aktif / Askıda / Ayrıldı; Ayrıldı opens a modal asking leave date and reason), "Anonimleştir" (only for LEFT members and `members.delete`; `anonymize-dialog` explains it is irreversible and requires typing the member number), "Sil".
- **Genel**: all fields, join/leave dates, dues-exempt flag, created/updated info.
- **Aidat**: table per year (Yıl, Tutar, Ödenen, Kalan, Durum, Son tarih, overdue highlighted red). Expandable row shows that year's payments (Makbuz No, tarih, tutar, yöntem, referans, kaydeden; voided payments struck through with reason; "Makbuz (PDF)" link per payment). Actions: "Ödeme ekle" (`payment-modal`: yıl select listing dues with remaining balance, tutar default = remaining, tarih default today, yöntem, referans, not), "Aidat ekle" (`due-modal`), edit due, delete due (rules 6), "Ödemeyi iptal et" (`void-payment-modal`, ADMIN). Summary line: total outstanding across years.
- Missing or deleted member: `notFound()`.

### 7.3 Dues report (`/uyeler/aidat`, `dues-report-view.tsx`; requires `memberPayments.view`)
- Year selector (default current year, from `?filter.year=`). Stats (`getDuesStats(year)`): "Beklenen tutar", "Tahsil edilen", "Kalan", "Tahsilat oranı (%)", plus counts of unpaid / partial / paid / overdue.
- `PageHeader` actions: "Aidat oluştur" (`memberPayments.create`, opens `generate-dues-modal` with year, due date, optional membership type, dry-run preview, confirm), "Excel'e aktar".
- DataTable columns: Üye No, Ad Soyad, Üyelik Türü, Tutar, Ödenen, Kalan, Durum, Son tarih (red when overdue). Search `q` by member name/number. Filters: Durum (`unpaid`/`partial`/`paid`/`overdue`), Üyelik Türü. Sortable: `memberNumber`, `lastName`, `amountDue`, `paidAmount`, `dueDate`, `status`. Default: `lastName asc`.
- Row action: "Ödeme ekle" (opens `payment-modal`), "Üyeye git".

### 7.4 Membership types (`/uyeler/turler`, `member-type-list-view.tsx`)
- DataTable: Ad, Aidat tutarı, Üye sayısı, Durum. "Yeni tür" and "Düzenle" via `type-form-modal`; "Pasife al / Aktifleştir" with `ConfirmDialog`. Permission: `memberTypes`.

### 7.5 Import (`/uyeler/ice-aktar`, `import-view.tsx`)
- Wizard (`import-wizard.tsx`): (1) download the template ("Şablonu indir"), (2) select an `.xlsx` file, (3) "Kontrol et" → dry-run result: total rows, valid rows, error rows with row number and Turkish message (table, max 200 shown, with a note if more), (4) "İçe aktar" button enabled only if there is at least one valid row; it re-submits the same file (the client keeps the `File` object) with `dryRun=false`, then shows the result summary and a link to the member list. If any row has errors, valid rows may still be imported; the dialog states "Hatalı satırlar atlanacak." before commit.

## 8. EXCEL IMPORT / EXPORT

All exports and imports use `exceljs`. Dates are real date cells (`dd.mm.yyyy`); money cells are numeric with number format `#,##0.00 "€"`; header row bold and frozen, auto-filter, sensible column widths.

**Members export** `GET /api/members/export`: accepts the same query parameters as the list (`q`, `filter.*`, `sort`, `dir`; `page`/`pageSize` ignored), permission `members.view`, max 10,000 rows (note on the sheet if truncated). Sheet "Üyeler". Columns: Üye No, Ad, Soyad, Üyelik Türü, Durum, E-posta, Telefon, Adres, Posta Kodu, Şehir, Doğum Tarihi, Üyelik Başlangıcı, Ayrılış Tarihi, Aidattan Muaf, Notlar. File name `uyeler-YYYY-MM-DD.xlsx`. Audit: `EXPORT` (changes: row count and filters, no personal data). The list query logic is shared with the list (no duplicated filter code).

**Dues export** `GET /api/members/dues/export`: same query parameters as the dues report, permission `memberPayments.view`, max 10,000 rows. Sheet "Aidat". Columns: Üye No, Ad Soyad, Üyelik Türü, Yıl, Tutar, Ödenen, Kalan, Durum, Son Ödeme Tarihi (latest non-voided payment date), Son Tarih. File name `aidat-<year>-YYYY-MM-DD.xlsx`. Audit `EXPORT`.

**Import template** `GET /api/members/import-template`: permission `members.create`. Sheet "Üyeler" with the header row and one example row; sheet "Açıklamalar" listing the columns, which are required, valid values for "Durum" (Aktif, Askıda, Ayrıldı) and the names of all ACTIVE membership types (read from the database), and the date format (`gg.aa.yyyy`).

**Import** `POST /api/members/import?dryRun=1|0` (multipart, field `file`): permission `members.create`; session 401 / permission 403 JSON like other handlers; max file size 5 MB, only `.xlsx` (extension and ZIP signature check via the shared files validation helpers if applicable, otherwise a local check); max 2,000 data rows (more → reject the whole file with a clear message). Columns (Turkish headers, matched case-insensitively and trimmed): Üye No (optional), Ad, Soyad, E-posta, Telefon, Adres, Posta Kodu, Şehir, Doğum Tarihi, Üyelik Türü, Üyelik Başlangıç Tarihi, Durum, Notlar. Required: Ad, Soyad, Üyelik Türü, Üyelik Başlangıç Tarihi. Row validation reuses the member zod schema plus: "Üyelik Türü" must match an ACTIVE type by name (case-insensitive), "Durum" defaults to Aktif, dates accept real date cells or text `dd.MM.yyyy`, "Üye No" must be a positive integer not used by another member and not repeated in the file, duplicates (rule 10) are checked against the database AND against earlier rows of the same file. Rows are validated all-or-nothing per row. The commit runs in a single transaction for all valid rows (member numbers assigned in file order for rows without a number). Response JSON: `{ ok, dryRun, total, valid, imported?, errors: [{ row, messages[] }] }`. Audit: one `IMPORT` record (changes: counts only). Imported members are created with `createdByLabel` of the importing user.

## 9. RECEIPT PDF (`GET /api/members/payments/[id]/receipt-pdf`)

- Permission `memberPayments.view`; `runtime = "nodejs"`; inline disposition; file name `makbuz-<receiptNumber>.pdf`; `Cache-Control: no-store`. Uses `@react-pdf/renderer` and fonts from `shared/pdf` (Turkish glyph support; verify `İ ı Ş ş Ğ ğ Ç ç Ö ö Ü ü`).
- Layout (A5 landscape or A4 portrait, single page): organization name (`ORGANIZATION_NAME`), title "AİDAT TAHSİLAT MAKBUZU", Makbuz No, Tarih, a sentence: "<Ad Soyad> (Üye No: <0012>) tarafından <year> yılı üyelik aidatı karşılığı <formatted amount> tahsil edilmiştir.", Ödeme yöntemi, Referans (if any), Not (if any), "Teslim alan: <createdByLabel>" with a signature line, and a footer with the receipt number. Voided payments show a clear "İPTAL EDİLDİ" label plus the void date and reason.
- For anonymized members the name line shows the anonymized name.

## 10. MEETINGS INTEGRATION (permitted change inside `meetings`)

- Add to `prisma/schema/meetings.prisma` (additive migration): `MeetingAttendee.memberId String?` (plain field, no FK) and `@@unique([meetingId, memberId])`.
- `members/server` exports `listActiveMemberOptions(): Promise<{ id: string; memberNumber: number; label: string }[]>` (non-deleted, non-anonymized members with status ACTIVE, `label` = "Ad Soyad", sorted by last name; never returns contact data).
- In the meetings attendees tab, add "Üye ekle" next to "Kullanıcı ekle" and "Konuk ekle": a multi-select modal over `listActiveMemberOptions()` with search. New action `addMemberAttendees({ meetingId, memberIds[] })` (same locking rules, `update` permission, role default MEMBER, attendance INVITED, `name` = label snapshot, a member can be added once per meeting, audit `ATTENDEE_ADD`). Attendee table shows source "Üye" for these rows.
- Copy-from-previous-meeting (Phase 2 rule 11) also copies member attendees whose member is still ACTIVE and not deleted/anonymized.
- Update the meetings dependency note in README. Nothing else in meetings changes. Re-run the Phase 2 acceptance checks for attendees and PDF after this change.

## 11. STATS AND DASHBOARD

- `getMemberStats()`: `{ active, suspended, joinedThisYear, leftThisYear }` (non-deleted; "this year" in Europe/Berlin).
- `getDuesStats(year)`: `{ expectedCents, collectedCents, remainingCents, collectionRate, unpaidCount, partialCount, paidCount, overdueCount }` computed from `MemberDue` of non-deleted members (excluding voided payments through the denormalized `paidAmount`).
- Dashboard Members card (composition layer): with `membersPermissions.view` show active member count and "Bu ay katılan: X"; with `memberPayments.view` additionally "<year> aidat tahsilatı: %X" and "Kalan: €Y", linking to `/uyeler/aidat`. Hide the card without `members.view`. Other cards unchanged.

## 12. AUDIT

All write operations and exports/imports are audited (`createAction`'s `audit` or `writeAudit` in handlers), following privacy rule 11.

| Operation | action | entity |
|---|---|---|
| Create / update member | CREATE / UPDATE | Member |
| Status change | STATUS_CHANGE | Member |
| Delete | DELETE | Member |
| Anonymize | ANONYMIZE | Member |
| Type create / update / activate / deactivate | CREATE / UPDATE / ACTIVATE / DEACTIVATE | MemberType |
| Generate dues (counts, year) | DUES_GENERATE | MemberDue |
| Add / update / delete due | DUE_ADD / DUE_UPDATE / DUE_DELETE | MemberDue |
| Add payment | PAYMENT_ADD | MemberPayment |
| Void payment (with reason) | PAYMENT_VOID | MemberPayment |
| Excel export (members, dues) | EXPORT | Member / MemberDue |
| Excel import | IMPORT | Member |

Receipt PDF downloads are not logged. `entityId` is the record id; include `memberNumber` (and `receiptNumber`, `year` where relevant) in `changes`.

## 13. ENVIRONMENT AND DEPLOYMENT

- No new environment variables (`ORGANIZATION_NAME` exists from Phase 2).
- README additions: member number and receipt number formats; dues model (annual dues, generation, partial payments, void instead of delete); denormalized `paidAmount`/`status` maintained only by `recalculateDue`; privacy notes (no national IDs stored, audit stores field names only for personal data, anonymization is irreversible and keeps accounting data, names in approved minutes remain, exports contain personal data and are logged); import template usage; the new module dependency map; the fonts now living in `shared/pdf` and the updated tracing/Dockerfile settings; backup note (database and `UPLOAD_DIR` together).

## 14. OUT OF SCOPE (DO NOT BUILD)

Monthly or installment dues schedules; automatic bank statement / SEPA import; online payments; email or SMS reminders and bulk mailing; member self-service portal; membership application and approval workflow; membership cards; family or group memberships; file attachments on members; donations and any accounting entries (Phase 4 will consume payments); board-role (görev) tracking; restoring deleted members; tests; any new library.

## 15. WORK ORDER

Work strictly in this order. After every step `pnpm typecheck` and `pnpm lint` must pass. Do not start the next step before the current one is done.

1. Read Phase 0, 1, 2 code; write down 5–6 bullet points of the patterns you will reuse.
2. Shared changes: `shared/money.ts`; move fonts and PDF helpers to `shared/pdf`; refactor the meetings PDF to use them; update `next.config` tracing and Dockerfile. Verify the Phase 2 minutes PDF is unchanged (including Turkish glyphs) in `pnpm build` + standalone run.
3. Write `members.prisma`, the migration and the seed additions.
4. Module foundation: `permissions.ts`, `constants.ts`, `types.ts`, `schemas/*`, `module.config.ts`, `index.ts`.
5. Services: `member-number.ts`, `dues-calculation.ts`, `dues-generation.ts`, `anonymize.ts`, `import-parser.ts`.
6. Queries: members list, member detail, dues list, types, stats, `list-active-member-options`.
7. Actions: member, status, anonymize, types, dues, payments.
8. Handlers and thin API routes: exports, import (dry-run + commit), template, receipt PDF.
9. Components, then views and thin route files: list, create, detail (tabs), edit, types, dues report, import wizard.
10. Meetings integration (Section 10) with its migration; re-run Phase 2 attendee and PDF checks.
11. Dashboard card, README updates, final check of `server.ts` / `ui.ts` / `index.ts` exports, `pnpm build`.

## 16. ACCEPTANCE CRITERIA

- `pnpm build`, `pnpm typecheck`, `pnpm lint` pass; `members` imports only `auth` and `shared`; only `meetings` imports `members` (via its public entry points); route files under `src/app` contain no business logic.
- Phase 2 still works exactly as before after the PDF/fonts refactor (minutes PDF identical, Turkish glyphs correct, standalone build produces it).
- Creating members yields sequential numbers (`0001`, `0002`, …) without duplicates, even with concurrent creations; the number is not editable. Duplicate email or duplicate name + birth date is rejected.
- Edit shows the concurrency error when another session saved first. Anonymized members cannot be edited.
- Status workflow: moving to LEFT requires a leave date and stores the reason; moving back clears them; the edit form never changes status.
- Deleting is possible only for ADMIN and only for members without dues/payments; members with payment history can only be marked LEFT; deleted members vanish from lists, search, stats, dues report, exports, dashboard and the meetings attendee picker.
- Membership types: unique names, deactivation hides them from new-member forms but keeps existing assignments; changing a type's amount does not alter existing dues.
- Dues generation: the preview shows eligible count and total; confirming creates one due per eligible member; running again creates none; members that are suspended, left, exempt, joined after the year or on a type without an amount are skipped and counted in the preview.
- Payments: partial payments update status to PARTIAL then PAID; a payment above the remaining balance is rejected; two concurrent payments cannot together exceed the balance; each payment gets a unique receipt number `MKB-<year>-NNNN`; amounts typed as "12,50" and "12.50" are both accepted and 3 decimals are rejected; no floating-point drift appears in sums.
- Void: only ADMIN, reason required; the due's `paidAmount` and `status` are recalculated; the voided payment is struck through; its receipt number stays reserved; the receipt PDF shows "İPTAL EDİLDİ".
- `paidAmount` and `status` always equal the values recomputed from non-voided payments (verify through add, void and amount-edit sequences). Lowering a due below its paid amount is rejected; a due with payments cannot be deleted.
- Roles: VIEWER sees members but no dues column, no "Aidat" tab, no dues report, and direct action/API calls for dues, payments and dues export are rejected; SECRETARY and BOARD can record payments and generate dues but cannot void payments, delete or anonymize members; ADMIN can do everything.
- Member list: search (including by member number and full name), filters (status, type, dues status for a year, join-date range), sorting and pagination work; URLs are shareable; the default view hides LEFT members.
- Dues report: year selector, stats (expected, collected, remaining, rate), filters and Excel export match the on-screen numbers.
- Members Excel export respects filters and writes real date cells; dues export writes numeric money cells; both are logged as `EXPORT` without personal data in the log.
- Import: the template downloads with the explanation sheet; the dry run reports row-level Turkish errors (missing required fields, unknown type, invalid dates, duplicate email, duplicate number, duplicates inside the file) and imports nothing; the commit imports only valid rows in one transaction, numbers continue after the highest imported number, and the summary is correct; files over 5 MB, non-xlsx files and files over 2,000 rows are rejected.
- Anonymize: only for LEFT members, requires typing the member number, clears all personal fields, keeps payments and receipt numbers, and cannot be undone; the audit log contains no personal values at any point (only changed field names for personal fields).
- Receipt PDF opens in the browser, Turkish characters render correctly, content matches Section 9, works from the production `standalone` build.
- Meetings: "Üye ekle" adds active members as attendees (once per meeting, locking rules respected), copy-from-previous-meeting carries over still-active member attendees, and Phase 2 behavior is otherwise unchanged.
- Dashboard Members card shows correct numbers by permission (dues info only with `memberPayments.view`).
- The audit log screen shows all operations from Section 12 with correct action/entity.
- Without Docker, using Homebrew PostgreSQL, `pnpm db:migrate && pnpm db:seed && pnpm dev` works.

When finished, summarize: the list of created and changed files, the changes made outside the `members` module (shared money/pdf, meetings integration, seed, dashboard, next.config/Dockerfile), the commands to run, and every point marked with `// KARAR:`.