# Accounting Dashboard, Shared Widgets & Website Documentation — Technical Specification and TODO

**Status:** Implemented as ACC-9 (single organization, EUR, `defineCards`) — see [ACC9_IMPLEMENTATION_STATUS.md](./ACC9_IMPLEMENTATION_STATUS.md); unchecked items are out of scope or deferred  
**Scope:** Accounting module, shared dashboard infrastructure, website documentation  
**Priority:** ACC-8 P1; DOC-1 mandatory cross-cutting acceptance criterion  
**Date:** 2026-11-16  
**Target:** Ordvexa / Verein ERP  
**Related:** `docs/ACCOUNTING_ROADMAP.md`, `docs/AUTOMATION_ENGINE.md`, `website/docs/kullanim/moduller/accounting.md`

> **2026-11-16 güncellemesi:** Bu belge ilk taslaktır. Mevcut proje altyapısı `defineCards` ve tek kurumlu EUR modelini kullanır. `defineModuleWidget`, multi-tenant, dört sütunlu grid, kart başına kalıcı ayarlar ve DE website sayfaları mevcut ACC-9 kapsamında değildir. Uygulama durumu ve geçerli kararlar için [ACC-9 uygulama durumuna](./ACC9_IMPLEMENTATION_STATUS.md) bakınız. Dashboard kartları PR #183, özet ekran/önerilerin ilk sürümü PR #184 ile ana dala alınmıştır.

## 1. Purpose and constraints

Provide an accounting overview with KPI cards, trends, alerts and actionable recommendations. Allow users to add permitted accounting widgets to the **main application dashboard**, without coupling the shared dashboard to accounting. Maintain detailed **website/** documentation for every accounting feature change, in addition to engineering docs.

This is a **proposal and implementation checklist**, not a claim that the features already exist. Audit the repository before choosing paths, dependencies or migrations. Reuse existing dashboard infrastructure, design system, permission model, module registry, accounting services, Files and Automation integrations. Avoid adding packages unless justified by an ADR. Respect the existing accounting roadmap's EÜR/single-entry scope; do not promise full HGB double-entry bookkeeping without verified support. The accounting module's current description and the roadmap disagree and require an explicit decision.

## 2. Functional design — Accounting dashboard

### 2.1 Summary widgets (initial set)

| Stable key (proposal) | Data and calculation | Filters / actions |
| --- | --- | --- |
| `accounting.revenue` | Posted income for period, comparable previous period and delta | Date range, organization, source transactions |
| `accounting.expenses` | Posted expenses for period, delta | Date range, categories, transaction drill-down |
| `accounting.net-result` | Income minus expenses for selected period, explicitly label cash vs accrual basis | Date range, accounting method, report link |
| `accounting.receivables` | Open receivables, count and aging buckets | Due date, debtor, invoice list |
| `accounting.payables` | Open supplier payables, count and aging buckets | Due date, supplier, payables list |
| `accounting.overdue` | Overdue open items and amounts | Aging, reminder workflow, invoices |
| `accounting.bank-unmatched` | Imported bank transactions without accepted reconciliation | Bank account, reconciliation |
| `accounting.tax-calendar` | Relevant deadlines and status from configured tax calendar | Period, tax settings, tax screen |
| `accounting.missing-receipts` | Posted/draft records missing required supporting documents | Status, document inbox |
| `accounting.income-expense-trend` | Monthly income/expense series, source-based totals | Range, month granularity |
| `accounting.cash-position` | Known reconciled account balances with explicit as-of timestamp | Account, balance details |
| `accounting.dues` | Member dues billed/collected/overdue when members integration is enabled | Membership period, dues source |

Every KPI must specify **source models, posting/status inclusion, sign convention, currency, VAT treatment, timezone, date field, accounting basis, rounding, refund/storno treatment and data freshness**. Do not silently combine different currencies or imply cash balance equals profit. Compare only equivalent periods. Provide drill-down from totals to authorized source records. If the organization has insufficient data, show an informative empty state, not fabricated zeroes.

### 2.2 Dashboard UX

- Responsive layout: 4-column desktop where feasible, 2-column tablet, 1-column mobile; adapt to actual design system.
- Cards: label, value, period, delta where meaningful, trend, last updated timestamp, tooltip explaining calculation, drill-down action.
- Charts: income vs expenses, aging distribution, category breakdown; accessible tabular alternatives and screen-reader labels.
- Global filters: organization scope (only authorized organizations), fiscal year, date range, currency and accounting basis where applicable.
- Persistent personal filters only if user explicitly saves them; ensure switching organizations invalidates previous scoped data.
- Loading skeleton, empty state, permission denied, disabled-module and recoverable error states.
- No automatic tax filing, invoice issuance, payments or reminders from a suggestion card.

### 2.3 Suggestions / alerts

Start with deterministic rule-based recommendations:
- Overdue invoices -> review reminders.
- Unreconciled bank transactions -> open reconciliation.
- Missing receipts -> open document inbox.
- Upcoming tax deadlines -> view tax calendar; avoid unsupported legal certainty.
- Suspected duplicate imports -> review candidates.
- Unusually high expense categories -> inspect underlying transactions, not automatic accusation.

Recommendation model: stable ID, owning module, organization scope, rule key/version, severity, explanation, evidence references, suggested safe navigation/action, created/evaluated timestamps, resolved/dismissed/snoozed status and actor. Store minimal personal data; do not include raw customer records in notifications. Explain why the recommendation was generated. Refresh or invalidate on relevant financial events. AI may **explain** deterministic results via the current module AI contract but must not autonomously post accounting entries, issue reminders or transmit financial data externally. Require explicit permission and human confirmation for sensitive actions.

## 3. Shared widget architecture

### 3.1 Module registration contract

Design a `defineModuleWidget`-style typed registry, but **first inspect existing module registration conventions**. Suggested fields:

```ts
type ModuleWidgetDefinition = {
  key: string;                  // globally unique and stable, e.g. accounting.revenue
  moduleKey: string;
  titleKey: string;
  descriptionKey: string;
  supportedSizes: Array<"sm" | "md" | "lg">;
  defaultSize: "sm" | "md" | "lg";
  requiredPermission: string;   // resolve against existing permission API
  settingsSchema: unknown;      // validated server-side (Zod or existing equivalent)
  dataVersion: number;
  // Trusted server-side provider and separate presentational component references;
  // do not serialize functions or import paths from user input.
};
```

Implementation guidance:
- Static/trusted registry, optionally generated via existing module sync; do not dynamically import arbitrary user-provided paths.
- Shared dashboard owns layout and widget instance persistence; each module owns data aggregation and its presentation.
- Server verifies session, tenant/organization, module enabled state, cross-module access approvals, permissions, validated settings and bounded query ranges **on every fetch**.
- Registry validates duplicate keys, unknown modules, invalid sizes/settings and unsupported component/data versions.
- Widgets are isolated: one failing widget must not crash the entire dashboard.
- Disable/remove behavior: preserve user layout safely while hiding unavailable widgets; never expose stale private cached data.
- Per-user layout stored using stable widget IDs, versioned settings and optimistic concurrency; provide sensible defaults and reset.
- Main dashboard supports catalog search, add/remove, reorder, resize, per-widget settings, and mobile fallback ordering.
- Do not duplicate the accounting query layer for the main dashboard. Both surfaces call the same authorized provider.
- Bounded data fetching, query batching, cache keys including tenant/user/permission scope, rate limits and instrumentation; no global cache of private financial results.

### 3.2 Suggested separation (adapt to repository)

```text
src/shared/dashboard/                 # shared contracts / registry, if appropriate
src/modules/dashboard/                # only if existing module ownership supports it
src/modules/accounting/               # accounting data providers, widgets, recommendations
website/docs/kullanim/moduller/accounting.md
website/docs/kullanim/moduller/accounting/  # only if existing website routing supports it
website/docs/gelistirici/             # adapt to existing documentation conventions
```

## 4. Detailed implementation TODO — ACC-8

> Durum (2026-11-17): `[x]` = main'de (PR #179–#193). `[ ]` = ACC-9 kapsamı dışında bırakıldı (multi-tenant, widget boyutlandırma/sürükleme, dismiss/snooze yaşam döngüsü, AI açıklaması, yük testi, DE website) veya ayrı yol haritasında.

### ACC-8.0 Discovery and ADR
- [x] Inventory current dashboard routes, registry, widget persistence, permissions and UI components.
- [x] Inventory accounting queries and confirm KPI source-of-truth, EÜR vs double-entry semantics and existing tax/calendar integrations.
- [x] Write ADR for shared widget ownership, extension contract, settings persistence, cache strategy and failure isolation.
- [x] Document dependency on the existing module versioning and releases discipline.

### ACC-8.1 Accounting data layer
- [x] Implement/reuse tenant-scoped, permission-checked dashboard aggregation services.
- [x] Define calculation specifications and unit tests for each KPI.
- [x] Handle partial payments, refunds, storno, tax treatment, date boundaries and decimal rounding.
- [ ] Add filters, drill-down IDs, freshness timestamps and bounded queries.
- [ ] Add performance measurements and appropriate indexes only after profiling.
- [x] Validate cross-widget consistency with source reports and invoice totals.

### ACC-8.2 Accounting dashboard UI
- [x] Add accounting dashboard route/section within existing navigation.
- [x] Implement summary cards, trend charts, aging, empty/loading/error states and responsive layout.
- [x] Implement source links, filter controls, accessible chart alternatives and translated explanations.
- [x] Add visual regression and mobile/keyboard/accessibility tests.

### ACC-8.3 Shared widget registry and main dashboard
- [ ] Define typed registration, validation and stable widget keys.
- [x] Add accounting widget registrations without making dashboard depend on accounting.
- [ ] Implement authorized widget catalog and add/remove/reorder/resize flows.
- [ ] Persist user layouts, validated widget settings and layout schema version.
- [ ] Handle disabled modules, permission revocation, stale settings and widget errors.
- [ ] Add tests for tenant isolation, access revocation, registry collisions and persistence migration.

### ACC-8.4 Recommendations
- [x] Define deterministic rule catalog, evidence links and priority/severity.
- [x] Implement overdue invoices, unmatched bank entries, missing documents and tax calendar alerts.
- [ ] Support dismiss/snooze/resolved lifecycle with audit records.
- [x] Provide explanation and explicit human approval before any financial side effect.
- [ ] Optional AI explanation only after privacy/security review and alignment with current AI v2 contract.
- [ ] Test stale recommendations, false positives, authorization and duplicate event handling.

### ACC-8.5 Operational readiness
- [ ] Test load with large transaction volumes and many widgets.
- [ ] Instrument latency, query counts, widget failures and cache invalidation.
- [ ] Ensure no sensitive data leaks through logs, browser cache or cross-tenant caching.
- [x] Run migration, unit, integration, E2E, typecheck, lint and relevant CI gates.
- [x] Update accounting module version and `releases.json`; run `module:sync` and `check-module-versions`.

## 5. Website documentation policy — DOC-1

**Mandatory for all accounting changes ACC-0 through ACC-8 and future accounting PRs.** The existing `website/` documentation system is the public/user-facing source; `docs/` remains the engineering/architecture source. Updating one does not replace the other.

### 5.1 Required content per change

| Change | Required website documentation |
| --- | --- |
| New feature | Purpose, prerequisites, roles/permissions, step-by-step usage, realistic example, limitations |
| New/changed settings | Default, meaning, impact, permission, migration implications |
| Invoice/banking/tax feature | Accounting basis, calculation example, status flow, exceptions and legal caveats |
| Dashboard widget | Meaning, exact metric definition, filters, data freshness, permission, source drill-down |
| Recommendations | Trigger, explanation, evidence, safe actions, dismissal and error cases |
| New export | File format, supported versions, download permissions, validation and example |
| Breaking UX/API change | Before/after behavior, migration, troubleshooting and release note |
| Bug fix | Update docs when user-visible behavior changes; otherwise note why no update is needed |

### 5.2 Website TODO
- [x] Inspect website documentation framework, current sidebar/routes, localization, frontmatter and build scripts before editing.
- [ ] Update `website/docs/kullanim/moduller/accounting.md` as canonical entry point.
- [x] Add dashboard guide: KPI definitions, filters, drill-downs, recommendations and screenshot(s) from implemented UI.
- [ ] Add main dashboard widget guide: catalog, add/remove, reorder, resize, permission effects and troubleshooting.
- [ ] Add invoice, banking, taxes, reports and GoBD subpages **only if justified by existing docs structure**.
- [ ] Add developer guide for widget registration, data provider contract, authorization, settings and tests.
- [ ] Maintain Turkish and German docs consistently where supported; add English only when website localization supports it.
- [x] Add links from navigation/sidebar and verify no broken internal links.
- [x] Explain limitations and avoid asserting GoBD certification or regulatory approval without evidence.
- [ ] Keep screenshots current; redact personal/financial data and use demo fixtures.
- [x] Run website build/link checks and ensure published documentation matches actual implemented behavior.

### 5.3 PR template acceptance criteria
- [x] Feature and calculation specification updated in `docs/`.
- [x] Corresponding user guide updated in `website/`, or PR explicitly explains why not applicable.
- [ ] Website pages and navigation links verified; translations updated where supported.
- [ ] Screenshots/examples match implemented UI, not mockups presented as live.
- [x] Tests for business logic, permissions and relevant UI flows pass.
- [ ] Database migration and backward compatibility verified where applicable.
- [x] Module version bumped and `releases.json` synchronized; CI passes.
- [ ] PR describes risks, test evidence, docs links and deployment/rollback considerations.

## 6. PR breakdown and dependencies

1. **PR A — Discovery/ADR + metric definitions**: no behavioral change. Establish existing infrastructure, accounting basis and security contract.
2. **PR B — Shared widget contract and layout persistence**: registry, validation, permissions, tests, docs.
3. **PR C — Accounting aggregations and dashboard UI**: cards, charts, drill-downs, translations, docs.
4. **PR D — Main dashboard widget catalog**: add/remove/reorder/resize, settings, migrations, docs.
5. **PR E — Deterministic recommendations**: evidence, safe navigation, lifecycle, audit, docs.
6. **PR F — Optional AI explanation and performance hardening**: gated by privacy and architecture review.

Each PR must be small, independently reviewable, and update both technical and website documentation for any user-facing change. Do not merge all phases into a single large feature PR. Avoid premature redesign or unrelated HeroUI migration.

## 7. Acceptance / definition of done

- Accounting and main dashboard show identical values for the same widget, tenant, permissions and filter settings.
- Users cannot access another organization’s accounting data through widget IDs, cached responses, export URLs or altered settings.
- Revoked permissions and disabled modules immediately block widget data access.
- KPI values reconcile with authoritative accounting reports for fixture scenarios.
- A failed widget does not prevent other widgets from rendering.
- Layouts persist across sessions and remain compatible with widget version upgrades.
- Recommendations cite underlying authorized records and do not autonomously execute financial actions.
- User-facing features are fully explained under `website/`; technical contracts are documented under `docs/`.
- All module version checks, tests, CI and documentation build checks pass before merge.

## 8. Related existing accounting work (do not duplicate)

`docs/ACCOUNTING_ROADMAP.md` already marks ACC-1 through ACC-8 features largely implemented, including DATEV, UStVA, EÜR, CAMT/MT940, XRechnung/ZUGFeRD and GoBD mechanisms. These require verification and hardening, **not blind reimplementation**. Existing known gaps in that roadmap include SEPA direct debit mandates and grants/Verwendungsnachweis; inspect current separate `sepa` and `grants` modules before treating these as still missing.

The earlier conversation used ACC-8 for the dashboard; this document retains that label for the **new dashboard workstream**, while distinguishing it from the *legacy* ACC-8 heading ("Ek özellikler") in the original accounting roadmap. Before implementation, reconcile workstream IDs in the canonical roadmap to avoid collisions.
