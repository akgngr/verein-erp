import "server-only";
import { getUserById,loadPermissionPolicy } from "@/modules/users/automation";
import { listUsableModuleKeys } from "@/modules/system/automation";
import { memberPaymentsPermissions } from "@/modules/members/automation";
import { exportsPermissions } from "@/modules/exports/automation";
import { can } from "@/shared/permissions/define";
import { aiPermissions } from "../permissions";
import { hasAiConsent,getActiveProvider } from "./consent";
import { providerRevision } from "./provider-revision";
import { getAiPermissions,isAllowed } from "./permissions";
export async function requireExportWorkerAccess(userId:string,revision:string) {
 const [user,policy,modules,consent,provider,matrix]=await Promise.all([getUserById(userId),loadPermissionPolicy(true),listUsableModuleKeys(),hasAiConsent(userId),getActiveProvider(),getAiPermissions()]);
 if(!user?.isActive||!consent||!provider||await providerRevision(provider)!==revision||!["ai","exports","members","automation"].every(m=>modules.includes(m))||!isAllowed(matrix,"members","read")||!isAllowed(matrix,"exports","create")||!can(user.role,aiPermissions,"view",policy)||!can(user.role,memberPaymentsPermissions,"view",policy)||!can(user.role,exportsPermissions,"create",policy))throw new Error("AI_EXPORT_ACCESS_REVOKED");
 return user;
}
