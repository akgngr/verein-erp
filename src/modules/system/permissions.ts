/**
 * #583: Tek tanım. `system` ve `settings` izinleri `@/shared/permissions/system` içinde tanımlıdır (paylaşılan
 * altyapı ve üretilen izin kaydı oradan okur). Önceden burada ayrışmış bir kopya vardı (TAX_ADVISOR'a
 * `settings.view` yok); izin kaydı önce bu kopyayı gördüğü için Roller ekranı ile kod farklı karar veriyordu.
 */
export { settingsPermissions, systemPermissions } from "@/shared/permissions/system";
