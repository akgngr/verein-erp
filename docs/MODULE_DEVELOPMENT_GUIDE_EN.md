# Verein ERP — Module Development Guide

> **Single source of truth** (English mirror of [`MODULE_DEVELOPMENT_GUIDE.md`](MODULE_DEVELOPMENT_GUIDE.md)).
> Copy-paste prompt for an external AI without repository access: [`AI_MODULE_PROMPT.md`](AI_MODULE_PROMPT.md).

This guide covers the rules for adding a module without touching the core (**zero touch**).
Most rules are checked automatically; breaking one turns CI red (see §9).

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
├── permissions.ts       # permission matrix for the 7 roles (definePermissions)
├── schema.prisma        # models; table names @@map("<key>_...")
├── index.ts | server.ts | ui.ts
├── page.tsx             # module home     → /<key>
├── routes/<path>/page.tsx  # sub-pages    → /<key>/<path>
├── api/<path>/route.ts     # API routes   → /api/<key>/<path>
├── messages/tr.json | de.json
├── schemas/  queries/  actions/  services/  helpers/
├── cards/index.tsx      # dashboard cards (optional; see §8)
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

- **Permissions:** `permissions.ts` defines all 7 roles (ADMIN, BOARD, SECRETARY, TREASURER, AUDITOR, VIEWER, TEACHER).
  TEACHER only sees the courses and student-progress modules; other modules use `TEACHER: []`.
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

## 8. Dashboard cards (`cards/`)

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

## 9. Verification (CI runs the same steps)

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
