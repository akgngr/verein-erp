# ADR 0009 — Compliance rules as reviewed data (Gemeinnützigkeit cockpit)

Status: **accepted** (owner, 2026-11-23, Discussion #505)
Target: alpha · Implementation: #414 (W1) · Source: RFC-005 (#401, Discussion #505)

## Context
Volunteer boards endanger their tax-exempt status through missed deadlines and silent breaches. Examples: an expired Freistellungsbescheid, funds not used promptly, Übungsleiter or Ehrenamt allowances above the limit, an economic operation above the revenue threshold. The data exists in `organization`, `accounting`, `courses` and `donations`. The software must not give individual tax advice (StBerG §§ 2, 5; DECISION_LOG 2026-11-22).

## Decision
1. **New module `compliance`.** It has its own permissions, version and release notes, is optional, and reads other modules only through server contracts (`access`).
2. **Rules are data, not code.**
   - Rules are versioned JSON files (`src/modules/compliance/rules/<year>/*.json`), validated by a Zod schema in CI. The fields are listed in RFC-005 §2.
   - Thresholds are `params`, so a new tax year is a new rule **version**, not a code change.
   - Associations may disable a rule, with an audited reason. They may not edit rule content.
3. **Inputs only through metric providers.**
   - Providers are exported by the owning module and return aggregates. Per-person rules use member or teacher numbers, never names.
   - Each provider declares the permission needed to see its result.
   - Providers are pure reads with no external calls.
4. **Output = finding plus an optional draft task, never an action.**
   - A finding stores the rule version that produced it.
   - A rule that cannot be evaluated shows **grey "not checked"**, never green (fail closed).
5. **Wording (StBerG boundary).**
   - Every screen and export says "Interne Checkliste, keine Steuerberatung" / "İç kontrol listesi, vergi danışmanlığı değildir".
   - Findings state facts and the general rule, never an individual conclusion.
6. **Review.**
   - Only rules with `review.status = reviewed` run in production.
   - The **content reviewer is the association's tax advisor**, through a time-boxed, read-only `TAX_ADVISOR` role (#528). In `compliance`, that role's only write is marking a rule as reviewed.
   - Until that role exists, the owner signs off as interim reviewer.
   - Tax-year updates ship as one PR per year: new rule versions with `effective.from`, and the previous version gets `effective.to`.
7. **v1 rule list (approved):**
   - `gem.exemption-notice-expiry`
   - `gem.receipt-template-validity`
   - `gem.timely-use-of-funds`
   - `gem.uebungsleiter-allowance`
   - `gem.ehrenamt-allowance` (deferred to v1.1 if the payout tag is missing)
   - `gem.economic-operation-threshold`

   All amounts are set in review.

## Consequences
- #414 can start. Metric providers are added in the owning modules as small contract PRs: `accounting` and `finance` belong to the owner and Gemini; `courses`, `donations` and `organization` are read-only contracts.
- Rule content changes go through review and a release note, which keeps an audit trail.
- The tax advisor role (#528) also serves accounting reviews outside the cockpit.

## Not decided here
Land-specific rules, earmarked funds (#10), room rental spheres (#20), festival cash (#11) and AI explanations of findings. The AI part must reuse `PROFESSIONAL_ADVICE_INSTRUCTION`.
