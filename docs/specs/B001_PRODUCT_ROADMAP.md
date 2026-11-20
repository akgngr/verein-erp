# B001 product roadmap: differentiation, parity and open work

**Status:** Accepted by the product owner (2026-11-20). Work starts **Monday 2026-11-23**.
**Origin:** Discussion [#392 Brainstorm-001](https://github.com/akgngr/verein-erp/discussions/392) (claude, gemini, chatgpt + product-owner help-center request).
**Research and full idea pool:** [`docs/ideas/BRAINSTORM_001_COMPETITIVE_RESEARCH.md`](../ideas/BRAINSTORM_001_COMPETITIVE_RESEARCH.md)
**Coordination:** [AI protocol](../ai-coordination/README.md) · [Discussions protocol](../ai-coordination/DISCUSSIONS_PROTOCOL.md) · [Decision log](../ai-coordination/DECISION_LOG.md)
**Language:** English (agent-to-agent rule of 2026-11-20). User-facing texts stay TR/DE.

This spec turns the brainstorm into ordered work packages with owners, dependencies and acceptance criteria. It also records the project review of 2026-11-20, so in-flight work is finished before new work crowds it out.

---

## 1. Goal and non-negotiable principles

**Goal:** Close the member-facing parity gap with German association software, and win on things nobody does well: proactive compliance, bilingual TR/DE board work and privacy you can verify.

Every work package in this spec follows these rules:

1. **Data stays in the instance.** Any external flow is opt-in, permission-gated, audited and listed in the egress ledger (F2).
2. **New capabilities are EXTENSION modules, default off.** Cross-module reads use admin-approved access grants and module contracts, never direct table access.
3. **AI is optional.** Features work without AI. AI sees only K0-K3-permitted data (`src/shared/data-policy.ts`), mostly aggregates or pseudonymised text. A self-hosted model endpoint is the recommended default for sensitive flows.
4. **Proposals, not actions.** Anything with an external effect (send, pay, file, delete) is a draft that a person approves (secretary pattern, ADR 0005).
5. **Legal-adjacent features** (tax, voting, insurance-like funds, cash registers) say "internal checklist, not legal or tax advice" and need owner sign-off before release.
6. **Quality gates** of the AI protocol apply to every PR (§10).

---

## 2. Project review (2026-11-20): what is still open

### 2.1 In-flight work: finish first

| Area | Issue | Owner | State | Note |
|---|---|---|---|---|
| Notifications N1b bell + drawer | #355 | chatgpt | draft PR #369 | Blocks N7 #364 and help drawer F1b #415 |
| Notifications N2b preferences UI | #358 | chatgpt | draft PR #378 | |
| Notifications N8b subscribers screen | #376 | chatgpt | ready (label says blocked; backend #375 is done) | |
| Notifications N8c announcement screen | #381 | chatgpt | ready | |
| Notifications N3b web push client / PWA | #360 | gemini | ready per board (label says blocked; backend #359 is done) | |
| Notifications N7 SSE + drawer a11y | #364 | gemini | blocked by #355 | |
| Notifications N5 WhatsApp | #362 | claude | blocked: owner Meta verification | |
| Notifications epic | #365 | claude (coord.) | open until all sub-tasks accepted | |
| Secretary S4-S5 UI | #317 | chatgpt | draft PR #348 | Last open child of epic #263 |
| Weather: server-side Open-Meteo | #397 | gemini | ready | Removes `RAW_FETCH_ALLOWLIST` exceptions |
| Finance: server-side exchange rates | #396 | gemini | ready | Same |

**Coordinator action on Monday:** fix the labels on #376 and #360 (both are effectively ready), review and merge the three draft PRs once CI is green.

### 2.2 Gaps found in the review (new issues)

| Gap | Evidence | Issue | Owner |
|---|---|---|---|
| Dependabot not configured; CodeQL runs only via GitHub default setup (no versioned config) | No `.github/dependabot.yml`; CodeQL checks appear on PRs | #408 | claude |
| Authorization matrix + IDOR tests missing | `docs/specs/TODO_SECURITY_TESTING.md` | #409 | chatgpt |
| AI v2 migration not finished (F01-F03; E08/E12 operator tasks) | `docs/TODO_AI_ASSISTANT_V2.md` | #410 | claude |
| Central file pipeline: inventory (FILE-0) not started | `docs/TODO_CENTRALIZED_FILE_PIPELINE.md` | #411 | gemini |
| Stale checkboxes: SEPA pain.008 and grants reports are implemented | `docs/ACCOUNTING_ROADMAP.md` | fixed in this PR | — |

### 2.3 Larger open topics without issues (owner decision needed)

- **ADR 0001 hybrid multi-tenant / control plane** is "proposed"; the phase ADRs are not written. This is the prerequisite for hosted SaaS and for the public portal deployment option (RFC-003 #399).
- **Licensing / packaging** is deliberately deferred (`docs/ideas/PRODUCT_PHILOSOPHY_AND_LICENSING_DECISION.md`). The "AI help = enterprise tier" note in F1/W3 is a packaging *assumption*, not a paywall; nothing is gated in code.
- **Remaining security backlog** (OSV, Semgrep, Trivy, ZAP, fuzzing, marketplace signature check in CI) stays in `TODO_SECURITY_TESTING.md` until #408/#409 are done.
- **Deferred accounting roadmap** R2 multi-currency, R3 dashboard drag/resize, R4 German website docs (`docs/ACCOUNTING_DEFERRED_ROADMAP.md`).

---

## 3. Kick-off plan (week of 2026-11-23)

| Day | claude | chatgpt (Codex) | gemini |
|---|---|---|---|
| Mon | Fix labels #376/#360; open RFC-002 #398 and RFC-005 #401; start SEC1 #408 | Finish #355 (PR #369) | Start #397 / #396 |
| Tue | Review/merge notifications PRs; F2a #402 | #358 (PR #378), then #376 | #360 web push client |
| Wed | RFC decisions (24 h review); start F1a #412 after #398 | #381, #317 (PR #348) | FILE-0 #411; #364 once #355 merged |
| Thu | Q2 SEPA coach #406 or W1 #414 (after #401) | F3 readiness #403 | W4 §72a #404 |
| Fri | Q1 audit room #405; promotion `alpha → beta` with acceptance notes | SEC2 authz matrix #409 | F1b help drawer #415 (after #412 + #355) |

**Rule:** In-flight work (§2.1) has priority over new B001 work. RFC-003 #399 and RFC-004 #400 start after RFC-002/005 are decided.

---

## 4. Wave 0: platform foundations

### F1. Contextual help drawer (product-owner request, all tiers)

- **What:** A help button in the top bar, next to the notification bell, opens a right-side drawer. It shows help for the current page: purpose, step-by-step tasks, field explanations and legal notes, in the user's language.
- **Content (single source of truth):** `src/modules/<module>/help/<route>.tr.md` and `.de.md`, collected by `module:sync`. The same files feed the docs site. CI fails when a nav route lacks TR or DE help (allow-list during migration).
- **Search:** route lookup first, then a static index (BM25/MiniSearch) built at sync time, with TR/DE normalisation (i/İ/ı, umlauts, ß). No external service, no vector DB.
- **Issues:** RFC-002 #398 → F1a backend #412 (claude) → F1b drawer UI #415 (gemini, after #355).
- **Done when:** three pilot modules (members, accounting, sepa) have full TR/DE help, the drawer passes keyboard/screen-reader checks and coexists with the notification drawer in one panel pattern.

### F2. Privacy presets and data egress report

- **What:** A ledger of every external call (category, provider, volume, legal basis, module; never payloads or personal data). Presets "Strict / Standard / Connected" switch extension modules and AI providers coherently, with a preview diff.
- **Report:** a monthly page that separates **configuration**, **actual transfers** and **provider-side retention**. Switching a flow off does not undo past disclosures, and the page says so.
- **Issues:** F2a backend #402 (claude) → F2b UI + egress contract tests #413 (chatgpt).
- **Done when:** a contract test proves that no outbound adapter can send without a ledger entry.

### F3. Module readiness and workflow health

- **What:** For each enabled module: configuration complete, access grants approved, worker heartbeat, failed jobs (count + redacted category), channel setup. Guidance only, no automatic changes.
- **Issue:** #403 (chatgpt).

---

## 5. Wave 1: the final top 5

| # | Package | Effort | Gate | Issue(s) |
|---|---|---|---|---|
| W1 | Gemeinnützigkeit Compliance Cockpit | M | RFC-005 #401 | #414 (claude), UI issue after backend |
| W2 | Member privacy cockpit + self-service portal | L | RFC-003 #399, SEC2 #409 | opened after RFC decision |
| W3 | Bilingual Behörden-Lotse + "Ask AI about this page" | M | RFC-002 #398, F1 | opened after F1a |
| W4 | §72a SGB VIII youth-protection inspection tracker | S | none | #404 (gemini) |
| W5 | General assembly end-to-end | L | RFC-004 #400 + legal review | opened after RFC decision |

### W1. Gemeinnützigkeit Compliance Cockpit

- **Problem:** volunteer boards endanger their tax-exempt status through missed deadlines and silent rule breaches.
- **Scope v1:** a rule engine over module contracts with a traffic-light overview and secretary nudges. First rules: Freistellungsbescheid expiry, zeitnahe Mittelverwendung, Übungsleiter/Ehrenamtspauschale per person, wirtschaftlicher Geschäftsbetrieb revenue threshold, receipt template validity. Builds on the existing §62 AO reserves and teacher-payout data.
- **Binding conditions:** rules are data with source, version, effective date and review status. Output is a finding plus a draft task, never a booking. "Internal checklist, not tax advice" (StBerG boundary). Summaries show member numbers, not names.
- **Later rules:** earmarked funds (#10), room rental spheres (#20), festival cash (#11), and youth-protection deadlines (W4).

### W2. Member privacy cockpit + self-service portal

- **Scope:** members view and correct master data (approval queue), manage consents and channels, download dues/donation receipts, sign pending documents, register for events, request an Art. 15 export, and read a plain-language processing log built from the audit log. No member directory unless each member opts in. Accessible polls (#24, gemini) are a later portal feature.
- **Binding conditions:** single-use links of about 15 minutes, step-up auth (passkey/WebAuthn) for downloads and data requests, rate limits, public routing separated from the admin surface (ADR 0001), negative authorisation tests, WCAG 2.1 AA.

### W3. Bilingual Behörden-Lotse + page AI

- **Scope:** an uploaded or forwarded authority letter goes through OCR and pseudonymisation. The output is a side-by-side TR/DE plain-language summary (what they want, deadline, consequence), a German reply draft and a dated task. On every page, the AI layer below the help article answers from the help articles and the page **structure**.
- **Binding conditions:** local model by default; external inference only after explicit per-request approval. Every extracted deadline links to its source passage and needs human confirmation. The page-context payload follows a strict Zod contract (route, field keys/types, button states, error keys) and never includes values. Screen values are a per-question opt-in through pseudonymisation and the K0-K3 gate.

### W4. §72a SGB VIII inspection tracker

- **Scope:** records the inspection date, certificate issue date, inspecting officer and next due date. It includes the fee-exemption request template and a reminder 3 months before expiry.
- **Binding condition:** document upload is technically impossible (DSGVO Art. 10). Issue #404.

### W5. General assembly end-to-end

- **Scope:** the invitation deadline and form computed from the bylaws, invitations through the preferred channel with proof of sending, hybrid check-in, live quorum, open and secret votes, minutes PDF, and a Registergericht notification draft.
- **Binding conditions:** the RFC proves that eligibility tokens and ballots cannot be linked (no joinable keys, timestamps or sequence correlation) while eligibility stays verifiable. Legal review covers BGB §32 and contestation risk. Build only after the F-wave and W2 authentication foundations. Decision evidence packets (A4) fold into the meetings part.

---

## 6. Parallel quick wins (S effort)

| Code | Package | Issue | Owner | Note |
|---|---|---|---|---|
| Q1 | Auditor (Kassenprüfer) time-boxed audit room | #405 | claude | Extends the existing auditor report in `accounting` |
| Q2 | SEPA mandate health check + returned-debit coach (#17 + #26) | #406 | claude | IBAN checksum locally, sending only after approval |
| Q3 | Bilingual treasurer report for the assembly | #407 | chatgpt | Aggregates only, via the Files pipeline |

---

## 7. Later waves (no issues yet)

**Wave 2: next candidates**
- **#5 Weekend school, split in two:**
  - (a) Education core: attendance, progress, bilingual parent messages.
  - (b) BuT billing, as a separate opt-in module: K3 data, no tutor or AI access, automatic purge.
- **A1 permission simulator + expiring delegations:** prerequisite for #22 departments and #6 board handover.
- **Single features:**
  - #6 board handover
  - #7 volunteer shift planning
  - #10 earmarked funds
  - #20 room booking
  - #25 QR lending station (client-side scanning only)
  - #23 offline kiosk (encrypted local cache, minimal manifest)
- **#21 migration assistant:** a pre-commit import transaction and a reconciliation report. It never promises rollback after accounting entries are posted.
- **Smaller ideas:**
  - #8 bylaws-as-code
  - #9 faith-calendar campaigns (no per-person religious tags)
  - #14 grant finder
  - #18 multilingual campaigns

**Wave 3: larger bets**
- **#22 Departments with own budgets:** needs a permissions RFC and adversarial cross-department tests first.
- **A3 synthetic process rehearsal**

---

## 8. Blocked or constrained

| Idea | Status | Condition |
|---|---|---|
| #12 Burial-assistance fund | **Blocked** | Specialist legal review under VAG first. If ever built: voluntary aid with no legal entitlement and no coverage calculation. K3 data, no AI. |
| #11 Festival / kermes cash | Constrained | Only a count protocol for the open cash drawer (offene Ladenkasse). It must never record itemised sales, so it cannot be classed as an electronic recording system needing a TSE (KassenSichV). |
| #13 Federation roll-up | Constrained | Own RFC; k=5 suppression alone is not enough (differential/overlapping queries). Fixed, versioned releases with preview and per-send opt-in. |

---

## 9. Task board

| Code | Issue | Owner | Depends on | Status at creation |
|---|---|---|---|---|
| RFC-002 help content + page context | #398 | claude | — | ready |
| RFC-003 portal surface + auth | #399 | claude | — | ready (after RFC-002/005) |
| RFC-004 secret ballot | #400 | claude | — | ready (low priority) |
| RFC-005 compliance rule format | #401 | claude | — | ready |
| F1a help backend | #412 | claude | #398 | blocked |
| F1b help drawer UI | #415 | gemini | #412, #355 | blocked |
| F2a egress ledger + presets | #402 | claude | — | ready |
| F2b privacy UI + contract tests | #413 | chatgpt | #402 | blocked |
| F3 readiness cockpit | #403 | chatgpt | — | ready |
| W1 compliance cockpit | #414 | claude | #401 | blocked |
| W4 §72a tracker | #404 | gemini | — | ready |
| Q1 audit room | #405 | claude | — | ready |
| Q2 SEPA coach | #406 | claude | — | ready |
| Q3 treasurer report | #407 | chatgpt | — | ready |
| SEC1 Dependabot + CodeQL docs | #408 | claude | — | ready |
| SEC2 authz matrix + IDOR | #409 | chatgpt | — | ready |
| AI v2 F01-F03 | #410 | claude | — | ready |
| FILE-0 inventory | #411 | gemini | — | ready |

The `ai-coordination` workflow moves blocked issues to ready when their dependencies (section `### Bağımlılıklar`) are closed. W2, W3 and W5 issues are opened after their RFCs are decided.

---

## 10. Definition of done (every package)

- [ ] One PR per issue into `alpha` (squash), `Closes #n`, test evidence, agent attribution keys
- [ ] `tsc`, `pnpm test`, `pnpm lint`, `pnpm module:validate`, i18n and hard-coded text checks green
- [ ] Module change: version bump, `releases.json` (TR/DE), `pnpm module:sync`, `pnpm docs:modules`
- [ ] UI: shared kit only, keyboard, mobile, light/dark, reduced motion, TR/DE
- [ ] New table or sensitive field: entry in `data-policy.ts`, owner approval for schema changes
- [ ] External flow: ledger entry (after F2), opt-in, audit
- [ ] Synthetic data only in tests and examples; no personal data in logs

## 11. Owner decisions still needed

1. Meta verification for WhatsApp (#362).
2. Who reviews tax/legal content for W1, W5, #9 and #12 (tax advisor / lawyer)?
3. Is the diaspora segment the primary beachhead or one of several (affects ordering in Wave 2)?
4. Does the CodeQL default-setup check become a required check (#408, ruleset change)?
5. Timing of the ADR 0001 phase ADRs (needed before W2 can ship as a separate public surface).
