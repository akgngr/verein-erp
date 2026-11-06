# Verein ERP — Module Development Guide

> **Single source of truth** (English mirror of [`MODULE_DEVELOPMENT_GUIDE.md`](MODULE_DEVELOPMENT_GUIDE.md)).
> Copy-paste prompt for an external AI without repository access: [`AI_MODULE_PROMPT.md`](AI_MODULE_PROMPT.md).

This guide covers the rules for adding a module without touching the core (**zero touch**).
Most rules are checked automatically; breaking one turns CI red (see §10).

---

## 1. Fastest and safest path: start from the scaffold

```bash
pnpm module:create sponsors "Sponsorlar" "Sponsoren"
pnpm db:migrate --name add_sponsors      # creates the table (do NOT use db push)
pnpm dev                                 # → /sponsors
```

`pnpm db:migrate` must be able to **reach** the database in `DATABASE_URL` (a remote server such as Neon
needs network access; otherwise `P1001: Can't reach database server`). In a network-restricted environment
use a local PostgreSQL (e.g. `docker run -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:16`) and point
`DATABASE_URL` at it. If the migration has to be generated elsewhere, say so explicitly; do not hand-write SQL.

The scaffold produces a module that **works from the first second**: list (search, status filter,
sorting, paging), create/edit form in the right-side drawer, delete confirmation, audit log and
Turkish/German translations. It passes every check (types, lint, hard-coded text, translations,
module standard). Add fields and screens on top of it by copying its patterns.

Template source: `scripts/scaffold-templates.ts` (test: `tests/scaffold.test.ts`).

---

## 2. Principles

1. **Zero touch:** never edit `src/app`, `src/registry.ts`, `prisma/schema/*` or the root
   `messages/*.json` by hand. `pnpm module:sync` generates them from the module folder.
2. **Vertical slice:** everything of the module (schema, permissions, translations, pages, APIs,
   components) lives in `src/modules/<key>/`.
3. **Public API boundary:** other modules only use `@/modules/<m>` (`index.ts`, isomorphic),
   `@/modules/<m>/server` (`server.ts`, `import "server-only"`) and `@/modules/<m>/ui` (`ui.ts`).
   Internal folders are private (ESLint boundary rule).
4. **Thin views:** `views/*` only orchestrate: read via `queries/`, pass props to `components/`.
   Calculations go to `helpers/` (pure) or `services/` (multi-step work, exports); mutations go to
   `actions/` (`"use server"`).

---

## 3. Folder layout

```text
src/modules/<key>/
├── module.config.ts     # identity, nav (sidebar), menu (module sub-menu)
├── permissions.ts       # default permissions (definePermissions; see §8b)
├── schema.prisma        # models; table names @@map("<key>_...")
├── index.ts | server.ts | ui.ts
├── page.tsx             # module home     → /<key>
├── routes/<path>/page.tsx  # sub-pages    → /<key>/<path>
├── api/<path>/route.ts     # API routes   → /api/<key>/<path>
├── messages/tr.json | de.json
├── schemas/  queries/  actions/  services/  helpers/
├── cards/index.tsx      # dashboard cards (optional; see §9)
├── components/          # "use client" components (HeroUI only here)
└── views/               # server components (NO HeroUI)
```

`pnpm module:sync` generates the bridges for `page.tsx`, `routes/` and `api/` and keeps all of them in
two folders: pages in `src/app/(dashboard)/(modules)/`, APIs in `src/app/api/(modules)/` (parenthesised
folders are route groups and do not appear in URLs). Both folders are deleted and rebuilt on every sync
(also before `dev`, `build` and `typecheck`); never put files in them by hand.
Route segment config (`export const runtime = "nodejs"` etc.) is written in the source file and copied to the bridge.

---

## 4. Server and client components

- `views/*` and `page.tsx` are **server components**: no `"use client"`, no hooks,
  **no `@heroui/react` import** (the page crashes with 500). If you need HeroUI, write a
  `"use client"` component under `components/`. Ready-made client components for PageHeader buttons:
  `LinkButton`, `FormDrawerButton`.
- `"use client"` / `"use server"` must be the **first statement**; an import in front of it silently disables it.
- Do not use HeroUI `Select` inside lists (`map`) (SSR id mismatch); use a styled native `<select>`.
- Do not call `Date.now()` / `new Date()` during render; compare dates in queries/helpers.
- No `any`; use `catch (error)` + `error instanceof Error`.

---

## 5. Forms: the right-side drawer standard

Create/edit forms open in a **right-side drawer**, not on a separate page or in a modal. The open state lives in the URL:

| Where | Parameter | View |
| --- | --- | --- |
| List page | `?yeni` (or `?yeni=<kind>`) | `<X>CreateView` |
| List page | `?duzenle=<id>` | `<X>EditView id` |
| Detail page | `?duzenle` | `<X>EditView id` |

Building blocks (`@/shared/components/forms/form-drawer`):

- `FormDrawer`: the server view puts the form inside it. Closing removes only `yeni`/`duzenle` and keeps filters. It is full screen on phones.
- `FormDrawerButton param="yeni"`: the PageHeader button (keeps the current query).
- `useFormDrawerHref()`: for table row actions (`drawerHref("duzenle", row.id)`).
- `useFormDrawerClose()`: closes the drawer after save/cancel.
- `FormSurface`: a card on a page, borderless inside the drawer.

**Form types:** if the schema uses `z.preprocess` (e.g. `emptyToNull` turning empty text into `null`) or
`.default()`, Zod's input type differs from its output and `useForm<FormValues>` vs `zodResolver` fails with
`TS2322`. Project pattern (see `meetings/components/meeting-form.tsx`):

```ts
import { useForm, type Resolver } from "react-hook-form";

const form = useForm<TaskFormValues>({
  resolver: zodResolver(taskSchema) as unknown as Resolver<TaskFormValues>,
});
```

Confirmations (delete, cancel, test mail) are not forms; they stay `ConfirmDialog`/modal.
Reference implementation: the scaffold's `views/item-*-view.tsx` and `components/item-form.tsx`.

---

## 6. Translations (Turkish + German required)

- **No hard-coded UI text.** All texts are in `messages/tr.json` and `messages/de.json`; both files
  must have **the same keys**.
- Server: `await getTranslations("<key>.<area>")`; client: `useTranslations(...)`.
- Required keys:
  - `nav.<labelKey>`: sidebar name;
  - `module.label` / `module.description`: module management list;
  - `menu.<key>`: every module menu item;
  - `meta.*`: page titles; use `generateMetadata` in `page.tsx`, not a static `metadata`.
- **Validation and error messages are translation keys:** `z.string().min(1, "<key>.validation.titleRequired")`,
  `throw new ActionError("<key>.errors.notFound")`. Values via the third argument:
  `new ActionError(key, undefined, { number })`. `createAction` translates them into the user's language;
  the form components translate field errors.
- Enum labels live in messages (`types.ACTIVE`, `status.OPEN` …), not in code. `constants.ts` only
  keeps value lists.
- ICU rule: do not put angle brackets such as `<Jahr>` in a message (parsed as a tag); variables are `{name}`.
- Excel/PDF: Excel headers follow the UI language (Turkish output matches the spec texts).
  Official PDFs accept `?lang=de|tr` and use a `pdf/strings.ts` dictionary.

The root `messages/<locale>.json` is **generated** from `messages/shell/<locale>.json` + module files.

---

## 7. Other rules

- **Permissions:** `permissions.ts` defines the 6 system roles (ADMIN, BOARD, SECRETARY, TREASURER, AUDITOR, VIEWER);
  module roles (e.g. TEACHER) are added only where relevant. These are **defaults**; admins can change them (§8b).
  Mutations use `createAction({ permission, schema, handler })`, which handles permission, schema
  validation, audit log (`audit`) and error translation.
- **User label:** for fields like `createdByLabel` use `buildUserLabel(user.name, user.email)`
  (`@/shared/utils`); it takes two strings, not the user object.
- **Database:** `const db = getDb()` (`@/shared/db`). Reference other modules' tables softly
  (`memberId String?` + label snapshot), not with `@relation`. For member pickers use
  `listMemberOptions()` (`@/modules/members/server`); do not query the `member` table directly. Schema change = migration (`pnpm db:migrate`).
- **Accounting bookings:** a module that collects money does not write bookings itself; it uses
  `createSourcedBooking` / `reverseSourcedBooking` (with `tx` inside its own transaction) and
  `getPaymentAccountTargets()` (cash/bank account) from `@/modules/accounting/server`. Add the
  `sourceType` to accounting's `SOURCE_TYPE_VALUES` and the `enums.sourceType` translation; use a new
  `sourceId` per payment (paying again after a reversal creates a new booking). Example: `courses`.
- **Menu:** sub-pages and exports go to `module.config.ts → menu` (home is added automatically;
  API links `isDownload: true`; optional `permission`). The PageHeader holds only the main "New" action.
- **Settings:** the sidebar has a single "Settings" entry; settings screens are not added to the main
  menu as separate items.
  - A standalone settings/admin page (e.g. "E-mail", "Users") → give its `nav` item
    `group: "settings"`. It then appears in the "Settings" sub-menu and in the "Association and system"
    section of the settings hub (`/ayarlar`); `module.description` is used as its description.
  - A settings page inside the module (e.g. `/muhasebe/ayarlar`) → a `menu` item with `key: "settings"`.
    It is listed automatically in the "Module settings" section of the hub.
  - Never add cards/links to the shell or the hub by hand; everything is built from the registry.
- **Lists:** `parseListParams` + `DataTable` (`@/shared/components/data-table/data-table`); search,
  filters, sorting and paging live in the URL.

---

## 8. Cross-module access (admin approval)

A module uses another module's data only through that module's `@/modules/<m>/server` API and
**declares** it in `module.config.ts`:

```ts
access: [
  { module: "students", operations: ["read"] },
  { module: "accounting", operations: ["read", "write"] },
],
```

- The reason text lives in `messages/tr.json` and `de.json` under `access.<module>`; it is shown in
  the approval dialog.
- `pnpm module:validate` scans the code. An undeclared `server` import or direct access to another
  module's table (`getDb().<model>`) is an error. The operation is derived from the function name:
  `delete…`/`remove…` → delete; `create…`, `update…`, `send…`, `…Action` etc. → write; otherwise read.
- `auth` (session, `createAction`) is infrastructure and needs no declaration.
- When activating the module, the admin sees the requested access in an approval dialog and allows it.
  Without approval the module is unusable: hidden from the menu, pages and APIs closed (generated
  bridges are wrapped with `withModuleGate` / `gateRouteHandler`). If an update requests new access,
  the approval lapses and is asked for again. Approvals are stored in the database (`system_settings`, `module-access:<module>`); official modules come approved, extensions wait for consent.

---

## 8b. Roles and permissions (database)

Users → Roles & Permissions is built automatically from all installed modules. Role kinds: system roles
(locked ADMIN + BOARD, SECRETARY, TREASURER, AUDITOR, VIEWER), module roles (`module.config.ts → roles`,
e.g. courses → TEACHER, with `messages → roles.<KEY>.label/shortDesc`) and custom roles created by admins.
Each `definePermissions` resource needs `messages → permissions.<resource>.label/description`. Code values are
defaults; admin changes are stored in `role_grants` ("Reset to default" removes them). When a module is
inactive, its roles cannot be assigned and grant nothing. Always check permissions with `can(...)`, never by role name (the validator rejects `user.role === "…"`). Data-scope rules are permissions too, e.g. `coursesAll` (all courses vs. own), `memberIdentity`, `progressNotesAll`.

## 8c. Extra npm packages (`dependencies`)

A module that needs a package not used by the core declares it in its own `module.config.ts`
(`dependencies: { qrcode: "^1.5.4" }`) and runs `pnpm module:deps` (adds/removes packages in the root
`package.json`, records ownership in `moduleDependencies`, installs with `--ignore-scripts`); commit
`package.json` and `pnpm-lock.yaml`. Core packages (used outside `src/modules`) need no declaration and their
versions cannot be changed by modules. `pnpm module:validate` rejects undeclared packages, missing installs,
incompatible ranges and missing ownership records. `pnpm module:deps --check` changes nothing.

## 9. Dashboard cards (`cards/`)

A module can offer cards for the dashboard (`/`). With "Edit dashboard" the user adds, removes and
reorders cards; the layout is stored per user. If the user never edited it, cards with
`defaultVisible: true` are shown. A card is hidden when its module is inactive or the user lacks its
`permission`.

`src/modules/<key>/cards/index.tsx`:

```tsx
import { Users } from "lucide-react";

import { StatCardBody } from "@/shared/components/dashboard/card-bodies";
import { defineCards } from "@/shared/types/dashboard";

import { sponsorsPermissions } from "../permissions";
import { getSponsorStats } from "../queries/get-sponsor-stats";

export const cards = defineCards([
  {
    key: "overview",                          // id: "sponsors.overview"
    titleKey: "cards.overview.title",         // in the module messages
    descriptionKey: "cards.overview.description",
    icon: Users,
    size: "sm",                               // sm = 1 column, md = 2, lg = full row
    defaultVisible: true,
    href: "/sponsors",
    permission: { definition: sponsorsPermissions, action: "view" },
    render: async ({ t }) => {
      const stats = await getSponsorStats();
      return <StatCardBody value={stats.active} label={t("cards.overview.active")} />;
    },
  },
]);
```

- Body components (`@/shared/components/dashboard/card-bodies`): `StatCardBody` (number),
  `TableCardBody` (short table), `GaugeCardBody` (0-100 gauge), `AlertCardBody` (warning).
  The dashboard draws title, icon, link and edit buttons; the card only returns its body.
- `render` runs on the server: it may query, but cannot use hooks or HeroUI. `t` is scoped to the
  module's translation namespace. Return `null` when there is nothing to show (e.g. an overdue
  warning); the card is then hidden in view mode. If it throws, only that card shows an error.
- Card title/description texts live in `messages/tr.json` and `de.json` under `cards.<key>.*`.
- `pnpm module:sync` collects the `cards/index.tsx` files into the generated `src/dashboard-cards.ts`;
  do not edit that file. Examples: the `cards/` folders of `members`, `meetings`, `documents`.

---

## 9b. Assistant (AI) contract (`ai.ts`)

**Everything** the assistant can do with a module is defined in that module's own `ai.ts`; the AI
module has no module-specific code. (TypeScript rather than YAML/JSON: schemas and functions are
type-checked, read by the validator and cannot drift apart.) `pnpm module:sync` collects all `ai.ts`
files into the generated `src/ai-registry.ts`. Types and shared helpers: `src/shared/ai/define.ts`.

Modules with a contract: `tasks`, `documents`, `meetings`, `inventory`, `courses`, `events` (read +
proposals); `accounting`, `members`, `donations`, `students`, `progress`, `organization` (read only).
See the Turkish guide for a full template.

Rules:
- `operation` (read/create/update/delete) maps to the module row in Settings → AI; default off.
- Write tools never change data; they call `propose(...)` and return `PROPOSED`. On confirm, the action
  is looked up in the module, its operation is taken from the definition (not the client), the matrix is
  re-checked, the payload re-validated with `schema`, and the module action checks the user's own role.
- `execute` returns `{ ok, error? }` where `error` is a translation key.
- Tools never return names, contact, address, bank or ID data (GDPR); masks in `title`, `details` and
  `payload` are restored automatically.
- Each action needs `ai.<action>.kind|confirm|done` in `messages/{tr,de}.json`.
- `ai.ts` only uses its own `./server` and `./permissions`; other modules go through the §8 `access` approval.
- `pnpm module:validate` checks: `server-only`, `defineModuleAi`, `module` = folder name, snake_case tool
  names, every proposed action defined, action translations.

Checklist: create `ai.ts` → add translations → `pnpm module:sync && pnpm module:validate && pnpm typecheck`
→ enable the row in Settings → AI.

## 9c. Generating files (`exports` module — "My files")

Modules never write their own PDF/Excel/Word code: declare `access: [{ module: "exports", operations: ["write"] }]`
and call `createGeneratedFile({ ownerId, title, format, markdown, source })` from `@/modules/exports/server`.
Files are encrypted, owner-only, deleted after 30 days and listed at `/dosyalar`. Formats: `pdf` (letterhead),
`xlsx` (one sheet per table, numeric cells), `docx`, `md`, `csv`. New format plugin: `formats/<name>.ts` with
`defineFormat(...)` + one line in `formats/index.ts` and `FILE_FORMATS`. The assistant uses `create_file`
(matrix: My files → create); the download button is shown under the answer.

## 9d. Background automation and task contract (`automation.ts`)

Modules that need background work define their task in the owning module; they do not implement
another queue or worker. The platform separates task definitions, durable execution records,
the transactional outbox and the pg-boss worker.

### Do not confuse the two `automation.ts` entrypoints

- `src/modules/<business-module>/automation.ts` is the module's **task definition**. It uses
  `defineTask(...)` to declare a namespaced key, version, input schema, timeout, retry policy,
  idempotency key and handler. Example: `src/modules/mailings/automation.ts`.
- `src/modules/automation/automation.ts` is the automation infrastructure's **narrow worker API**.
  It exposes primitives such as execution-record creation without importing the task registry or
  Next.js UI.
- `server.ts` is the module's general server API for web pages and Server Actions. Do not add
  every worker dependency to this broad barrel; expose only the worker-safe functions through a
  separate `automation.ts` entrypoint.

### Define a task

Use this pattern in `src/modules/<business-module>/automation.ts`:

```ts
import "server-only";

import { z } from "zod";
import { defineTask } from "@/shared/automation/define";

export const processExampleTask = defineTask({
  key: "example.process_item",
  version: 1,
  description: "example.process_item",
  inputSchema: z.object({ itemId: z.string().min(1).max(128) }).strict(),
  timeoutSeconds: 300,
  retry: {
    maxAttempts: 3, // includes the first attempt
    initialDelaySeconds: 30,
    maxDelaySeconds: 900,
    backoffMultiplier: 2,
  },
  idempotencyKey: (input) => `example:item:${input.itemId}`,
  handler: async (input, context) => {
    const { processItem } = await import("./services/process-item");
    return processItem(input.itemId, context);
  },
});
```

- Task keys are namespaced as `<module>.<task_name>`. Keep keys stable; increment `version`
  when the task input/output contract changes incompatibly.
- The queue input is validated by `inputSchema` before the handler runs. Use `.strict()` to
  reject unexpected properties.
- Keep queue input and execution context minimal: record IDs, tenant/organization scope and
  correlation metadata only. Never put email addresses, recipient lists, identity numbers,
  bank data, session tokens or other PII into queue payloads. Keep sensitive business data in
  its source module and resolve it again inside the handler.
- Handlers are trusted application code. Never derive an import path, function name, code or
  executable handler from user input. Register tasks statically in
  `src/modules/automation/tasks/registry.ts`.
- Keep business logic in the owning module's `services/` layer; `automation.ts` should define
  the contract and connect it to the service.
- Execution-level idempotency does not guarantee exactly-once delivery of every email, payment
  or external side effect. Add recipient/transaction-level deduplication and partial-failure
  recovery where needed.

### Start and dispatch a task

Execution creation and the dispatch intent are persisted in one database transaction. A separate
worker process publishes transactional outbox events to pg-boss. A feature module must not create
its own queue table, cron mechanism or pg-boss connection.

Call `createTaskExecutionRecord` from the automation module's narrow API:

```ts
import { createTaskExecutionRecord } from "@/modules/automation/automation";

// Check the actor's permission, module availability and business rules first.
const execution = await createTaskExecutionRecord({
  taskKey: "example.process_item",
  taskVersion: 1,
  organizationId,
  requestedById: user.id,
  sourceModule: "example",
  correlationId,
  idempotencyKey: `example:item:${itemId}`,
  input: { itemId },
  maxAttempts: 3,
});
```

This is an **internal persistence primitive**, not a public enqueue API. It does not independently
check the caller's permission or source-module availability; the calling service must do so first.
Handle uniqueness conflicts for repeated idempotency keys.

### Worker-safe API and dependency boundary

The worker runs outside a Next.js request context. APIs used by it must:

- start with `import "server-only"`;
- not transitively import Next.js UI, React, `next-intl/server`, `next/headers`,
  `next/cache`, Server Actions or request-context-dependent code;
- expose only the functions needed by the worker instead of re-exporting a broad `server.ts` barrel;
- keep read-only queries and business services clearly separated.

Examples include `@/modules/mail/automation`, `@/modules/users/automation`,
`@/modules/system/automation` and `@/modules/automation/automation`. Add new worker-facing
functions to these narrow entrypoints; do not move UI/action/cache dependencies into them.
Keep the relevant `module.config.ts → access` declaration and translated access reason for
cross-module calls.

### Failure handling, retries and execution state

- **Everything after the claim** must be inside the same `try/catch` boundary: start logging,
  task lookup, input validation, timeout setup and handler execution. An exception outside that
  boundary can leave an execution stuck in `RUNNING`.
- Do not call translation or context APIs that require a Next.js request from the worker. Translate
  user-facing text in the UI; use stable task keys and error codes in worker logs.
- Define total attempts, initial delay, maximum delay and backoff explicitly. Retry transient
  failures; after attempts are exhausted, mark the execution and step terminal `FAILED`.
  Successful work becomes `SUCCEEDED`.
- Claiming must be atomic so two workers cannot run the same execution concurrently. Set stale/
  lease windows according to the task timeout and actual runtime.
- A fix that prevents future stuck executions does not automatically make previously stuck
  `RUNNING` records safe to replay. Inspect prior side effects and deduplication state first,
  especially for partially sent email or payment jobs.

### Durable logs and monitoring

- Persist worker events through `AutomationLog`: at minimum attempt started, retryable failure,
  final failure, success and terminal failure.
- Logging is **best-effort**. A log-write failure must never change the job's outcome.
- Keep log fields bounded and sanitized. Never store PII, recipient addresses, access tokens or
  complete sensitive payload copies; cap message and details sizes.
- Protect the monitoring page with a view permission. The current page shows the latest 100
  executions, up to 8 recent logs per execution, and campaign summaries/failed-send details for
  the mailings integration. It does not show recipient email addresses.
- The current page reads data when rendered; it does not guarantee real-time polling. Design
  refresh behavior separately if required.

### Background-task TODO checklist for module authors

- [ ] Confirm that the work genuinely needs a background worker.
- [ ] Define the input and tenant/organization scope; carry only required IDs and metadata.
- [ ] Define the task contract, strict Zod schema and task version in `automation.ts`.
- [ ] Set timeout, total attempts and backoff based on the actual job duration.
- [ ] Define a stable, PII-free idempotency key.
- [ ] Add side-effect-level deduplication and partial-success recovery for email, payment or APIs.
- [ ] Keep business logic in `services/`; keep the handler thin and register it statically.
- [ ] Expose worker dependencies through a narrow `automation.ts` API, not a broad `server.ts`
      barrel or Next.js request-context code.
- [ ] Declare cross-module access in `module.config.ts → access` and add TR/DE reason strings.
- [ ] Recheck permissions, module availability, tenant isolation and source-record validity at execution time.
- [ ] Verify that logs contain no PII and log failures do not affect job outcomes.
- [ ] Test success, retryable/final failure, timeout, invalid payload, unknown task/version,
      concurrent claims and partial side effects.
- [ ] Bump `module.config.ts` and add a TR/DE entry at the top of `releases.json`.
- [ ] Run module sync/validation, i18n and hard-coded-text checks, typecheck, lint and tests.

## 10. Verification (CI runs the same steps)

```bash
pnpm module:sync                                  # bridges, schema, translations, registry
pnpm module:validate                              # module standard + translation completeness + migration
pnpm exec tsx scripts/check-i18n-keys.ts          # every used key exists in tr/de; ICU is valid
pnpm exec tsx scripts/check-hardcoded-text.ts     # no hard-coded UI text
pnpm typecheck && pnpm lint && pnpm test
```

`pnpm typecheck` first deletes stale Next route types (`.next/types`, `.next/dev/types`), so adding a route
while `next dev` is running no longer breaks it with `.next/dev/types/routes.d.ts … TS1128`. If you run `tsc`
directly, run `rm -rf .next/types .next/dev/types` first.

Tests catch: hand-written `src/app` files (`zero-touch`), directives not on the first line
(`directives`), HeroUI without "use client" (`heroui-client-only`), menu links without a page
(`navigation`), scaffold templates breaking the rules (`scaffold`).

## Right to erasure (`lifecycle.ts → onUserDeleted`)

Before a user is deleted, the system calls every module's `onUserDeleted(userId)` hook (even for disabled modules).

- Rows that belong to a single user (conversations, profile, personal calendar, personal files, preferences):
  set `personalOwnerField` in `DATA_POLICY` and delete them in the hook (`x.deleteMany({ where: { userId } })`).
- Business records (bookings, meetings, members, shared calendar entries) are kept for legal retention;
  `createdById` is a soft reference and `…ByLabel` keeps the name.
- A table with `userId`/`ownerId` that is kept goes into `USER_LINK_RETAINED` with a reason.
- `tests/shared/user-deletion.test.ts` enforces this decision and the hook for every such table.
