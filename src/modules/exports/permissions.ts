import { definePermissions } from "@/shared/permissions/define";

/** Herkes yalnızca KENDİ dosyalarını görür ve siler (sorgu kapsamı sahibe bağlıdır). */
export const exportsPermissions = definePermissions("exports", {
  ADMIN: ["view", "create", "delete"],
  BOARD: ["view", "create", "delete"],
  SECRETARY: ["view", "create", "delete"],
  TREASURER: ["view", "create", "delete"],
  AUDITOR: ["view", "create", "delete"],
  // #582: Vergi danışmanı uyum raporunu oluşturabiliyor ama indiremiyordu (403). Dosyalar sahibine bağlı
  // sorgulandığı için yalnız KENDİ dosyalarını görür/siler; `create` yok (YZ dışa aktarım araçları kapalı).
  TAX_ADVISOR: ["view", "delete"],
  TEACHER: ["view", "create", "delete"],
  VIEWER: ["view", "create", "delete"],
});
