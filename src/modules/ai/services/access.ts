import "server-only";
import { ActionError, requireUser } from "@/modules/auth/server";
import { can } from "@/shared/permissions/define";
import { listUsableModuleKeys } from "@/modules/system/server";
import { checkCurrentAiAccess } from "./access-policy";
import { aiPermissions } from "../permissions";
import { getActiveProvider, hasAiConsent } from "./consent";
import type { AiProviderId } from "./providers/registry";

/** Reload the actor and policy at each execution boundary, not only at discovery. */
export async function requireCurrentAiAccess(expectedUserId: string, expectedProvider?: AiProviderId) {
  const access = await checkCurrentAiAccess(expectedUserId, expectedProvider, {
    user: requireUser,
    modules: listUsableModuleKeys,
    consent: hasAiConsent,
    provider: getActiveProvider,
    allowed: user => can(user.role, aiPermissions, "view"),
  });
  if (!access) throw new ActionError("ai.errors.permissionRevoked");
  return access;
}
