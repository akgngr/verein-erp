import { definePermissions } from "@/shared/permissions/define";

export const mailPermissions = definePermissions("mail", {
  ADMIN: ["view", "create", "update"],
  BOARD: [],
  SECRETARY: [],
  TREASURER: [],
  AUDITOR: ["view"],
  TEACHER: [],
  VIEWER: [],
});

/**
 * Gelen kutusu (IMAP / .eml içe aktarma): görme ve eki muhasebeye aktarma (create);
 * IMAP ayarları ve e-posta silme (update/delete). Gelen e-postalar kişisel veri içerir.
 */
export const mailInboxPermissions = definePermissions("mailInbox", {
  ADMIN: ["view", "create", "update", "delete"],
  BOARD: [],
  SECRETARY: [],
  TREASURER: ["view", "create"],
  AUDITOR: [],
  TEACHER: [],
  VIEWER: [],
});
