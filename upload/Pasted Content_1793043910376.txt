# TASK: Association Management System — Phase 4: Accounting (Einnahmen-Überschuss-Rechnung) + Germany Compliance Retrofit for Phases 0–3

Phases 0–3 are complete and working: core infrastructure, documents, meetings & minutes, members & dues. The system is used by registered associations in Germany (eingetragene Vereine, e.V., usually gemeinnützig under §§ 51 ff. AO). Board members using it are Turkish-speaking. This phase does two things:

- PART A: retrofit Phases 0–3 for German associations (roles, association master data, German-language official documents, German terminology, data-protection and bookkeeping hardening).
- PART B: build the `accounting` module: simple cash-basis bookkeeping (Einnahmen-Überschuss-Rechnung, EÜR) organized by the four tax spheres of a gemeinnütziger Verein, with receipts (Belege), cash book (Kassenbuch), year closing, budget (Haushaltsplan), member-fee import, and the annual treasurer's report (Kassenbericht) for the Mitgliederversammlung.

All decisions in this document are final. Do not ask questions, do not propose alternatives, do not add libraries that are not explicitly allowed. If something is ambiguous, choose the simplest and safest option and leave a short `// KARAR:` comment in the code.

BEFORE YOU START: read the existing code (`src/shared/*`, all modules, `src/registry.ts`, ESLint boundary rules, `README.md`, existing migrations and `prisma/seed.ts`). New code must follow existing patterns exactly (`createAction`, `requirePermission`, `parseListParams`, `useListQueryState`, `DataTable`, form components, `ActionResult`, `writeAudit`, `shared/money.ts`, `shared/pdf`, `shared/files`, optimistic concurrency, soft delete, transactional numbering with `P2002` retry).

## 1. LANGUAGE AND TERMINOLOGY POLICY

- Code, identifiers, file names, table and column names: ENGLISH.
- Application UI (labels, toasts, validation messages, Excel headers): TURKISH. For legally relevant terms the UI shows the Turkish term followed by the German term in parentheses, e.g. "Üyelik aidatı (Mitgliedsbeitrag)". These labels live in each module's `constants.ts`.
- Official PDF documents (meeting minutes, payment receipts, cash book, annual treasurer's report) are produced in GERMAN by default and optionally in Turkish (Section 4.3). Excel exports stay Turkish.
- Use this glossary consistently (UI Turkish ↔ PDF German):

| Turkish | German |
|---|---|
| Yönetim Kurulu | Vorstand |
| Genel Kurul | Mitgliederversammlung |
| Tutanak | Protokoll |
| Toplantı (Yönetim Kurulu/Komisyon) / Genel Kurul | Sitzung / Versammlung |
| Gündem | Tagesordnung |
| Karar | Beschluss |
| Toplantı yeter sayısı | Beschlussfähigkeit |
| Başkan / Sekreter (toplantıda) | Versammlungsleiter/in (Sitzungsleiter/in for non-assembly meetings) / Protokollführer/in |
| Kabul / Ret / Çekimser | Ja / Nein / Enthaltungen |
| Üye / Üyelik aidatı / Makbuz | Mitglied / Mitgliedsbeitrag / Quittung |
| Muhasebe / Gelir / Gider | Buchhaltung / Einnahme / Ausgabe |
| Hesap / Kasa / Banka / Virman | Konto / Kasse / Bank / Umbuchung |
| Belge (fiş, fatura) | Beleg |
| Kasa defteri / Kasa raporu | Kassenbuch / Kassenbericht |
| Sayman / Kasa denetçisi | Kassenwart / Kassenprüfer |
| Bütçe | Haushaltsplan |
| İdeel alan / Varlık yönetimi / Amaca bağlı işletme / Ticari işletme | ideeller Bereich / Vermögensverwaltung / Zweckbetrieb / wirtschaftlicher Geschäftsbetrieb |
| Vergi muafiyet belgesi | Freistellungsbescheid |

## 2. SCOPE

PART A (retrofit): roles `TREASURER` and `AUDITOR`; new `organization` module (association master data); PDF localization; changes to documents, meetings and members; append-only audit log; DSGVO/GoBD notes.
PART B (new): `accounting` module.

## 3. ARCHITECTURE RULES AND PERMITTED CHANGES

- All Phase 0 architecture rules apply unchanged (three layers, public entry points `index.ts`/`server.ts`/`ui.ts`, ESLint boundary rules, thin route files). `pnpm lint` must stay clean.
- New modules: `organization` and `accounting`. Dependency map after this phase (put it in the README; no cycles allowed):
  - `auth` → none
  - `organization` → `auth`
  - `users`, `audit`, `documents` → `auth`
  - `members` → `auth`, `organization`
  - `meetings` → `auth`, `members`, `organization`
  - `accounting` → `auth`, `members`, `organization`
- No Prisma foreign keys across modules; reference by plain `...Id` + snapshot `...Label` fields.
- No new npm dependencies in this phase.
- Permitted changes outside the new modules are exactly those listed in PART A. Nothing else changes.

---

# PART A — GERMANY RETROFIT

## 4. CHANGES TO EXISTING PHASES

### 4.1 Roles and permissions (Phase 0, applies to all modules)

German associations have a treasurer (Kassenwart) and an independent auditor (Kassenprüfer).

- Extend the Prisma `Role` enum with `TREASURER` and `AUDITOR` (enum additions only in the migration, no usage of the new values inside that same migration).
- `shared/roles.ts`: because of `Record<Role, ...>` typing the compiler will force updating labels and colors:
  - ADMIN "Yönetici (Administrator)", BOARD "Yönetim Kurulu (Vorstand)", SECRETARY "Sekreter (Schriftführer)", TREASURER "Sayman (Kassenwart)", AUDITOR "Kasa Denetçisi (Kassenprüfer)", VIEWER "Salt okunur".
- Update EVERY existing `definePermissions` call (they must now list all six roles) and add the two new definitions. Final matrix (v=view, c=create, u=update, d=delete, a=approve, "-"=none):

| Resource | ADMIN | BOARD | SECRETARY | TREASURER | AUDITOR | VIEWER |
|---|---|---|---|---|---|---|
| users | v,c,u | - | - | - | - | - |
| audit | v | - | - | - | - | - |
| documents | v,c,u,d | v,c,u | v,c,u | v,c,u | v | v |
| documentCategories | v,c,u | v,c,u | v | v | v | v |
| meetings | v,c,u,d,a | v,c,u,a | v,c,u | v | v | v |
| members | v,c,u,d | v,c,u | v,c,u | v | - | v |
| memberTypes | v,c,u | v,c,u | v | v,c,u | - | v |
| memberPayments | v,c,u,d | v,c,u | v,c,u | v,c,u,d | - | - |
| organization (new) | v,u | v,u | v | v | v | - |
| accounting (new) | v,c,u,d,a | v | - | v,c,u,d,a | v | - |
| accountingSetup (new) | v,c,u | v | - | v,c,u | v | - |

- Consequence: voiding a member payment (`memberPayments.delete`) is now allowed for ADMIN and TREASURER. Update Phase 3 rule 8, its UI hints and README accordingly.
- Users module: the role select shows the new roles automatically. Dashboard cards, sidebar and all permission checks already work through `can(...)`; verify no hard-coded role lists exist anywhere (`grep` for `"ADMIN"`, `"BOARD"` literals outside `shared/roles.ts`, `permissions.ts` files, seed and tests of acceptance).

### 4.2 New module: `organization` (association master data, "Dernek Bilgileri")

Replaces the sole use of `ORGANIZATION_NAME` in PDFs. The env variable stays as a fallback when no profile exists.

Structure (standard module layout): `index.ts`, `server.ts`, `ui.ts`, `module.config.ts`, `permissions.ts`, `schemas/profile.ts`, `queries/get-profile.ts`, `actions/update-profile.ts`, `components/profile-form.tsx`, `views/profile-view.tsx`. Route: `src/app/(dashboard)/ayarlar/dernek/page.tsx` (thin). Nav item "Dernek Bilgileri" (group `settings`, `organizationPermissions` + `view`).

Prisma (`prisma/schema/organization.prisma`), singleton row (`id` fixed to `"singleton"`, created on first save via upsert):
```prisma
model OrganizationProfile {
  id                    String    @id             // always "singleton"
  name                  String                    // full legal name including "e.V."
  street                String?
  postalCode            String?
  city                  String?
  country               String?   @default("Deutschland")
  email                 String?
  phone                 String?
  website               String?
  registerCourt         String?                   // Amtsgericht
  registerNumber        String?                   // e.g. "VR 12345"
  taxNumber             String?                   // Steuernummer
  taxOffice             String?                   // Finanzamt
  exemptionNoticeDate   DateTime? @db.Date        // date of Freistellungs-/Feststellungsbescheid
  exemptionNoticePeriod String?                   // e.g. "2022–2024"
  updatedById           String?
  updatedByLabel        String?
  updatedAt             DateTime  @updatedAt
}
```
- Validation: `name` 3–200; `postalCode` `^\d{5}$` when country is empty or "Deutschland"; `registerNumber` ≤ 30; `taxNumber` ≤ 30; `website` valid URL or empty; `email` valid or empty; all others ≤ 200. Optimistic concurrency with `updatedAt`.
- `organization/server` exports `getOrganizationProfile(): Promise<OrganizationProfile-like>`; it returns the saved row or a fallback object `{ name: env.ORGANIZATION_NAME }` with all other fields null.
- Letterhead helper for PDFs (`shared/pdf/letterhead.tsx`, receives the profile object, does NOT import the module): prints name, address line (`street, PLZ city`), "Vereinsregister: AG <registerCourt>, <registerNumber>", "Steuernummer: <taxNumber> – Finanzamt <taxOffice>", and, only when `exemptionNoticeDate` exists, "Gemeinnützigkeit: Freistellungsbescheid des Finanzamts <taxOffice> vom <dd.MM.yyyy>" (plus period if set). Print only the lines that have data. Use this letterhead in all PDFs.
- Dashboard: for users with `organizationPermissions.update`, show an info banner "Dernek bilgileri eksik" linking to `/ayarlar/dernek` while no profile row exists.
- Audit: `UPDATE` on entity `OrganizationProfile` (changed field names; values only for non-personal public data like `registerCourt`).

### 4.3 PDF localization (affects Phase 2 minutes PDF, Phase 3 receipt PDF, and all new PDFs)

- New `shared/pdf/i18n.ts`: `type PdfLang = "de" | "tr"`; `resolvePdfLang(request): PdfLang` = `?lang=` query value if valid, else env `DOCUMENT_LANGUAGE` (default `"de"`). Each PDF module has `pdf/strings.ts` exporting `{ de: {...}, tr: {...} }` typed with one shared key interface so a missing translation is a compile error.
- `shared/pdf/format.ts`: `formatPdfDate(date, lang)` (`dd.MM.yyyy`), `formatPdfMoney(cents, lang)` (de: `Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" })`, e.g. `1.234,56 €`; tr: `tr-TR`), `formatPdfNumber`.
- Extend `shared/money.ts#formatMoney` with an optional locale argument (default `tr-TR` for the UI).
- Every PDF route accepts `?lang=de|tr`. In the UI each PDF button becomes a split button: main click = default language, dropdown items "Almanca (Deutsch)" and "Türkçe".
- Switch the Phase 2 minutes PDF and Phase 3 receipt PDF to the German-default dictionary using the glossary in Section 1. Meeting PDF specifics: title "PROTOKOLL"; for GENERAL_ASSEMBLY use "Protokoll der Mitgliederversammlung" and "Versammlungsleiter/in", otherwise "Sitzungsprotokoll" and "Sitzungsleiter/in"; secretary signature label "Protokollführer/in"; attendance statuses "Anwesend / Entschuldigt / Nicht anwesend / Eingeladen"; quorum sentence "Die Beschlussfähigkeit wurde festgestellt (X/Y)." or "Die Beschlussfähigkeit war nicht gegeben (X/Y)."; decisions "Beschluss Nr. 2026/7", votes "Ja X / Nein Y / Enthaltungen Z", result "angenommen / abgelehnt / vertagt"; footer "Seite X von Y"; draft mark "ENTWURF"; approved line "Genehmigt am dd.MM.yyyy – <label>"; free text typed by users is printed unchanged.
- Receipt PDF (Phase 3): title "QUITTUNG ÜBER MITGLIEDSBEITRAG"; sentence "<Name> (Mitglied-Nr. 0012) hat den Mitgliedsbeitrag für das Jahr <year> in Höhe von <amount> gezahlt."; voided label "STORNIERT" with date and reason; ADD this disclaimer at the bottom in both languages: DE "Diese Quittung ist keine Zuwendungsbestätigung im Sinne des § 10b EStG." / TR "Bu makbuz, § 10b EStG anlamında bir bağış/aidat vergi belgesi (Zuwendungsbestätigung) değildir.".
- Use `shared/pdf/letterhead.tsx` (4.2) in the minutes, receipts and all new PDFs. Add `ORGANIZATION` data loading via `getOrganizationProfile()` in the handlers (meetings and members now depend on `organization`).
- UI PDF buttons in meetings and members are updated to the split button.
- Env: add `DOCUMENT_LANGUAGE=de` to `.env.example` and `shared/env.ts` (zod enum `de|tr`).
- Re-verify Turkish glyphs and German umlauts/ß (`ä ö ü Ä Ö Ü ß`) render in the Noto Sans PDFs, in dev and in the `standalone` build.

### 4.4 Documents module (Phase 1) changes

- `DeliveryMethod` enum: rename value `KEP` to `REGISTERED_MAIL` and add `FAX`. Generate the migration with `prisma migrate dev --create-only`, then edit the SQL to use `ALTER TYPE "DeliveryMethod" RENAME VALUE 'KEP' TO 'REGISTERED_MAIL';` and `ALTER TYPE "DeliveryMethod" ADD VALUE 'FAX';` so existing data is preserved. Update labels: POST "Posta (Post)", EMAIL "E-posta", HAND "Elden (persönlich)", COURIER "Kargo/Kurye", REGISTERED_MAIL "Taahhütlü posta (Einschreiben)", FAX "Faks", OTHER "Diğer". Update Excel export mapping and the filter.
- Seed (upsert, existing categories untouched): add document categories "Vergi dairesi (Finanzamt)", "Dernek sicili (Vereinsregister / Amtsgericht)", "Banka (Bank)", "Sigorta (Versicherung)", "Genel Kurul (Mitgliederversammlung)", "Tüzük (Satzung)".
- No functional change otherwise. README: documents are never hard-deleted; retention periods (Section 12).

### 4.5 Meetings module (Phase 2) changes

- Add to `Meeting`: `invitationSentAt DateTime? @db.Date` (additive migration). Form field "Davet gönderim tarihi (Einladung versandt am)", shown for types BOARD and GENERAL_ASSEMBLY, must not be after `meetingDate`. Detail "Genel" tab shows it and, when set, "Davet süresi: N gün". No enforcement of any notice period (the Satzung decides; README note). Minutes PDF prints "Einladung versandt am dd.MM.yyyy" when set. Audit includes it as an ordinary field.
- Labels per glossary: type labels "Yönetim Kurulu (Vorstand)", "Genel Kurul (Mitgliederversammlung)", "Komisyon (Ausschuss)", "Diğer"; quorum banner "Toplantı yeter sayısı (Beschlussfähigkeit) sağlandı/sağlanmadı (X/Y)"; chairperson "Başkan (Versammlungsleiter/in)", secretary "Sekreter (Protokollführer/in)".
- PDF changes per Section 4.3.

### 4.6 Members module (Phase 3) changes

- `Member`: add `country String?` and `cancellationReceivedAt DateTime? @db.Date` (additive migration). Postal code validation: `^\d{5}$` when `country` is empty or "Deutschland"/"Germany"/"Almanya"; otherwise free text ≤ 10. Add `country` to the form, detail, import template (column "Ülke"), import parser and members Excel export.
- "Ayrıldı" status modal gets an optional field "Fesih bildirimi tarihi (Kündigung eingegangen am)" stored in `cancellationReceivedAt` (must not be after `leaveDate`); shown on the detail page; cleared when the member returns to ACTIVE/SUSPENDED.
- Seed (upsert): add membership type "Destekleyici Üye (Fördermitglied)" (amount null). Existing types untouched.
- Labels per glossary: "Üyelik aidatı (Mitgliedsbeitrag)", "Makbuz (Quittung)", "Üyelik türü (Mitgliedsart)".
- `members/server` exports `listPaymentsForAccounting(params?: { fromDate?: string; toDate?: string }): Promise<AccountingPaymentRow[]>` where `AccountingPaymentRow = { id; receiptNumber; memberNumber; dueYear; amountCents; paidAt: string /* YYYY-MM-DD */; method: PaymentMethod; voidedAt: string | null; voidReason: string | null }`. Contains NO personal data (no names). Used only by `accounting`.
- DSGVO right of access (Art. 15): `GET /api/members/[id]/data-export` (thin route + `handlers/data-export.ts`), permission `members.update`, returns a JSON file `mitglied-<0012>-datenauskunft.json` with all stored fields of that member plus dues and payments (receipt number, date, amount, method, reference, void info). Not available for anonymized members (clear error). Detail page action "Veri dışa aktar (DSGVO Art. 15)". Audit `DATA_EXPORT` (no content, only member number). README: names in meeting minutes are not included (legal record).
- Payments: void permission change per 4.1. Receipt PDF changes per 4.3.

### 4.7 Phase 0 hardening

- Append-only audit log: add a migration with SQL triggers on `"AuditLog"` that raise an exception on UPDATE and DELETE:
```sql
CREATE OR REPLACE FUNCTION prevent_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION '% on % is not allowed (append-only)', TG_OP, TG_TABLE_NAME; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
```
  Verify nothing in the codebase updates or deletes audit rows (`seed.ts` included).
- README additions: "Datenschutz (DSGVO)" section (data categories processed, hosting inside the EU/Germany on the association's own server, encrypted backups of database and `UPLOAD_DIR` together, role-based access, data minimization, no national IDs or bank data of members stored, no third-party tracking or external resource loading, right of access via data export, right to erasure via anonymization vs. statutory retention); "GoBD/Verfahrensdokumentation (kurz)" section (how bookings are recorded, locked, corrected by reversal, how receipts are kept, who may do what, how backups work); "Aufbewahrungsfristen" (Section 12).

---

# PART B — ACCOUNTING MODULE

## 5. GERMAN BOOKKEEPING BACKGROUND (design basis)

- Small associations use cash-basis bookkeeping (EÜR): income and expenses are recorded when money flows (Zufluss-/Abflussprinzip). No double-entry accounting, no balance sheet in this phase. The accounting year is the calendar year (`// KARAR:`).
- A gemeinnütziger Verein separates four spheres (Tätigkeitsbereiche); every category belongs to exactly one:
  1. `IDEELL` – ideeller Bereich (membership fees, donations, grants, ordinary association spending)
  2. `ASSET_MANAGEMENT` – Vermögensverwaltung (interest, rent)
  3. `PURPOSE_OPERATION` – Zweckbetrieb (statutory-purpose activities with income, tax-privileged)
  4. `ECONOMIC_OPERATION` – steuerpflichtiger wirtschaftlicher Geschäftsbetrieb
- GoBD principles implemented: every booking has a consecutive number, a date and a description; receipts (Belege) are attached to bookings; bookings are not deleted, only reversed (storniert) with a reason; closed years cannot be changed; all changes are logged in the append-only audit log; no negative cash balance (Kassenminus).
- Constants in `accounting/constants.ts` (comment `// Stand: 2026 – jährlich prüfen`, mention in README):
  - `ECONOMIC_OPERATION_LIMIT_CENTS = 5_000_000` (50,000 € gross income limit for taxable wirtschaftliche Geschäftsbetriebe, § 64 Abs. 3 AO, applicable from 2026)
  - `ALLOWANCE_HINT_TEXT = "Ehrenamtspauschale bis 960 €/Jahr, Übungsleiterpauschale bis 3.300 €/Jahr je Person (Stand 2026). Kişi bazlı yıllık takip bu uygulamada yapılmaz."` shown as help text on the expense category for allowances.
- All amounts are booked GROSS (as paid or received). No VAT handling in this phase.
- The application supports record-keeping; it is not tax advice. README says the association should have its Kassenwart and Kassenprüfer (and if needed a tax advisor) review the setup.

## 6. FILE STRUCTURE

```
prisma/schema/organization.prisma
prisma/schema/accounting.prisma
src/modules/organization/...                    # Section 4.2
src/shared/pdf/letterhead.tsx, i18n.ts          # Section 4.3
src/modules/accounting/
  index.ts  server.ts  ui.ts  module.config.ts  permissions.ts  types.ts  constants.ts
  schemas/    booking.ts account.ts category.ts project.ts budget.ts settings.ts year.ts
  queries/    list-bookings.ts get-booking.ts list-accounts.ts list-categories.ts list-projects.ts
              get-budget.ts get-ledger.ts get-income-expense-report.ts get-project-report.ts
              get-accounting-stats.ts list-years.ts preview-member-sync.ts get-settings.ts
  services/   booking-number.ts balances.ts booking-guards.ts member-sync.ts report-builders.ts
  actions/    booking-actions.ts       # create, update, reverse
              account-actions.ts category-actions.ts project-actions.ts budget-actions.ts
              year-actions.ts          # close, unlock
              sync-actions.ts          # previewMemberSync, runMemberSync
              settings-actions.ts delete-file.ts
  handlers/   upload-file.ts download-file.ts export-bookings.ts export-income-expense.ts
              export-ledger.ts ledger-pdf.ts annual-report-pdf.ts
  pdf/        ledger-document.tsx annual-report-document.tsx strings.ts
  components/ booking-form.tsx booking-type-badge.tsx stats-cards.tsx list-filters.tsx
              account-balance-chips.tsx files-panel.tsx reverse-modal.tsx
              account-form-modal.tsx category-form-modal.tsx project-form-modal.tsx
              budget-editor.tsx year-close-dialog.tsx year-unlock-dialog.tsx
              sync-panel.tsx report-tables.tsx pdf-split-button.tsx (or the shared one)
  views/      booking-list-view.tsx booking-create-view.tsx booking-detail-view.tsx
              booking-edit-view.tsx setup-view.tsx budget-view.tsx year-closing-view.tsx
              member-sync-view.tsx reports-view.tsx
src/app/(dashboard)/muhasebe/page.tsx                    # booking list
src/app/(dashboard)/muhasebe/yeni/page.tsx               # ?tur=gelir|gider|virman
src/app/(dashboard)/muhasebe/[id]/page.tsx
src/app/(dashboard)/muhasebe/[id]/duzenle/page.tsx
src/app/(dashboard)/muhasebe/ayarlar/page.tsx            # ?sekme=hesaplar|kategoriler|projeler
src/app/(dashboard)/muhasebe/butce/page.tsx
src/app/(dashboard)/muhasebe/yil-kapanisi/page.tsx
src/app/(dashboard)/muhasebe/uyelik-aktarimi/page.tsx
src/app/(dashboard)/muhasebe/raporlar/page.tsx
src/app/api/accounting/[id]/files/route.ts               # POST upload
src/app/api/accounting/files/[fileId]/route.ts           # GET download/preview
src/app/api/accounting/export/route.ts                   # GET bookings xlsx
src/app/api/accounting/reports/income-expense/export/route.ts   # GET xlsx
src/app/api/accounting/reports/ledger/export/route.ts           # GET xlsx
src/app/api/accounting/reports/ledger/pdf/route.ts              # GET pdf
src/app/api/accounting/reports/annual/pdf/route.ts              # GET pdf
```
Nav items: "Muhasebe (Buchhaltung)" (`/muhasebe`, group `main`, `accountingPermissions` + `view`).

## 7. DATABASE (`prisma/schema/accounting.prisma`)

```prisma
enum AccountType    { CASH BANK OTHER }
enum BookingType    { INCOME EXPENSE TRANSFER }
enum CategoryDirection { INCOME EXPENSE }
enum Sphere {
  IDEELL              // ideeller Bereich
  ASSET_MANAGEMENT    // Vermögensverwaltung
  PURPOSE_OPERATION   // Zweckbetrieb
  ECONOMIC_OPERATION  // wirtschaftlicher Geschäftsbetrieb
}

model AccountingCounter {
  year    Int @id
  lastSeq Int @default(0)
}

model AccountingAccount {
  id             String      @id @default(cuid())
  name           String      @unique            // e.g. "Kasse", "Girokonto"
  type           AccountType
  openingBalance Decimal     @default(0) @db.Decimal(12, 2)
  openingDate    DateTime    @db.Date
  isActive       Boolean     @default(true)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  bookings       AccountingBooking[] @relation("BookingAccount")
  transfersIn    AccountingBooking[] @relation("BookingCounterAccount")
}

model AccountingCategory {
  id         String            @id @default(cuid())
  name       String            @unique
  direction  CategoryDirection
  sphere     Sphere
  helpText   String?
  sortOrder  Int               @default(0)
  isActive   Boolean           @default(true)
  createdAt  DateTime          @default(now())
  updatedAt  DateTime          @updatedAt
  bookings   AccountingBooking[]
  budgetLines AccountingBudgetLine[]
}

model AccountingProject {
  id        String   @id @default(cuid())
  name      String   @unique
  note      String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  bookings  AccountingBooking[]
}

model AccountingBooking {
  id              String      @id @default(cuid())
  year            Int                          // year of bookingDate
  sequence        Int
  bookingNumber   String      @unique          // B-2026-0001
  type            BookingType
  bookingDate     DateTime    @db.Date
  accountId       String
  account         AccountingAccount   @relation("BookingAccount", fields: [accountId], references: [id], onDelete: Restrict)
  counterAccountId String?                     // TRANSFER target
  counterAccount  AccountingAccount?  @relation("BookingCounterAccount", fields: [counterAccountId], references: [id], onDelete: Restrict)
  categoryId      String?                      // null for TRANSFER
  category        AccountingCategory? @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  projectId       String?
  project         AccountingProject?  @relation(fields: [projectId], references: [id], onDelete: Restrict)
  amount          Decimal     @db.Decimal(12, 2)   // always positive
  description     String                           // Buchungstext
  counterparty    String?                          // payer / payee (free text)
  receiptReference String?                         // external receipt / invoice number

  sourceType      String?                          // "MEMBER_PAYMENT" or null
  sourceId        String?                          // MemberPayment id (no FK)

  reversedAt      DateTime?
  reversedById    String?
  reversedByLabel String?
  reverseReason   String?

  createdById     String
  createdByLabel  String
  updatedById     String?
  updatedByLabel  String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  files           AccountingBookingFile[]

  @@unique([year, sequence])
  @@unique([sourceType, sourceId])
  @@index([bookingDate])
  @@index([accountId])
  @@index([categoryId])
  @@index([projectId])
  @@index([year, type])
}

model AccountingBookingFile {
  id              String    @id @default(cuid())
  bookingId       String
  booking         AccountingBooking @relation(fields: [bookingId], references: [id], onDelete: Restrict)
  originalName    String
  storedName      String    @unique
  storagePath     String               // accounting/<year>/<bookingId>/<storedName>
  mimeType        String
  size            Int
  uploadedById    String
  uploadedByLabel String
  createdAt       DateTime  @default(now())
  deletedAt       DateTime?
  deletedById     String?
  deletedByLabel  String?

  @@index([bookingId])
}

model AccountingYear {
  year           Int       @id
  lockedAt       DateTime?
  lockedById     String?
  lockedByLabel  String?
}

model AccountingBudgetLine {
  id         String   @id @default(cuid())
  year       Int
  categoryId String
  category   AccountingCategory @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  amount     Decimal  @db.Decimal(12, 2)
  updatedAt  DateTime @updatedAt

  @@unique([year, categoryId])
}

model AccountingSettings {
  id                  String  @id              // always "singleton"
  memberFeeCategoryId String?
  cashAccountId       String?                  // account for payments with method CASH
  bankAccountId       String?                  // account for BANK_TRANSFER, CARD, OTHER
  updatedAt           DateTime @updatedAt
}
```
- Money columns are Decimal(12,2); all arithmetic in TypeScript is done in integer cents via `shared/money.ts`; sums in the database use Prisma `aggregate`/`groupBy`.
- Migration also adds database-level protection (SQL in the migration): a `BEFORE DELETE` trigger on `"AccountingBooking"` and `"AccountingBookingFile"` raising an exception (reuse `prevent_mutation()` from 4.7), and a `BEFORE UPDATE` trigger on `"AccountingBooking"` that raises if `bookingNumber`, `year`, `sequence` or `createdAt` change.
- Seed (idempotent, upsert by name):
  - Accounts: "Kasa (Kasse)" CASH and "Banka hesabı (Girokonto)" BANK, both with opening balance 0 and `openingDate` = 1 Jan of the current year (the admin adjusts them before the first booking).
  - Income categories: "Üyelik aidatları (Mitgliedsbeiträge)" IDEELL; "Bağışlar (Spenden)" IDEELL; "Hibe ve destekler (Zuschüsse / Fördermittel)" IDEELL; "Diğer ideel gelirler (Sonstige ideelle Einnahmen)" IDEELL; "Faiz gelirleri (Zinserträge)" ASSET_MANAGEMENT; "Kira gelirleri (Mieteinnahmen)" ASSET_MANAGEMENT; "Amaca bağlı işletme gelirleri (Einnahmen Zweckbetrieb)" PURPOSE_OPERATION; "Ticari işletme gelirleri (Einnahmen wirtschaftlicher Geschäftsbetrieb)" ECONOMIC_OPERATION.
  - Expense categories: "Kira ve yan giderler (Raumkosten / Miete)" IDEELL; "Etkinlik giderleri (Veranstaltungskosten)" IDEELL; "Büro, posta, iletişim (Bürobedarf, Porto, Telefon)" IDEELL; "Sigortalar (Versicherungen)" IDEELL; "Banka masrafları (Kontoführungsgebühren)" IDEELL; "Görev tazminatları (Aufwandsentschädigungen / Ehrenamts- und Übungsleiterpauschale)" IDEELL with `helpText = ALLOWANCE_HINT_TEXT`; "Seyahat giderleri (Reisekosten)" IDEELL; "Federasyon ve birlik aidatları (Verbandsbeiträge)" IDEELL; "Tanıtım ve halkla ilişkiler (Öffentlichkeitsarbeit)" IDEELL; "Varlık yönetimi giderleri (Aufwendungen Vermögensverwaltung)" ASSET_MANAGEMENT; "Amaca bağlı işletme giderleri (Ausgaben Zweckbetrieb)" PURPOSE_OPERATION; "Ticari işletme giderleri (Ausgaben wirtschaftlicher Geschäftsbetrieb)" ECONOMIC_OPERATION; "Diğer giderler (Sonstige Ausgaben)" IDEELL.
  - After seeding, if `AccountingSettings` does not exist, create it with `memberFeeCategoryId` = "Üyelik aidatları" category, `cashAccountId` = the Kasse account, `bankAccountId` = the Girokonto account.

## 8. BUSINESS RULES

1. **Booking types**: `INCOME` (money into `accountId`), `EXPENSE` (money out of `accountId`), `TRANSFER` (Umbuchung: money from `accountId` to `counterAccountId`, e.g. cash deposit to bank). INCOME/EXPENSE require an active category with matching `direction` and no `counterAccountId`. TRANSFER requires an active `counterAccountId` different from `accountId`, no category, no project. The type cannot be changed after creation.
2. **Booking number**: `B-<year>-<sequence 4 digits>`, `year` = year of `bookingDate`, sequence from `AccountingCounter` incremented atomically in the creating transaction (same technique and `P2002` retry as earlier phases). Numbers reflect entry order, are immutable and never reused.
3. **Booking date**: not in the future (Europe/Berlin today), not earlier than the account's `openingDate` (for TRANSFER both accounts), and its year must not be locked (rule 8).
4. **Amount**: > 0, at most 2 decimals (`toCents`), max 9,999,999.99.
5. **Validation (zod)**: `description` 3–300, `counterparty` ≤ 150, `receiptReference` ≤ 100, `projectId` optional active project; empty strings become null; text trimmed; `updatedAt` hidden field for optimistic concurrency on update.
6. **Editing** (`update`): allowed only if the booking is not reversed, its year is not locked, and `sourceType` is null (member-payment bookings are managed by the sync). Editable fields: date, account(s), category, project, amount, description, counterparty, receiptReference. Every change passes through the same validations as create plus the cash rule (rule 9).
7. **Reversal (Storno)** (`delete` permission): never a hard delete. Requires a reason (5–300 chars); sets `reversedAt/ById/ByLabel` and `reverseReason`. Not allowed if the year is locked, if `sourceType` is set (member-payment bookings are reversed only by the sync when the payment is voided), or if the cash rule (rule 9) would be violated. Reversed bookings stay visible (struck through), keep their number and files, and are EXCLUDED from every sum, balance and report. A reversed booking cannot be edited or un-reversed; the user creates a new booking instead.
8. **Year locking** (`approve` permission): `closeYear(year)`: allowed for years before the current year or the current year (the user decides); shows a preview first (booking count, income, expense, number of bookings missing receipts) and requires confirmation; sets `AccountingYear.lockedAt/By`. While locked: no create/edit/reverse for bookings dated in that year, no budget edits for that year, no file deletion; file upload stays allowed (late receipts); the member sync skips payments dated in that year (reported in the preview). `unlockYear(year)` requires `approve`, a mandatory reason (5–300 chars), clears the lock and writes a prominent audit record `YEAR_UNLOCK`. Corrections after closing are normally made as new bookings in the current open year (README states this).
9. **Cash rule (Kassenminus)**: the running balance of an account of type CASH must never be below zero at any date. `services/balances.ts#assertNoNegativeCash(accountId, tx)` recomputes the chronological running balance (opening balance + movements ordered by `bookingDate`, then `sequence`) after any create/update/reverse/transfer and the operation is rejected with "Kasa bakiyesi eksiye düşemez (Kassenminus)." if any point is negative. BANK and OTHER accounts may be negative.
10. **Account balance** at date D = opening balance (if `openingDate` ≤ D) + INCOME to the account − EXPENSE from it − TRANSFER out + TRANSFER in, over non-reversed bookings with `openingDate` ≤ `bookingDate` ≤ D, computed in cents.
11. **Accounts**: unique name; `openingBalance` and `openingDate` are editable only while the account has no bookings (error "Hareketi olan hesabın açılış bakiyesi değiştirilemez."); CASH opening balance must be ≥ 0; accounts are never deleted, only deactivated; an inactive account cannot be used in new bookings but keeps its history.
12. **Categories**: unique name; `direction` and `sphere` are immutable once any non-reversed booking uses the category (error text explains why); name, helpText, sortOrder and active flag are editable; never deleted, only deactivated.
13. **Projects**: unique name, optional note, deactivate instead of delete. Projects model grants and events (Verwendungsnachweis); reports show income, expense and balance per project.
14. **Receipts (Belege)**: files attach to a booking via the shared files module (Section 9). A booking "has a receipt" if it has at least one non-deleted file, OR it is a TRANSFER, OR `sourceType` is set (the member receipt exists in the members module). Bookings without a receipt are flagged "Belge eksik (Beleg fehlt)" in lists, stats, the year-closing preview and the annual report; this is a warning, not a blocker.
15. **Member-fee import** (`services/member-sync.ts`, `actions/sync-actions.ts`): imports payments from the members module into the ledger without duplicating work.
    - Requires `AccountingSettings` (member-fee category must be an active INCOME category; cash and bank accounts active). Otherwise the screen asks to configure them.
    - `previewMemberSync()` returns: payments to import (count and total), payments to reverse (count and total), skipped because their year is locked, skipped because `paidAt` is before the target account's `openingDate`, conflicts (voided payment whose booking is in a locked year).
    - `runMemberSync()` (permission `accounting.create`) in one transaction per batch: for every non-voided payment from `listPaymentsForAccounting()` without a booking, create an INCOME booking with `bookingDate = paidAt`, account by method (CASH → `cashAccountId`; BANK_TRANSFER, CARD, OTHER → `bankAccountId`), category = member-fee category, `amount`, `description = "Mitgliedsbeitrag <dueYear> – Mitglied Nr. <0012> – <receiptNumber>"` (member NUMBER only, never names), `receiptReference = receiptNumber`, `sourceType = "MEMBER_PAYMENT"`, `sourceId = payment id`. For every voided payment whose booking exists and is not reversed: reverse it with reason "Quittung storniert: <voidReason>" (reversal performed by the running user). Idempotent: running twice creates nothing new (`@@unique([sourceType, sourceId])`). Cash rule applies; a violation lists the payment as a conflict instead of failing the whole run.
    - Audit: one `SYNC_MEMBER_PAYMENTS` record with counts and totals (plus the normal CREATE/REVERSE records per booking).
16. **Budget (Haushaltsplan)**: one amount per year and active category (`AccountingBudgetLine`). Editing screen shows all active categories grouped by direction and sphere with an amount input per row; saving writes all changed rows in one transaction (empty or 0 removes the line); "Önceki yıldan kopyala" copies the previous year's lines into empty rows. Blocked for locked years.
17. **Economic operation limit notice**: in reports show the gross income of sphere `ECONOMIC_OPERATION` versus `ECONOMIC_OPERATION_LIMIT_CENTS`: neutral text under 80%, amber note from 80%, red note when exceeded: "Ticari işletme gelirleri 50.000 € sınırını aştı (§ 64 Abs. 3 AO). Vergi danışmanına başvurun." This is an informational note only.
18. **Concurrency**: booking edit uses optimistic concurrency (`updatedAt`); other entities follow the established patterns.

## 9. FILE HANDLING (Belege)

Use `shared/files` exclusively (validation, storage, download response). Storage path `accounting/<year>/<bookingId>/<storedName>` (`year` = booking year). Allowed extensions: pdf, jpg/jpeg, png only (receipt scans and photos); `MAX_UPLOAD_MB` limit; max 10 active files per booking.
- Upload `POST /api/accounting/[id]/files`: session (401 JSON) → permission `accounting.update`, or `accounting.create` for a booking created in the same session flow (handler accepts either; viewer/auditor never) → booking exists and is not reversed → limits and validation → write → `AccountingBookingFile` row → audit `FILE_UPLOAD`. Upload is allowed in locked years. Failure removes any written file.
- Download `GET /api/accounting/files/[fileId]`: session + `accounting.view`, file not deleted; `?inline=1` only for pdf/jpg/png; headers per shared helper.
- File deletion (soft, `delete` permission): only if the booking's year is not locked; audit `FILE_DELETE`. The file stays on disk.
- Create flow: after `createBooking` succeeds, the client uploads selected files sequentially; on failure the booking is kept and the user lands on the detail page with a warning (same pattern as Phase 1).

## 10. PERMISSIONS (`permissions.ts`)

Definitions exactly as in the Section 4.1 matrix: `accountingPermissions` and `accountingSetupPermissions`.
- View lists, details, reports, PDFs, Excel exports, file downloads: `accounting.view`.
- Create bookings, run member sync: `accounting.create`. Edit bookings, upload files: `accounting.update`. Reverse bookings, delete files: `accounting.delete`. Close/unlock years: `accounting.approve`.
- Accounts, categories, projects, budget, sync settings: `accountingSetup` (view / create / update).
- Every view, action and handler checks permissions on the server with `requirePermission`. `module.config.ts`: nav "Muhasebe (Buchhaltung)".

## 11. SCREENS

All screens use the existing shared components (`PageHeader`, `DataTable`, form components, `ConfirmDialog`, `EmptyState`, `AccessDenied`, toasts, `useListQueryState`).

### 11.1 Booking list (`/muhasebe`)
- Year selector (default current year, `filter.year`). When the selected year is locked show a banner "<year> yılı kilitli (abgeschlossen)".
- `account-balance-chips`: current balance per active account.
- `StatsCards` for the selected year: "Gelir (Einnahmen)", "Gider (Ausgaben)", "Fark (Überschuss/Fehlbetrag)", "Belgesi eksik (Beleg fehlt)" (click applies the filter).
- Header actions (permission-aware): "Gelir ekle" (`/muhasebe/yeni?tur=gelir`), "Gider ekle" (`?tur=gider`), "Virman (Umbuchung)" (`?tur=virman`), "Üyelik aktarımı" (`/muhasebe/uyelik-aktarimi`), "Raporlar", "Bütçe (Haushaltsplan)", "Yıl kapanışı", "Ayarlar" (accounts/categories/projects), "Excel'e aktar".
- Columns: Buchungsnr., Tarih, Tür (badge), Hesap ("A → B" for transfers), Kategori, Açıklama, Karşı taraf, Proje, Tutar (income green, expense red, transfer neutral; reversed rows struck through), Belge (clip icon with count or amber "eksik"), Durum (Aktif/İptal edildi), Kaynak (badge "Üyelik aidatı (otomatik)" for synced rows).
- Search `q`: `bookingNumber`, `description`, `counterparty`, `receiptReference`. Filters: Tür, Hesap, Kategori, Alan (Sphere), Proje, "Belgesi eksik", Kaynak (el ile / üyelik aktarımı), "İptal edilenleri gizle", date range (`filter.from`, `filter.to`).
- Sortable: `bookingDate`, `bookingNumber`, `amount`, `createdAt`. Default `bookingDate desc`, then `sequence desc`.
- Row click → detail. Row actions: Görüntüle, Düzenle, İptal et (Storno).

### 11.2 Create / edit booking (`/muhasebe/yeni`, `/muhasebe/[id]/duzenle`)
- One `booking-form.tsx`, adapting fields to the type: Tarih, Tutar, Hesap (for transfers "Kaynak hesap" and "Hedef hesap"), Kategori (filtered by direction, option labels show sphere), Proje, Açıklama (Buchungstext), Karşı taraf, Belge/Fatura no, and on create a Belge (Beleg) upload area. Selecting an allowance category shows its `helpText`.
- Edit is blocked with an explanatory message for reversed, locked-year and synced bookings.

### 11.3 Detail (`/muhasebe/[id]`)
- Header: booking number, type badge, amount, status. All fields, created/updated info, reversal info (who, when, reason), source info for synced bookings (receipt number, member number only).
- Files panel: list, download/preview, upload, delete (rules in Section 9).
- Actions: Düzenle, İptal et (opens `reverse-modal` with mandatory reason).

### 11.4 Setup (`/muhasebe/ayarlar?sekme=`)
- Tabs "Hesaplar (Konten)", "Kategoriler (Kategorien)", "Projeler (Projekte)": each a `DataTable` with create/edit via modal and activate/deactivate via `ConfirmDialog`. Accounts show current balance; categories show direction, sphere, booking count; projects show booking count. Rules 11–13.

### 11.5 Budget (`/muhasebe/butce`)
- Year selector, grouped input table, save, copy from previous year (rule 16). Shows per-row actual amount of the year next to the plan for orientation.

### 11.6 Year closing (`/muhasebe/yil-kapanisi`)
- Table of years that have bookings (plus the current year): year, booking count, income, expense, missing receipts, status (Açık / Kilitli with who and when). Actions "Yılı kapat" (preview dialog, rule 8) and "Kilidi aç" (reason dialog) by permission.

### 11.7 Member sync (`/muhasebe/uyelik-aktarimi`)
- Settings card (member-fee category, cash account, bank account; `accountingSetup.update`) and the preview panel with "Önizleme" and "Aktar" buttons (`accounting.create`), listing conflicts and skipped items (rule 15).

### 11.8 Reports (`/muhasebe/raporlar`, year selector, `?filter.year=`)
1. **Gelir-Gider Tablosu (Einnahmen-Ausgaben-Rechnung)**: grouped by sphere, then by category; columns Plan (budget), Gerçekleşen (actual), Fark, Önceki yıl (previous year actual). Per sphere subtotals "Gelir toplamı / Gider toplamı / Fazla veya eksik (Überschuss/Fehlbetrag)", grand totals, and the economic-operation notice (rule 17). Transfers and reversed bookings are excluded. Excel export (`/api/accounting/reports/income-expense/export`).
2. **Kasa/Hesap Defteri (Kassenbuch)**: account selector and date range (default the year). Opening balance at range start, rows in chronological order (date, booking number, description, receipt reference, income, expense, running balance), closing balance; reversed bookings are listed struck-through and excluded from the running balance; running balance below zero highlighted red. Excel export and PDF (`/api/accounting/reports/ledger/pdf?account=&from=&to=&lang=`).
3. **Proje Raporu (Projekte)**: per project income, expense, balance for the year.
4. **Yıllık Kasa Raporu (Kassenbericht)** PDF for the Mitgliederversammlung (`/api/accounting/reports/annual/pdf?year=&lang=`): letterhead; title "KASSENBERICHT <year>"; opening and closing balances per account; the full Einnahmen-Ausgaben-Rechnung with plan/actual; project summary; a note with the number of bookings without receipts; the economic-operation notice when relevant; closing blocks "Erstellt von (Kassenwart): ______ Datum: ______" and "Kassenprüfung durchgeführt am: ______ Ergebnis: ______ Unterschrift Kassenprüfer/in: ______". German by default, Turkish via `lang=tr`.
- PDF buttons use the split-button (language choice). Report calculations live in `services/report-builders.ts` and are shared by screens, Excel and PDFs (no duplicated logic).

### 11.9 Excel export of bookings (`/api/accounting/export`)
- Same query parameters as the list (`q`, `filter.*`, `sort`, `dir`; page ignored), permission `accounting.view`, max 10,000 rows. Sheet "Buchungen". Columns: Buchungsnr., Tarih, Tür, Hesap, Hedef hesap, Kategori, Alan, Proje, Tutar (numeric, `#,##0.00 "€"`), Açıklama, Karşı taraf, Belge no, Belge sayısı, Durum, İptal nedeni. Date cells are real dates. File name `buchungen-<year>-YYYY-MM-DD.xlsx`. Audit `EXPORT`.

## 12. RETENTION AND DATA PROTECTION RULES

- Nothing in accounting is hard-deleted (database triggers enforce it for bookings and files). Documents, bookings and receipts are retained; README states: books, records and annual statements 10 years, booking receipts 8 years (§ 147 AO as amended by BEG IV; verify yearly), and that the association must keep a backup of database and `UPLOAD_DIR` for these periods.
- Member data: anonymization (Phase 3) is the erasure mechanism; ledger entries for member fees contain only member numbers and receipt numbers.
- Audit privacy: for bookings, record before/after values for dates, amounts, ids and numbers; for `description` and `counterparty` record only that the field changed (they may contain personal data).

## 13. AUDIT

| Operation | action | entity |
|---|---|---|
| Create / update booking | CREATE / UPDATE | AccountingBooking |
| Reverse booking (reason) | REVERSE | AccountingBooking |
| Upload / delete receipt | FILE_UPLOAD / FILE_DELETE | AccountingBookingFile |
| Account create / update / activate / deactivate | CREATE / UPDATE / ACTIVATE / DEACTIVATE | AccountingAccount |
| Category create / update / activate / deactivate | same | AccountingCategory |
| Project create / update / activate / deactivate | same | AccountingProject |
| Budget save (year, changed line count) | BUDGET_SAVE | AccountingBudgetLine |
| Year close | YEAR_CLOSE | AccountingYear |
| Year unlock (reason) | YEAR_UNLOCK | AccountingYear |
| Member sync (counts, totals) | SYNC_MEMBER_PAYMENTS | AccountingBooking |
| Sync settings update | UPDATE | AccountingSettings |
| Excel export / PDF report generation of reports | EXPORT | AccountingBooking |

Every booking-related record contains `bookingNumber` in `changes`. File downloads are not logged; PDF generation of Kassenbuch and Kassenbericht IS logged (`EXPORT`, with report type and year).

## 14. STATS AND DASHBOARD

- `getAccountingStats(year)`: `{ incomeCents, expenseCents, netCents, missingReceiptCount, accountBalances: [{ accountId, name, balanceCents }] }` (non-reversed, transfers excluded from income/expense).
- Dashboard "Muhasebe" card (composition layer): with `accountingPermissions.view` show current-year income, expense and difference, total cash+bank balance, and "Belgesi eksik: X" linking to `/muhasebe`. Hidden otherwise. The incomplete-organization-profile banner from 4.2 also lives here.

## 15. ENVIRONMENT AND DEPLOYMENT

- `.env.example` / `shared/env.ts`: `DOCUMENT_LANGUAGE=de` (new); existing variables unchanged.
- Add the new PDF routes (`ledger/pdf`, `annual/pdf`) to `outputFileTracingIncludes` so fonts are present in the `standalone` build; verify by running the standalone server and downloading all PDFs (minutes, receipt, ledger, annual report) in German and Turkish.
- README: the module dependency map; roles and the full permission matrix; bookkeeping model (EÜR, spheres, calendar year, gross amounts, no VAT); year closing and correction procedure; Kassenminus rule; member-fee import; budget; the 50,000 € notice and allowance hint with "Stand 2026, jährlich prüfen"; the privacy and GoBD sections from 4.7; retention table; backup note; statement that the tool does not replace tax advice.

## 16. OUT OF SCOPE (DO NOT BUILD)

Double-entry bookkeeping, balance sheet (Bilanz); VAT / Umsatzsteuer handling and returns; payroll or mini-job settlements and per-person allowance tracking; Zuwendungsbestätigung (donation receipts); Mittelverwendungsrechnung and reserves (Rücklagen); SEPA direct debit and bank-statement import (CSV/MT940/CAMT); DATEV export; multi-currency; fiscal years other than the calendar year; recurring bookings; inventory list; e-invoice handling; an auditor workflow beyond read access; restoring reversed bookings; tests; any new library.

## 17. WORK ORDER

Work strictly in this order. After every step `pnpm typecheck` and `pnpm lint` must pass. Do not start the next step before the current one is done.

1. Read all existing code; write 5–6 bullets of the patterns you will reuse. Create a backup-minded checklist of every place that lists roles or permissions.
2. Roles: Prisma enum migration, `shared/roles.ts`, update ALL existing `definePermissions` to the Section 4.1 matrix, fix compile errors, update Phase 3 void-permission hints.
3. Append-only audit triggers migration (4.7). Verify nothing mutates audit rows.
4. `organization` module (4.2) including migration, seed-free singleton upsert, letterhead helper, dashboard banner.
5. PDF localization (4.3): `shared/pdf/i18n.ts`, `format.ts`, `money.ts` locale, split button, convert minutes and receipt PDFs (German default, Turkish optional), `DOCUMENT_LANGUAGE`. Verify glyphs in dev and standalone.
6. Documents changes (4.4), meetings changes (4.5), members changes (4.6) including migrations, seeds, labels, import/export updates, `listPaymentsForAccounting`, data export.
7. `accounting.prisma`, migration with triggers, seed.
8. Accounting foundation: `permissions.ts`, `constants.ts`, `types.ts`, `schemas/*`, `module.config.ts`, `index.ts`.
9. Services: `booking-number`, `balances` (incl. cash rule), `booking-guards`, `report-builders`, `member-sync`.
10. Queries.
11. Actions (bookings, setup, budget, year close/unlock, sync, settings, file delete).
12. Handlers and thin API routes: upload, download, Excel exports, PDFs. Update `next.config` tracing.
13. Components, views and thin route files (list, create, detail, edit, setup, budget, year closing, member sync, reports).
14. Dashboard cards, README updates, final check of module exports and ESLint boundaries, `pnpm build`, standalone run with all PDFs.

## 18. ACCEPTANCE CRITERIA

General
- `pnpm build`, `pnpm typecheck`, `pnpm lint` pass; the dependency map of Section 3 is respected (no forbidden imports); route files contain no business logic.

Part A
- Six roles exist; the permission matrix of 4.1 is enforced on every module (views, actions, handlers); no module has a hard-coded role list. A TREASURER can void member payments; SECRETARY cannot. An AUDITOR sees documents, meetings, accounting and the organization page read-only and sees no members, no dues, no users, no audit log.
- The association master data page works with concurrency protection; PDFs print only the letterhead lines that have data; without a profile the env name is used; the dashboard banner appears for authorized roles until a profile is saved.
- All PDFs (minutes, receipt, ledger, annual report) render in German by default and in Turkish with `?lang=tr`; `ä ö ü ß ğ ş İ ı ç` render correctly; dates are `dd.MM.yyyy`; German money format `1.234,56 €`; the receipt carries the Zuwendungsbestätigung disclaimer; minutes use Protokoll terminology per Section 4.3. Works in the `standalone` build.
- `KEP` data was migrated to `REGISTERED_MAIL` without data loss; `FAX` exists; new document categories, the Fördermitglied type and the new labels exist; seeds are idempotent.
- Meetings store and show `invitationSentAt`; members store `country` and `cancellationReceivedAt`; the 5-digit postal code rule applies for Germany; the data export returns the member's data as JSON, is audited without content and is refused for anonymized members.
- `UPDATE` and `DELETE` on `"AuditLog"` fail at database level.

Part B
- Bookings: income, expense and transfer bookings can be created; numbers `B-<year>-0001…` are sequential and unique under concurrency; type and number are immutable; future dates, dates before the account opening date and dates in locked years are rejected; amounts accept "12,50" and "12.50" and reject 3 decimals; no floating-point drift in sums.
- Kassenminus: an expense, transfer or reversal that would make a CASH account negative at any date is rejected with the specified message; bank accounts may go negative.
- Reversal: needs a reason and `accounting.delete`; the booking stays visible and struck through; it vanishes from balances, reports and exports sums; it cannot be edited, un-reversed or reversed again; synced member bookings cannot be reversed manually.
- Receipts: upload of pdf/jpg/png works, other types, oversized files and the 11th file are rejected; download needs `accounting.view`; bookings without receipts are flagged in list, stats, year-closing preview and annual report; deletion of receipts is blocked in locked years; uploads still work in locked years.
- Setup: accounts, categories and projects can be created, edited and deactivated, never deleted; account opening balance is locked once bookings exist; category sphere/direction is locked once used; seeded categories and accounts exist.
- Member sync: the preview and run create one INCOME booking per non-voided member payment with member number only in the text; running twice creates no duplicates; payments voided later reverse their booking automatically on the next run; locked-year and pre-opening-date cases are listed as skipped/conflicts; the cash rule is respected; the audit shows counts.
- Year closing: the preview shows correct numbers; after closing, create/edit/reverse/budget/sync for that year are rejected on the server; unlocking needs `accounting.approve` and a reason and leaves a `YEAR_UNLOCK` audit record.
- Budget: plan amounts save per year and category, copy from previous year works, locked years are read-only; plan/actual/difference appear in the report.
- Reports: the Einnahmen-Ausgaben-Rechnung is grouped by sphere and category, excludes reversed bookings and transfers, shows previous-year values and the economic-operation notice at 80% and above 50,000 €; the Kassenbuch shows correct opening balance, running balance and closing balance and highlights negative balances; Excel and PDF outputs match the on-screen numbers; the annual Kassenbericht PDF contains all sections of 11.8.
- Permissions: BOARD and AUDITOR can view and export but cannot create, edit, reverse, close years or change setup; SECRETARY and VIEWER cannot access accounting at all (nav hidden, routes show `AccessDenied`, direct action/API calls rejected); TREASURER and ADMIN can do everything including year close/unlock.
- Audit: every operation in Section 13 appears with the correct action and entity; no personal values for `description`/`counterparty` and no file content are logged.
- Dashboard: the accounting card shows correct numbers for authorized roles and is hidden otherwise.
- Database triggers block DELETE on bookings and booking files and block changes to `bookingNumber`, `year`, `sequence`, `createdAt`.
- Without Docker, using Homebrew PostgreSQL, `pnpm db:migrate && pnpm db:seed && pnpm dev` works.

When finished, summarize: the list of created and changed files per phase (0, 1, 2, 3, new modules), all migrations (including hand-edited SQL), the commands to run, how to verify the PDFs in the standalone build, and every point marked with `// KARAR:`.