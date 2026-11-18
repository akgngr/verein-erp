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

- Do not directly push to the three protected branches. Use PRs and pass the required CI checks.
- Require human approval before `beta -> main`; AI agents must not auto-merge production changes.
- PRs should target `alpha` unless they are branch promotion PRs.
- All PRs still run GitHub CI (Prisma migrations, generated files, i18n, typecheck, lint, tests, Next build and hydration checks). Vercel is not a required PR check.
- The `Branch promotion policy` CI job enforces allowed PR source/target combinations. GitHub rulesets must require that check; a workflow alone does not protect against direct pushes.
- `main` updates retain the existing GHCR Docker build/publish and Coolify deployment pathway.

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
Protect `alpha`, `beta`, and `main` with rulesets or branch protection:
- Require pull requests and passing checks for all three branches; block force-push and deletion.
- Require `Branch promotion policy` and `Quality gate` checks on PRs, plus other existing security/docs checks where applicable.
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
- [ ] Promotion guard rejects feature -> beta/main and alpha -> main
- [ ] GitHub rulesets protect all three branches and no Vercel status is required
- [ ] First release promotion tested end-to-end
