export type TaskActorIdentity={id:string;email:string;verifiedMemberIds?:readonly string[]};

/** AI supplies an explicit verified set, including an empty set for an unlinked account. */
export async function resolveTaskAssigneeIds(actor:TaskActorIdentity,legacyLookup:(email:string)=>Promise<string[]>):Promise<string[]>{
 if(actor.verifiedMemberIds!==undefined)return [...new Set(actor.verifiedMemberIds)];
 // Compatibility for the existing user-facing list; never selected by the AI caller.
 return [actor.id,...await legacyLookup(actor.email)];
}
