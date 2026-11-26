# Tiered DevSecOps & Supply-Chain Policy

This document records the repository's layered security scanning policy and the Product Owner's decision on **#614** (implemented in **#621**).

## 1. Decision Summary (#614 -> #621)

After independent reviews by `agent:claude` and `agent:gemini`, the Product Owner elected to **defer third-party AppSec SaaS adoption (Aikido Security)** in favor of a **zero-egress, zero-lock-in OSS DevSecOps stack** integrated directly into GitHub Actions:

- **Zero source-code egress** to external SaaS processors or third-party AI triage endpoints.
- **Zero per-seat SaaS cost** while covering the actual remaining gaps (container image CVEs, OSS license compliance, CycloneDX SBOM artifacts, and `pnpm` supply-chain hardening).
- **Tiered execution** aligned with the `feature/* -> alpha -> beta -> main` branch contract (`docs/development/BRANCH_RELEASE_WORKFLOW.md`).

## 2. Tiered Security Gate Matrix

| Trigger / Branch | Workflow | Checks Executed | Purpose |
| :--- | :--- | :--- | :--- |
| **`feature/* -> alpha` PRs** | `ci.yml`, `security.yml`, CodeQL | `Quality gate`, `Promotion policy (alpha)`, `Secret scan (gitleaks)`, `Dependency audit` (`pnpm audit --prod`), `CodeQL` | Fast feedback (~1–2 min security overhead, parallel with Quality gate); **zero Docker/SBOM/license overhead** on daily feature PRs. |
| **`alpha -> beta` PR & `beta` push** *(Release Candidate)* | `security-release-gate.yml` (+ above) | **Trivy filesystem SCA + license SARIF**, **Production OSS license gate** (`scripts/check-licenses.mjs`), **CycloneDX SBOM** (repo + web image), **Trivy Docker image scan** (`Dockerfile` `runner` target) | Full supply-chain and container verification once changes are integrated in `alpha`, before acceptance testing. |
| **`beta -> main` PR & `main` push** *(Production)* | `security-release-gate.yml` + `ci.yml` + `security.yml` | All checks above + production GHCR Docker publish + 90-day CycloneDX SBOM artifact retention | Verifies the exact promoted commit and retains audit / EU CRA SBOM evidence. |
| **Weekly schedule (`cron`)** | `security.yml` + `security-release-gate.yml` | Full `gitleaks`, `pnpm audit`, Trivy FS/image scans, license check, CycloneDX SBOM | Detects newly disclosed CVEs even when repository code has not changed. |

## 3. CI Action Pinning Policy

Following supply-chain compromises against mutable GitHub Action version tags (e.g., `CVE-2026-33634`), third-party security scanner actions in `security-release-gate.yml` (`aquasecurity/trivy-action`, `github/codeql-action/upload-sarif`) **must be pinned to full 40-character immutable commit SHAs** with the release version documented as an inline comment, and explicit scanner binary versions pinned (e.g. `version: v0.76.2`).

## 4. `pnpm` Supply-Chain Hardening (`pnpm-workspace.yaml`)

- **`allowBuilds` & `onlyBuiltDependencies`**: Lifecycle install scripts (`preinstall`/`install`/`postinstall`) are blocked by default for all packages outside the explicit reviewed allowlist.
- **`minimumReleaseAge: 1440`**: Enforces a 24-hour cooldown window before newly published npm package versions can be resolved, mitigating rapid account-takeover / malicious release waves.
- **`blockExoticSubdeps: true`**: Prevents transitive dependencies from resolving via arbitrary git URLs or direct tarball URLs outside the npm registry.

## 5. Exception Lifecycle (Mandatory Expiry)

Temporary vulnerability or license exceptions must **never** be permanent or silent:

1. **Vulnerability exceptions:** Must be recorded in `docs/security/DEPENDENCY_AUDIT_EXCEPTIONS.md`, enforced with a hard expiry date in `.github/workflows/security.yml` (`pnpm audit`), and mirrored with an ISO `expired_at` date in `.trivyignore.yaml`.
2. **License exceptions:** Production runtime dependencies are checked by `scripts/check-licenses.mjs` (SPDX `OR`/`AND` aware; blocks pure strong-copyleft licenses such as `GPL-*`, `AGPL-*`, `SSPL-*`, `BUSL-*`, `EUPL-*` unless a permissive `OR` branch applies). Every exception in `REVIEWED_PACKAGE_EXCEPTIONS` requires a documented rationale and, when temporary, an `expiresAt` date.

## 6. Optional Future Phases (Post-Pilot)

- **Phase 2 (Centralized Self-Hosted Dashboard):** Deploy [SecObserve](https://github.com/SecObserve/SecObserve) (BSD-3, German-maintained, lightweight vulnerability + license + SBOM hub) on an isolated German VPS (e.g., Hetzner DE, 4 vCPU / 8 GB RAM, completely separate from production customer databases) and ingest the `beta`/`main` SARIF and CycloneDX outputs.
- **Phase 3 (Pre-Major-Release DAST / AI Audit):** Run staging-only dynamic testing against synthetic seed data (e.g., OWASP ZAP or self-hosted PentAGI) ahead of major `beta -> main` releases. Never run DAST or third-party AI scanners against production instances or real association data.
