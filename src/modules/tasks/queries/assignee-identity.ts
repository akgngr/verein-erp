export type TaskActorIdentity={id:string;email:string;verifiedMemberIds?:readonly string[]};

/** AI supplies an explicit verified set, including an empty set for an unlinked account. */
export async function resolveTaskAssigneeIds(actor:TaskActorIdentity,legacyLookup:(email:string)=>Promise<string[]>):Promise<string[]>{
 if(actor.verifiedMemberIds!==undefined)return [...new Set(actor.verifiedMemberIds)];
 // Compatibility for the existing user-facing list; never selected by the AI caller.
 return [actor.id,...await legacyLookup(actor.email)];
}

/**
 * "Bana atananlar" koşulu (#584): yalnız kullanıcının üye kaydına atanmış görevler; kullanıcının
 * oluşturduğu ama başkasına atadığı görevler dahil edilmez. Eşleşen üye kaydı yoksa hiçbir görev dönmez.
 */
export function assignedToMeCondition(memberIds: string[]): { memberId: { in: string[] } } {
  return { memberId: { in: memberIds } };
}
