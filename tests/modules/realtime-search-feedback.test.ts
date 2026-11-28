import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  decodePgNotificationPayload,
  encodePgNotificationPayload,
  NOTIFICATION_PG_CHANNEL,
} from "../../src/modules/notifications/services/stream-bus";
import { formatFeedbackVersionContext } from "../../src/modules/feedback/services/context-version";
import { notifications as feedbackNotifications } from "../../src/modules/feedback/notifications";
import {
  filterQuickSearchItems,
  normalizeSearchText,
  type QuickSearchItem,
} from "../../src/shared/search/types";

describe("Roadmap E2.7 Realtime SSE, Feedback Context & Global Quick Search (#633)", () => {
  it("encodes and decodes cross-process Postgres LISTEN/NOTIFY payloads while skipping self-echoes and invalid tokens", () => {
    assert.equal(NOTIFICATION_PG_CHANNEL, "verein_notifications");
    const encoded = encodePgNotificationPayload("instA123", "user_42");
    assert.equal(encoded, "instA123:user_42");

    // Self-echo from the same process instance is ignored
    assert.equal(decodePgNotificationPayload(encoded ?? undefined, "instA123"), null);
    // Remote process notification is dispatched to the target user
    assert.equal(decodePgNotificationPayload(encoded ?? undefined, "instB999"), "user_42");

    // Rejects PII / spaces / injection characters
    assert.equal(encodePgNotificationPayload("instA", "user@example.com"), null);
    assert.equal(encodePgNotificationPayload("instA", "a; DROP TABLE users;"), null);
    assert.equal(decodePgNotificationPayload("malformed", "instB"), null);
    assert.equal(decodePgNotificationPayload("instA:has space", "instB"), null);
  });

  it("enriches feedback version context with active module key and version from pageUrl", () => {
    const withModule = formatFeedbackVersionContext("/muhasebe/banka?tab=open", "0.41.0");
    assert.ok(withModule?.startsWith("0.41.0 · accounting@"), `Unexpected context: ${withModule}`);

    const withFullUrl = formatFeedbackVersionContext("https://app.example.org/evrak/doc-1", "0.41.0");
    assert.ok(withFullUrl?.startsWith("0.41.0 · documents@"), `Unexpected context: ${withFullUrl}`);

    assert.equal(formatFeedbackVersionContext("/", "0.41.0"), "0.41.0");
    assert.equal(formatFeedbackVersionContext(null, "0.41.0"), "0.41.0");
  });

  it("registers feedback.replied notification type with safe detail href and strict schema", () => {
    assert.equal(feedbackNotifications.module, "feedback");
    const replied = feedbackNotifications.types.find((t) => t.key === "replied");
    assert.ok(replied, "feedback.replied notification type must be registered");
    assert.equal(replied.href({ id: "fb_123", number: 7 }), "/geri-bildirim/fb_123");
    assert.equal(replied.schema.safeParse({ id: "fb_123", number: 7 }).success, true);
    assert.equal(replied.schema.safeParse({ id: "fb_123", number: -1 }).success, false);
  });

  it("filters quick-search navigation items across Turkish/German diacritics and ranks prefix matches first", () => {
    assert.equal(normalizeSearchText("Üyeler & Bağışlar · Straße"), "uyeler & bagislar · strasse");

    const catalog: QuickSearchItem[] = [
      { id: "1", kind: "page", moduleKey: "members", title: "Üyeler", href: "/uyeler" },
      { id: "2", kind: "page", moduleKey: "donations", title: "Bağışlar", href: "/bagislar" },
      { id: "3", kind: "page", moduleKey: "accounting", title: "Banka eşleştirme", subtitle: "Muhasebe", href: "/muhasebe/banka" },
      { id: "4", kind: "page", moduleKey: "documents", title: "Evrak Kayıt", href: "/evrak" },
    ];

    const uyeMatches = filterQuickSearchItems(catalog, "uye");
    assert.equal(uyeMatches.length, 1);
    assert.equal(uyeMatches[0]?.href, "/uyeler");

    const bagisMatches = filterQuickSearchItems(catalog, "bagis");
    assert.equal(bagisMatches.length, 1);
    assert.equal(bagisMatches[0]?.href, "/bagislar");

    const multiTerm = filterQuickSearchItems(catalog, "muhasebe banka");
    assert.equal(multiTerm.length, 1);
    assert.equal(multiTerm[0]?.href, "/muhasebe/banka");
  });

  it("enforces server-side authentication, usable modules, and per-module view RBAC in /api/search", () => {
    const src = readFileSync(
      path.join(process.cwd(), "src/app/api/search/route.ts"),
      "utf8",
    );
    assert.ok(src.includes("await requireUser()"));
    assert.ok(src.includes("listUsableModuleKeys()"));
    for (const perm of [
      'mayView("members", membersPermissions)',
      'mayView("documents", documentsPermissions)',
      'mayView("meetings", meetingsPermissions)',
      'mayView("tasks", tasksPermissions)',
      'mayView("events", eventsPermissions)',
      'mayView("inventory", inventoryPermissions)',
    ]) {
      assert.ok(src.includes(perm), `/api/search must enforce ${perm}`);
    }
  });

  it("applies the list pages' time-boxed reviewer rule and answers a pending password change without a 500", () => {
    const src = readFileSync(path.join(process.cwd(), "src/app/api/search/route.ts"), "utf8");
    const gate = src.slice(src.indexOf("const mayView"), src.indexOf('if (await mayView("members"'));
    assert.ok(gate.includes('can(sessionUser.role, definition, "view")'), "role permission first");
    assert.ok(gate.includes("isTimeBoxedRole(sessionUser.role)"), "time-boxed roles take the grant check");
    assert.ok(gate.includes('await requirePermission(definition, "view")'), "same grant check and audit as the list pages");
    assert.doesNotMatch(src, /if \(usable\.has\("[a-z]+"\) && can\(user\.role/, "no module may bypass mayView");
    assert.match(src, /error instanceof ForbiddenError\) \{\s*return NextResponse\.json\(\{ ok: false, items: \[\] \}, \{ status: 403 \}\)/);
  });

  it("offers submenu pages only to roles the sidebar would show them to (home permission fallback)", async () => {
    const { registry } = await import("../../src/registry");
    const { collectQuickSearchNavItems } = await import("../../src/shared/search/nav-items");
    const labels = { panel: "Panel", nav: () => "nav", menu: () => "menu", module: () => "module" };
    const hrefs = (role: "TEACHER" | "ADMIN") =>
      collectQuickSearchNavItems({ modules: registry, activeModuleKeys: ["students"], role, labels }).map((item) => item.href);
    assert.ok(hrefs("ADMIN").includes("/ogrenciler/veliler"));
    assert.ok(!hrefs("TEACHER").includes("/ogrenciler/veliler"), "students.view is denied to TEACHER, so is its guardians submenu");
    assert.ok(!hrefs("TEACHER").includes("/ogrenciler"));
  });

  it("links inventory results with the list page's q parameter and listens on the direct database URL", () => {
    const route = readFileSync(path.join(process.cwd(), "src/app/api/search/route.ts"), "utf8");
    assert.ok(route.includes("`/inventory?q=${encodeURIComponent(item.name)}`"));
    const helpers = readFileSync(path.join(process.cwd(), "src/modules/inventory/helpers/inventory-helpers.ts"), "utf8");
    assert.ok(helpers.includes("getSingleParam(params.q)"), "inventory list reads ?q=");
    const bus = readFileSync(path.join(process.cwd(), "src/modules/notifications/services/stream-bus.ts"), "utf8");
    assert.ok(bus.includes("process.env.DIRECT_URL || process.env.DATABASE_URL"), "LISTEN must avoid the transaction pooler");
  });
});
