import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile,unlink } from "node:fs/promises";
import { getDb } from "@/shared/db";
import { allModules } from "@/registry";
import { accessSignature } from "@/shared/modules/module-access";
import { createReferenceScope,saveDataset } from "@/modules/ai/services/references";
import { requestDatasetExport,runDatasetExport } from "@/modules/ai/services/dataset-export";
import { providerRevision } from "@/modules/ai/services/provider-revision";
import { giveAiConsent } from "@/modules/ai/services/consent";
import { loadDuesDataset } from "@/modules/members/automation";
import { openBytes } from "@/shared/security/secret-box";
import { resolveSafePath } from "@/shared/files/storage";
const enabled=Boolean(process.env.AI_TEST_DATABASE_URL);
if(enabled&&process.env.DATABASE_URL!==process.env.AI_TEST_DATABASE_URL)throw new Error("Use an isolated database");
test("server export inserts private names only in the file, rejects stale datasets and revoked actors",{skip:!enabled},async()=>{
 const id=`dataset-test-${randomUUID()}`,memberIds:string[]=[],fileIds:string[]=[];
 const oldFlag=process.env.AI_PERSONAL_EXPORT_ENABLED,oldAuto=process.env.AUTOMATION_ENABLED;
 process.env.AI_PERSONAL_EXPORT_ENABLED="true";process.env.AUTOMATION_ENABLED="true";
 const db=getDb();
 try{
  await db.user.create({data:{id,name:"Test Actor",email:`${id}@example.test`,passwordHash:"test",role:"ADMIN"}});
  for(const key of ["ai","members","exports","automation"]){
   const mod=allModules.find(m=>m.key===key)!;
   await db.systemModuleState.upsert({where:{moduleKey:key},create:{moduleKey:key,isEnabled:true},update:{isEnabled:true}});
   await db.systemSetting.upsert({where:{key:`module-access:${key}`},create:{key:`module-access:${key}`,value:JSON.stringify({signature:accessSignature(mod.access),approvedAt:new Date().toISOString(),approvedBy:id})},update:{value:JSON.stringify({signature:accessSignature(mod.access),approvedAt:new Date().toISOString(),approvedBy:id})}});
  }
  await db.aiSettings.upsert({where:{id:"singleton"},create:{id:"singleton",provider:"local",permissions:{members:["read"],exports:["create"]}},update:{provider:"local",permissions:{members:["read"],exports:["create"]}}});
  await db.aiProviderCredential.upsert({where:{provider:"local"},create:{provider:"local",model:"test",baseUrl:"http://localhost/v1"},update:{model:"test",baseUrl:"http://localhost/v1"}});
  await giveAiConsent(id,"local");
  const revision=await providerRevision("local"),actor={userId:id,conversationId:randomUUID(),policyRevision:revision};
  const member=await db.member.create({data:{year:2001,sequence:Math.floor(Math.random()*1e8),membershipNumber:id,firstName:"PRIVATE_NAME_SENTINEL",lastName:"Only In File",joinDate:new Date("2001-01-01"),createdById:id,createdByLabel:"Test",dues:{create:{year:2001,amountDue:120,dueDate:new Date("2001-02-01"),createdById:id,createdByLabel:"Test"}}}});memberIds.push(member.id);
  const current=await loadDuesDataset(2001),scope=await createReferenceScope(actor,"dues-export");
  const datasetRef=await saveDataset(actor,{scopeId:scope.id,sourceModule:"members",definition:{year:2001},selection:{fingerprint:current.fingerprint},columns:["member.fullName","dues.overdueAmount"]});
  assert.ok(!JSON.stringify({datasetRef,count:current.rows.length}).includes("PRIVATE_NAME_SENTINEL"));
  const job=await requestDatasetExport({datasetRef,format:"csv",columns:["member.fullName","dues.overdueAmount"]},{userId:id,conversationId:actor.conversationId,proposalId:randomUUID()});fileIds.push(job);
  const status=await runDatasetExport(job,new AbortController().signal);
  await runDatasetExport(job,new AbortController().signal);
  assert.equal(await db.generatedFile.count({where:{id:job}}),1);
  assert.ok(!JSON.stringify(status).includes("PRIVATE_NAME_SENTINEL"));
  const encrypted=await readFile(resolveSafePath(`generated/${job}.bin`));
  assert.ok(openBytes("generated-file",encrypted)?.toString().includes("PRIVATE_NAME_SENTINEL"));
  await db.memberDue.update({where:{memberId_year:{memberId:member.id,year:2001}},data:{amountDue:140}});
  const stale=await requestDatasetExport({datasetRef,format:"csv",columns:["member.fullName"]},{userId:id,conversationId:actor.conversationId,proposalId:randomUUID()});
  await assert.rejects(runDatasetExport(stale,new AbortController().signal),/AI_DATASET_STALE_PREVIEW/);
  await db.user.update({where:{id},data:{isActive:false}});
  await assert.rejects(runDatasetExport(stale,new AbortController().signal),/AI_EXPORT_ACCESS_REVOKED/);
 }finally{
  for(const fileId of fileIds){await unlink(resolveSafePath(`generated/${fileId}.bin`)).catch(()=>{});await db.generatedFile.deleteMany({where:{id:fileId}});}
  await db.aiExportRequest.deleteMany({where:{userId:id}});await db.aiReferenceScope.deleteMany({where:{userId:id}});await db.member.deleteMany({where:{id:{in:memberIds}}});await db.aiUserConsent.deleteMany({where:{userId:id}});await db.user.deleteMany({where:{id}});
  if(oldFlag===undefined)delete process.env.AI_PERSONAL_EXPORT_ENABLED;else process.env.AI_PERSONAL_EXPORT_ENABLED=oldFlag;
  if(oldAuto===undefined)delete process.env.AUTOMATION_ENABLED;else process.env.AUTOMATION_ENABLED=oldAuto;
 }
});
test.after(async()=>{if(enabled)await getDb().$disconnect();});
