#!/usr/bin/env node
/**
 * SEC2 read-only authorization surface inventory.
 * Lists candidate permission definitions and entry points for manual review.
 * A match is NOT proof of an authorization guard or IDOR protection.
 * No files are modified and no application code is executed.
 */
import { readdir, readFile } from "node:fs/promises";
import { join, sep } from "node:path";

const root = process.cwd();
const targets = ["src/app", "src/modules", "src/shared/permissions"];
const ignored = new Set(["node_modules", ".next", ".git", "__generated__", "generated"]);
const results = [];

async function visit(directory) {
  let entries;
  try {
    entries = await readdir(join(root, directory), { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(path);
      continue;
    }
    if (!entry.isFile() || !/\.[cm]?[jt]sx?$/.test(entry.name)) continue;
    const isEntry = /(^|\/)(page|route|layout|actions?)\.[cm]?[jt]sx?$/.test(path);
    const isPermission = /(^|\/)permissions?\.[cm]?[jt]sx?$/.test(path);
    // Server actions often live in named files under actions/, not actions.ts.
    // Read candidate source without executing it; keep ordinary service files out.
    const isActionCandidate = /(^|\/)actions\/[^/]+\.[cm]?[jt]sx?$/.test(path);
    if (!isEntry && !isPermission && !isActionCandidate) continue;
    const source = await readFile(join(root, path), "utf8");
    const isServerAction = isActionCandidate && /["\x27]use server["\x27]/.test(source);
    if (!isEntry && !isPermission && !isServerAction) continue;
    const markers = [];
    if (isEntry) markers.push("entry-point");
    if (isPermission) markers.push("permission-file");
    if (isServerAction) markers.push("server-action");
    if (/\b(?:definePermissions|PermissionDefinition)\b/.test(source)) markers.push("permission-definition");
    if (/\b(?:requireUser|requirePermission|canAccess|assertPermission)\b/.test(source)) markers.push("guard-reference");
    results.push({ path: path.split(sep).join("/"), markers });
  }
}

for (const target of targets) await visit(target);
results.sort((a, b) => a.path.localeCompare(b.path));
if (process.argv.includes("--json")) {
  process.stdout.write(JSON.stringify({ schemaVersion: 1, candidates: results }, null, 2) + "\n");
} else {
  process.stdout.write("SEC2 authorization surface candidates (manual review required)\n");
  for (const item of results) process.stdout.write(item.path + " | " + item.markers.join(", ") + "\n");
  process.stdout.write("Total candidates: " + results.length + "\n");
}
