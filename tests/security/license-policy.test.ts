import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  evaluateLicenseReport,
  isLicenseExpressionAllowed,
} from "../../scripts/check-licenses.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");

describe("OSS license policy gate (#621)", () => {
  it("allows standard permissive and weak-copyleft licenses", () => {
    for (const lic of [
      "MIT",
      "Apache-2.0",
      "BSD-2-Clause",
      "BSD-3-Clause",
      "ISC",
      "0BSD",
      "Unlicense",
      "BlueOak-1.0.0",
      "MPL-2.0",
      "LGPL-3.0-or-later",
      "(MIT AND Zlib)",
      "Apache-2.0 AND MIT",
    ]) {
      assert.equal(
        isLicenseExpressionAllowed(lic),
        true,
        `expected ${lic} to be allowed`,
      );
    }
  });

  it("allows dual-licensed SPDX OR expressions when a permissive branch exists", () => {
    assert.equal(isLicenseExpressionAllowed("(MIT OR GPL-3.0-or-later)"), true);
    assert.equal(isLicenseExpressionAllowed("(MIT OR EUPL-1.1+)"), true);
    assert.equal(
      isLicenseExpressionAllowed("(Apache-2.0 OR AGPL-3.0-only)"),
      true,
    );
  });

  it("blocks strong copyleft, viral, and unknown licenses", () => {
    for (const lic of [
      "GPL-3.0-only",
      "GPL-2.0-or-later",
      "AGPL-3.0-only",
      "SSPL-1.0",
      "BUSL-1.1",
      "EUPL-1.2",
      "WTFPL",
      "Unknown",
      "",
      "(MIT AND GPL-3.0-only)",
      "(GPL-2.0-only OR AGPL-3.0-only)",
    ]) {
      assert.equal(
        isLicenseExpressionAllowed(lic),
        false,
        `expected ${lic || "<empty>"} to be blocked`,
      );
    }
  });

  it("enforces package exceptions and fails once a temporary exception expires", () => {
    const sample = {
      MIT: [{ name: "safe-pkg", versions: ["1.0.0"] }],
      "GPL-3.0-only": [{ name: "gpl-pkg", versions: ["2.0.0"] }],
    };

    const blocked = evaluateLicenseReport(sample, {
      today: "2026-11-26",
      exceptions: [],
    });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.violations.length, 1);
    assert.equal(blocked.violations[0]?.name, "gpl-pkg");

    const allowedBeforeExpiry = evaluateLicenseReport(sample, {
      today: "2026-11-26",
      exceptions: [
        {
          name: "gpl-pkg",
          license: "GPL-3.0-only",
          reason: "Temporary test exception",
          expiresAt: "2026-12-15",
        },
      ],
    });
    assert.equal(allowedBeforeExpiry.ok, true);

    const failedAfterExpiry = evaluateLicenseReport(sample, {
      today: "2026-12-16",
      exceptions: [
        {
          name: "gpl-pkg",
          license: "GPL-3.0-only",
          reason: "Temporary test exception",
          expiresAt: "2026-12-15",
        },
      ],
    });
    assert.equal(failedAfterExpiry.ok, false);
    assert.equal(failedAfterExpiry.expiredExceptions.length, 1);
    assert.equal(failedAfterExpiry.violations.length, 1);
  });

  it("keeps security-release-gate.yml scoped off feature->alpha PRs and SHA-pinned", () => {
    const workflow = readFileSync(
      path.join(REPO_ROOT, ".github/workflows/security-release-gate.yml"),
      "utf8",
    );

    assert.match(workflow, /branches:\s*\[beta,\s*main\]/);
    assert.doesNotMatch(
      workflow,
      /pull_request:\s*\n\s*branches:\s*\[[^\]]*alpha/,
    );
    assert.match(
      workflow,
      /aquasecurity\/trivy-action@[0-9a-f]{40}/,
      "trivy-action must be pinned to an immutable 40-char commit SHA",
    );
    assert.match(
      workflow,
      /github\/codeql-action\/upload-sarif@[0-9a-f]{40}/,
      "upload-sarif must be pinned to an immutable 40-char commit SHA",
    );
  });

  it("enforces pnpm supply-chain hardening directives in pnpm-workspace.yaml", () => {
    const ws = readFileSync(
      path.join(REPO_ROOT, "pnpm-workspace.yaml"),
      "utf8",
    );
    assert.match(ws, /^minimumReleaseAge:\s*[1-9]\d*/m);
    assert.match(ws, /^blockExoticSubdeps:\s*true\s*$/m);
    assert.match(ws, /^onlyBuiltDependencies:/m);
  });

  it("requires every .trivyignore.yaml vulnerability entry to have an expired_at date", () => {
    const ignoreFile = readFileSync(
      path.join(REPO_ROOT, ".trivyignore.yaml"),
      "utf8",
    );
    const idMatches = ignoreFile.match(/^\s*-\s*id:\s*\S+/gm) ?? [];
    const expiryMatches =
      ignoreFile.match(/^\s*expired_at:\s*\d{4}-\d{2}-\d{2}\s*$/gm) ?? [];
    assert.equal(
      expiryMatches.length,
      idMatches.length,
      "every .trivyignore.yaml entry must declare an ISO expired_at date",
    );
  });
});
