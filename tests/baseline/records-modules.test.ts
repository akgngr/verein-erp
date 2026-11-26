/** #606: crm, inventory, organization, feedback, progress, students, audit — core validation rules (synthetic data). */
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("crm: party summary respects source-module access (restricted vs missing) and resolves members/contacts", async () => {
  const { summarizeParty, MISSING_PARTY } = await import("@/modules/crm/lib/party-summary");
  const ctx = {
    usable: new Set(["members", "accounting"]),
    readable: new Set(["members"]),
    restrictedLabel: "Restricted",
    members: new Map([["m1", { firstName: "Ada", lastName: "Muster", email: "ada@example.test", phone: null }]]),
    contacts: new Map([["c1", { name: "Firma GmbH", contactPerson: "Bo", email: null, phone: "+49 30 1" }]]),
  };
  assert.deepEqual(summarizeParty({ sourceModule: "members", sourceId: "m1" }, ctx), { name: "Ada Muster", detail: "", email: "ada@example.test", phone: null, missing: false, restricted: false });
  assert.equal(summarizeParty({ sourceModule: "accounting", sourceId: "c1" }, ctx).restricted, true, "usable but not readable → restricted, no data leaked");
  assert.equal(summarizeParty({ sourceModule: "accounting", sourceId: "c1" }, ctx).email, null);
  assert.deepEqual(summarizeParty({ sourceModule: "members", sourceId: "gone" }, ctx), MISSING_PARTY);
  assert.deepEqual(summarizeParty({ sourceModule: "students", sourceId: "x" }, ctx), MISSING_PARTY, "unusable module → missing");
  const readable = { ...ctx, readable: new Set(["members", "accounting"]) };
  assert.equal(summarizeParty({ sourceModule: "accounting", sourceId: "c1" }, readable).name, "Firma GmbH");
});

test("inventory: URL filters are whitelisted, paging is clamped, unknown sort falls back", async () => {
  const { parseInventoryFilters, hasActiveInventoryFilters } = await import("@/modules/inventory/helpers/inventory-helpers");
  const filters = parseInventoryFilters({ q: "  Beamer ", "filter.category": "ELECTRONICS", "filter.status": "HACKED", sort: "DROP TABLE", dir: "asc", page: "-3", pageSize: "5000" });
  assert.equal(filters.search, "Beamer");
  assert.equal(filters.category, "ELECTRONICS");
  assert.equal(filters.status, null, "unknown status ignored");
  assert.equal(filters.sort, "createdAt");
  assert.equal(filters.direction, "desc", "direction only applies to a valid sort field");
  assert.equal(filters.page, 1);
  assert.equal(filters.pageSize, 100, "page size capped");
  assert.equal(hasActiveInventoryFilters(filters), true);
  assert.equal(hasActiveInventoryFilters(parseInventoryFilters({})), false);
});

test("inventory: item schema enforces quantity/price bounds and valid dates", async () => {
  const { inventoryCreateSchema } = await import("@/modules/inventory/schemas/inventory-schema");
  const base = { name: "Beamer", category: "ELECTRONICS", serialNumber: "", location: "", quantity: 1, status: "IN_USE", purchaseDate: "2026-02-01", purchasePrice: 499, description: "", assignedMemberId: "", trackAsAsset: false };
  assert.equal(inventoryCreateSchema.safeParse(base).success, true);
  assert.equal(inventoryCreateSchema.safeParse({ ...base, quantity: 0 }).success, false);
  assert.equal(inventoryCreateSchema.safeParse({ ...base, quantity: 1.5 }).success, false);
  assert.equal(inventoryCreateSchema.safeParse({ ...base, purchasePrice: -1 }).success, false);
  assert.equal(inventoryCreateSchema.safeParse({ ...base, purchaseDate: "2026-02-30" }).success, false);
  assert.equal(inventoryCreateSchema.safeParse({ ...base, category: "WEAPONS" }).success, false);
});

test("organization: German postal codes need 5 digits, other countries are free-form; name required", async () => {
  const { organizationUpdateSchema } = await import("@/modules/organization/schemas/profile");
  const base = { name: "Kulturverein Beispiel e. V.", street: "", postalCode: "60311", city: "Frankfurt", country: "", email: "", phone: "", website: "", registerCourt: "", registerNumber: "", taxNumber: "", taxOffice: "", exemptionNoticeDate: "", exemptionNoticePeriod: "", exemptionDocumentType: "", charitablePurposes: "" };
  const ok = organizationUpdateSchema.safeParse(base);
  assert.equal(ok.success, true, JSON.stringify(ok.error?.issues));
  assert.equal(ok.data!.membershipFeesDeductible, false, "deductibility is opt-in");
  assert.equal(ok.data!.exemptionDocumentType, null);
  assert.equal(organizationUpdateSchema.safeParse({ ...base, postalCode: "6031" }).success, false);
  assert.equal(organizationUpdateSchema.safeParse({ ...base, postalCode: "06100", country: "Türkiye" }).success, true);
  assert.equal(organizationUpdateSchema.safeParse({ ...base, name: "e." }).success, false);
});

test("feedback: page URL must be a same-origin path; status/priority are closed sets", async () => {
  const { feedbackCreateSchema, feedbackUpdateSchema } = await import("@/modules/feedback/schemas/feedback");
  const base = { type: "BUG", title: "Kaydet çalışmıyor", description: "Formu kaydedince hata çıkıyor." };
  assert.equal(feedbackCreateSchema.safeParse({ ...base, pageUrl: "/uyeler?q=…" }).success, true);
  for (const pageUrl of ["https://evil.example/x", "//evil.example", "javascript:alert(1)", "/a\nb"]) {
    assert.equal(feedbackCreateSchema.safeParse({ ...base, pageUrl }).success, false, pageUrl);
  }
  assert.equal(feedbackCreateSchema.safeParse({ ...base, title: "ab" }).success, false);
  assert.equal(feedbackUpdateSchema.safeParse({ id: "f1", status: "DONE", priority: "HIGH" }).success, true);
  assert.equal(feedbackUpdateSchema.safeParse({ id: "f1", status: "ARCHIVED", priority: "HIGH" }).success, false);
});

test("feedback: user deletion anonymises reports (Art. 17) instead of keeping identifying fields", () => {
  const src = fs.readFileSync("src/modules/feedback/lifecycle.ts", "utf8");
  for (const field of ["reporterLabel", "screenshotPath", "pageUrl", "userAgent"]) assert.match(src, new RegExp(`${field}: (null|"—")`), field);
});

test("progress: points accept comma decimals and empty input", async () => {
  const { parsePoints } = await import("@/modules/progress/schemas/progress");
  assert.equal(parsePoints(""), null);
  assert.equal(parsePoints("7,5"), 7.5);
  assert.equal(parsePoints("12"), 12);
  assert.equal(Number.isNaN(parsePoints("abc")), true, "invalid input is rejected downstream (NaN)");
});

test("students: IBAN normalisation and ISO 13616 mod-97 check", async () => {
  const { normalizeIban, isValidIban, personName } = await import("@/modules/students/utils");
  assert.equal(normalizeIban(" de89 3704 0044 0532 0130 00 "), "DE89370400440532013000");
  assert.equal(normalizeIban("   "), null);
  assert.equal(isValidIban("DE89 3704 0044 0532 0130 00"), true);
  assert.equal(isValidIban("DE88 3704 0044 0532 0130 00"), false, "check digits");
  assert.equal(isValidIban("DE89"), false);
  assert.equal(personName({ firstName: "Ada", lastName: "" }), "Ada");
});

test("audit: action/entity filter values are unique and every action has a TR and DE label", async () => {
  const { AUDIT_ACTIONS, AUDIT_ENTITIES } = await import("@/modules/audit/constants");
  assert.equal(new Set(AUDIT_ACTIONS).size, AUDIT_ACTIONS.length);
  assert.equal(new Set(AUDIT_ENTITIES).size, AUDIT_ENTITIES.length);
  for (const lang of ["tr", "de"]) {
    const messages = JSON.parse(fs.readFileSync(`src/modules/audit/messages/${lang}.json`, "utf8")) as { actions: Record<string, string> };
    const missing = AUDIT_ACTIONS.filter((action) => !messages.actions[action]);
    assert.deepEqual(missing, [], `${lang}: missing action labels`);
  }
});
