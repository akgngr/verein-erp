import type { ModuleAccessRequest, ModuleCategory } from "../types/module";

/**
 * Modüller arası erişim izinleri (yönetici onayı). Kayıtlar veritabanında tutulur
 * (src/modules/system/services/module-access-store.ts); burada yalnızca saf kurallar var.
 * Onay, modülün bildirdiği erişim listesinin imzasına bağlıdır: modül güncellenip yeni erişim
 * isterse onay kendiliğinden düşer.
 */
export type ModuleAccessApproval = { signature: string; approvedAt: string; approvedBy: string };

/** Kayıt: onay ya da yöneticinin geri aldığı izin. */
export type ModuleAccessRecord = ModuleAccessApproval | { revoked: true; revokedAt: string };

/** Erişim listesinin sıradan bağımsız imzası ("accounting:read,write|users:write"). */
export function accessSignature(access: ModuleAccessRequest[] | undefined): string {
  return [...(access ?? [])]
    .map((request) => `${request.module}:${[...new Set(request.operations)].sort().join(",")}`)
    .sort()
    .join("|");
}

/**
 * Modülün bildirdiği erişim onaylı mı. Erişim istemeyen modül her zaman onaylıdır.
 * Kayıt yoksa: resmi (OFFICIAL) modüller projeyle birlikte onaylı gelir; eklentiler izin bekler.
 *
 * KARAR (#583): Çekirdek (CORE) modüller platformun parçasıdır, kapatılamaz ve kullanılabilirlik denetimi
 * (module-availability.ts) onları zaten onaydan bağımsız sayar. Bu yüzden erişimleri her zaman onaylıdır;
 * önceden yeni kurulumda "izin bekliyor" görünüyor ve her sürüm güncellemesinde yeniden onay istiyordu.
 */
export function isAccessApproved(
  mod: { category: ModuleCategory; access?: ModuleAccessRequest[] },
  record: ModuleAccessRecord | undefined,
): boolean {
  if (mod.category === "CORE") return true;
  const signature = accessSignature(mod.access);
  if (signature === "") return true;
  if (!record) return mod.category === "OFFICIAL";
  return !("revoked" in record) && record.signature === signature;
}
