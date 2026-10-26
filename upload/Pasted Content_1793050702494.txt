# TASK: Association Management System — Phase 5: Donations & Official Donation Receipts (Zuwendungsbestätigung)

Phases 0–4 are complete and working: core infrastructure, documents, meetings, members & dues, organization master data, accounting (EÜR). The system is used by registered associations in Germany (eingetragene Vereine, usually gemeinnützig). Board members using it are Turkish-speaking.

This phase adds the `donations` module: donor records, money donations (Geldspenden, including expense-waiver donations / Aufwandsspenden), automatic accounting entries, and official tax-deductible receipts per the binding BMF templates (individual confirmations and collective confirmations / Sammelbestätigungen) for donations and, where legally allowed, for membership fees. Generated confirmations are stored immutably as PDFs.

All decisions in this document are final. Do not ask questions, do not propose alternatives, do not add libraries. If something is ambiguous, choose the simplest and safest option and leave a short `// KARAR:` comment in the code.

LANGUAGE RULES (unchanged): code/identifiers/file names/DB names in ENGLISH; UI text, toasts, validation messages and Excel headers in TURKISH, with the German legal term in parentheses where relevant (e.g. "Bağış bildirimi (Zuwendungsbestätigung)"). The official confirmation PDFs are GERMAN ONLY (the legal template is German; no Turkish version, no `?lang=` option for them).

BEFORE YOU START: read the existing code (all modules, `src/shared/*`, `src/registry.ts`, ESLint boundary rules, existing migrations, seed, README). Follow existing patterns exactly (`createAction`, `requirePermission`, `parseListParams`, `DataTable`, form components, `ActionResult`, `writeAudit`, `shared/money.ts`, `shared/pdf`, `shared/files`, optimistic concurrency, soft delete, transactional numbering with `P2002` retry, immutable-record triggers).

## 1. LEGAL BACKGROUND (design basis, Stand 2026)

- A tax-deductible donation or membership-fee receipt may only be issued on the binding official BMF template (BMF letter of 7 Nov 2013, templates unchanged since 1 Jan 2014). Only the elements that do not apply to the individual case may be omitted. The issuer must keep a duplicate (Doppel) of every confirmation together with its bookkeeping.
- Money donations ("Geldzuwendungen") are supported. Non-cash donations (Sachzuwendungen) use a different template and valuation rules: OUT OF SCOPE.
- Donations up to 300 € do not require a formal confirmation (bank statement as proof). The app shows a hint but still allows issuing (`SMALL_DONATION_LIMIT_CENTS = 30_000`, `// Stand: 2026 – jährlich prüfen`).
- Expense-waiver donation (Aufwandsspende / Verzicht auf Erstattung von Aufwendungen): the association must owe a reimbursement claim that existed BEFORE the waiver, and the waiver must be declared promptly. The line "Es handelt sich um den Verzicht auf Erstattung von Aufwendungen Ja / Nein" must ALWAYS appear on money confirmations and be ticked.
- Membership fees are deductible only for associations whose purposes are not those listed in § 10b Abs. 1 Satz 8 EStG (e.g. sport, leisure-oriented culture, Heimatpflege, Brauchtum). The application cannot decide this: an ADMIN/BOARD user sets the flag `membershipFeesDeductible` in the organization profile (default false). If false, NO membership-fee confirmations can be issued, and money-donation confirmations carry the extra statement "nicht um einen Mitgliedsbeitrag" (see template).
- A confirmation is not accepted as proof if the date of the Freistellungsbescheid (or the Anlage zum Körperschaftsteuerbescheid) is older than 5 years, or the date of the § 60a AO Feststellungsbescheid is older than 3 years, at the time of issuing (§ 63 Abs. 5 AO). The app BLOCKS issuing in that case.
- Collective confirmations (Sammelbestätigungen): the word "Sammelbestätigung" replaces "Bestätigung"; total amount and period are stated; "Art der Zuwendung" and "Tag der Zuwendung" refer to an attached "Anlage zur Sammelbestätigung vom …" listing every single contribution (date, amount, type, expense-waiver yes/no) with a total equal to the confirmation's total; an extra sentence confirms that no other confirmations were or will be issued for these amounts. Design decisions: one collective confirmation covers exactly ONE recipient, ONE content type (donations OR membership fees, never mixed), ONE calendar year (period within one calendar year), and ONE waiver value (all waived or none waived), so the Ja/Nein line is exact.
- The app supports record-keeping; it does not replace tax advice. README says so and recommends that the Kassenwart or tax advisor verify the template wording and settings before the first issuance.

## 2. ARCHITECTURE RULES AND PERMITTED CHANGES

- Phase 0 architecture rules apply unchanged (three layers, public entry points, ESLint boundary rules, thin route files). `pnpm lint` stays clean.
- New module: `donations`. Dependency map (README; no cycles): `auth` → none; `organization` → `auth`; `users`, `audit`, `documents` → `auth`; `members` → `auth`, `organization`; `meetings` → `auth`, `members`, `organization`; `accounting` → `auth`, `members`, `organization`; `donations` → `auth`, `organization`, `members`, `accounting`.
- No Prisma foreign keys across modules; reference by plain `...Id` + snapshot labels. No new npm dependencies.
- PERMITTED changes outside `donations` are exactly those in PART A. Nothing else changes.

---

# PART A — CHANGES TO EXISTING MODULES

## 3. ROLES AND PERMISSIONS

Add the `donations` definition (update the Phase 4 matrix and README):

| Resource | ADMIN | BOARD | SECRETARY | TREASURER | AUDITOR | VIEWER |
|---|---|---|---|---|---|---|
| donations | v,c,u,d,a | v | - | v,c,u,d,a | - | - |

Meaning: view lists/details/exports; create/update donors and donations; delete = cancel (reverse) donations and cancel confirmations; approve = issue confirmations and confirm the template wording. AUDITOR has no access to donor personal data.

## 4. ORGANIZATION MODULE ADDITIONS

Additive migration on `OrganizationProfile`:
```prisma
enum ExemptionDocumentType {
  EXEMPTION_NOTICE        // Freistellungsbescheid
  TAX_ASSESSMENT_ANNEX    // Anlage zum Körperschaftsteuerbescheid
  SPECIAL_ASSESSMENT_60A  // Feststellungsbescheid nach § 60a AO
}
// add to OrganizationProfile:
exemptionDocumentType  ExemptionDocumentType?
charitablePurposes     String?    // "Angabe des begünstigten Zwecks/der begünstigten Zwecke", e.g. "der Volks- und Berufsbildung sowie der Kunst und Kultur"
membershipFeesDeductible Boolean  @default(false)
```
- Reuse existing `taxNumber`, `taxOffice`, `exemptionNoticeDate` (date of the notice), `exemptionNoticePeriod` (the "letzter Veranlagungszeitraum", e.g. "2022 bis 2024"; not used for `SPECIAL_ASSESSMENT_60A`).
- Form (organization profile): new section "Gemeinnützigkeit (Kamu yararı)" with: document type select, notice date, period, purposes (textarea ≤ 500; help text: phrase must fit after "Wir sind wegen Förderung …" and "… nur zur Förderung … verwendet wird", e.g. "der Bildung und Erziehung" — copy it from the Freistellungsbescheid), and the switch "Üyelik aidatları vergiden düşülebilir (Mitgliedsbeiträge abziehbar)" with help text explaining § 10b Abs. 1 Satz 8 EStG and "Emin değilseniz Steuerberater'a sorun".
- Letterhead (`shared/pdf/letterhead.tsx`) wording uses the type: "Gemeinnützigkeit: Freistellungsbescheid des Finanzamts <taxOffice> vom <date>" / "Anlage zum Körperschaftsteuerbescheid des Finanzamts … vom …" / "Feststellungsbescheid nach § 60a AO des Finanzamts … vom …". Printed only if data exists.
- Expose `getOrganizationProfile()` fields accordingly. Audit: changed field names; the membershipFeesDeductible change records old/new value.

## 5. MEMBERS MODULE ADDITIONS (`members/server`, data-minimized)

- `getMemberAddressBlock(memberId): Promise<{ memberId; memberNumber; name; street; postalCode; city; country } | null>`: null if the member is deleted or anonymized or has no complete address.
- `listMemberFeePaymentsForConfirmation(params: { year: number }): Promise<Array<{ memberId; memberNumber; name; street; postalCode; city; country; payments: Array<{ id; receiptNumber; paidAt: string; amountCents: number }> }>>`: only non-voided payments with `paidAt` in `year`, only members that are not deleted/anonymized. No other personal fields (no email, phone, birth date, notes).
- `getPaymentStatuses(paymentIds: string[]): Promise<Array<{ id; voidedAt: string | null }>>`.
- These functions perform NO permission checks (server-to-server); the calling module must check its own permissions. Do not expose them through any route.

## 6. ACCOUNTING MODULE ADDITIONS (`accounting/server`)

Service-level API used by `donations` (callers must have checked permissions; these functions apply all business rules: year lock, account opening date, cash rule, numbering, uniqueness):
```ts
createSourcedBooking(input: {
  tx?: Prisma.TransactionClient;
  actor: { id: string; label: string };
  type: "INCOME" | "EXPENSE";
  sourceType: "DONATION" | "DONATION_WAIVER";
  sourceId: string;
  bookingDate: Date; accountId: string; categoryId: string; amountCents: number;
  description: string; receiptReference?: string | null;
}): Promise<{ id: string; bookingNumber: string }>

reverseSourcedBooking(input: { tx?; actor; sourceType: string; sourceId: string; reason: string }): Promise<void>
  // idempotent: no-op if no booking exists or it is already reversed; fails if the booking's year is locked

getDonationBookingTargets(): Promise<{ donationCategoryId: string; cashAccountId: string; bankAccountId: string }>
  // throws a Turkish error naming what is missing in accounting settings

listActiveCategoryOptions(direction: "INCOME" | "EXPENSE"): Promise<Array<{ id: string; name: string; sphere: string }>>
```
- `AccountingSettings`: add `donationCategoryId String?` (additive migration; must be an active INCOME category). Seed: set it to "Bağışlar (Spenden)" if the settings row exists and the field is null. Add the field to the sync/settings card on `/muhasebe/uyelik-aktarimi` (label "Bağış kategorisi").
- Source labels in the booking list and detail: `DONATION` → "Bağış (otomatik)", `DONATION_WAIVER` → "Aufwandsspende gideri (otomatik)". Manual edit/reversal of any booking with a `sourceType` stays blocked (already the case): such bookings are managed from the source module.

## 7. SHARED ADDITIONS

- `shared/german-number-words.ts`: `amountToGermanWords(cents: number): string` for amounts up to 9,999,999.99 €. Format: `<euro words> Euro` plus, when cents > 0, ` und <cent words> Cent`. Compound numbers below one million are one lowercase word; from one million use "eine Million"/"zwei Millionen" with a space, then the rest. Required results (verify with a small script `scripts/verify-amount-words.ts` that you run once and keep in the repo; no test framework is added):
  - 100 → `ein Euro`; 2500 → `fünfundzwanzig Euro`; 10000 → `einhundert Euro`; 10101 → `einhunderteins Euro und ein Cent`
  - 123450 → `eintausendzweihundertvierunddreißig Euro und fünfzig Cent`; 200000 → `zweitausend Euro`
  - 1234567 → `zwölftausenddreihundertfünfundvierzig Euro und siebenundsechzig Cent`
  - 2121 → `einundzwanzig Euro und einundzwanzig Cent`; 5000 → `fünfzig Euro`; 5 → `null Euro und fünf Cent`
  - 100000000 → `eine Million Euro`; 250000000 → `zwei Millionen fünfhunderttausend Euro`
  - Correct handling of 11, 12, 16, 17, 30, 60, 70, "ein" vs "eins" (only at the very end of a number below 100 when standalone: "eins" is never used before "Euro"/"Cent" — it is always "ein").
- `shared/files`: ensure there is a function to store a generated buffer (PDF) under a given relative path and to compute a SHA-256 hash; reuse existing storage and path-traversal protection.

## 8. DOCUMENTATION AND PRIVACY (README)

- Donors: data categories stored (name, address, optional email/phone, optional member link), purpose (donation records and receipts), legal basis (legal obligation and legitimate interest), retention: confirmation duplicates are kept as booking receipts for 8 years after the end of the calendar year of issue (§ 147 AO; `CONFIRMATION_RETENTION_YEARS = 8`, `// Stand: 2026 – jährlich prüfen`); erasure by anonymization only after that period (Section 11, rule 12); accounting bookings contain donor NUMBERS only, never names.
- Add the Zuwendungsbestätigung workflow (checklist, template verification, issuing, cancelling, re-issuing), the Aufwandsspende conditions, the 300 € hint, the 5/3-year validity block, and the statement that the tool does not replace tax advice.

---

# PART B — DONATIONS MODULE

## 9. FILE STRUCTURE

```
prisma/schema/donations.prisma
src/shared/german-number-words.ts
scripts/verify-amount-words.ts
src/modules/donations/
  index.ts server.ts ui.ts module.config.ts permissions.ts types.ts constants.ts
  schemas/    donor.ts donation.ts confirmation.ts settings.ts
  queries/    list-donors.ts get-donor.ts list-donations.ts get-donation.ts
              list-confirmations.ts get-confirmation.ts
              find-confirmation-candidates.ts   # donations and member fees eligible for confirmation
              get-readiness.ts                  # checklist
              get-donation-stats.ts get-settings.ts
  services/   donation-numbers.ts               # donor/donation/confirmation numbers
              issue-guards.ts                   # assertCanIssue(), validity-date check
              confirmation-builder.ts           # builds immutable snapshot + items
              donation-bookings.ts              # create/reverse accounting entries for a donation
              anonymize-donor.ts
  actions/    donor-actions.ts                  # create, update, deactivate/activate, anonymize
              donation-actions.ts               # create, update, cancel
              confirmation-actions.ts           # issue (single/collective/batch), cancel
              settings-actions.ts               # confirm template wording
  handlers/   confirmation-pdf.ts batch-pdf.ts template-preview-pdf.ts
              export-donations.ts export-confirmations.ts
  pdf/        confirmation-document.tsx         # official template layout
              template-de.ts                    # ALL official wording as constants + TEMPLATE_VERSION
  components/ donor-form.tsx donation-form.tsx method-badge.tsx waiver-badge.tsx
              confirmation-status-badge.tsx readiness-checklist.tsx
              candidate-picker.tsx issue-wizard.tsx cancel-confirmation-modal.tsx
              cancel-donation-modal.tsx anonymize-donor-dialog.tsx stats-cards.tsx list-filters.tsx
  views/      donation-list-view.tsx donation-create-view.tsx donation-detail-view.tsx donation-edit-view.tsx
              donor-list-view.tsx donor-detail-view.tsx donor-form-view.tsx
              confirmation-list-view.tsx confirmation-detail-view.tsx confirmation-issue-view.tsx
              settings-view.tsx
src/app/(dashboard)/bagislar/page.tsx
src/app/(dashboard)/bagislar/yeni/page.tsx
src/app/(dashboard)/bagislar/[id]/page.tsx
src/app/(dashboard)/bagislar/[id]/duzenle/page.tsx
src/app/(dashboard)/bagislar/bagiscilar/page.tsx
src/app/(dashboard)/bagislar/bagiscilar/yeni/page.tsx
src/app/(dashboard)/bagislar/bagiscilar/[id]/page.tsx
src/app/(dashboard)/bagislar/bagiscilar/[id]/duzenle/page.tsx
src/app/(dashboard)/bagislar/bildirimler/page.tsx
src/app/(dashboard)/bagislar/bildirimler/olustur/page.tsx
src/app/(dashboard)/bagislar/bildirimler/[id]/page.tsx
src/app/(dashboard)/bagislar/ayarlar/page.tsx
src/app/api/donations/confirmations/[id]/pdf/route.ts
src/app/api/donations/confirmations/batch-pdf/route.ts        # ?ids=a,b,c (max 100)
src/app/api/donations/template-preview/pdf/route.ts
src/app/api/donations/export/route.ts
src/app/api/donations/confirmations/export/route.ts
```
Nav item: "Bağışlar (Spenden)" (`/bagislar`, group `main`, `donationsPermissions` + `view`). Add the new PDF routes to `outputFileTracingIncludes`.

## 10. DATABASE (`prisma/schema/donations.prisma`)

```prisma
enum DonorType            { PERSON ORGANIZATION }
enum DonationMethod       { CASH BANK_TRANSFER CARD PAYPAL REIMBURSEMENT_WAIVER OTHER }
enum ConfirmationKind     { SINGLE COLLECTIVE }
enum ConfirmationContent  { DONATION MEMBERSHIP_FEE }
enum ConfirmationStatus   { ISSUED CANCELLED }
enum ConfirmationItemType { DONATION MEMBER_PAYMENT }
enum DonationsCounterKind { DONOR DONATION CONFIRMATION }

model DonationsCounter {
  kind    DonationsCounterKind
  year    Int                    // 0 for DONOR
  lastSeq Int                    @default(0)
  @@id([kind, year])
}

model Donor {
  id               String    @id @default(cuid())
  donorNumber      Int       @unique              // displayed SP-0001
  type             DonorType
  firstName        String?
  lastName         String?
  organizationName String?
  street           String?
  postalCode       String?
  city             String?
  country          String?   @default("Deutschland")
  email            String?
  phone            String?
  memberId         String?                         // optional hint, no FK; data is copied, not linked
  note             String?
  isActive         Boolean   @default(true)
  isAnonymized     Boolean   @default(false)
  anonymizedAt     DateTime?
  createdById      String
  createdByLabel   String
  updatedById      String?
  updatedByLabel   String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  donations        Donation[]
  confirmations    ZuwendungConfirmation[]
  @@index([lastName, firstName])
  @@index([organizationName])
}

model Donation {
  id               String         @id @default(cuid())
  donationNumber   String         @unique          // BG-2026-0001
  year             Int
  sequence         Int
  donorId          String
  donor            Donor          @relation(fields: [donorId], references: [id], onDelete: Restrict)
  receivedAt       DateTime       @db.Date          // Tag der Zuwendung
  amount           Decimal        @db.Decimal(12, 2)
  method           DonationMethod
  reference        String?
  purposeNote      String?
  waivedReimbursement Boolean     @default(false)
  claimBasis       String?                          // basis of the prior reimbursement claim (contract, Vorstandsbeschluss …)
  waiverDeclaredAt DateTime?      @db.Date
  expenseCategoryId String?                         // accounting category id (plain), required when waived
  bookingNumber    String?                          // income booking
  waiverBookingNumber String?                       // expense booking (waived only)
  reversedAt       DateTime?
  reversedById     String?
  reversedByLabel  String?
  reverseReason    String?
  createdById      String
  createdByLabel   String
  updatedById      String?
  updatedByLabel   String?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
  @@unique([year, sequence])
  @@index([donorId])
  @@index([receivedAt])
}

model ZuwendungConfirmation {
  id                  String               @id @default(cuid())
  confirmationNumber  String               @unique   // ZB-2026-0001
  year                Int
  sequence            Int
  kind                ConfirmationKind
  content             ConfirmationContent
  donorId             String?
  donor               Donor?               @relation(fields: [donorId], references: [id], onDelete: Restrict)
  memberId            String?                         // membership-fee confirmations (no FK)
  recipientName       String                          // snapshots as printed
  recipientStreet     String
  recipientPostalCode String
  recipientCity       String
  recipientCountry    String?
  periodFrom          DateTime             @db.Date
  periodTo            DateTime             @db.Date
  totalAmount         Decimal              @db.Decimal(12, 2)
  amountInWords       String
  waivedReimbursement Boolean
  issuerSnapshot      Json                            // organization data + exemption data used
  templateVersion     String
  issuedAt            DateTime             @default(now())
  issuedPlace         String
  issuedById          String
  issuedByLabel       String
  status              ConfirmationStatus   @default(ISSUED)
  cancelledAt         DateTime?
  cancelledById       String?
  cancelledByLabel    String?
  cancelReason        String?
  replacesId          String?
  replaces            ZuwendungConfirmation? @relation("Replacement", fields: [replacesId], references: [id], onDelete: Restrict)
  replacedBy          ZuwendungConfirmation[] @relation("Replacement")
  pdfStoragePath      String?                         // donations/<year>/<id>/<uuid>.pdf (relative to UPLOAD_DIR)
  pdfSha256           String?
  pdfSize             Int?
  items               ZuwendungConfirmationItem[]
  @@unique([year, sequence])
  @@index([donorId])
  @@index([memberId])
  @@index([status])
}

model ZuwendungConfirmationItem {
  id              String   @id @default(cuid())
  confirmationId  String
  confirmation    ZuwendungConfirmation @relation(fields: [confirmationId], references: [id], onDelete: Restrict)
  position        Int
  itemType        ConfirmationItemType
  sourceId        String                         // Donation id or MemberPayment id
  itemDate        DateTime @db.Date
  amount          Decimal  @db.Decimal(12, 2)
  label           String                         // "Geldspende" | "Mitgliedsbeitrag"
  waived          Boolean
  activeKey       String?  @unique               // "<itemType>:<sourceId>" while the confirmation is ISSUED, NULL after cancellation
  @@index([confirmationId])
}

model DonationsSettings {
  id                        String    @id          // always "singleton"
  templateConfirmedVersion  String?
  templateConfirmedAt       DateTime?
  templateConfirmedById     String?
  templateConfirmedByLabel  String?
  updatedAt                 DateTime  @updatedAt
}
```
Migration SQL additions (reuse `prevent_mutation()` from Phase 4):
- `BEFORE DELETE` triggers on `"Donation"`, `"ZuwendungConfirmation"`, `"ZuwendungConfirmationItem"` raising an exception.
- `BEFORE UPDATE` trigger on `"ZuwendungConfirmation"` raising if any of these change: `confirmationNumber, year, sequence, kind, content, donorId, memberId, recipientName, recipientStreet, recipientPostalCode, recipientCity, recipientCountry, periodFrom, periodTo, totalAmount, amountInWords, waivedReimbursement, issuerSnapshot, templateVersion, issuedAt, issuedPlace, issuedById, issuedByLabel`; PDF columns may change only from NULL to a value once; status may change only ISSUED → CANCELLED.
- `BEFORE UPDATE` trigger on `"ZuwendungConfirmationItem"` raising if anything except `activeKey` changes, and `activeKey` may only change to NULL.
- `Donor` contains personal data and may be anonymized (updated) but never deleted: no delete trigger needed beyond application rules (no delete action exists).

## 11. BUSINESS RULES

1. **Numbers** (atomic in the creating transaction with `P2002` retry): donor `SP-0001` (counter `DONOR`, year 0; immutable); donation `BG-<year>-<seq 4>` (year of `receivedAt`); confirmation `ZB-<year>-<seq 4>` (year of issue date, consecutive, never reused even after cancellation).
2. **Donor validation**: `type` PERSON requires `lastName` (1–60) and optional `firstName`; ORGANIZATION requires `organizationName` (2–120). Address fields optional at creation but REQUIRED to issue a confirmation. `postalCode` `^\d{5}$` when country is empty or "Deutschland"/"Germany"/"Almanya", otherwise ≤ 10. `email` optional and valid. Donors are never deleted; deactivate instead. Duplicate warning on create (same email, or same last name + postal code) with explicit confirmation to proceed. "Üyeden bağışçı oluştur": prefill from `getMemberAddressBlock` (data copied once, `memberId` stored as hint).
3. **Donation validation**: `receivedAt` not in the future and not before 1 Jan of the previous year (late entries into locked years are impossible anyway); `amount` > 0, 2 decimals (`toCents`), max 9,999,999.99; `method` required; `reference` ≤ 100; `purposeNote` ≤ 300. Hint under the amount when ≤ 300 €: "300 € ve altındaki bağışlar için resmi bildirim zorunlu değildir (banka dekontu yeterlidir)." PayPal hint: "Yalnızca derneğe net ulaşan tutarı girin (PayPal komisyonu bağış değildir)."
4. **Expense-waiver donations** (`waivedReimbursement = true`, `method` forced to `REIMBURSEMENT_WAIVER`): required `claimBasis` (5–300 chars, e.g. "Vorstandsbeschluss vom …"), `waiverDeclaredAt` (not before... any date ≤ today, must be ≥ the date implied? no check), and `expenseCategoryId` (active EXPENSE category from `listActiveCategoryOptions("EXPENSE")`). The form shows a notice: "Aufwandsspende yalnızca, dernek ödemeyi önceden (sözleşme, tüzük veya yönetim kurulu kararıyla) taahhüt ettiyse ve vazgeçme gecikmeden beyan edildiyse geçerlidir."
5. **Accounting entries** (`services/donation-bookings.ts`, inside the donation's transaction using `tx`): resolve targets with `getDonationBookingTargets()` (error if accounting settings are incomplete). Normal donation: one INCOME booking via `createSourcedBooking` (`sourceType = "DONATION"`, `sourceId = donation id`), `bookingDate = receivedAt`, account by method (CASH → cash account; BANK_TRANSFER, CARD, PAYPAL, OTHER → bank account), category = `donationCategoryId`, `description = "Spende <donationNumber> – Spender Nr. <SP-0007>"` (donor NUMBER only), `receiptReference = donationNumber`. Waived donation: TWO bookings on the bank account in this order: INCOME (`DONATION`) then EXPENSE (`DONATION_WAIVER`, category = `expenseCategoryId`), same amount and date, descriptions "Aufwandsspende <donationNumber> – Spender Nr. <…> (Einnahme)" / "(Ausgabe)". Store `bookingNumber` and `waiverBookingNumber`. Any accounting failure (locked year, opening date, cash rule) aborts the donation with the accounting error message.
6. **Edit donation** (`update`): not allowed if the donation is reversed or has an ACTIVE confirmation item. Changes of donor, reference or purposeNote touch no bookings. Changes of date, amount, method, waiver fields: in one transaction reverse the old booking(s) with reason "Bağış düzeltildi" and create the new ones (never edit bookings in place). Optimistic concurrency with `updatedAt`.
7. **Cancel donation** (`delete` permission, reason 5–300): not allowed with an ACTIVE confirmation (cancel the confirmation first). Reverses its booking(s) via `reverseSourcedBooking`, sets `reversedAt/By/Label/reason`. Reversed donations stay visible struck through and are excluded from stats, candidates and exports sums.
8. **Readiness** (`issue-guards.ts#assertCanIssue(issueDate, content)`), checked on every issuance, errors in Turkish listing ALL missing items:
   - Organization profile has `name`, `street`, `postalCode`, `city`, `taxNumber`, `taxOffice`, `exemptionDocumentType`, `exemptionNoticeDate`, `charitablePurposes`, and `exemptionNoticePeriod` unless type is `SPECIAL_ASSESSMENT_60A`.
   - Validity: for `EXEMPTION_NOTICE` and `TAX_ASSESSMENT_ANNEX` the notice date must be within 5 years before the issue date; for `SPECIAL_ASSESSMENT_60A` within 3 years (§ 63 Abs. 5 AO). Otherwise issuing is blocked with "Muafiyet belgesinin tarihi çok eski; bildirim geçerli sayılmaz."
   - `DonationsSettings.templateConfirmedVersion === TEMPLATE_VERSION` (Section 14).
   - For `MEMBERSHIP_FEE`: `membershipFeesDeductible === true`.
   - Recipient has name, street, postal code and city.
9. **Issuing** (`approve` permission; `actions/confirmation-actions.ts`):
   - Single donation confirmation: for one active, non-reversed donation (no active item). Kind SINGLE, content DONATION, period = date of donation, one item.
   - Collective donation confirmation: for one donor, a period within one calendar year, all selected non-reversed donations in the period with the same `waivedReimbursement` value and no active item (the candidate picker shows eligible donations and lets the user deselect; optional toggle "300 € altı bağışları hariç tut").
   - Membership-fee confirmation: kind COLLECTIVE if more than one payment else SINGLE, content MEMBERSHIP_FEE, one member, calendar year, from `listMemberFeePaymentsForConfirmation({ year })` (non-voided payments without an active item); `waived = false`.
   - Batch issuing: "Yıllık toplu üretim" lets the user select many recipients (donors or members) for a year and issues one confirmation per recipient sequentially, reporting success/failure per recipient (a failure does not stop the rest).
   - Each issuance runs in one transaction (timeout 30 s): `assertCanIssue` → allocate number → build the immutable snapshot (`confirmation-builder.ts`: recipient snapshot, issuer snapshot from `getOrganizationProfile()`, template version, total in cents, `amountToGermanWords`) → insert confirmation and items with `activeKey` → render the PDF (Section 13) → store it with `shared/files` under `donations/<year>/<id>/<uuid>.pdf` → set `pdfStoragePath/pdfSha256/pdfSize`. On any failure roll back and remove a written file. `issuedPlace` = organization city; `issuedAt` = now; all dates in Europe/Berlin.
   - The total of the items must equal `totalAmount`; verify in the builder.
10. **Cancelling a confirmation** (`delete` permission, reason 5–300): sets status CANCELLED and cancel fields, sets every item's `activeKey` to NULL (frees the items for a new confirmation). The stored PDF stays. A replacement is a new confirmation created from the same items with `replacesId` pointing to the cancelled one (the issue wizard offers "Yerine yenisini oluştur"). The detail page of a cancelled confirmation shows a red "İPTAL EDİLDİ" banner; the original PDF is NOT re-rendered with a marking (it stays byte-identical).
11. **Member-fee confirmations and voided payments**: members cannot be told about confirmations (no dependency back). The confirmation detail page and the list call `getPaymentStatuses` for `MEMBER_PAYMENT` items and show a red warning "Bu bildirimdeki bir ödeme iptal edilmiş (<receipt>). Bildirimi iptal edip yenisini oluşturun." The dashboard card counts such confirmations.
12. **Donor anonymization** (`delete` permission): allowed only if the donor has no ISSUED confirmation whose retention has not ended (retention ends on 31 Dec of `issuedYear + CONFIRMATION_RETENTION_YEARS`), and no non-reversed donation with an ISSUED confirmation in that period. It clears name, organization name, address, email, phone, note and `memberId`, sets `isAnonymized`. The donor number and donation records remain. Confirmation snapshots are untouched until their retention ends (README explains; after retention an additional action "Eski bildirim verilerini temizle" is out of scope).
13. **Audit privacy**: never put donor or recipient names/addresses into audit records; use donor number, donation number, confirmation number, amounts, dates and ids; for donor edits record only changed field names.

## 12. PERMISSIONS

`donationsPermissions` exactly as in Section 3.
- View lists, details, readiness, PDFs, Excel: `donations.view`. Create/edit donors and donations: `create`/`update`. Cancel donation, cancel confirmation, anonymize donor: `delete`. Issue confirmations (single, collective, batch) and confirm the template wording: `approve`.
- Every view, action and handler checks permissions on the server with `requirePermission`; for server-to-server calls into `members` and `accounting` the check in `donations` is the only gate.

## 13. OFFICIAL PDF (`pdf/confirmation-document.tsx`, `pdf/template-de.ts`)

German only. A4 portrait, Noto Sans from `shared/pdf`, simple black-and-white layout, no decoration. All wording lives in `template-de.ts` as named constants together with `export const TEMPLATE_VERSION = "BMF-2013-11-07/Geld-Mitgliedsbeitrag+Sammel/1"` and a comment block: "Source: BMF-Schreiben vom 07.11.2013 (BStBl I S. 1333), amtliche Muster. Must be compared with the official PDF at bundesfinanzministerium.de before use."

Elements in order (print only what applies):
1. Label "Aussteller (Bezeichnung und Anschrift der steuerbegünstigten Einrichtung)" (small), then organization name and address (from the issuer snapshot).
2. Title (large): single donation "Bestätigung über Geldzuwendungen"; single fee "Bestätigung über Mitgliedsbeitrag"; collective donation "Sammelbestätigung über Geldzuwendungen"; collective fees "Sammelbestätigung über Mitgliedsbeiträge". Below it: "im Sinne des § 10b des Einkommensteuergesetzes an eine der in § 5 Abs. 1 Nr. 9 des Körperschaftsteuergesetzes bezeichneten Körperschaften, Personenvereinigungen oder Vermögensmassen".
3. "Name und Anschrift des Zuwendenden" + recipient snapshot.
4. Single: "Betrag der Zuwendung – in Ziffern –" (e.g. `1.234,50 €`), "– in Buchstaben –" (`amountInWords`), "Tag der Zuwendung" (`dd.MM.yyyy`). Collective: "Gesamtsumme der Zuwendung – in Ziffern –", "– in Buchstaben –", "Zeitraum der Sammelbestätigung: dd.MM.yyyy bis dd.MM.yyyy", "Art der Zuwendung: siehe Anlage zur Sammelbestätigung", "Tag der Zuwendung: siehe Anlage zur Sammelbestätigung".
5. Line "Es handelt sich um den Verzicht auf Erstattung von Aufwendungen" followed by two drawn checkboxes "Ja" and "Nein" (bordered boxes; the applicable one contains an "X"; do NOT rely on font glyphs for check marks).
6. Exemption paragraph by `exemptionDocumentType` (values from the issuer snapshot; `<purposes>` = `charitablePurposes`):
   - `EXEMPTION_NOTICE`: "Wir sind wegen Förderung <purposes> nach dem Freistellungsbescheid des Finanzamtes <taxOffice>, StNr. <taxNumber>, vom <dd.MM.yyyy> für den letzten Veranlagungszeitraum <period> nach § 5 Abs. 1 Nr. 9 des Körperschaftsteuergesetzes von der Körperschaftsteuer und nach § 3 Nr. 6 des Gewerbesteuergesetzes von der Gewerbesteuer befreit."
   - `TAX_ASSESSMENT_ANNEX`: same sentence with "nach der Anlage zum Körperschaftsteuerbescheid des Finanzamtes" instead of "nach dem Freistellungsbescheid des Finanzamtes".
   - `SPECIAL_ASSESSMENT_60A`: "Die Einhaltung der satzungsmäßigen Voraussetzungen nach den §§ 51, 59, 60 und 61 AO wurde vom Finanzamt <taxOffice>, StNr. <taxNumber>, mit Bescheid vom <dd.MM.yyyy> nach § 60a AO gesondert festgestellt. Wir fördern nach unserer Satzung <purposes>."
7. Single: "Es wird bestätigt, dass die Zuwendung nur zur Förderung <purposes> verwendet wird." Collective: "Es wird bestätigt, dass die Zuwendungen nur zur Förderung <purposes> verwendet werden."
8. Collective only: "Es wird bestätigt, dass über die in der Gesamtsumme enthaltenen Zuwendungen keine weiteren Bestätigungen, weder formelle Zuwendungsbestätigungen noch Beitragsquittungen oder Ähnliches, ausgestellt wurden und werden."
9. Only for content DONATION and only if `membershipFeesDeductible` is false (from the snapshot): heading "Nur für steuerbegünstigte Einrichtungen, bei denen die Mitgliedsbeiträge steuerlich nicht abziehbar sind:" and "Es wird bestätigt, dass es sich nicht um einen Mitgliedsbeitrag handelt, dessen Abzug nach § 10b Abs. 1 des Einkommensteuergesetzes ausgeschlossen ist."
10. Signature area: "<issuedPlace>, <dd.MM.yyyy>" with a signature line and caption "(Ort, Datum und Unterschrift des Zuwendungsempfängers)". The PDF is meant to be printed and signed by hand (`// KARAR:`; README explains the optional "maschinelles Verfahren" with prior notification to the Finanzamt and that the association must decide with its tax advisor; the app never omits the signature line).
11. Notice block: "Hinweis:" followed by "Wer vorsätzlich oder grob fahrlässig eine unrichtige Zuwendungsbestätigung erstellt oder veranlasst, dass Zuwendungen nicht zu den in der Zuwendungsbestätigung angegebenen steuerbegünstigten Zwecken verwendet werden, haftet für die entgangene Steuer (§ 10b Abs. 4 EStG, § 9 Abs. 3 KStG, § 9 Nr. 5 GewStG)." and "Diese Bestätigung wird nicht als Nachweis für die steuerliche Berücksichtigung der Zuwendung anerkannt, wenn das Datum des Freistellungsbescheides länger als 5 Jahre bzw. das Datum der Feststellung der Einhaltung der satzungsmäßigen Voraussetzungen nach § 60a Abs. 1 AO länger als 3 Jahre seit Ausstellung des Bescheides zurückliegt (§ 63 Abs. 5 AO)."
12. Small footer (every page): confirmation number "ZB-2026-0001" and "Seite X von Y". No other decoration.
13. Collective only, page 2: "Anlage zur Sammelbestätigung vom <issue date dd.MM.yyyy>", recipient name and confirmation number, table "Lfd. Nr. | Datum der Zuwendung | Art der Zuwendung (Geldspende / Mitgliedsbeitrag) | Betrag | Verzicht auf Erstattung von Aufwendungen (Ja/Nein)", last row "Gesamtsumme" equal to the confirmation total. Paginate if there are many rows (header row repeats).
- Preview: `GET /api/donations/template-preview/pdf?type=` renders each variant with obviously fictitious sample data, a large diagonal-free header line "MUSTER – KEINE GÜLTIGE BESTÄTIGUNG" at the top of every page, no number, not stored. Permission `donations.view`.
- Download `GET /api/donations/confirmations/[id]/pdf`: returns the STORED PDF bytes (verify SHA-256 against `pdfSha256`; on mismatch return 500 with a clear message and write an audit record `PDF_INTEGRITY_ERROR`), inline disposition, filename `<confirmationNumber>.pdf`, `Cache-Control: private, no-store`. Logged as `PDF_DOWNLOAD`.
- Batch print `GET /api/donations/confirmations/batch-pdf?ids=…` (max 100 ids, permission `donations.view`): renders one multi-page PDF from the stored snapshots (same render function, deterministic), not stored, filename `zuwendungsbestaetigungen-<YYYY-MM-DD>.pdf`; logged as `PDF_BATCH_DOWNLOAD` with the count.

## 14. TEMPLATE VERIFICATION GATE

- `DonationsSettings.templateConfirmedVersion` must equal `TEMPLATE_VERSION` before any issuance. The settings page (`/bagislar/ayarlar`) shows: link text "BMF amtliche Muster (Formularcenter)", the preview PDFs, a checkbox "Preview'deki metni BMF'nin resmi örneğiyle karşılaştırdım; derneğimizin durumuna uygun" and a button "Metni onayla" (requires `approve`). Confirmation stores version, time, user. Changing `TEMPLATE_VERSION` in code invalidates the confirmation automatically (README: bump the version whenever wording changes).
- Audit `TEMPLATE_CONFIRM`.

## 15. SCREENS

All screens use the existing shared components. Turkish UI.

1. **Donations list** (`/bagislar`): year selector; `StatsCards` ("Bağış toplamı", "Bağış sayısı", "Bildirim bekleyen (>300 €)", "Düzenlenen bildirim"); columns: No, Tarih, Bağışçı (name + SP-no), Tutar, Yöntem (badge), Aufwandsspende (badge), Bildirim (ZB-no / "Yok" / "İptal"), Muhasebe fişi (booking number, link to `/muhasebe/[id]` if the user has accounting view). Search `q`: donation number, donor name/number, reference. Filters: year, method, waived, confirmation status (yok / düzenlendi), amount > 300 €, date range. Header actions: "Yeni bağış", "Bağışçılar", "Bildirim oluştur", "Bildirimler", "Ayarlar", "Excel'e aktar". Row actions: Görüntüle, Düzenle, İptal et, "Bildirim oluştur".
2. **Create/edit donation**: donor autocomplete with "Yeni bağışçı" and "Üyeden oluştur"; fields per rules 3–4 with the hints; waiver fields appear when the switch is on. Edit blocked with explanation per rule 6.
3. **Donation detail**: all fields, booking numbers (links), confirmation status, created/updated info, reversal info, actions.
4. **Donors** (`/bagislar/bagiscilar`): list (SP-no, name/organization, city, donation count, total, status), create/edit form, detail (donations, confirmations, "Bildirim oluştur"), deactivate/activate, anonymize (confirmation by typing the donor number; blocked per rule 12 with explanation).
5. **Confirmations list** (`/bagislar/bildirimler`): columns ZB-no, tarih, tür (Einzel/Sammel, Bağış/Aidat), alıcı, tutar, durum, uyarı (voided payment). Filters: year, kind, content, status, "uyarılı". Actions: Görüntüle/PDF, İptal et, "Seçilenleri tek PDF'te indir" (batch print), "Excel (Zuwendungsregister)".
6. **Issue wizard** (`/bagislar/bildirimler/olustur`, `?kaynak=bagis|aidat&bagisci=&uye=&yil=`): step 1 type (Tek bağış / Bağışçıya toplu / Üyelik aidatı / Yıllık toplu üretim); step 2 candidates via `candidate-picker` with totals and the grouping rule (waived vs not waived shown as separate groups); step 3 preview data (recipient, amounts, amount in words, period, the exemption paragraph, readiness checklist with any blocker); "Oluştur" issues and offers the PDF download; batch mode shows per-recipient results.
7. **Confirmation detail**: all snapshot data, items, PDF download, cancel (reason) and "Yerine yenisini oluştur".
8. **Settings** (`/bagislar/ayarlar`): readiness checklist (each item ✓/✗ with link to fix it: organization profile fields, validity with days remaining and a warning 90 days before expiry, accounting donation category, template confirmation), preview PDFs, `membershipFeesDeductible` shown read-only with link to the organization page.
9. **Excel exports** (`exceljs`, Turkish headers, real date and numeric cells, 10,000-row cap, audit `EXPORT` without personal data in the log): donations (`/api/donations/export`: No, Tarih, Bağışçı No, Bağışçı adı, Tutar, Yöntem, Aufwandsspende, Bildirim No, Muhasebe fişi) and confirmations register (`/api/donations/confirmations/export`: ZB-no, tarih, tür, alıcı adı, dönem, toplam, durum, iptal nedeni). Donor names ARE included (the export is a personal-data document; README notes it).

## 16. AUDIT

| Operation | action | entity |
|---|---|---|
| Donor create / update / activate / deactivate / anonymize | CREATE / UPDATE / ACTIVATE / DEACTIVATE / ANONYMIZE | Donor |
| Donation create / update / cancel (reason) | CREATE / UPDATE / CANCEL | Donation |
| Confirmation issue / cancel (reason) | ISSUE / CANCEL | ZuwendungConfirmation |
| Confirmation PDF download / batch download / integrity error | PDF_DOWNLOAD / PDF_BATCH_DOWNLOAD / PDF_INTEGRITY_ERROR | ZuwendungConfirmation |
| Template wording confirmed | TEMPLATE_CONFIRM | DonationsSettings |
| Excel exports | EXPORT | Donation / ZuwendungConfirmation |

Records contain donor/donation/confirmation numbers, amounts and ids only (rule 13).

## 17. STATS AND DASHBOARD

- `getDonationStats(year)`: `{ totalCents, count, unconfirmedOver300Count, issuedConfirmationCount, warningConfirmationCount }`.
- Dashboard "Bağışlar" card (composition layer), visible with `donations.view`: current-year donation total, "Bildirim bekleyen: X", a red line "Bildirim üretimi hazır değil: <first missing item>" when readiness fails, and the voided-payment warning count. Hidden otherwise.

## 18. ENVIRONMENT AND DEPLOYMENT

- No new environment variables. Confirmation PDFs are stored under `UPLOAD_DIR` (backup note in README already covers it; stress that confirmation duplicates are retention-relevant).
- Add the new PDF routes to `outputFileTracingIncludes`; verify all PDFs (including the donation templates) in the `standalone` build.

## 19. OUT OF SCOPE (DO NOT BUILD)

Sachzuwendungen (non-cash donations) and their template; confirmations for foundations, parties or voters' associations; sending confirmations by e-mail or electronic signature; online/PayPal API donation capture; recurring donations; donation appeals and mailing; bank-statement import and SEPA (later phase); automatic "Kleinspende" receipts; Mittelverwendung; erasing confirmation snapshots after retention; restoring cancelled records; tests (except the one-off `scripts/verify-amount-words.ts`); any new library.

## 20. WORK ORDER

Work strictly in this order. After every step `pnpm typecheck` and `pnpm lint` must pass.

1. Read all existing code; write 5–6 bullets of the patterns you will reuse.
2. Shared: `german-number-words.ts` + verification script (run it, all listed cases must pass); buffer-storage and SHA-256 helpers in `shared/files`.
3. Organization additions (Section 4): migration, form, validation, letterhead wording.
4. Members additions (Section 5).
5. Accounting additions (Section 6): service API, settings field, labels, seed.
6. Permissions matrix update (Section 3).
7. `donations.prisma` and migration with the SQL triggers (Section 10).
8. Module foundation: `permissions.ts`, `constants.ts`, `types.ts`, `schemas/*`, `module.config.ts`, `index.ts`, `pdf/template-de.ts`.
9. Services (numbers, guards, builder, donation bookings, anonymization), queries, actions.
10. PDF component and handlers (single, collective with Anlage, batch, preview), Excel handlers, thin API routes, tracing.
11. Components, views and thin route files; settings page with the template gate.
12. Dashboard card, README updates (Sections 1, 8, 14, privacy, workflow), final check of exports and ESLint boundaries, `pnpm build`, standalone run downloading every PDF variant.

## 21. ACCEPTANCE CRITERIA

General: `pnpm build`, `pnpm typecheck`, `pnpm lint` pass; the dependency map of Section 2 is respected; route files contain no business logic; `scripts/verify-amount-words.ts` passes every required case.

- Roles: only ADMIN and TREASURER can issue confirmations, cancel donations/confirmations and confirm the template; BOARD is read-only; SECRETARY, AUDITOR and VIEWER cannot reach donations (nav hidden, routes `AccessDenied`, direct action/API calls rejected).
- Organization: new fields save with validation; the letterhead and confirmations use the correct document-type wording.
- Donations: numbers `BG-<year>-0001…` and donor numbers `SP-0001…` are unique under concurrency; a normal donation creates exactly one INCOME booking with donor NUMBER only in the text; a waived donation requires claim basis, declaration date and expense category and creates the income and expense booking pair on the bank account; failures in accounting (locked year, missing settings) abort the donation with a clear Turkish message.
- Editing amount/date/method reverses the old booking(s) and creates new ones; cancelling a donation reverses its booking(s); neither is possible while an active confirmation exists.
- Readiness: with an incomplete organization profile, an expired notice (older than 5 years, or 3 years for § 60a), a missing template confirmation, or `membershipFeesDeductible = false` for fee confirmations, issuing is blocked and ALL missing items are listed.
- Template gate: before the wording is confirmed (or after `TEMPLATE_VERSION` changes) no confirmation can be issued; confirmation is audited.
- Issuing: a single donation confirmation, a collective donor confirmation (one recipient, one calendar year, one waiver value), a membership-fee confirmation and the batch run all work; the total equals the sum of items; the amount in words is correct; each confirmation gets a unique consecutive `ZB-<year>-NNNN` and a stored PDF with a recorded SHA-256; an item cannot be in two active confirmations (also under concurrency).
- PDF content: wording matches Section 13 for every variant (titles, exemption paragraph by document type, Ja/Nein boxes ticked correctly, collective extra sentence, conditional non-deductible block, notice block, signature area, footer, Anlage page with matching total); umlauts and ß render; works in the `standalone` build; downloads return the stored bytes and detect tampering.
- Cancelling: needs reason and `delete`; items become available again; the stored PDF is unchanged; a replacement can be issued; cancelled confirmations are clearly marked in UI.
- Member-fee confirmations: only available when `membershipFeesDeductible` is true; a payment voided after issuing triggers the warning on the confirmation and the dashboard.
- Immutability: the database rejects deletion of donations, confirmations and items, and rejects changes to the protected confirmation columns.
- Donors: duplicate warning works; "Üyeden oluştur" prefills data; anonymization is blocked while confirmations are within retention and clears personal data otherwise; no audit record contains names or addresses.
- Exports: donations and confirmation register match the on-screen data with real date/number cells.
- Dashboard card shows correct numbers and the readiness/warning lines for authorized roles and is hidden otherwise.
- Without Docker, using Homebrew PostgreSQL, `pnpm db:migrate && pnpm db:seed && pnpm dev` works.

When finished, summarize: created and changed files per module, all migrations (including hand-edited SQL and triggers), the commands to run, how to verify every PDF variant in the standalone build, which official wording must still be checked against the BMF template by the association, and every point marked with `// KARAR:`.