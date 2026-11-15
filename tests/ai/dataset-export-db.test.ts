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
  const paid=await db.member.create({data:{year:2001,sequence:Math.floor(Math.random()*1e8),membershipNumber:`paid-${id}`,firstName:"PRIVATE_NAME_SENTINEL",lastName:"Only In File",joinDate:new Date("2001-01-01"),createdById:id,createdByLabel:"Test",dues:{create:{year:2001,amountDue:10,status:"PAID",dueDate:new Date("2001-02-01"),createdById:id,createdByLabel:"Test"}}}});memberIds.push(paid.id);
  for(let i=0;i<101;i++){
   const extra=await db.member.create({data:{year:2001,sequence:Math.floor(Math.random()*1e8),membershipNumber:`${id}-${i}`,firstName:"PRIVATE_NAME_SENTINEL",lastName:"Only In File",joinDate:new Date("2001-01-01"),createdById:id,createdByLabel:"Test",dues:{create:{year:2001,amountDue:120,dueDate:new Date("2001-02-01"),createdById:id,createdByLabel:"Test"}}}});memberIds.push(extra.id);
  }
  const filtered=await loadDuesDataset({year:2001,status:"PAID"});assert.equal(filtered.rows.length,1);assert.equal(filtered.rows[0].memberId,paid.id);
  assert.equal((await loadDuesDataset({year:2001,minimumRemainingCents:12001})).rows.length,0);
  assert.equal((await loadDuesDataset({year:2001,maximumRemainingCents:12000})).rows.length,102);
  const current=await loadDuesDataset(2001),scope=await createReferenceScope(actor,"dues-export");
  const datasetRef=await saveDataset(actor,{scopeId:scope.id,sourceModule:"members",definition:{year:2001},selection:{fingerprint:current.fingerprint},columns:["member.fullName","dues.overdueAmount"]});
  assert.ok(!JSON.stringify({datasetRef,count:current.rows.length}).includes("PRIVATE_NAME_SENTINEL"));
  const proposalId=randomUUID();
  const jobs=await Promise.all(Array.from({length:2},()=>requestDatasetExport({datasetRef,format:"csv",columns:["member.fullName","dues.overdueAmount"]},{userId:id,conversationId:actor.conversationId,proposalId})));
  assert.equal(jobs[0],jobs[1]);const job=jobs[0];fileIds.push(job);
  assert.equal(await db.aiExportRequest.count({where:{proposalId}}),1);
  await assert.rejects(requestDatasetExport({datasetRef,format:"xlsx",columns:["member.fullName","dues.overdueAmount"]},{userId:id,conversationId:actor.conversationId,proposalId}),/AI_EXPORT_IDEMPOTENCY_CONFLICT/);
  const status=await runDatasetExport(job,new AbortController().signal);
  await runDatasetExport(job,new AbortController().signal);
  assert.equal(await db.generatedFile.count({where:{id:job}}),1);
  assert.ok(!JSON.stringify(status).includes("PRIVATE_NAME_SENTINEL"));
  assert.equal(current.rows.length,102);
  const encrypted=await readFile(resolveSafePath(`generated/${job}.bin`));
  assert.ok(openBytes("generated-file",encrypted)?.toString().includes("PRIVATE_NAME_SENTINEL"));
  const cancelled=await requestDatasetExport({datasetRef,format:"csv",columns:["member.fullName"]},{userId:id,conversationId:actor.conversationId,proposalId:randomUUID()});
  await db.aiExportRequest.update({where:{id:cancelled},data:{status:"CANCELLED"}});
  await assert.rejects(runDatasetExport(cancelled,new AbortController().signal),/AI_EXPORT_CANCELLED/);
  assert.equal(await db.generatedFile.count({where:{id:cancelled}}),0);
  const stopped=new AbortController();stopped.abort();
  const aborted=await requestDatasetExport({datasetRef,format:"csv",columns:["member.fullName"]},{userId:id,conversationId:actor.conversationId,proposalId:randomUUID()});
  await assert.rejects(runDatasetExport(aborted,stopped.signal));assert.equal(await db.generatedFile.count({where:{id:aborted}}),0);
  const xlsx=await requestDatasetExport({datasetRef,format:"xlsx",columns:["member.fullName","dues.overdueAmount"]},{userId:id,conversationId:actor.conversationId,proposalId:randomUUID()});fileIds.push(xlsx);
  await runDatasetExport(xlsx,new AbortController().signal);
  const {default:ExcelJS}=await import("exceljs"),workbook=new ExcelJS.Workbook();
  const xlsxBytes=openBytes("generated-file",await readFile(resolveSafePath(`generated/${xlsx}.bin`)));assert.ok(xlsxBytes);
  await workbook.xlsx.load(xlsxBytes as never);const sheet=workbook.worksheets[0];
  assert.equal(sheet.rowCount,103);assert.equal(sheet.getCell("B2").value,120);assert.equal(typeof sheet.getCell("A2").value,"string");
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
