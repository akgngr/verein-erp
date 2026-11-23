# Security Policy

## Supported branches

Verein ERP has no numbered release lines yet. Security fixes land on the branches below
(see `docs/development/BRANCH_RELEASE_WORKFLOW.md`):

| Branch | Role | Security fixes |
| --- | --- | --- |
| `main` | Production releases | :white_check_mark: |
| `beta` | Release candidate | :white_check_mark: (promoted to `main`) |
| `alpha` | Integration / development | :white_check_mark: (lands here first) |
| Other branches and forks | — | :x: |

Self-hosted installations should track `main`.

## Reporting a vulnerability

Please **do not** open a public issue, pull request or discussion for a suspected vulnerability.
That includes anything that exposes member or association data, credentials, or financial records.

- **Email:** hi@akgngr.com
- Include: affected branch/commit, the module or route, steps to reproduce, and impact.
  Use synthetic data only and never send real member data or secrets.
- We acknowledge reports within 48 hours and send a status update at least every 7 days
  until the issue is resolved or declined.
- Accepted reports are fixed on `alpha` first and promoted to `beta` and `main`. You will be credited
  in the release notes unless you ask us not to be.
- If a report is declined, we explain why (for example: out of scope, not reproducible, or intended behavior).

## Scope notes

- Personal data in logs, audit trails or exports, authorization bypasses (IDOR) and deletion or alteration
  of finalized financial records (GoBD) are treated as security issues.
- Findings in third-party dependencies should also be reported upstream; we track them via Dependabot.
