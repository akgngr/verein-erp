import { definePermissions } from "@/shared/permissions/define";

/** Faz 5 (§ 3) yetki matrisi — donations.
 * view: listeler/detay/önizleme/PDF/Excel; create+update: bağışçı ve bağış kaydı;
 * delete: bağış/bildirim iptali + bağışçı anonimleştirme; approve: bildirim
 * üretimi (tek/toplu/batch) + metin onayı. AUDITOR bağışçı kişisel verisini
 * GÖREMEZ (§ 3: AUDITOR has no access to donor personal data).
 */
export const donationsPermissions = definePermissions("donations", {
  ADMIN: ["view", "create", "update", "delete", "approve"],
  BOARD: ["view"],
  SECRETARY: [],
  TREASURER: ["view", "create", "update", "delete", "approve"],
  AUDITOR: [],
  VIEWER: [],
});
