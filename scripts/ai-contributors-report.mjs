#!/usr/bin/env node
// Read-only GitHub AI contributor activity report. No third-party dependencies.
import { appendFile, writeFile } from "node:fs/promises";

const repo = process.env.GITHUB_REPOSITORY || "akgngr/verein-erp";
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
  console.error("Invalid GITHUB_REPOSITORY");
  process.exit(1);
}
if (!token) {
  console.error("Set GITHUB_TOKEN or GH_TOKEN (read-only repository access)");
  process.exit(1);
}
const api = "https://api.github.com";
const headers = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "verein-erp-ai-contributors",
};
async function get(path) {
  const response = await fetch(api + path, { headers });
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${path}`);
  return response.json();
}
async function pages(path, maxPages = 5) {
  const out = [];
  for (let page = 1; page <= maxPages; page++) {
    const separator = path.includes("?") ? "&" : "?";
    const chunk = await get(`${path}${separator}per_page=100&page=${page}`);
    out.push(...chunk);
    if (chunk.length < 100) break;
  }
  return out;
}
function tokenValue(body, key) {
  const match = String(body || "").match(new RegExp(`^${key}:[ \\t]*([^\\r\\n]*)`, "im"));
  return match?.[1]?.trim().toLowerCase() || "";
}
function normalizeId(value) {
  return /^[a-z][a-z0-9_-]{0,39}$/.test(value) && value !== "none" ? value : null;
}
function safeCell(value) {
  return String(value ?? "").replace(/[|\r\n]/g, " ").replace(/</g, "&lt;").slice(0, 120);
}
const prs = await pages(`/repos/${repo}/pulls?state=all&sort=updated&direction=desc`);
const issues = (await pages(`/repos/${repo}/issues?state=all&sort=updated&direction=desc`))
  .filter(issue => !issue.pull_request);
const agents = new Map();
function agent(id) {
  if (!agents.has(id)) agents.set(id, { merged: 0, open: 0, closed: 0, openIssues: 0, closedIssues: 0, prs: [] });
  return agents.get(id);
}
let unattributed = 0;
for (const pr of prs) {
  const id = normalizeId(tokenValue(pr.body, "Agent-Primary"));
  if (!id) { unattributed++; continue; }
  const stats = agent(id);
  if (pr.merged_at) stats.merged++;
  else if (pr.state === "open") stats.open++;
  else stats.closed++;
  stats.prs.push(pr);
}
for (const issue of issues) {
  const ids = [...new Set((issue.labels || []).map(label => typeof label === "string" ? label : label.name)
    .filter(label => /^agent:[a-z][a-z0-9_-]*$/i.test(label || ""))
    .map(label => label.slice(6).toLowerCase()))];
  for (const id of ids) {
    if (issue.state === "open") agent(id).openIssues++;
    else agent(id).closedIssues++;
  }
}
const lines = [
  "# Verein ERP — AI Contributors",
  "",
  `Generated: ${new Date().toISOString()} · Repository: ${repo}`,
  "",
  "> Self-declared attribution, not GitHub account authorship. Data covers the latest 500 updated PRs/issues at most; older history may be excluded.",
  "",
  "| Primary agent | Merged PRs | Open PRs | Closed, unmerged | Open assigned issues | Closed assigned issues |",
  "| --- | ---: | ---: | ---: | ---: | ---: |",
];
for (const [id, stats] of [...agents].sort((a,b) => a[0].localeCompare(b[0]))) {
  lines.push(`| ${safeCell(id)} | ${stats.merged} | ${stats.open} | ${stats.closed} | ${stats.openIssues} | ${stats.closedIssues} |`);
}
if (!agents.size) lines.push("| _No declared attribution yet_ | 0 | 0 | 0 | 0 | 0 |");
lines.push("", `Unattributed PRs in sample: **${unattributed}** / ${prs.length}.`, "",
  "## Open attributed PRs (latest check-run snapshot)", "",
  "| PR | Primary agent | CI check runs |",
  "| --- | --- | --- |");
let open = 0;
for (const [id, stats] of agents) {
  for (const pr of stats.prs.filter(item => item.state === "open").slice(0, 20)) {
    open++;
    let status = "unavailable";
    try {
      const data = await get(`/repos/${repo}/commits/${pr.head.sha}/check-runs?per_page=100`);
      const runs = (data.check_runs || []).filter(run => !["skipped", "neutral"].includes(run.conclusion));
      if (!runs.length) status = "no reported checks";
      else if (runs.some(run => ["failure", "cancelled", "timed_out", "action_required"].includes(run.conclusion))) status = "failed";
      else if (runs.some(run => run.status !== "completed")) status = "pending";
      else if (runs.every(run => run.conclusion === "success")) status = "passed";
      else status = "mixed / unknown";
    } catch { status = "unavailable"; }
    lines.push(`| [#${pr.number}](${pr.html_url}) ${safeCell(pr.title)} | ${safeCell(id)} | ${status} |`);
  }
}
if (!open) lines.push("| _None_ | — | — |");
lines.push("", "_Check snapshots are informational, not GitHub branch-protection decisions. Historical CI success percentages are intentionally not inferred._", "");
const markdown = lines.join("\n");
console.log(markdown);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown + "\n");
if (process.env.REPORT_OUTPUT) await writeFile(process.env.REPORT_OUTPUT, markdown + "\n");
