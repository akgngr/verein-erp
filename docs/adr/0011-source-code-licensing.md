# ADR 0011 — Source-code licensing: AGPL-3.0-only core + commercial dual-licensing

Status: **proposed** (tri-agent consensus: Gemini, Claude, ChatGPT — 2026-11-26; pending product-owner approval and German IT-Recht legal review before publishing `LICENSE` / CLA)
Target: alpha · Related: [ADR 0001](./0001-isolated-deployment-per-customer.md), [ADR 0008](./0008-licensing.md), [ADR 0010](./0010-member-portal.md), [PRODUCT_PHILOSOPHY_AND_LICENSING_DECISION.md](../ideas/PRODUCT_PHILOSOPHY_AND_LICENSING_DECISION.md), [DEVSECOPS_TIERED_POLICY.md](../security/DEVSECOPS_TIERED_POLICY.md), `erp-cloud` RFC-001

## Context

- `akgngr/verein-erp` is a **public** GitHub repository without a root `LICENSE` file (legally *All Rights Reserved* until a license is explicitly published).
- **Commercial and deployment model (`ADR 0001`):** One codebase serves both Managed Cloud (SaaS: Community / Business / Enterprise) and Self-Host with equal priority.
- **Enterprise feature licensing (`ADR 0008`):** Signed `vlic-1` licenses (Ed25519, bound to domain + organisation) gate paid modules (such as `help-center`) distributed from private repositories as `.vmod` packages.
- **Static module bundling (`scripts/module-install.ts`):** `pnpm module:install <pkg.vmod>` unpacks `.vmod` source files directly into `src/modules/<key>/`, runs `pnpm module:sync`, and compiles everything into a **single Next.js standalone bundle** (`pnpm build`). First-party Enterprise modules and future third-party modules therefore do not merely share a process — they form a single statically compiled program with the core.
- **Control Plane core sharing (`erp-cloud` RFC-001):** The private `akgngr/erp-cloud` control plane reuses `verein-erp`'s `src/shared/*` platform and core modules (`auth`, `users`, `system`, `audit`, `automation`, etc.).
- **Target market & product philosophy:** German/EU associations (*eingetragene Vereine*), foundations, and SMEs value OSI-approved open source, DSGVO verifiability, and transparent Community vs. Commercial boundaries (`PRODUCT_PHILOSOPHY_AND_LICENSING_DECISION.md`).

## Decision

Adopt a **layered Open-Core + Dual-License** model across repositories and distribution tiers:

| Component / Artifact | Visibility | License | `package.json` → `license` |
| :--- | :--- | :--- | :--- |
| **`verein-erp`** (public core + Community modules) | Public | **`AGPL-3.0-only`** *(+ commercial dual-license option)* | `"AGPL-3.0-only"` |
| **Enterprise / Business+ modules** (`.vmod`, `vlic-1`) | Private | **Proprietary Commercial EULA** *(includes commercial license for core)* | `"SEE LICENSE IN LICENSE"` |
| **`erp-cloud`** (Control Plane & Provisioner) | Private | **Proprietary / All Rights Reserved** | `"UNLICENSED"` |
| **Documentation prose** (`website/`, optional) | Public | **`CC-BY-4.0`** *(decided separately from code)* | — |
| **Brand / Name** ("Verein ERP") | Public policy | **`TRADEMARKS.md`** + DPMA / EUIPO trademark filing | — |

### Binding rules

1. **Public repository under `AGPL-3.0-only` (not `-or-later`):**
   - `verein-erp` is licensed under **GNU Affero General Public License v3.0 only** (`SPDX-License-Identifier: AGPL-3.0-only`).
   - Using `-only` keeps future license-upgrade authority with the product owner (backed by the CLA) rather than delegating it to the FSF.
   - **Scope clarity:** `AGPL-3.0-only` requires publishing source code when *modified* versions are operated over a network (§13). It does **not** forbid a third party from hosting an *unmodified* copy as a managed service. Protection against unmodified hosting clones comes from `erp-cloud` automation, private Enterprise `.vmod` modules, support/SLA, and trademarks.
   - Self-hosted associations running unmodified `verein-erp` incur zero practical compliance overhead.

2. **Commercial dual-licensing and combined `.vmod` builds:**
   - Because `pnpm module:install` compiles `.vmod` packages together with `verein-erp` core into a single Next.js standalone bundle, a self-hosted Enterprise instance combining AGPL core with a proprietary `.vmod` would face a license conflict if the customer held only an AGPL-3.0 license to the core.
   - Therefore, every commercial `vlic-1` / Enterprise EULA **must explicitly grant a commercial (non-AGPL) license to `verein-erp` core** for the licensed domain and organisation alongside the private Enterprise `.vmod` modules.
   - The product owner retains the right to offer standalone commercial / OEM / white-label licenses to `verein-erp` core.

3. **German-law-compliant CLA (§29 / §31 UrhG) mandatory before external PRs:**
   - Under German copyright law (§29 UrhG), copyright itself is non-transferable (*unübertragbar*); US-style "copyright assignment" CLAs are legally ineffective in Germany.
   - Before merging any external contribution into `verein-erp`, contributors must sign a German-law-compliant CLA granting the product owner a worldwide, irrevocable, transferable, sublicensable usage right (*einfaches, unwiderrufliches, räumlich und zeitlich unbeschränktes, übertragbares und unterlizenzierbares Nutzungsrecht* under §31 UrhG) explicitly covering:
     1. commercial dual-licensing of `verein-erp` core,
     2. bundling with proprietary Enterprise `.vmod` modules, and
     3. reuse of `verein-erp` core inside the private `erp-cloud` control plane (`RFC-001` Pillar 1).
   - A Developer Certificate of Origin (DCO) alone is **not** sufficient.

4. **Public-repo `hasLicensedFeature` gates (explicit boundary):**
   - Under `AGPL-3.0-only` (§7), prohibiting users from removing a license check inside AGPL-licensed source code is legally unenforceable.
   - **Rule:** Any Enterprise/Business+ feature whose implementation must remain commercially protected **must** live in a private `.vmod` repository (as specified in `ADR 0008` for `help-center`), not in the public `verein-erp` repo.
   - **Open pre-publication decision (`member-portal`):** Currently `src/modules/member-portal/services/rights.ts` gates `listPortalBusinessFeatures` and `registerPortalEvent` behind `hasPortalBusinessLicense()` (`member-portal:business` / `business`) while keeping the implementation in the public repo. Before publishing `LICENSE`, the product owner must choose one of:
     - **Option A:** Keep the public gate explicitly as a *managed-SaaS / default-tier toggle* (accepting that self-hosters may legally patch it out under AGPL-3.0), or
     - **Option B:** Move the `member-portal` Business+ code into a private `.vmod` package.

5. **Third-party marketplace modules (no AGPL §7 exception in v1):**
   - No AGPL §7 "additional permission" (module linking exception) is added in v1. Under AGPL §7, adding an exception later is straightforward, whereas revoking a granted exception is irreversible for published versions.
   - Third-party modules distributed with AGPL core must be AGPL-3.0-compatible by default. If a closed-source third-party marketplace ecosystem is pursued later, it will be enabled via partner licensing or out-of-process/IPC isolation.

6. **Inbound dependency policy (`scripts/check-licenses.mjs`):**
   - Because `verein-erp` must remain commercially dual-licensable (for Enterprise EULAs and `erp-cloud`), third-party production runtime dependencies **must remain permissive or compatible weak-copyleft only**.
   - `scripts/check-licenses.mjs` (enforced in `.github/workflows/security-release-gate.yml`) continues to block strong copyleft / source-available licenses (`GPL-*`, `AGPL-*`, `SSPL-*`, `BUSL-*`, `CPAL-*`, `EUPL-*`, `WTFPL`, `Unknown`) unless satisfied by a permissive `OR` branch or an explicitly reviewed exception.
   - `EPL-2.0` (without a GPL/AGPL Secondary License notice) is incompatible with `AGPL-3.0-only` if linked into the application bundle; it must never be introduced into the `verein-erp` runtime bundle.

## Options Considered and Rejected

| Alternative | Why rejected as primary license |
| :--- | :--- |
| **`FSL-1.1-ALv2`** (Functional Source License, 2-year conversion to `Apache-2.0`) | Strongest anti-competitor SaaS restriction and zero copyleft friction, but **not OSI-approved Open Source**. Weakens trust and public-grant eligibility in the German association (*Verein*) and public-interest sector. Kept as documented fallback only if unmodified-SaaS cloning becomes a decisive concern prior to `AGPL-3.0-only` publication. |
| **`LGPL-3.0-only`** (Odoo Community model) | Allows closed third-party plugins cleanly, but **lacks network copyleft (§13)** — competitors can modify the ERP and operate closed SaaS without contributing back. |
| **`EUPL-1.2`** | Official German text and EU public-sector familiarity, but its Appendix compatibility clause allows downstream relicensing under `GPL-2.0` (which has no network copyleft clause), leaving a SaaS loophole. Worth re-evaluating only if EU public-sector tenders become the primary channel. |
| **`Apache-2.0` / `MIT`** | Lowest friction and maximum adoption, but offers zero copyleft protection against modified closed-source SaaS forks. |

## Dependency License Audit Snapshot (2026-11-26)

Verified against `pnpm-lock.yaml` via `node scripts/check-licenses.mjs` and `pnpm licenses list --json` (**754 production packages / 923 total packages**):

- **CI policy gate:** `node scripts/check-licenses.mjs` → **PASSED** (`754 production packages verified`).
- **Strong copyleft / SSPL / BUSL in production:** **0** pure packages.
- **Production license breakdown (754 packages):**
  - Permissive (`MIT`: 592, `Apache-2.0`: 65, `ISC`: 52, `BSD-3-Clause`: 14, `BSD-2-Clause`: 11, `Unlicense`: 4, `Apache-2.0 AND MIT`: 1, `MIT and ISC`: 1, `MIT/X11`: 1, `BSD`: 1, `BlueOak-1.0.0`: 1, `MIT-0`: 1, `MIT AND Zlib`: 1, `0BSD`: 1, `MIT OR CC0-1.0`: 1): **747 packages**.
  - Dual-licensed with permissive `OR` branch (**2 packages** — `MIT` elected):
    - `jszip@3.10.2` (`(MIT OR GPL-3.0-or-later)`)
    - `@zone-eu/mailsplit@5.4.31` (`(MIT OR EUPL-1.1+)`)
  - Reviewed `Unknown` metadata exception (**1 package**):
    - `buffers@0.1.1` (upstream `substack/node-buffers` declares `MIT/X11`; documented in `scripts/check-licenses.mjs`).
  - Data / attribution (**1 package**):
    - `caniuse-lite@1.0.30001826` (`CC-BY-4.0`, browser support dataset; attribution notice preserved).
  - Weak-copyleft / special review (**3 production packages**):
    1. **`web-push@4.0.0`** (`MPL-2.0`, direct dependency of `notifications`): Standard MPL-2.0 without an "Incompatible with Secondary Licenses" notice. Compatible with **both** `AGPL-3.0-only` (via MPL-2.0 §3.3 Larger Work) and commercial/proprietary builds (file-level copyleft; `web-push` files remain unmodified).
    2. **`@img/sharp-libvips-linux-x64@1.3.4`** (`LGPL-3.0-or-later`, transitive optional native lib via `sharp`): Dynamically linked native shared library; compatible with both `AGPL-3.0-only` and commercial builds provided LGPL-3.0 notices and relinking capability (dynamic linking) are preserved in container images.
    3. **`elkjs@0.11.1`** (`EPL-2.0` without Secondary License): Pulled in transitively **only** via `prisma@7.10.1` → `@prisma/studio-core@0.33.0` (peer dependency of `@prisma/client`). **Not imported or bundled** into `.next/standalone` or the `verein-erp` runtime; in `Dockerfile`, `prisma` CLI resides in `/app/migrate/` and runs as a separate pre-start CLI process (`prisma migrate deploy`), which is mere aggregation under AGPL-3.0 §5. Still flagged for legal verification and to ensure `@prisma/studio-core` / `elkjs` never enters the application bundle.
- **Additional dev-only weak-copyleft packages (never shipped at runtime):** `axe-core@4.14.1`, `lightningcss@1.33.0`, `lightningcss-linux-x64-gnu@1.33.0` (`MPL-2.0`), plus 1 `Python-2.0` build tool dependency.

## Consequences

### Positive
- Establishes an OSI-approved, German-market-credible open-source foundation while keeping `erp-cloud` and Enterprise `.vmod` modules legally protected.
- Prevents accidental lock-out of `erp-cloud` or Enterprise dual-licensing by making the German §31 UrhG CLA a hard prerequisite before external contributions.
- Directly addresses the static-bundling reality of `scripts/module-install.ts` in the commercial EULA design.

### Trade-offs & Legal Prerequisites
- Requires paid legal review (*Fachanwalt für IT-Recht*) of the German §31 UrhG CLA, the Enterprise Commercial EULA (covering core + `.vmod`), and `TRADEMARKS.md` before `LICENSE` is committed.
- `AGPL-3.0-only` does not block unmodified managed-hosting clones; product velocity, `erp-cloud` operational quality, Enterprise modules, and trademarks carry that defense.
- `verein-erp` remains legally *All Rights Reserved* until the rollout checklist below is completed and `LICENSE` is added.

## Rollout Checklist (before committing `LICENSE`)

- [ ] Product owner approves `AGPL-3.0-only` direction and resolves the `member-portal` Business+ gate decision (Option A vs. Option B above).
- [ ] *Fachanwalt für IT-Recht* reviews and signs off on:
  - [ ] §31 UrhG-compliant CLA (covering commercial dual-licensing, `.vmod` bundling, and `erp-cloud` core reuse),
  - [ ] Enterprise Commercial EULA (`vlic-1`, explicitly granting commercial core rights alongside `.vmod` packages),
  - [ ] `TRADEMARKS.md` and `elkjs` (`/app/migrate/` separate-process isolation) / `sharp-libvips` LGPL notice compliance.
- [ ] Enable automated CLA gate (e.g., CLA Assistant) on `akgngr/verein-erp` prior to accepting external PRs.
- [ ] Add root `LICENSE` (full GNU AGPL-3.0 text), `TRADEMARKS.md`, `CONTRIBUTING.md`, set `"license": "AGPL-3.0-only"` in `package.json`, add `SPDX-License-Identifier: AGPL-3.0-only` headers, and update `README.md` + `docs/ideas/PRODUCT_PHILOSOPHY_AND_LICENSING_DECISION.md`.
- [ ] Log accepted decision in `docs/ai-coordination/DECISION_LOG.md`.
