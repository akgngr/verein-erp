import "server-only";
import {can} from "@/shared/permissions/define";
import {getLiveMemberIdentity,membersPermissions} from "@/modules/members/automation";
import {getStudentMemberLink,getGuardianMemberLink,studentsPermissions} from "@/modules/students/automation";
import {getUserById,loadPermissionPolicy} from "@/modules/users/automation";
import {listUsableModuleKeys} from "@/modules/system/automation";
import {aiPermissions} from "../permissions";
import {hasAiConsent,getActiveProvider} from "./consent";
import {providerRevision} from "./provider-revision";
import {getAiPermissions,isAllowed} from "./permissions";
import {createEntityReference,resolveEntityReferenceDetails,type ReferenceActor} from "./references";

type IdentityResource="members"|"students"|"guardians"|"users";
async function requireIdentityAccess(actor:ReferenceActor,resource:IdentityResource){
 const [user,policy,modules,matrix,consent,provider]=await Promise.all([getUserById(actor.userId),loadPermissionPolicy(true),listUsableModuleKeys(),getAiPermissions(),hasAiConsent(actor.userId),getActiveProvider()]);
 const studentSource=resource==="students"||resource==="guardians";
 if(!user?.isActive||!consent||!provider||await providerRevision(provider)!==actor.policyRevision||!["ai","members",...(studentSource?["students"]:[])].every(key=>modules.includes(key))||!can(user.role,aiPermissions,"view",policy)||!can(user.role,membersPermissions,"view",policy)||!isAllowed(matrix,"members","read")||(studentSource&&(!can(user.role,studentsPermissions,"view",policy)||!isAllowed(matrix,"students","read"))))throw new Error("AI_IDENTITY_ACCESS_REVOKED");
}

/** Server-only link resolution. No name/email selectors, no parent-as-child inference. */
export async function resolveLinkedMemberReference(actor:ReferenceActor,sourceRef:string,resource:IdentityResource):Promise<string>{
 await requireIdentityAccess(actor,resource);
 const source=await resolveEntityReferenceDetails(actor,sourceRef,resource);
 // No verified user/member relation exists in this schema. Never infer one from email or name.
 if(resource==="users")throw new Error("AI_IDENTITY_UNLINKED");
 const candidate=resource==="members"?source.recordId:resource==="students"?await getStudentMemberLink(source.recordId):await getGuardianMemberLink(source.recordId);
 if(!candidate||!await getLiveMemberIdentity(candidate))throw new Error("AI_IDENTITY_UNLINKED");
 await requireIdentityAccess(actor,resource);
 return createEntityReference(actor,source.scopeId,"members",candidate);
}
