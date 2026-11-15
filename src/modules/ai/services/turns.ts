import "server-only";
import { aiRetentionCutoff } from "./retention";
import { randomUUID } from "node:crypto";
import { getDb } from "@/shared/db";
import { sealSecret,openSecret } from "@/shared/security/secret-box";

export async function claimAiTurn(userId:string,conversationId:string,requestKey:string) {
  const db=getDb();
  return db.$transaction(async tx=>{
    const old=await tx.aiTurnClaim.findUnique({where:{userId_requestKey:{userId,requestKey}}});
    if(old && old.conversationId!==conversationId)throw new Error("AI_TURN_BUSY");
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

export async function getCachedAiTurn(userId:string,requestKey:string,conversationId:string|null) {
  const row=await getDb().aiTurnClaim.findUnique({where:{userId_requestKey:{userId,requestKey}}});
  if(!row)return null;
  const conversation=await getDb().aiConversation.findFirst({where:{id:row.conversationId,userId,updatedAt:{gt:aiRetentionCutoff()}},select:{id:true}});
  if(!conversation)throw new Error("AI_TURN_FAILED");
  if(conversationId && row.conversationId!==conversationId)throw new Error("AI_TURN_BUSY");
  if(row.status==="RUNNING"&&row.leaseExpiresAt<=new Date()){
    await getDb().aiTurnClaim.updateMany({where:{id:row.id,status:"RUNNING",leaseExpiresAt:{lte:new Date()}},data:{status:"FAILED"}});
    throw new Error("AI_TURN_FAILED");
  }
  if(row.status==="FAILED")throw new Error("AI_TURN_FAILED");
  if(row.status!=="DONE"||!row.resultEnc)throw new Error("AI_TURN_BUSY");
  const text=openSecret("ai-turn",row.resultEnc);if(!text)throw new Error("AI_TURN_UNREADABLE");
  return JSON.parse(text) as unknown;
}
export async function commitAiTurn(args:{userId:string;conversationId:string;id:string;message:string;reply:string;proposals:unknown;files:unknown;response:unknown}) {
  const db=getDb();
  await db.$transaction(async tx=>{
    const lease=await tx.aiConversation.updateMany({where:{id:args.conversationId,userId:args.userId,activeTurnId:args.id,turnLeaseExpiresAt:{gt:new Date()}},data:{activeTurnId:null,turnLeaseExpiresAt:null,revision:{increment:1},updatedAt:new Date()}});
    if(lease.count!==1)throw new Error("AI_TURN_BUSY");
    const claim=await tx.aiTurnClaim.updateMany({where:{id:args.id,userId:args.userId,status:"RUNNING"},data:{status:"DONE",resultEnc:sealSecret("ai-turn",JSON.stringify(args.response))}});
    if(claim.count!==1)throw new Error("AI_TURN_BUSY");
    await tx.aiMessage.createMany({data:[{conversationId:args.conversationId,role:"user",contentEnc:sealSecret("ai-chat-history",args.message)},{conversationId:args.conversationId,role:"assistant",contentEnc:sealSecret("ai-chat-history",args.reply),proposalsEnc:sealSecret("ai-chat-history",JSON.stringify({proposals:args.proposals,files:args.files}))}]});
  });
}
