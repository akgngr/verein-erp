import { definePermissions } from "@/shared/permissions/define";

/**
 * Banka bağlantısı: görme (view), senkronize etme (update), bağlantı kurma/kaldırma ve sağlayıcı
 * anahtarlarını yönetme (approve). Hareketler muhasebe → Banka ekranında eşleştirilir.
 */
export const bankingPermissions = definePermissions("banking", {
  ADMIN: ["view", "update", "approve"],
  BOARD: ["view"],
  SECRETARY: [],
  TREASURER: ["view", "update", "approve"],
  AUDITOR: ["view"],
  TEACHER: [],
  VIEWER: [],
});
