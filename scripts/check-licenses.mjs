#!/usr/bin/env node
/**
 * Production OSS license policy gate (#621).
 *
 * Reads `pnpm licenses list --prod --json` and enforces that production runtime
 * dependencies do not introduce strong copyleft / viral licenses (GPL, AGPL,
 * SSPL, BUSL) unless satisfied by a permissive alternative in an SPDX `OR`
 * expression (for example `(MIT OR GPL-3.0-or-later)`).
 *
 * Also checks that every reviewed exception has a documented reason and, when
 * temporary, has not expired.
 */

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * License identifiers blocked for production runtime dependencies unless a
 * permissive branch is available via SPDX `OR`.
 */
export const BLOCKED_LICENSE_PATTERNS = [
  /^AGPL-/i,
  /^GPL-/i,
  /^SSPL-/i,
  /^BUSL-/i,
  /^CPAL-/i,
  /^EUPL-/i,
  /^WTFPL$/i,
];

/**
 * @typedef {{ name: string; license: string; reason: string; expiresAt: string | null }} LicenseException
 */

/**
 * Reviewed, permanently or temporarily allowed package-specific exceptions.
 * - `buffers@0.1.1`: transitive legacy dependency whose package.json omits the
 *   `license` field; upstream repository specifies MIT/X11.
 *
 * @type {LicenseException[]}
 */
export const REVIEWED_PACKAGE_EXCEPTIONS = [
  {
    name: "buffers",
    license: "Unknown",
    reason:
      "Transitive legacy package omits package.json license field; upstream repo (substack/node-buffers) declares MIT/X11.",
    expiresAt: null,
  },
];

function stripOuterParens(expr) {
  let trimmed = expr.trim();
  while (trimmed.startsWith("(") && trimmed.endsWith(")")) {
    let depth = 0;
    let wrapsEntire = true;
    for (let i = 0; i < trimmed.length; i += 1) {
      const ch = trimmed[i];
      if (ch === "(") depth += 1;
      else if (ch === ")") depth -= 1;
      if (depth === 0 && i < trimmed.length - 1) {
        wrapsEntire = false;
        break;
      }
    }
    if (!wrapsEntire) break;
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function splitTopLevel(expr, operator) {
  const parts = [];
  let depth = 0;
  let start = 0;
  const token = ` ${operator} `;
  const upper = expr.toUpperCase();
  const upperToken = token.toUpperCase();

  for (let i = 0; i < expr.length; i += 1) {
    const ch = expr[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    else if (
      depth === 0 &&
      upper.slice(i, i + upperToken.length) === upperToken
    ) {
      parts.push(expr.slice(start, i).trim());
      start = i + upperToken.length;
      i += upperToken.length - 1;
    }
  }
  parts.push(expr.slice(start).trim());
  return parts;
}

/**
 * Evaluates whether an SPDX-like license expression is allowed.
 * - `OR`: allowed if at least one branch is allowed (dual-licensed packages can
 *   be used under the permissive branch).
 * - `AND`: allowed only if all branches are allowed.
 * - Leaf token: allowed iff it does not match `BLOCKED_LICENSE_PATTERNS` and is
 *   not `"Unknown"`.
 */
export function isLicenseExpressionAllowed(expression) {
  const normalized = stripOuterParens(String(expression ?? ""));
  if (!normalized || normalized.toLowerCase() === "unknown") {
    return false;
  }

  const orBranches = splitTopLevel(normalized, "OR");
  if (orBranches.length > 1) {
    return orBranches.some((branch) => isLicenseExpressionAllowed(branch));
  }

  const andBranches = splitTopLevel(normalized, "AND");
  if (andBranches.length > 1) {
    return andBranches.every((branch) => isLicenseExpressionAllowed(branch));
  }

  return !BLOCKED_LICENSE_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Evaluates a `pnpm licenses list --prod --json` payload against the policy.
 *
 * @param {Record<string, Array<{ name: string; versions?: string[]; license?: string }>>} licenseMap
 * @param {{ today?: string; exceptions?: LicenseException[] }} [options]
 */
export function evaluateLicenseReport(licenseMap, options = {}) {
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const exceptions = options.exceptions ?? REVIEWED_PACKAGE_EXCEPTIONS;
  const violations = [];
  const expiredExceptions = [];
  let checkedPackages = 0;

  for (const exc of exceptions) {
    if (exc.expiresAt && today > exc.expiresAt) {
      expiredExceptions.push(exc);
    }
  }

  for (const [licenseKey, packages] of Object.entries(licenseMap ?? {})) {
    if (!Array.isArray(packages)) continue;
    const allowed = isLicenseExpressionAllowed(licenseKey);

    for (const pkg of packages) {
      checkedPackages += 1;
      if (allowed) continue;

      const matched = exceptions.find(
        (exc) =>
          exc.name === pkg.name &&
          exc.license === licenseKey &&
          (!exc.expiresAt || today <= exc.expiresAt),
      );
      if (!matched) {
        violations.push({
          name: pkg.name,
          versions: pkg.versions ?? [],
          license: licenseKey,
        });
      }
    }
  }

  return {
    ok: violations.length === 0 && expiredExceptions.length === 0,
    checkedPackages,
    violations,
    expiredExceptions,
  };
}

function main() {
  const raw = execFileSync("pnpm", ["licenses", "list", "--prod", "--json"], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });

  const licenseMap = JSON.parse(raw);
  const result = evaluateLicenseReport(licenseMap);

  if (result.expiredExceptions.length > 0) {
    console.error("Expired OSS license exceptions detected:");
    for (const exc of result.expiredExceptions) {
      console.error(
        `  - ${exc.name} (${exc.license}) expired on ${exc.expiresAt}: ${exc.reason}`,
      );
    }
  }

  if (result.violations.length > 0) {
    console.error("Disallowed production dependency licenses detected:");
    for (const v of result.violations) {
      console.error(
        `  - ${v.name}@${v.versions.join(",")} -> ${v.license}`,
      );
    }
  }

  if (!result.ok) {
    process.exit(1);
  }

  console.log(
    `OSS license policy check passed (${result.checkedPackages} production packages verified).`,
  );
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  main();
}
