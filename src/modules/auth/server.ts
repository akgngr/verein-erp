import "server-only";

import { Prisma } from "@prisma/client";
import { z } from "zod";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { can, type PermissionAction, type PermissionDefinition } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { auth } from "./auth";
import {
  ActionError,
  ForbiddenError,
  UnauthorizedError,
} from "./errors";
import type { SessionUser } from "./types";

// Hata sınıfları: view'lar ForbiddenError'ı yakalayıp <AccessDenied /> gösterir.
export { ActionError, ForbiddenError, UnauthorizedError } from "./errors";

// Auth.js tam yapılandırmasının public sunucu girişleri (6. bölüm)
export { handlers, auth, signIn, signOut, unstable_update } from "./auth";

// Server action'lar: client bileşenler bunları prop yoluyla alır (server.ts "server-only"
// olduğu için doğrudan client import edilemez).
export { signOutAction } from "./actions/logout";

/** Mevcut oturum kullanıcısını veritabanından tazeleyerek döner; pasif kullanıcı null döner. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const dbUser = await getDb().user.findUnique({ where: { id: session.user.id } });
  if (!dbUser || !dbUser.isActive) return null;

  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    mustChangePassword: dbUser.mustChangePassword,
  };
}

/**
 * Oturumu doğrular ve kullanıcıyı VERİTABANINDAN yeniden okur.
 * Kullanıcı pasife alınmışsa JWT süresi dolmadan etkisiz hale gelir (6. bölüm, md. 6).
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const dbUser = await getDb().user.findUnique({ where: { id: session.user.id } });
  if (!dbUser || !dbUser.isActive) {
    throw new UnauthorizedError("Oturumunuz geçersiz veya hesabınız pasif duruma alınmış.");
  }

  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    mustChangePassword: dbUser.mustChangePassword,
  };
}

/** Oturum + yetki kontrolü; yetki yoksa ForbiddenError fırlatır (7.4). */
export async function requirePermission(
  definition: PermissionDefinition,
  action: PermissionAction,
): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, definition, action)) throw new ForbiddenError();
  return user;
}

export type ActionAuditFn = (args: {
  action: string;
  entity: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}) => Promise<void>;

export type ActionConfig<I, T> = {
  /** Belirtilmezse yalnızca geçerli oturum istenir. */
  permission?: { definition: PermissionDefinition; action: PermissionAction };
  schema: z.ZodType<I>;
  handler: (ctx: { input: I; user: SessionUser; audit: ActionAuditFn }) => Promise<T>;
};

/**
 * Tüm modüllerin server action sarmalayıcısı (10.2):
 * oturum → yetki → zod doğrulama → handler (try/catch) → ActionResult.
 * Prisma P2002 için anlamlı genel mesaj döner; modüller kendi özel mesajlarını
 * handler içinde ActionError ile verebilir.
 */
export function createAction<I, T>(
  config: ActionConfig<I, T>,
): (rawInput: unknown) => Promise<ActionResult<T>> {
  return async function runAction(rawInput: unknown): Promise<ActionResult<T>> {
    try {
      const user = config.permission
        ? await requirePermission(config.permission.definition, config.permission.action)
        : await requireUser();

      const parsed = config.schema.safeParse(rawInput);
      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path.join(".") || "_form";
          (fieldErrors[key] ??= []).push(issue.message);
        }
        return { ok: false, error: "Lütfen formdaki hataları düzeltin.", fieldErrors };
      }

      const userLabel = buildUserLabel(user.name, user.email);
      const audit: ActionAuditFn = async (args) => {
        await writeAudit({ userId: user.id, userLabel, ...args });
      };

      const data = await config.handler({ input: parsed.data, user, audit });
      return { ok: true, data };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return { ok: false, error: "Oturumunuz sona erdi. Lütfen tekrar giriş yapın." };
      }
      if (error instanceof ForbiddenError) {
        return { ok: false, error: "Bu işlem için yetkiniz yok." };
      }
      if (error instanceof ActionError) {
        return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return { ok: false, error: "Bu kayıt zaten mevcut." };
      }
      console.error("[action] Beklenmeyen hata:", error);
      return { ok: false, error: "Beklenmeyen bir hata oluştu." };
    }
  };
}
