import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getDb } from "@/shared/db";
import { claimProposal, finalizeProposal, prepareProposal } from "@/modules/ai/services/proposal-store";
import { createReferenceScope,createEntityReference,resolveEntityReference,revokeAiReferences } from "@/modules/ai/services/references";
import { cleanupAiHistory } from "@/modules/ai/services/cleanup";
const enabled=Boolean(process.env.AI_TEST_DATABASE_URL);
if(enabled && process.env.DATABASE_URL!==process.env.AI_TEST_DATABASE_URL) throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");

test("proposal ownership, expiry and concurrent confirmation are enforced by PostgreSQL",{skip:!enabled},async()=>{
 const userId=`test-${randomUUID()}`,conversationId=randomUUID(),revision="test-revision";
 try{
  const p=await prepareProposal({userId,conversationId,revision,draft:{kind:"module",module:"tasks",action:"create",operation:"create",title:"Test",details:[],payload:{title:"PRIVATE"}}});
  await assert.rejects(claimProposal("other",p.proposalId,revision));
  await assert.rejects(claimProposal(userId,p.proposalId,"different"));
  const claims=await Promise.allSettled([claimProposal(userId,p.proposalId,revision),claimProposal(userId,p.proposalId,revision)]);
  assert.equal(claims.filter(r=>r.status==="fulfilled").length,1);
  await finalizeProposal(p.proposalId,true);
  assert.equal((await claimProposal(userId,p.proposalId,revision)).applied,true);
  await getDb().aiProposal.update({where:{id:p.proposalId},data:{expiresAt:new Date(0)}});
  await assert.rejects(claimProposal(userId,p.proposalId,revision));
 }finally{await getDb().aiProposal.deleteMany({where:{userId}});}
});
test("reference is scoped, revocable and independent of personal data",{skip:!enabled},async()=>{
 const actor={userId:`test-${randomUUID()}`,conversationId:randomUUID(),policyRevision:"test"};
 try{
  const scope=await createReferenceScope(actor,"test"),token=await createEntityReference(actor,scope.id,"members","server-record-id");
  assert.equal(token.length,43);
  assert.equal(await resolveEntityReference(actor,token,"members"),"server-record-id");
  await assert.rejects(resolveEntityReference({...actor,userId:"other"},token,"members"));
  await assert.rejects(resolveEntityReference({...actor,conversationId:"other"},token,"members"));
  await assert.rejects(resolveEntityReference(actor,token,"students"));
  await revokeAiReferences(actor.userId);
  await assert.rejects(resolveEntityReference(actor,token,"members"));
 }finally{await getDb().aiReferenceScope.deleteMany({where:{userId:actor.userId}});}
});
test("cleanup deletes old messages in active conversations without a UI request",{skip:!enabled},async()=>{
 const userId=`test-${randomUUID()}`;
 try{
  const c=await getDb().aiConversation.create({data:{userId,titleEnc:"opaque",messages:{create:[{role:"user",contentEnc:"old",createdAt:new Date(0)},{role:"user",contentEnc:"new"}]}}});
  const result=await cleanupAiHistory(new Date(),userId);
  assert.equal(result.messages,1);
  assert.equal(await getDb().aiMessage.count({where:{conversationId:c.id}}),1);
 }finally{await getDb().aiConversation.deleteMany({where:{userId}});}
});
test.after(async()=>{if(enabled)await getDb().$disconnect();});

test("turn claims and usage counters serialize concurrent requests",{skip:!enabled},async()=>{
 const {claimAiTurn,finishAiTurn}=await import("@/modules/ai/services/turns");
 const {reserveAiUsage}=await import("@/modules/ai/services/usage");
 const userId=`test-${randomUUID()}`;
 const c=await getDb().aiConversation.create({data:{userId,titleEnc:"opaque"}});
 try{
  const results=await Promise.allSettled([claimAiTurn(userId,c.id,"request1"),claimAiTurn(userId,c.id,"request2")]);
  const success=results.filter((r):r is PromiseFulfilledResult<Awaited<ReturnType<typeof claimAiTurn>>>=>r.status==="fulfilled");
  assert.equal(success.length,1);
  await finishAiTurn(userId,c.id,success[0].value.id,{ok:true},true);
  const row=await getDb().aiTurnClaim.findUniqueOrThrow({where:{id:success[0].value.id}});
  assert.deepEqual((await claimAiTurn(userId,c.id,row.requestKey)).cached,{ok:true});
  const limits=await Promise.allSettled(Array.from({length:20},()=>reserveAiUsage(userId,"request")));
  assert.equal(limits.filter(r=>r.status==="fulfilled").length,15);
 }finally{await getDb().aiTurnClaim.deleteMany({where:{userId}});await getDb().aiConversation.delete({where:{id:c.id}});await getDb().aiUsageBucket.deleteMany({where:{scopeKey:{endsWith:`:${userId}`}}});}
});

test("failed byte deletion keeps a retryable tombstone; aged orphan files are reconciled",{skip:!enabled},async()=>{
 const {mkdir,rmdir,writeFile,utimes,access}=await import("node:fs/promises");
 const {resolveSafePath}=await import("@/shared/files/storage");
 const {purgeExpiredFiles,reconcileGeneratedStorage}=await import("@/modules/exports/services/file-cleanup");
 const id=randomUUID(),file=resolveSafePath(`generated/${id}.bin`),orphan=resolveSafePath(`generated/${randomUUID()}.bin`);
 try{
  await mkdir(file,{recursive:true});
  await getDb().generatedFile.create({data:{id,ownerId:"cleanup-test",titleEnc:"opaque",format:"csv",source:"test",sizeBytes:0,expiresAt:new Date(0)}});
  await purgeExpiredFiles();
  assert.equal((await getDb().generatedFile.findUniqueOrThrow({where:{id}})).deletionPending,true);
  await rmdir(file);await purgeExpiredFiles();
  assert.equal(await getDb().generatedFile.findUnique({where:{id}}),null);
  await writeFile(orphan,"opaque");await utimes(orphan,new Date(0),new Date(0));
  await reconcileGeneratedStorage();await assert.rejects(access(orphan));
 }finally{await rmdir(file).catch(()=>{});await getDb().generatedFile.deleteMany({where:{id}});}
});

test("conversation pages are bounded and cursors cannot cross owner/conversation scope",{skip:!enabled},async()=>{
 const {getConversation}=await import("@/modules/ai/services/history");
 const {sealSecret}=await import("@/shared/security/secret-box");
 const userId=`page-test-${randomUUID()}`,db=getDb();
 const c=await db.aiConversation.create({data:{userId,titleEnc:sealSecret("ai-chat-history","Test")}});
 try{
  await db.aiMessage.createMany({data:Array.from({length:105},(_,i)=>({conversationId:c.id,role:"user",contentEnc:sealSecret("ai-chat-history",`line ${i}`),createdAt:new Date(Date.now()-200000+i*1000)}))});
  const first=await getConversation(userId,c.id,40);assert.ok(first);assert.equal(first.turns.length,40);assert.equal(first.pageInfo.hasMore,true);
  const second=await getConversation(userId,c.id,40,first.pageInfo.beforeCursor!);assert.ok(second);assert.equal(second.turns.length,40);
  assert.equal(new Set([...first.turns,...second.turns].map(t=>t.id)).size,80);
  assert.equal(await getConversation("other",c.id,40,first.pageInfo.beforeCursor!),null);
  assert.equal(await getConversation(userId,c.id,40,"unrelated-cursor"),null);
 }finally{await db.aiConversation.delete({where:{id:c.id}});}
});
test("turn messages and cached response commit atomically under the active lease",{skip:!enabled},async()=>{
 const {claimAiTurn,commitAiTurn,getCachedAiTurn}=await import("@/modules/ai/services/turns");
 const {sealSecret}=await import("@/shared/security/secret-box");const db=getDb(),userId=`commit-test-${randomUUID()}`;
 const c=await db.aiConversation.create({data:{userId,titleEnc:sealSecret("ai-chat-history","Test")}});
 try{
  const claim=await claimAiTurn(userId,c.id,"fixed-key");
  await commitAiTurn({userId,conversationId:c.id,id:claim.id,message:"hello",reply:"answer",proposals:[],files:[],response:{ok:true,conversationId:c.id}});
  assert.equal(await db.aiMessage.count({where:{conversationId:c.id}}),2);
  assert.deepEqual(await getCachedAiTurn(userId,"fixed-key",null),{ok:true,conversationId:c.id});
  await assert.rejects(commitAiTurn({userId,conversationId:c.id,id:claim.id,message:"duplicate",reply:"duplicate",proposals:[],files:[],response:{}}));
  assert.equal(await db.aiMessage.count({where:{conversationId:c.id}}),2);
 }finally{await db.aiTurnClaim.deleteMany({where:{userId}});await db.aiConversation.delete({where:{id:c.id}});}
});

test("shared monetary reservations cannot overspend under concurrent model rounds",{skip:!enabled},async()=>{
 const {reserveAiUsage}=await import("@/modules/ai/services/usage");
 const userId=`cost-test-${randomUUID()}`,deployment=`cost-test-${randomUUID()}`;
 const keys=["AI_DEPLOYMENT_ID","AI_DAILY_COST_BUDGET_MICRO_EUR","AI_MODEL_COSTS_JSON"] as const;
 const old=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 process.env.AI_DEPLOYMENT_ID=deployment;process.env.AI_DAILY_COST_BUDGET_MICRO_EUR="1000";
 process.env.AI_MODEL_COSTS_JSON=JSON.stringify({"test:model":{inputMicroEurPerMillion:1000000,outputMicroEurPerMillion:0}});
 try{
  const results=await Promise.allSettled(Array.from({length:20},()=>reserveAiUsage(userId,"model",100,new Date(),{provider:"test",model:"model"})));
  assert.equal(results.filter(r=>r.status==="fulfilled").length,10);
  const bucket=await getDb().aiUsageBucket.findFirstOrThrow({where:{scopeKey:`cost:${deployment}`}});
  assert.equal(bucket.costMicros,1000);assert.equal(bucket.calls,10);
 }finally{
  await getDb().aiUsageBucket.deleteMany({where:{scopeKey:{in:[`cost:${deployment}`,`model:${userId}`]}}});
  for(const key of keys){if(old[key]===undefined)delete process.env[key];else process.env[key]=old[key];}
 }
});
