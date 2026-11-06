import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { DATA_POLICY, USER_LINK_RETAINED, type TablePolicy } from "@/shared/data-policy";

/**
 * Silinme hakkı (KVKK md. 7 / DSGVO Art. 17): kullanıcıya ait tabloların sahibi modül, kullanıcı
 * silinince bu satırları `lifecycle.ts → onUserDeleted` ile silmek zorundadır.
 */
const policy = DATA_POLICY as Record<string, TablePolicy>;
const accessor = (model: string) => model.charAt(0).toLowerCase() + model.slice(1);

/** lifecycle.ts and the module files it imports relatively (one level). */
function lifecycleSources(moduleKey: string): string | null {
  const file = path.join("src/modules", moduleKey, "lifecycle.ts");
  if (!fs.existsSync(file)) return null;
  const source = fs.readFileSync(file, "utf8");
  const imported = [...source.matchAll(/from "(\.\/[^"]+)"/g)].map((match) => path.join(path.dirname(file), `${match[1]}.ts`)).filter((item) => fs.existsSync(item));
  return [source, ...imported.map((item) => fs.readFileSync(item, "utf8"))].join("\n");
}

function modelsWithUserLink(): { model: string; owner: string; field: string }[] {
  const out: { model: string; owner: string; field: string }[] = [];
  for (const moduleKey of fs.readdirSync("src/modules")) {
    const file = path.join("src/modules", moduleKey, "schema.prisma");
    if (!fs.existsSync(file)) continue;
    for (const match of fs.readFileSync(file, "utf8").matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
      const field = ["userId", "ownerId"].find((name) => new RegExp(`^\\s+${name}\\s`, "m").test(match[2]));
      if (field) out.push({ model: match[1], owner: moduleKey, field });
    }
  }
  return out;
}

describe("User deletion (right to erasure)", () => {
  test("every userId/ownerId table is either erased on user deletion or explicitly retained", () => {
    const undecided = modelsWithUserLink()
      .filter(({ model }) => !policy[model]?.personalOwnerField && !USER_LINK_RETAINED[model])
      .map(({ model, owner, field }) => `${owner}.${model}.${field}`);
    assert.deepEqual(undecided, [], "Set personalOwnerField in DATA_POLICY or add the table to USER_LINK_RETAINED with a reason.");
  });

  test("personal tables are deleted by the owning module's onUserDeleted hook", () => {
    const missing: string[] = [];
    for (const [model, entry] of Object.entries(policy)) {
      if (!entry.personalOwnerField) continue;
      const source = lifecycleSources(entry.owner);
      const hook = source && /onUserDeleted\s*:/.test(source);
      const deletes = source && new RegExp(`${accessor(model)}\\.deleteMany\\(\\{\\s*where:\\s*\\{[^}]*\\b${entry.personalOwnerField}\\b`).test(source);
      if (!hook || !deletes) missing.push(`${entry.owner}: ${model}.${entry.personalOwnerField}`);
    }
    assert.deepEqual(missing, []);
  });

  test("user deletion runs the hooks before deleting the user", () => {
    const source = fs.readFileSync("src/modules/users/actions/delete-user.ts", "utf8");
    const hooks = source.indexOf("runUserDeletionHooks(");
    const remove = source.indexOf("db.user.delete(");
    assert.ok(hooks > 0 && remove > hooks);
  });
});
