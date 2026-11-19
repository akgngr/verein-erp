# Verein ERP — Branch and release workflow

**Status:** active proposal, effective after the pipeline PR passes CI and is promoted to `main`.
**Owner:** repository maintainers · **Applies to:** human and AI contributors.

## Purpose
Develop features in small independent PRs without a Vercel Preview build for every PR. Integrate into `alpha`, stabilize one release candidate in `beta`, and deploy Vercel production only when `main` changes.

```text
feature/<topic> ---- PR + CI ----> alpha
                                   |
                         release candidate PR + CI
                                   v
                                  beta
                                   |
                       acceptance / E2E / manual approval
                                   v
                                  main ----> Vercel production
                                        `-> GHCR/Coolify (existing main workflow)
```

## Branch contract

| Branch | Source of PR | Purpose | Vercel Git deployment |
| --- | --- | --- | --- |
| `alpha` | feature branches / approved fix branches | Integration and iterative development | disabled |
| `beta` | `alpha` only | Release candidate and acceptance | disabled |
| `main` | `beta` only | Production-ready, reviewed releases | enabled |

- Vercel builds only `main`. `vercel.json` disables Git deployments for every branch (`"**": false`; a single `*` does not match branch names with `/` such as `claude/x` or `chatgpt/x`) and an `ignoreCommand` skips any build whose `VERCEL_GIT_COMMIT_REF` is not `main`. Branches created before this change still carry the old file until they merge the current base.
- Do not directly push to the three protected branches. Use PRs and pass the required CI checks.
- Require human approval before `beta -> main`; AI agents must not auto-merge production changes.
- PRs should target `alpha` unless they are branch promotion PRs.
- All PRs still run GitHub CI (Prisma migrations, generated files, i18n, typecheck, lint, tests, Next build and hydration checks). Vercel is not a required PR check.
- The `Promotion policy (<base>)` CI job (`scripts/check-promotion.mjs`) enforces the strict rules below. Each target branch requires its **own** check name, because GitHub matches required checks per commit SHA: with one shared name, a green `alpha -> beta` run let `alpha -> main` (#309) merge on the same commit.
- `main` updates retain the existing GHCR Docker build/publish and Coolify deployment pathway.

## Strict rules (enforced)

| Target | Allowed head | Merge method | Required checks | Extra |
| --- | --- | --- | --- | --- |
| `alpha` | `claude/ chatgpt/ codex/ agent/ feature/ fix/ hotfix/ docs/ chore/ ci/ test/ refactor/ deps/ dependabot/ sync/` | squash only | `Quality gate`, `Promotion policy (alpha)` | branch must be up to date with `alpha` |
| `beta` | `alpha` only | merge commit only | `Quality gate`, `Promotion policy (beta)` | `beta` must not contain content missing from `alpha` |
| `main` | `beta` only | merge commit only | `Quality gate`, `Promotion policy (main)`, `Secret scan (gitleaks)`, `Dependency audit` | `main` must not contain content missing from `beta`; explicit product-owner approval |

- Fork PRs are rejected for all three branches.
- `main`, `beta` and `alpha` can never be the head of a PR into `alpha` (no back-merges; drift is caught by the content check instead).
- Direct pushes, force pushes and deletion are blocked by rulesets for everyone (no bypass actors).
- Merge methods are fixed per branch: squash keeps `alpha` history one commit per task; merge commits keep `beta`/`main` traceable to the promoted `alpha`/`beta` commit.
- A required approval is not configured because the single maintainer account authors the PRs (GitHub forbids self-approval); the `beta -> main` human approval is recorded in the promotion PR conversation instead.

## Release train
1. Merge small task PRs into `alpha` once the quality gate passes.
2. When a coherent module/package is complete, open a PR from `alpha` to `beta`.
3. Verify build, migrations, feature behavior, accessibility, regression tests and staging/smoke; record the acceptance evidence in the promotion PR.
4. Fix issues on a feature branch targeting `alpha`, then refresh the `alpha -> beta` promotion; avoid beta-only changes or merge drift.
5. After manual approval and successful CI, open `beta -> main` and merge. Production deployment runs for `main`.
6. Keep `alpha` and `beta` synced after releases; never promote an old beta snapshot over newer production fixes.

## Hotfix / rollback
A critical production fix starts from the current `main` commit. Apply via a narrowly scoped fix PR into `alpha`, promote to `beta`, validate, then promote to `main`. If release-train changes in `alpha` must not ship, coordinate an explicit exceptional emergency process with a human administrator and documented audit rather than silently bypassing branch rules. Use Vercel/Coolify rollback mechanisms for urgent recovery; data migrations require a separate rollback/forward-fix plan.

## GitHub repository settings (administrator action)
The exact rulesets live in `.github/rulesets/{alpha,beta,main}.json`. Apply them in **Settings → Rules → Rulesets → New ruleset → Import a ruleset** — applied on 2026-11-19 (Alpha / Beta / Production Branch Protection); the legacy shared "Branch promotion policy" check was removed.

Protect `alpha`, `beta`, and `main` with rulesets or branch protection:
- Require pull requests and passing checks for all three branches; block force-push and deletion.
- Require `Promotion policy (<branch>)` and `Quality gate` checks on PRs, plus other existing security/docs checks where applicable.
- Require at least one human approval and disable bypass/auto-merge for `main`. Consider a CODEOWNERS rule for release ownership.
- Remove Vercel Preview/Deployment checks from **required checks**; GitHub CI must remain required.
- Set Vercel Production Branch to `main` under Project Settings → Git.
- Note that Vercel settings cannot be changed by this GitHub code PR; verify the live project after promotion.

## Existing PR migration
Do not retarget existing PRs blindly; inspect their base, merge conflicts, release/version checks, and dependencies. Open/retarget approved feature PRs to `alpha` when appropriate. The initial infrastructure PR itself targets `alpha` to avoid bypassing the new policy.

## Prisma and modules
- Respect `module.config.ts`, `releases.json`, `module:sync`, and generated output expectations on each feature PR.
- Prefer expand-and-contract migrations for release compatibility. A successful beta migration is not, on its own, proof of production safety. Backups and migration review are required.

## Acceptance checklist
- [ ] `alpha` and `beta` exist from current `main`
- [ ] Vercel Git deployment disabled for all branches except `main`
- [ ] Branch CI runs for PRs and pushes to `alpha`, `beta`, `main`
- [x] Promotion guard rejects feature -> beta/main and alpha -> main (per-target check names)
- [ ] GitHub rulesets protect all three branches and no Vercel status is required
- [ ] First release promotion tested end-to-end
