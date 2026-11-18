import assert from "node:assert/strict";
import { test } from "node:test";

import { buildAccountingItems, pickTaxDeadline, secretary as accountingSecretary } from "@/modules/accounting/secretary";
import { buildDocumentItems, secretary as documentsSecretary } from "@/modules/documents/secretary";
import { buildMemberItems, secretary as membersSecretary } from "@/modules/members/secretary";
import { can } from "@/shared/permissions/define";
import { validateBriefingItem, validateModuleSecretary, type ModuleSecretary } from "@/shared/secretary/define";

import accountingTr from "@/modules/accounting/messages/tr.json";
import accountingDe from "@/modules/accounting/messages/de.json";
import documentsTr from "@/modules/documents/messages/tr.json";
import documentsDe from "@/modules/documents/messages/de.json";
import membersTr from "@/modules/members/messages/tr.json";
import membersDe from "@/modules/members/messages/de.json";

/**
 * Gerçek mesaj dosyalarıyla basit çevirmen: eksik anahtar testte yakalanır. Basit `{ad}` yer tutucuları
 * doldurulur; ICU çoğul ifadeleri olduğu gibi kalır (biçim denetimi i18n kontrolünde).
 */
function translator(messages: Record<string, unknown>) {
  return (key: string, values: Record<string, string | number> = {}) => {
    const raw = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages);
    assert.equal(typeof raw, "string", `eksik anahtar: ${key}`);
    return (raw as string).replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
  };
}

const today = new Date("2026-11-18T00:00:00Z");
const emptyAccounting = {
  overdueInvoices: { count: 0, cents: 0 },
  overduePayables: { count: 0, cents: 0 },
  draftPayables: 0,
  openBankTransactions: 0,
  nextTaxDeadline: null,
};

test("secretary providers: boş veride öğe yok", () => {
  for (const t of [translator(accountingTr)]) assert.deepEqual(buildAccountingItems(emptyAccounting, { t }, today), []);
  assert.deepEqual(buildDocumentItems({ overdue: 0, dueSoon: 0, nextDueAt: null }, { t: translator(documentsTr) }, today), []);
  assert.deepEqual(buildMemberItems({ overdueDues: 0 }, { t: translator(membersTr) }), []);
});

test("secretary providers: dolu veride geçerli, kendi sayfasına bağlanan öğeler (TR/DE)", () => {
  const snapshot = {
    overdueInvoices: { count: 2, cents: 12_500 },
    overduePayables: { count: 1, cents: 4_000 },
    draftPayables: 3,
    openBankTransactions: 7,
    nextTaxDeadline: { key: "ustva" as const, period: "2026-Q3", due: new Date("2026-11-20T00:00:00Z") },
  };
  for (const messages of [accountingTr, accountingDe]) {
    const items = buildAccountingItems(snapshot, { t: translator(messages) }, today);
    assert.deepEqual(items.map((item) => item.kind), ["overdue-invoices", "overdue-payables", "payables-review", "bank-open", "tax-deadline"]);
    for (const item of items) {
      assert.deepEqual(validateBriefingItem("accounting", item), []);
      assert.ok(item.href.startsWith("/muhasebe"));
    }
    const tax = items.at(-1)!;
    assert.equal(tax.severity, "warning");
    assert.equal(tax.id, "accounting:tax-deadline:ustva-2026-Q3");
    assert.match(tax.title, /2026-Q3/);
  }
  assert.equal(buildAccountingItems(snapshot, { t: translator(accountingTr) }, today)[0].title, "2 vadesi geçmiş fatura");

  for (const messages of [documentsTr, documentsDe]) {
    const items = buildDocumentItems({ overdue: 1, dueSoon: 4, nextDueAt: new Date("2026-11-19T00:00:00Z") }, { t: translator(messages) }, today);
    assert.deepEqual(items.map((item) => [item.id, item.severity, item.dueAt]), [
      ["documents:overdue", "danger", "2026-11-18"],
      ["documents:due-soon", "warning", "2026-11-19"],
    ]);
    for (const item of items) assert.deepEqual(validateBriefingItem("documents", item), []);
  }

  for (const messages of [membersTr, membersDe]) {
    const [item] = buildMemberItems({ overdueDues: 5 }, { t: translator(messages) });
    assert.deepEqual(validateBriefingItem("members", item), []);
    assert.equal(item.href, "/uyeler/aidat");
    assert.ok(item.title.length > 0);
  }
});

test("secretary providers: vergi tarihi ufku", () => {
  const deadlines = [
    { key: "ustva" as const, period: "2026-09", due: new Date("2026-11-10T00:00:00Z") },
    { key: "ustva" as const, period: "2026-10", due: new Date("2026-12-10T00:00:00Z") },
    { key: "annualVat" as const, period: "2025", due: new Date("2026-11-25T00:00:00Z") },
  ];
  assert.equal(pickTaxDeadline(deadlines, today)?.period, "2025");
  assert.equal(pickTaxDeadline(deadlines.slice(0, 2), today), null);
  const info = buildAccountingItems({ ...emptyAccounting, nextTaxDeadline: deadlines[2] }, { t: translator(accountingTr) }, today);
  assert.equal(info[0].severity, "info");
});

test("secretary providers: sözleşme geçerli ve görüntüleme yetkisine bağlı", () => {
  const cases: [ModuleSecretary, string, string][] = [
    [accountingSecretary, "accounting", "SECRETARY"],
    [documentsSecretary, "documents", "TEACHER"],
    [membersSecretary, "members", "VIEWER"],
  ];
  for (const [definition, moduleKey, deniedRole] of cases) {
    assert.deepEqual(validateModuleSecretary(moduleKey, definition), []);
    for (const provider of definition.providers) {
      assert.equal(provider.permission.action, "view");
      assert.equal(can("ADMIN", provider.permission.definition, "view"), true);
      // Yetkisiz rol: toplayıcı (getBriefing) bu sağlayıcıyı hiç çağırmaz.
      assert.equal(can(deniedRole as never, provider.permission.definition, "view"), false);
    }
  }
});
