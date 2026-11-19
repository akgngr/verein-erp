/**
 * #291 — Sekreter "Bugün" kartının Panel yüzeyine bağlanması: tanım, yetki ve modül kapısı.
 * Görsel/klavye/tema/mobil doğrulaması CI'daki tarayıcı smoke testindedir (scripts/check-hydration.ts).
 */
import assert from "node:assert/strict";
import test from "node:test";

import { cards } from "@/modules/secretary/cards";
import { moduleConfig } from "@/modules/secretary/module.config";
import { getDb } from "@/shared/db";
import { accessSignature, isAccessApproved } from "@/shared/modules/module-access";
import { can } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";

const [today] = cards;

test("panel card: sağ üst yüzey (panel.home/aside), kaynak sayfa ve sekreter yetkisi", () => {
  assert.equal(cards.length, 1);
  assert.equal(today.key, "today");
  assert.deepEqual(today.surfaces, [{ key: "panel.home", placement: "aside" }]);
  assert.equal(today.href, "/sekreter");
  assert.equal(today.defaultVisible, false, "ızgarada ikinci kopya olmasın; yüzeyde sabit");
  assert.equal(today.permission.action, "view");
  const allowed: Role[] = ["ADMIN", "BOARD", "SECRETARY", "TREASURER", "AUDITOR", "TEACHER"];
  for (const role of allowed) assert.equal(can(role, today.permission.definition, "view"), true, role);
  assert.equal(can("VIEWER", today.permission.definition, "view"), false, "yetkisiz rol kartı görmez");
});

test("panel card: EXTENSION modül erişimi onaylanmadan kullanılabilir sayılmaz", () => {
  assert.equal(moduleConfig.category, "EXTENSION");
  const signature = accessSignature(moduleConfig.access);
  assert.notEqual(signature, "");
  assert.equal(isAccessApproved(moduleConfig, undefined), false, "onay kaydı yoksa kart listelenmez");
  assert.equal(isAccessApproved(moduleConfig, { signature, approvedAt: "x", approvedBy: "x" }), true);
  assert.equal(isAccessApproved(moduleConfig, { signature: "eski-imza", approvedAt: "x", approvedBy: "x" }), false, "erişim değişince yeniden onay");
  assert.equal(isAccessApproved(moduleConfig, { revoked: true, revokedAt: "x" }), false);
});

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);

test("panel card: modül kapalıyken veya onaysızken kullanılabilir modüller listesinde yok (gerçek DB)", { skip: !enabled }, async () => {
  const db = getDb();
  const { listUsableModuleKeys } = await import("@/modules/system/automation");
  const stateBefore = await db.systemModuleState.findUnique({ where: { moduleKey: "secretary" } });
  const accessKey = "module-access:secretary";
  const accessBefore = await db.systemSetting.findUnique({ where: { key: accessKey } });
  const setState = (isEnabled: boolean) =>
    db.systemModuleState.upsert({ where: { moduleKey: "secretary" }, create: { moduleKey: "secretary", isEnabled }, update: { isEnabled } });
  const setAccess = (value: string | null) =>
    value === null
      ? db.systemSetting.deleteMany({ where: { key: accessKey } })
      : db.systemSetting.upsert({ where: { key: accessKey }, create: { key: accessKey, value, description: "test" }, update: { value } });
  try {
    await setState(false);
    await setAccess(JSON.stringify({ signature: accessSignature(moduleConfig.access), approvedAt: "x", approvedBy: "test" }));
    assert.ok(!(await listUsableModuleKeys()).includes("secretary"), "kapalı modül");

    await setState(true);
    await setAccess(null);
    assert.ok(!(await listUsableModuleKeys()).includes("secretary"), "onaysız erişim");

    await setAccess(JSON.stringify({ signature: accessSignature(moduleConfig.access), approvedAt: "x", approvedBy: "test" }));
    assert.ok((await listUsableModuleKeys()).includes("secretary"), "açık ve onaylı");
  } finally {
    if (stateBefore) await db.systemModuleState.update({ where: { moduleKey: "secretary" }, data: { isEnabled: stateBefore.isEnabled } });
    else await db.systemModuleState.deleteMany({ where: { moduleKey: "secretary" } });
    if (accessBefore) await setAccess(accessBefore.value);
    else await setAccess(null);
  }
});
