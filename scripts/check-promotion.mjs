// Strict branch promotion policy (feature → alpha → beta → main). Dependency-free for GitHub Actions.
// The CI job is named "Promotion policy (<base>)" so a green run for one target can never satisfy
// the required check of another target on the same commit (e.g. alpha→beta must not unlock alpha→main).
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

/** Allowed feature branch prefixes for PRs into alpha. */
export const FEATURE_PREFIXES = ["claude/", "chatgpt/", "codex/", "gemini/", "agent/", "feature/", "fix/", "hotfix/", "docs/", "chore/", "ci/", "test/", "refactor/", "deps/", "dependabot/", "sync/"];

/**
 * Pure decision; `extraOnBase` = files changed on the base since the merge base (content the source lacks).
 * @param {{ base?: string, head?: string, headRepo?: string, baseRepo?: string, extraOnBase?: string[], otherOpenBases?: string[] }} input
 * @returns {string[]}
 */
export function evaluatePromotion({ base, head, headRepo, baseRepo, extraOnBase = [], otherOpenBases = [] }) {
  /** @type {string[]} */
  const errors = [];
  if (!base || !head) return ["missing base or head ref"];
  if (headRepo && baseRepo && headRepo !== baseRepo) errors.push(`PRs from forks cannot target ${base} (${headRepo})`);
  if (base === "alpha") {
    if (["main", "beta", "alpha"].includes(head)) errors.push(`${head} -> alpha is not allowed (alpha is fed by feature branches only)`);
    else if (!FEATURE_PREFIXES.some((prefix) => head.startsWith(prefix))) {
      errors.push(`feature branch "${head}" must start with one of: ${FEATURE_PREFIXES.join(" ")}`);
    }
  } else if (base === "beta") {
    if (head !== "alpha") errors.push(`only alpha -> beta is allowed (got ${head} -> beta)`);
  } else if (base === "main") {
    if (head !== "beta") errors.push(`only beta -> main is allowed (got ${head} -> main)`);
  }
  // Bir dal = tek açık PR. Aynı başlığın başka hedefe açık PR'ı, aynı commit üzerindeki zorunlu kontrolü gölgeler.
  if (otherOpenBases.length > 0) {
    errors.push(`branch "${head}" also has an open PR into ${[...new Set(otherOpenBases)].join(", ")}; one branch may have only one open PR. Close the extra PR.`);
  }
  if ((base === "beta" || base === "main") && extraOnBase.length > 0) {
    errors.push(
      `${base} has changes that ${head} does not contain (direct change or skipped promotion): ` +
        extraOnBase.slice(0, 10).join(", ") + (extraOnBase.length > 10 ? ` … +${extraOnBase.length - 10}` : "") +
        `. Bring them into ${base === "main" ? "beta (via alpha)" : "alpha"} first.`,
    );
  }
  return errors;
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

/** Files that differ between the merge base and the base tip (content only; merge commits alone produce none). */
function extraContentOnBase(base, head) {
  git(["fetch", "--no-tags", "--quiet", "origin", `+refs/heads/${base}:refs/remotes/origin/${base}`, `+refs/heads/${head}:refs/remotes/origin/${head}`]);
  const mergeBase = git(["merge-base", `origin/${base}`, `origin/${head}`]);
  const out = git(["diff", "--name-only", mergeBase, `origin/${base}`]);
  return out ? out.split("\n") : [];
}

/** Aynı başlık dalının başka hedeflere açık PR'ları (GitHub API, salt okunur). Token yoksa denetim atlanır. */
async function otherOpenBasesFor(head, base) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.BASE_REPO;
  const owner = (process.env.HEAD_REPO ?? "").split("/")[0];
  if (!token || !repo || !owner) return [];
  const url = `https://api.github.com/repos/${repo}/pulls?state=open&per_page=100&head=${encodeURIComponent(`${owner}:${head}`)}`;
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json" } });
  if (!response.ok) throw new Error(`GitHub API ${response.status}`);
  const pulls = await response.json();
  return pulls.map((pull) => pull.base.ref).filter((ref) => ref !== base);
}

async function main() {
  if (process.env.GITHUB_EVENT_NAME !== "pull_request") {
    console.log("[promotion] Non-PR event; nothing to check.");
    return;
  }
  const base = process.env.BASE_REF;
  const head = process.env.HEAD_REF;
  const input = { base, head, headRepo: process.env.HEAD_REPO, baseRepo: process.env.BASE_REPO, extraOnBase: [] };
  if ((base === "beta" && head === "alpha") || (base === "main" && head === "beta")) input.extraOnBase = extraContentOnBase(base, head);
  input.otherOpenBases = await otherOpenBasesFor(head, base);
  const errors = evaluatePromotion(input);
  if (errors.length) {
    for (const error of errors) console.error(`[promotion] ✖ ${error}`);
    console.error("[promotion] Flow: <prefix>/<topic> → alpha → beta → main (docs/development/BRANCH_RELEASE_WORKFLOW.md).");
    process.exit(1);
  }
  console.log(`[promotion] ✓ ${head} → ${base}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`[promotion] ✖ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
