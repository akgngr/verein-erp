import "server-only";
import { randomUUID } from "node:crypto";
import { getDb } from "@/shared/db";
import { sealSecret,openSecret } from "@/shared/security/secret-box";

export async function claimAiTurn(userId:string,conversationId:string,requestKey:string) {
  const db=getDb();
  return db.$transaction(async tx=>{
    const old=await tx.aiTurnClaim.findUnique({where:{userId_conversationId_requestKey:{userId,conversationId,requestKey}}});
    if(old?.status==="DONE"&&old.resultEnc) {
      const result=openSecret("ai-turn",old.resultEnc);
      if(!result)throw new Error("AI_TURN_UNREADABLE");
      return {cached:JSON.parse(result) as unknown,id:old.id};
    }
    if(old)throw new Error("AI_TURN_BUSY");
    const now=new Date(),id=randomUUID();
    const lease=await tx.aiConversation.updateMany({where:{id:conversationId,userId,OR:[{activeTurnId:null},{turnLeaseExpiresAt:{lte:now}}]},data:{activeTurnId:id,turnLeaseExpiresAt:new Date(now.getTime()+150_000)}});
    if(lease.count!==1)throw new Error("AI_TURN_BUSY");
    await tx.aiTurnClaim.create({data:{id,userId,conversationId,requestKey,leaseExpiresAt:new Date(now.getTime()+150_000)}});
    return {cached:null,id};
  });
}
export async function finishAiTurn(userId:string,conversationId:string,id:string,result:unknown,success:boolean) {
  const db=getDb();
  await db.$transaction([
    db.aiTurnClaim.updateMany({where:{id,userId,status:"RUNNING"},data:{status:success?"DONE":"FAILED",resultEnc:success?sealSecret("ai-turn",JSON.stringify(result)):null}}),
    db.aiConversation.updateMany({where:{id:conversationId,userId,activeTurnId:id},data:{activeTurnId:null,turnLeaseExpiresAt:null,revision:{increment:1}}}),
  ]);
}
