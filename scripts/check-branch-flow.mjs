// Pull request branch promotion policy. Kept dependency-free for GitHub Actions.
const event = process.env.GITHUB_EVENT_NAME ?? "";
if (event !== "pull_request") {
  console.log("[branch-flow] Non-PR event; no promotion rule to check.");
  process.exit(0);
}
const base = process.env.GITHUB_BASE_REF;
const head = process.env.GITHUB_HEAD_REF;
if (!base || !head) {
  console.error("[branch-flow] Missing GITHUB_BASE_REF or GITHUB_HEAD_REF.");
  process.exit(1);
}
const allowed = base === "main"
  ? head === "beta"
  : base === "beta"
    ? head === "alpha"
    : base === "alpha"
      ? head !== "main" && head !== "beta" && head !== "alpha"
      : true; // Other targets are not production promotion branches.
if (!allowed) {
  console.error(`[branch-flow] Invalid PR promotion: ${head} -> ${base}.`);
  console.error("[branch-flow] Use feature/* -> alpha -> beta -> main. Hotfixes also go through promotion.");
  process.exit(1);
}
console.log(`[branch-flow] Allowed PR: ${head} -> ${base}.`);
