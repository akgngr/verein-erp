import "server-only";

import { getDb } from "@/shared/db";
import type { Role } from "@/shared/roles";

/** Yönetici dizini (ör. bildirim aboneleri): ad/e-posta araması, sayfalı; parola vb. alan yok. */
export async function listUserDirectory(options: { q?: string; skip: number; take: number; ids?: readonly string[] }): Promise<{ rows: { id: string; name: string; email: string; role: Role; isActive: boolean }[]; total: number }> {
  const q = options.q?.trim().slice(0, 80);
  const where = {
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }] } : {}),
    ...(options.ids ? { id: { in: [...options.ids] } } : {}),
  };
  const db = getDb();
  const [rows, total] = await Promise.all([
    db.user.findMany({ where, select: { id: true, name: true, email: true, role: true, isActive: true }, orderBy: { name: "asc" }, skip: options.skip, take: Math.min(options.take, 100) }),
    db.user.count({ where }),
  ]);
  return { rows: rows as { id: string; name: string; email: string; role: Role; isActive: boolean }[], total };
}
