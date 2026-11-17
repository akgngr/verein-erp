import assert from "node:assert/strict";
import test from "node:test";
import { migrateToast } from "../../scripts/ui/migrate-toast";

test("migrate-toast preserves other HeroUI imports and maps static variants", () => {
  const input = [
    '"use client";',
    'import { Button, toast, Chip } from "@heroui/react";',
    'function save() {',
    '  toast("Done", { variant: "success", timeout: 2000 });',
    '  toast("No", { variant: "danger" });',
    '}',
  ].join("\n");
  const r = migrateToast(input);
  assert.equal(r.changed, true);
  assert.equal(r.calls, 2);
  assert.match(r.source, /import \{ Button, Chip \} from "@heroui\/react"/);
  assert.match(r.source, /notify.success\("Done", \{ timeout: 2000 \}\)/);
  assert.match(r.source, /notify.error\("No"\)/);
  assert.match(r.source, /import \{ notify \} from "@\/shared\/components\/ui\/notify"/);
});

test("migrate-toast fails closed on unknown options", () => {
  const input = 'import { toast } from "@heroui/react"; toast("Hi", { promise: true });';
  const r = migrateToast(input);
  assert.equal(r.changed, false);
  assert.match(r.reason ?? "", /Unhandled/);
});

test("migrate-toast ignores non-HeroUI toast", () => {
  const input = 'import { toast } from "./local"; toast("Hi");';
  assert.equal(migrateToast(input).changed, false);
});
