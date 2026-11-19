# AI Contributors — attribution and reporting standard

Status: v1 pilot (non-invasive, GitHub-native). Applies to all human and AI agents contributing to Verein ERP.

## Principles

1. GitHub commit `author` / `committer` belongs to the authenticated GitHub identity. **Never spoof a separate AI GitHub account** and never rewrite history to inflate contributions.
2. Agent attribution is transparent **metadata** on pull requests and issues. Agent participation does not mean independent GitHub authorship.
3. Every implementation PR targets `alpha` first, except branch promotion (`alpha → beta → main`).
4. The dashboard reports **declared**, not inferred, agent work. Unattributed PRs are not assigned arbitrarily; collaborative PRs can list multiple agents.
5. No secrets, model prompts containing credentials, client/private information or raw production data in public PR metadata.
6. PR code ownership, merge approval and security controls remain with human maintainers.

## Pull-request metadata

Use the repository PR template. Put an **Attribution** block in the PR body:

```text
Agent-Primary: chatgpt
Agent-Collaborators: claude, codex
Agent-Role: ui-platform
Agent-Task: #258
```

Use `Agent-Primary: human` for primarily human-authored work; `Agent-Primary: none` if unassigned. The primary value is one stable lowercase ID (e.g. `chatgpt`, `claude`, `codex`, `gemini`, `human`, `none`). Collaborators are optional and comma-separated. Prefer one primary agent per PR; collaborators are acknowledged but not double-counted in PR totals. `Agent-Task` should point to a tracked issue when possible.

Issue labels `agent:chatgpt`, `agent:claude`, etc. identify responsibility, **not verified code authorship**. The dashboard counts labeled issues separately from PR attribution. Historical PRs without this block remain unattributed; no guessed backfill.

Optional Git trailers (not used as sole source for dashboard):

```text
Assisted-by: ChatGPT
Agent-Role: UI Platform
```

These trailers are descriptive only and do not create a GitHub Contributor account or change commit authorship.

## Workflow

- Brainstorm in Discussions; record approved design decisions in ADR documents.
- Track deliverables with Issues, including `agent:*` labels.
- Implement through small PRs with the attribution block and explicit linked issues.
- GitHub CI remains authoritative; agents cannot self-authorize main production merges.
- Reassigning a task requires changing issue labels and documenting hand-off.
- Keep attribution accurate when a human substantially rewrites the work.

## Reporting

`.github/workflows/ai-contributors.yml` runs weekly and on demand. It executes `scripts/ai-contributors-report.mjs` with read-only GitHub permissions and publishes a Markdown dashboard in **Actions job summary** and an artifact; it **does not commit to the repo** or change Issues/PRs.

The report displays the most recently updated PRs (up to 500), grouped by their declared primary agent, with counts of merged/open/closed PRs, labeled open/closed issues, and current open PR check-run outcomes. PR checks are advisory snapshots; not a historical success rate. Agent metadata is untrusted user-provided attribution and must not be treated as an authorization signal.

To reproduce locally: `GITHUB_TOKEN=<read-only-token> GITHUB_REPOSITORY=akgngr/verein-erp node scripts/ai-contributors-report.mjs`. Optionally set `GITHUB_STEP_SUMMARY` / `REPORT_OUTPUT`.

## Future improvements

- Store agent registry/roles in a reviewed config file.
- Provide optional historical audit and duplicate task detection.
- Consider dashboard UI after report accuracy and privacy requirements are validated.
