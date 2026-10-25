import "server-only";

import type { Prisma } from "@prisma/client";
import { headers } from "next/headers";

import { getDb } from "@/shared/db";

export type WriteAuditInput = {
  userId?: string | null;
  userLabel?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
};

/** `changes` içinden parola içerebilecek alanlar otomatik olarak temizlenir. */
const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "currentPassword",
  "newPassword",
  "confirmPassword",
  "temporaryPassword",
  "tempPassword",
  "plainPassword",
]);

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key)) continue;
      output[key] = sanitize(item);
    }
    return output;
  }
  return value;
}

/**
 * Denetim kaydı yazar. Yazım hatası ana işlemi ASLA bozmaz
 * (hata yalnızca sunucu loguna yazılır).
 */
export async function writeAudit(input: WriteAuditInput): Promise<void> {
  try {
    let ip = input.ip ?? null;
    if (!ip) {
      try {
        const requestHeaders = await headers();
        ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
      } catch {
        // headers() yalnızca istek bağlamında kullanılabilir (seed vb. bağlamlarda yoktur).
      }
    }

    const hasChanges = input.before !== undefined || input.after !== undefined;

    await getDb().auditLog.create({
      data: {
        userId: input.userId ?? null,
        userLabel: input.userLabel ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        changes: hasChanges
          ? ({
              before: sanitize(input.before ?? null),
              after: sanitize(input.after ?? null),
            } as Prisma.InputJsonValue)
          : undefined,
        ip,
      },
    });
  } catch (error) {
    console.error("[audit] Denetim kaydı yazılamadı:", error);
  }
}
