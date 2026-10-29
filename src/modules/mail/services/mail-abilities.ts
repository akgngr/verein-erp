import "server-only";

import { ForbiddenError, UnauthorizedError, requirePermission } from "@/modules/auth/server";
import { mailPermissions } from "../permissions";
import type { MailAbilities } from "../types";

async function hasMailPermission(action: "view" | "create" | "update"): Promise<boolean> {
  try {
    await requirePermission(mailPermissions, action);
    return true;
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof UnauthorizedError) return false;
    throw error;
  }
}

export async function getMailAbilities(): Promise<MailAbilities> {
  const [canView, canSendTest, canUpdate] = await Promise.all([
    hasMailPermission("view"),
    hasMailPermission("create"),
    hasMailPermission("update"),
  ]);
  return { canView, canSendTest, canUpdate };
}
