import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

import { ai as sponsorsAi } from "@/modules/sponsors/ai";
import { sponsorCreatedEvent } from "@/modules/sponsors/automation";
import { buildSponsorWhere } from "@/modules/sponsors/queries/list-sponsors";
import {
  parseOptionalIsoDate,
  parseSponsorAmountCents,
  sponsorFormSchema,
} from "@/modules/sponsors/schemas/sponsor-schema";
import { sponsorsPermissions } from "@/modules/sponsors/permissions";
import { can } from "@/shared/permissions/define";

describe("sponsors module — schema & money parsing", () => {
  const validInput = {
    name: "Muster GmbH",
    tier: "GOLD" as const,
    status: "ACTIVE" as const,
    amount: "1.250,50",
    contactName: "Max Mustermann",
    contactEmail: "max@muster.example",
    contactPhone: "+49 30 123456",
    website: "https://muster.example",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    notes: "Jahressponsoring",
  };

  test("accepts valid sponsor payload and converts amount to integer cents", () => {
    const parsed = sponsorFormSchema.safeParse(validInput);
    assert.equal(parsed.success, true);
    assert.equal(parseSponsorAmountCents(validInput.amount), 125_050);
    assert.equal(parseSponsorAmountCents(""), 0);
    assert.equal(parseOptionalIsoDate("2026-01-01")?.toISOString(), "2026-01-01T00:00:00.000Z");
    assert.equal(parseOptionalIsoDate(""), null);
  });

  test("rejects negative or malformed amount with translation key", () => {
    const neg = sponsorFormSchema.safeParse({ ...validInput, amount: "-10" });
    assert.equal(neg.success, false);
    if (!neg.success) {
      assert.equal(neg.error.issues[0]?.message, "sponsors.validation.amountInvalid");
    }

    const bad = sponsorFormSchema.safeParse({ ...validInput, amount: "abc" });
    assert.equal(bad.success, false);
  });

  test("rejects endDate before startDate", () => {
    const result = sponsorFormSchema.safeParse({
      ...validInput,
      startDate: "2026-06-01",
      endDate: "2026-05-31",
    });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.issues[0]?.message, "sponsors.validation.endBeforeStart");
      assert.deepEqual(result.error.issues[0]?.path, ["endDate"]);
    }
  });

  test("rejects non-http(s) website URLs", () => {
    const result = sponsorFormSchema.safeParse({
      ...validInput,
      website: "javascript:alert(1)",
    });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.issues[0]?.message, "sponsors.validation.websiteInvalid");
    }
  });
});

describe("sponsors module — query builder & permissions", () => {
  test("buildSponsorWhere ignores unknown status/tier values and builds search OR", () => {
    const where = buildSponsorWhere({
      page: 1,
      pageSize: 10,
      q: "Muster",
      sort: "updatedAt",
      dir: "desc",
      filters: { status: "ACTIVE", tier: "UNKNOWN_TIER" },
      skip: 0,
      take: 10,
    });
    assert.equal(where.status, "ACTIVE");
    assert.equal(where.tier, undefined);
    assert.ok(Array.isArray(where.OR) && where.OR.length === 3);
  });

  test("default permissions grant expected capabilities", () => {
    assert.equal(can("ADMIN", sponsorsPermissions, "delete"), true);
    assert.equal(can("BOARD", sponsorsPermissions, "delete"), true);
    assert.equal(can("TREASURER", sponsorsPermissions, "update"), true);
    assert.equal(can("TREASURER", sponsorsPermissions, "delete"), false);
    assert.equal(can("VIEWER", sponsorsPermissions, "view"), true);
    assert.equal(can("VIEWER", sponsorsPermissions, "create"), false);
    assert.equal(can("TEACHER", sponsorsPermissions, "view"), false);
  });
});

describe("sponsors module — extension points (cards, ai v2, automation)", () => {
  test("exports dashboard overview card gated by sponsors view permission", () => {
    const cardSource = fs.readFileSync(path.join(process.cwd(), "src/modules/sponsors/cards/index.tsx"), "utf8");
    assert.match(cardSource, /export const cards = defineCards\(/);
    assert.match(cardSource, /key:\s*"overview"/);
    assert.match(cardSource, /href:\s*"\/sponsors"/);
    assert.match(cardSource, /permission:\s*\{\s*definition:\s*sponsorsPermissions,\s*action:\s*"view"\s*\}/);
  });

  test("exports AI v2 aggregate-only statistics tool", () => {
    assert.equal(sponsorsAi.module, "sponsors");
    assert.equal(sponsorsAi.tools.length, 1);
    assert.equal(sponsorsAi.tools[0]?.name, "get_sponsor_statistics");
    assert.equal(sponsorsAi.tools[0]?.operation, "read");
  });

  test("sponsors.created event validates strict PII-free payload", () => {
    assert.equal(sponsorCreatedEvent.key, "sponsors.created");
    const ok = sponsorCreatedEvent.payloadSchema.safeParse({
      sponsorId: "sp-1",
      tier: "GOLD",
      status: "ACTIVE",
    });
    assert.equal(ok.success, true);
    const bad = sponsorCreatedEvent.payloadSchema.safeParse({
      sponsorId: "sp-1",
      tier: "GOLD",
      status: "ACTIVE",
      extra: "denied",
    });
    assert.equal(bad.success, false);
  });
});
