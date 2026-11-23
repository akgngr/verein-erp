import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { isTrackingOptOut } from "@/modules/mailings/services/tracking";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

// #497 — DSGVO Art. 25 (Privacy by Default) ve Global Privacy Control.
describe("Mailing tracking privacy defaults (#497)", () => {
  test("Sec-GPC: 1 is treated as a tracking opt-out", () => {
    assert.equal(isTrackingOptOut(new Headers({ "Sec-GPC": "1" })), true);
    assert.equal(isTrackingOptOut(new Headers({ "sec-gpc": " 1 " })), true);
    assert.equal(isTrackingOptOut(new Headers({ "Sec-GPC": "0" })), false);
    assert.equal(isTrackingOptOut(new Headers()), false);
  });

  test("new campaigns start with tracking off (schema, server default, wizard)", () => {
    assert.match(read("src/modules/mailings/schema.prisma"), /\btracking\s+Boolean\s+@default\(false\)/);
    const campaigns = read("src/modules/mailings/services/campaigns.ts");
    assert.doesNotMatch(campaigns, /tracking:\s*input\.tracking\s*\?\?\s*true/);
    assert.equal(campaigns.match(/tracking:\s*input\.tracking\s*\?\?\s*false/g)?.length, 2);
    assert.match(read("src/modules/mailings/components/campaign-wizard.tsx"), /const \[tracking, setTracking\] = useState\(false\)/);
    const migration = read("prisma/schema/migrations/20261229090000_mailings_tracking_default_off/migration.sql");
    assert.match(migration, /ALTER COLUMN "tracking" SET DEFAULT false/);
    assert.doesNotMatch(migration, /\bUPDATE\b|\bDELETE\b|\bDROP\b/i, "existing campaigns stay unchanged");
  });

  test("open and click endpoints skip recording when GPC is set but still respond", () => {
    const open = read("src/modules/mailings/api/t/o/[token]/route.ts");
    assert.match(open, /!isTrackingOptOut\(request\.headers\)\)\s*await recordOpen/);
    assert.match(open, /image\/gif/);
    const click = read("src/modules/mailings/api/t/c/[token]/route.ts");
    assert.match(click, /if \(!isTrackingOptOut\(request\.headers\)\) await recordClick/);
    assert.match(click, /NextResponse\.redirect\(target, 302\)/);
  });
});
