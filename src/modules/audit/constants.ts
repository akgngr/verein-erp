/** Denetim kaydı "İşlem" filtresi seçenekleri ve etiketleri. */
export const AUDIT_ACTION_OPTIONS = [
  { value: "LOGIN_SUCCESS", label: "Giriş (başarılı)" },
  { value: "LOGIN_FAILED", label: "Giriş (başarısız)" },
  { value: "LOGOUT", label: "Çıkış" },
  { value: "CREATE", label: "Oluşturma" },
  { value: "UPDATE", label: "Güncelleme" },
  { value: "DEACTIVATE", label: "Pasife alma" },
  { value: "ACTIVATE", label: "Aktifleştirme" },
  { value: "PASSWORD_CHANGE", label: "Parola değişimi" },
  { value: "PASSWORD_RESET", label: "Parola sıfırlama" },
] as const;

/** Denetim kaydı "Varlık" filtresi seçenekleri ve etiketleri. */
export const AUDIT_ENTITY_OPTIONS = [
  { value: "User", label: "Kullanıcı" },
  { value: "Auth", label: "Oturum" },
] as const;

export const AUDIT_ACTION_LABELS: Record<string, string> = Object.fromEntries(
  AUDIT_ACTION_OPTIONS.map((option) => [option.value, option.label]),
);

export const AUDIT_ENTITY_LABELS: Record<string, string> = Object.fromEntries(
  AUDIT_ENTITY_OPTIONS.map((option) => [option.value, option.label]),
);
