import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { permissionResources } from "@/permissions-registry";
import { can, PERMISSION_ACTIONS } from "@/shared/permissions/define";
import { SYSTEM_ROLES } from "@/shared/roles";

const MODULES_DIR = path.join(process.cwd(), "src/modules");

function walkFiles(dir: string, predicate: (file: string) => boolean, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "generated" || entry.name === "node_modules") continue;
      walkFiles(full, predicate, out);
    } else if (predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Explicit allowlist for server action files that intentionally do not use
 * createAction/requirePermission (e.g. unauthenticated login, credential-based
 * secret ballot cast, or public form submission).
 */
const PUBLIC_OR_CREDENTIAL_ACTIONS = new Set([
  "src/modules/auth/actions/login.ts",
  "src/modules/auth/actions/logout.ts",
  "src/modules/meetings/actions/public-vote-actions.ts",
  "src/modules/online-forms/actions/public-actions.ts",
]);

test("SEC2: role × page & server-action authorization matrix is generated from permissionResources and enforces least privilege", () => {
  const resourcesByModule = new Map<string, typeof permissionResources[number]["definitions"]>();
  for (const entry of permissionResources) {
    resourcesByModule.set(entry.moduleKey, entry.definitions);
  }

  const matrix: Array<{
    moduleKey: string;
    pages: number;
    actions: number;
    roles: Record<string, string[]>;
  }> = [];

  for (const moduleKey of fs.readdirSync(MODULES_DIR).sort()) {
    const modDir = path.join(MODULES_DIR, moduleKey);
    if (!fs.statSync(modDir).isDirectory()) continue;

    const pages = walkFiles(path.join(modDir, "routes"), (f) => f.endsWith("/page.tsx"));
    const actions = [
      ...walkFiles(path.join(modDir, "actions"), (f) => f.endsWith(".ts")),
      ...(fs.existsSync(path.join(modDir, "actions.ts")) ? [path.join(modDir, "actions.ts")] : []),
    ];

    if (pages.length === 0 && actions.length === 0) continue;

    // Every module with dashboard pages or server actions must be registered in permissionResources
    // (except auth which is session-only).
    if (moduleKey !== "auth" && moduleKey !== "system") {
      const defs = resourcesByModule.get(moduleKey);
      assert.ok(defs && defs.length > 0, `Module ${moduleKey} has routes/actions but no registered permissions`);

      const roleSummary: Record<string, string[]> = {};
      for (const role of SYSTEM_ROLES) {
        const granted = new Set<string>();
        for (const def of defs) {
          for (const action of PERMISSION_ACTIONS) {
            if (can(role, def, action, null)) granted.add(`${def.resource}:${action}`);
          }
        }
        roleSummary[role] = [...granted];
      }

      // Least-privilege invariant: VIEWER cannot mutate or approve any business module
      // (except personal exports and submitting feedback).
      for (const perm of roleSummary.VIEWER ?? []) {
        if (moduleKey === "exports" || perm === "feedback:create") continue;
        assert.equal(
          perm.endsWith(":view"),
          true,
          `VIEWER must never have write/approve permission (${moduleKey}: ${perm})`,
        );
      }

      matrix.push({
        moduleKey,
        pages: pages.length,
        actions: actions.length,
        roles: roleSummary,
      });
    }

    // Every "use server" action file must enforce auth/permission via createAction, requirePermission, or requireUser.
    for (const actionFile of actions) {
      const rel = path.relative(process.cwd(), actionFile).replace(/\\/g, "/");
      const src = fs.readFileSync(actionFile, "utf8");
      if (!src.includes('"use server"') && !src.includes("'use server'")) continue;
      if (PUBLIC_OR_CREDENTIAL_ACTIONS.has(rel)) continue;

      const hasGuard =
        /\bcreateAction\s*\(/.test(src) ||
        /\brequirePermission\s*\(/.test(src) ||
        /\brequireUser\s*\(/.test(src);
      assert.ok(hasGuard, `Server action ${rel} must guard every mutation with createAction/requirePermission/requireUser`);
    }
  }

  assert.ok(matrix.length >= 15, `Expected at least 15 guarded modules in SEC2 matrix, got ${matrix.length}`);
});

test("SEC2 IDOR: every module with [id] record pages enforces permission/ownership guards and denies cross-role access", () => {
  const recordPages = walkFiles(MODULES_DIR, (f) => f.includes(`${path.sep}[id]${path.sep}`) && f.endsWith("page.tsx"));
  const recordModules = [...new Set(recordPages.map((p) => path.relative(MODULES_DIR, p).split(path.sep)[0]))].sort();

  assert.deepEqual(recordModules, [
    "accounting",
    "automation",
    "courses",
    "documents",
    "donations",
    "feedback",
    "grants",
    "meetings",
    "members",
    "sepa",
    "students",
    "users",
  ]);

  const defsByModule = new Map(permissionResources.map((r) => [r.moduleKey, r.definitions[0]]));

  // Synthetic cross-user / cross-role IDOR check for every record module:
  // An unauthorized role (e.g. VIEWER for sensitive record modules, or TEACHER for finance/admin modules)
  // must be denied view/update/delete by record ID.
  for (const mod of recordModules) {
    const def = defsByModule.get(mod);
    assert.ok(def, `Record module ${mod} must have a primary PermissionDefinition`);

    if (["accounting", "donations", "members", "sepa", "users", "grants"].includes(mod)) {
      assert.equal(can("VIEWER", def, "view", null), false, `IDOR guard: VIEWER cannot view ${mod} record by id`);
    }
    for (const writeAction of ["create", "update", "delete", "approve"] as const) {
      if (!(mod === "feedback" && writeAction === "create")) {
        assert.equal(can("VIEWER", def, writeAction, null), false, `IDOR guard: VIEWER cannot ${writeAction} ${mod} record`);
        assert.equal(can("AUDITOR", def, writeAction, null), false, `IDOR guard: AUDITOR cannot ${writeAction} ${mod} record`);
      }
    }
  }

  // Scope-based IDOR check: TEACHER cannot view all courses (coursesAll) or another teacher's course/student records
  // without explicit coursesAll permission.
  const coursesAll = permissionResources
    .find((r) => r.moduleKey === "courses")
    ?.definitions.find((d) => d.resource === "coursesAll");
  assert.ok(coursesAll, "coursesAll permission resource must exist");
  assert.equal(can("TEACHER", coursesAll, "view", null), false, "TEACHER must be scoped to own courses, not coursesAll");

  // User-owned modules (notifications, exports, ai) must scope queries by userId in their services/queries.
  const userScopedFiles = [
    "src/modules/exports/services",
    "src/modules/notifications/services",
    "src/modules/ai/services",
  ];
  for (const dir of userScopedFiles) {
    const files = walkFiles(path.join(process.cwd(), dir), (f) => f.endsWith(".ts"));
    const combined = files.map((f) => fs.readFileSync(f, "utf8")).join("\n");
    assert.match(combined, /\buserId\b/, `${dir} must scope record queries by userId`);
  }
});
