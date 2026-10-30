import fs from "node:fs";
import path from "node:path";

import type { ModuleAccessRequest } from "../types/module";

/**
 * Modüller arası erişim izinleri (yönetici onayı). Modül durumları gibi src/config altında
 * dosyada tutulur (modules-state.json ile aynı yaklaşım). Onay, modülün bildirdiği erişim
 * listesinin imzasına bağlıdır: modül güncellenip yeni erişim isterse onay kendiliğinden düşer.
 */
const ACCESS_FILE = path.join(process.cwd(), "src", "config", "module-access.json");

export type ModuleAccessApproval = { signature: string; approvedAt: string; approvedBy: string };

/** Erişim listesinin sıradan bağımsız imzası ("accounting:read,write|users:write"). */
export function accessSignature(access: ModuleAccessRequest[] | undefined): string {
  return [...(access ?? [])]
    .map((request) => `${request.module}:${[...new Set(request.operations)].sort().join(",")}`)
    .sort()
    .join("|");
}

export function getAccessApprovals(): Record<string, ModuleAccessApproval> {
  try {
    if (fs.existsSync(ACCESS_FILE)) return JSON.parse(fs.readFileSync(ACCESS_FILE, "utf8"));
  } catch {
    // Bozuk dosya: hiçbir onay yok sayılır (güvenli taraf).
  }
  return {};
}

/** Modülün bildirdiği erişim onaylı mı (erişim istemeyen modül her zaman onaylıdır). */
export function isAccessApproved(key: string, access: ModuleAccessRequest[] | undefined): boolean {
  const signature = accessSignature(access);
  return signature === "" || getAccessApprovals()[key]?.signature === signature;
}

export function setAccessApproval(key: string, approval: ModuleAccessApproval | null): void {
  const approvals = getAccessApprovals();
  if (approval) approvals[key] = approval;
  else delete approvals[key];
  fs.mkdirSync(path.dirname(ACCESS_FILE), { recursive: true });
  fs.writeFileSync(ACCESS_FILE, `${JSON.stringify(approvals, null, 2)}\n`, "utf8");
}
