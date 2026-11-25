import assert from "node:assert/strict";
import test from "node:test";

import { accountingPermissions } from "@/modules/accounting/permissions";
import { automationPermissions } from "@/modules/automation/permissions";
import { automationLocaleFrom, defaultAutomationLocale } from "@/modules/automation/services/automation-locale";
import { summarizeParty } from "@/modules/crm/lib/party-summary";
import { crmPermissions } from "@/modules/crm/permissions";
import { exportsPermissions } from "@/modules/exports/permissions";
import { financePermissions } from "@/modules/finance/permissions";
import { payoutReceivedChangeError } from "@/modules/grants/lib/payout-guard";
import { changesAccountingAsset } from "@/modules/inventory/helpers/asset-projection";
import { inventoryPermissions } from "@/modules/inventory/permissions";
import { escapeCsvValue } from "@/modules/inventory/helpers/inventory-helpers";
import { membersPermissions } from "@/modules/members/permissions";
import { securityMonitorPermissions } from "@/modules/security-monitor/permissions";
import { neutralizeCsvFormula } from "@/shared/files/csv-formula";
import { can, type PermissionDefinition } from "@/shared/permissions/define";

/**
 * #582: Çok rollü negatif yetki testleri (veritabanı gerektirmez). Her satır bir sızıntının kapandığını
 * sabitler: rol hedef modülde işlem yapabilse de kaynak modülün verisine/yazmasına erişemez.
 */
type Case = [role: string, definition: PermissionDefinition, action: "view" | "create" | "update" | "delete" | "approve", allowed: boolean, why: string];

const MATRIX: Case[] = [
  // grants/crm: muhasebe verisi yalnız muhasebeyi görebilen rollere (fiş ayrıntısı, cari kişi).
  ["SECRETARY", accountingPermissions, "view", false, "grants report and CRM must hide accounting data from SECRETARY"],
  ["VIEWER", accountingPermissions, "view", false, "CRM must hide accounting contacts from VIEWER"],
  ["VIEWER", crmPermissions, "view", true, "VIEWER still sees CRM relationship data"],
  ["VIEWER", membersPermissions, "view", true, "VIEWER may see member names in CRM"],
  ["TAX_ADVISOR", crmPermissions, "view", false, "TAX_ADVISOR has no CRM access"],
  ["TEACHER", crmPermissions, "view", false, "TEACHER has no CRM access"],
  // inventory: AfA kaydı muhasebe yazma izni ister.
  ["SECRETARY", inventoryPermissions, "update", true, "SECRETARY edits inventory"],
  ["SECRETARY", accountingPermissions, "update", false, "…but cannot change AccountingAsset (AfA) records"],
  ["BOARD", inventoryPermissions, "update", true, "BOARD edits inventory"],
  ["BOARD", accountingPermissions, "update", false, "…but cannot change AccountingAsset (AfA) records"],
  ["TREASURER", accountingPermissions, "update", true, "TREASURER may change AfA via inventory"],
  // exports: vergi danışmanı kendi uyum raporunu indirebilir, silemez başkasınınkini (servis sahiplik denetler).
  ["TAX_ADVISOR", exportsPermissions, "view", true, "TAX_ADVISOR downloads compliance exports (was 403)"],
  ["TAX_ADVISOR", exportsPermissions, "create", false, "TAX_ADVISOR cannot create generic exports"],
  // finance: ayarlar yalnız approve.
  ["VIEWER", financePermissions, "view", true, "VIEWER sees exchange rates"],
  ["VIEWER", financePermissions, "approve", false, "VIEWER cannot open /finance/ayarlar"],
  ["TEACHER", financePermissions, "approve", false, "TEACHER cannot open /finance/ayarlar"],
  // security-monitor: sayfa view, test çalıştırma create.
  ["VIEWER", securityMonitorPermissions, "view", false, "VIEWER cannot open /guvenlik-izleme"],
  ["SECRETARY", securityMonitorPermissions, "view", false, "SECRETARY cannot open /guvenlik-izleme"],
  ["AUDITOR", securityMonitorPermissions, "view", true, "AUDITOR reads security results"],
  ["AUDITOR", securityMonitorPermissions, "create", false, "AUDITOR cannot run the suite"],
  // automation: ham hata metni yalnız update.
  ["VIEWER", automationPermissions, "update", false, "VIEWER sees error codes, not raw messages"],
  ["AUDITOR", automationPermissions, "update", false, "AUDITOR sees error codes, not raw messages"],
];

for (const [role, definition, action, allowed, why] of MATRIX) {
  test(`${role} ${allowed ? "can" : "cannot"} ${definition.resource}.${action}: ${why}`, () => {
    assert.equal(can(role, definition, action, null), allowed);
  });
}

test("CSV formula injection is neutralized in inventory export cells", () => {
  assert.equal(escapeCsvValue("=HYPERLINK(\"http://x\")"), "\"'=HYPERLINK(\"\"http://x\"\")\"");
  assert.equal(escapeCsvValue("+1+1"), "'+1+1");
  assert.equal(escapeCsvValue("@SUM(A1)"), "'@SUM(A1)");
  assert.equal(escapeCsvValue(" \t-2+3"), "' \t-2+3");
  assert.equal(escapeCsvValue("-12,50"), "-12,50", "plain signed numbers stay numeric");
  assert.equal(escapeCsvValue(-5), "-5", "numbers are never prefixed");
  assert.equal(escapeCsvValue("Beamer"), "Beamer");
  assert.equal(neutralizeCsvFormula("=1"), "'=1");
});

test("automation locale comes from the stored context, else the document language", () => {
  const previous = process.env.DOCUMENT_LANGUAGE;
  try {
    process.env.DOCUMENT_LANGUAGE = "tr";
    assert.equal(defaultAutomationLocale(), "tr");
    assert.equal(automationLocaleFrom({}), "tr");
    assert.equal(automationLocaleFrom({ locale: "de" }), "de");
    assert.equal(automationLocaleFrom({ locale: "fr" }), "tr", "unknown locale falls back");
    delete process.env.DOCUMENT_LANGUAGE;
    assert.equal(defaultAutomationLocale(), "de");
    assert.equal(automationLocaleFrom(null), "de");
  } finally {
    if (previous === undefined) delete process.env.DOCUMENT_LANGUAGE;
    else process.env.DOCUMENT_LANGUAGE = previous;
  }
});

test("crm: a usable but unreadable source yields a restricted summary without contact data", () => {
  const context = {
    usable: new Set(["members", "accounting"]),
    readable: new Set(["members"]),
    members: new Map([["m1", { firstName: "Erika", lastName: "Muster", email: "e@example.org", phone: "1" }]]),
    contacts: new Map([["c1", { name: "Lieferant GmbH", contactPerson: "Max", email: "l@example.org", phone: "2" }]]),
    restrictedLabel: "RESTRICTED",
  };
  assert.deepEqual(summarizeParty({ sourceModule: "accounting", sourceId: "c1" }, context), {
    name: "RESTRICTED", detail: "", email: null, phone: null, missing: false, restricted: true,
  });
  assert.equal(summarizeParty({ sourceModule: "members", sourceId: "m1" }, context).name, "Erika Muster");
  assert.equal(summarizeParty({ sourceModule: "members", sourceId: "gone" }, context).missing, true);
  const disabled = { ...context, usable: new Set(["members"]) };
  assert.equal(summarizeParty({ sourceModule: "accounting", sourceId: "c1" }, disabled).missing, true, "disabled module → missing");
  const treasurer = { ...context, readable: new Set(["members", "accounting"]) };
  assert.equal(summarizeParty({ sourceModule: "accounting", sourceId: "c1" }, treasurer).email, "l@example.org");
});

test("grants: payouts are bound to their grant and a received payout cannot be cleared (GoBD)", () => {
  const received = { grantId: "g1", receivedAt: new Date("2030-02-10") };
  const open = { grantId: "g1", receivedAt: null };
  assert.equal(payoutReceivedChangeError(open, "g2", "2030-02-10"), "grants.errors.notFound", "IDOR via another grant");
  assert.equal(payoutReceivedChangeError(null, "g1", "2030-02-10"), "grants.errors.notFound");
  assert.equal(payoutReceivedChangeError(received, "g1", null), "grants.errors.payoutAlreadyReceived");
  assert.equal(payoutReceivedChangeError(received, "g1", "2030-02-11"), null, "correcting the date is allowed");
  assert.equal(payoutReceivedChangeError(open, "g1", "2030-02-10"), null);
});

test("inventory: only changes to AfA-relevant fields of tracked items touch the accounting asset", () => {
  const tracked = { name: "Beamer", purchaseDate: new Date("2029-05-01"), purchasePrice: 1200, trackAsAsset: true, status: "IN_USE" };
  assert.equal(changesAccountingAsset(tracked, { ...tracked }), false, "location/description edits are free");
  assert.equal(changesAccountingAsset(tracked, { ...tracked, status: "IDLE" }), false);
  assert.equal(changesAccountingAsset(tracked, { ...tracked, purchasePrice: 900 }), true);
  assert.equal(changesAccountingAsset(tracked, { ...tracked, status: "SCRAPPED" }), true);
  assert.equal(changesAccountingAsset(tracked, { ...tracked, trackAsAsset: false }), true, "unlinking changes the asset");
  assert.equal(changesAccountingAsset(null, tracked), true, "creating a tracked item creates an asset");
  assert.equal(changesAccountingAsset(tracked, null), true, "deleting disposes the asset");
  assert.equal(changesAccountingAsset(null, { ...tracked, trackAsAsset: false }), false);
  assert.equal(changesAccountingAsset(null, { ...tracked, purchasePrice: null }), false, "no cost → not tracked");
});
