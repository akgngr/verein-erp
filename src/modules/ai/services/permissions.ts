import "server-only";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";

/**
 * Asistanın modül bazında izin matrisi: her modül için okuma / oluşturma / güncelleme / silme
 * ayrı ayrı "izin ver / izin verme". KARAR (KVKK/DSGVO): varsayılan hepsi KAPALI; matriste
 * işaretlenmeyen hiçbir işlemin aracı modele sunulmaz. Yazma işlemleri ayrıca her seferinde
 * kullanıcının karttan onayını ve kendi rol yetkisini gerektirir.
 */
export const AI_OPERATIONS = ["read", "create", "update", "delete"] as const;
export type AiOperation = (typeof AI_OPERATIONS)[number];
export type AiPermissionMatrix = Record<string, AiOperation[]>;

const isOperation = (value: unknown): value is AiOperation => (AI_OPERATIONS as readonly unknown[]).includes(value);

export function sanitizeMatrix(raw: unknown, allowed: Record<string, AiOperation[]>): AiPermissionMatrix {
  const matrix: AiPermissionMatrix = {};
  if (!raw || typeof raw !== "object") return matrix;
  for (const [module, ops] of Object.entries(raw as Record<string, unknown>)) {
    const supported = allowed[module];
    if (!supported || !Array.isArray(ops)) continue;
    const kept = AI_OPERATIONS.filter((op) => ops.some((value) => isOperation(value) && value === op) && supported.includes(op));
    if (kept.length) matrix[module] = kept;
  }
  return matrix;
}

export async function getAiPermissions(): Promise<AiPermissionMatrix> {
  const row = await getDb().aiSettings.findUnique({ where: { id: "singleton" } });
  const raw = row?.permissions;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as AiPermissionMatrix;
}

export async function setAiPermissions(matrix: AiPermissionMatrix): Promise<void> {
  const permissions = matrix as unknown as Prisma.InputJsonValue;
  await getDb().aiSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", provider: "", permissions },
    update: { permissions },
  });
}

export function isAllowed(matrix: AiPermissionMatrix, module: string, operation: AiOperation): boolean {
  return matrix[module]?.includes(operation) ?? false;
}
