import assert from "node:assert/strict";
import test from "node:test";
import { collectInventory } from "../../scripts/ui/heroui-inventory";

test("W1 complete: business modules never import HeroUI toast directly", () => {
  const inventory = collectInventory(process.cwd());
  const toastCount = inventory.componentUses.toast ?? 0;
  const offenders = inventory.files
    .filter((file) => file.imports.includes("toast"))
    .map((file) => file.path);
  assert.equal(toastCount, 0, "Still using direct @heroui/react toast imports: " + offenders.join(", "));
});
