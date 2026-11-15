import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile,unlink } from "node:fs/promises";
import { getDb } from "@/shared/db";
import { allModules } from "@/registry";
import { accessSignature } from "@/shared/modules/module-access";
import {resolveLinkedMemberReference} from "@/modules/ai/services/identity-links";
import { createReferenceScope,saveDataset,createEntityReference,resolveEntityReference } from "@/modules/ai/services/references";
import { requestDatasetExport,runDatasetExport } from "@/modules/ai/services/dataset-export";
import {prepareProposal,claimProposal} from "@/modules/ai/services/proposal-store";
import { providerRevision } from "@/modules/ai/services/provider-revision";
import { giveAiConsent } from "@/modules/ai/services/consent";
import {makeDuesDatasetTool} from "@/modules/members/services/dues-ai-tool";
import {openAiCompatibleAdapter} from "@/modules/ai/services/providers/openai-compatible";
import { loadDuesDataset } from "@/modules/members/automation";
import { openBytes } from "@/shared/security/secret-box";
import { resolveSafePath } from "@/shared/files/storage";
const enabled=Boolean(process.env.AI_TEST_DATABASE_URL);
if(enabled&&process.env.DATABASE_URL!==process.env.AI_TEST_DATABASE_URL)throw new Error("Use an isolated database");
test("server export inserts private names only in the file, rejects stale datasets and revoked actors",{skip:!enabled},async()=>{
 const id=`dataset-test-${randomUUID()}`,memberIds:string[]=[],fileIds:string[]=[],studentIds:string[]=[],guardianIds:string[]=[];
 const oldFlag=process.env.AI_PERSONAL_EXPORT_ENABLED,oldAuto=process.env.AUTOMATION_ENABLED;
 process.env.AI_PERSONAL_EXPORT_ENABLED="true";process.env.AUTOMATION_ENABLED="true";
 const db=getDb();
 try{
  await db.user.create({data:{id,name:"Test Actor",email:`${id}@example.test`,passwordHash:"test",role:"ADMIN"}});
  for(const key of ["ai","members","exports","automation","students"]){
   const mod=allModules.find(m=>m.key===key)!;
   await db.systemModuleState.upsert({where:{moduleKey:key},create:{moduleKey:key,isEnabled:true},update:{isEnabled:true}});
   await db.systemSetting.upsert({where:{key:`module-access:${key}`},create:{key:`module-access:${key}`,value:JSON.stringify({signature:accessSignature(mod.access),approvedAt:new Date().toISOString(),approvedBy:id})},update:{value:JSON.stringify({signature:accessSignature(mod.access),approvedAt:new Date().toISOString(),approvedBy:id})}});
  }
  await db.aiSettings.upsert({where:{id:"singleton"},create:{id:"singleton",provider:"local",permissions:{members:["read"],students:["read"],exports:["create"]}},update:{provider:"local",permissions:{members:["read"],students:["read"],exports:["create"]}}});
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
  const tool=makeDuesDatasetTool({name:"create_dues_dataset"});
  const wire:string[]=[];let projected:{datasetRef:string;count:number}|undefined;
  const adapter=openAiCompatibleAdapter({apiKey:"test-not-a-real-key",fetch:async(_url,init)=>{
   wire.push(String(init?.body));
   const message=wire.length===1?{role:"assistant",content:null,tool_calls:[{id:"dues-call",type:"function",function:{name:tool.name,arguments:JSON.stringify({year:2001})}}]}:{role:"assistant",content:"Ready"};
   return new Response(JSON.stringify({id:"test",object:"chat.completion",created:0,model:"test",choices:[{index:0,finish_reason:wire.length===1?"tool_calls":"stop",message}]}),{headers:{"content-type":"application/json"}});
  }});
  await adapter.run({model:"test",system:"Prepare dues data without personal identities.",turns:[{role:"user",content:"Dues export 2001"}],tools:[{name:tool.name,description:tool.description,inputSchema:tool.inputSchema}],maxToolRounds:6,beforeRequest:async()=>{},executeTool:async(name,input)=>{
   assert.equal(name,tool.name);
   projected=await tool.run(input,{user:{id,name:"Actor",email:`${id}@example.test`,role:"ADMIN"},loadDatasetDefinition:async()=>{throw new Error("Not used");},createDataset:args=>saveDataset(actor,{scopeId:scope.id,sourceModule:"members",...args}),restore:value=>value,propose:()=>{throw new Error("Read tool cannot propose here");},attachFile:()=>{throw new Error("Read tool cannot attach here");}}) as {datasetRef:string;count:number};
   return {content:JSON.stringify(projected),isError:false};
  }});
  assert.ok(projected);assert.equal(projected.count,102);assert.equal(wire.length,2);
  assert.ok(!wire.join("\n").includes("PRIVATE_NAME_SENTINEL"));assert.ok(!wire.join("\n").includes("Only In File"));
  assert.ok(wire[1].includes(projected.datasetRef));
  const datasetRef=projected.datasetRef;
  assert.ok(!JSON.stringify({datasetRef,count:current.rows.length}).includes("PRIVATE_NAME_SENTINEL"));
  const proposal=await prepareProposal({userId:id,conversationId:actor.conversationId,revision,draft:{kind:"module",module:"exports",action:"datasetExport",operation:"create",title:"CSV",details:[],payload:{datasetRef,format:"csv",columns:["member.fullName","dues.overdueAmount"]}}});
  const proposalId=proposal.proposalId;
  assert.equal((await claimProposal(id,proposalId,revision)).applied,false);
  const jobs=await Promise.all(Array.from({length:2},()=>requestDatasetExport({datasetRef,format:"csv",columns:["member.fullName","dues.overdueAmount"]},{userId:id,conversationId:actor.conversationId,proposalId})));
  assert.equal(jobs[0],jobs[1]);const job=jobs[0];fileIds.push(job);
  assert.equal(await db.aiExportRequest.count({where:{proposalId}}),1);
  const persisted=await db.aiExportRequest.findUniqueOrThrow({where:{proposalId}});
  assert.equal(await db.automationExecution.count({where:{id:persisted.executionId!}}),1);
  assert.equal(await db.automationOutbox.count({where:{executionId:persisted.executionId!}}),1);
  // Simulate a web process disappearing after commit but before proposal finalization.
  const recovered=await claimProposal(id,proposalId,revision);assert.equal(recovered.applied,true);assert.equal(recovered.row.executionId,job);
  assert.equal((await claimProposal(id,proposalId,revision)).row.executionId,job);
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
  const student=await db.student.create({data:{year:2001,sequence:123456789,studentNumber:`student-${id}`,firstName:"PRIVATE_NAME_SENTINEL",lastName:"Only In File",memberId:paid.id,createdById:id,createdByLabel:"Test"}});studentIds.push(student.id);
  const guardian=await db.studentGuardian.create({data:{debtorNumber:50001,firstName:"PRIVATE_NAME_SENTINEL",lastName:"Only In File",memberId:member.id,createdById:id,createdByLabel:"Test"}});guardianIds.push(guardian.id);
  await db.studentGuardianLink.create({data:{studentId:student.id,guardianId:guardian.id,relation:"MOTHER",isPayer:true}});
  const studentRef=await createEntityReference(actor,scope.id,"students",student.id),guardianRef=await createEntityReference(actor,scope.id,"guardians",guardian.id);
  const linkedStudent=await resolveLinkedMemberReference(actor,studentRef,"students"),linkedGuardian=await resolveLinkedMemberReference(actor,guardianRef,"guardians");
  assert.equal(await resolveEntityReference(actor,linkedStudent,"members"),paid.id);
  assert.equal(await resolveEntityReference(actor,linkedGuardian,"members"),member.id);
  assert.notEqual(linkedStudent,linkedGuardian);
  await db.student.update({where:{id:student.id},data:{memberId:null}});
  await assert.rejects(resolveLinkedMemberReference(actor,studentRef,"students"),/AI_IDENTITY_UNLINKED/);
  const userRef=await createEntityReference(actor,scope.id,"users",id);
  await assert.rejects(resolveLinkedMemberReference(actor,userRef,"users"),/AI_IDENTITY_UNLINKED/);
  await db.member.update({where:{id:member.id},data:{deletedAt:new Date()}});
  await assert.rejects(resolveLinkedMemberReference(actor,guardianRef,"guardians"),/AI_IDENTITY_UNLINKED/);
  await db.member.update({where:{id:member.id},data:{deletedAt:null}});
  await assert.rejects(resolveLinkedMemberReference({...actor,conversationId:"other"},guardianRef,"guardians"));
  await db.memberDue.update({where:{memberId_year:{memberId:member.id,year:2001}},data:{amountDue:140}});
  const stale=await requestDatasetExport({datasetRef,format:"csv",columns:["member.fullName"]},{userId:id,conversationId:actor.conversationId,proposalId:randomUUID()});
  await assert.rejects(runDatasetExport(stale,new AbortController().signal),/AI_DATASET_STALE_PREVIEW/);
  await db.user.update({where:{id},data:{isActive:false}});
  await assert.rejects(runDatasetExport(stale,new AbortController().signal),/AI_EXPORT_ACCESS_REVOKED/);
 }finally{
  for(const fileId of fileIds){await unlink(resolveSafePath(`generated/${fileId}.bin`)).catch(()=>{});await db.generatedFile.deleteMany({where:{id:fileId}});}
  await db.student.deleteMany({where:{id:{in:studentIds}}});await db.studentGuardian.deleteMany({where:{id:{in:guardianIds}}});
  await db.aiProposal.deleteMany({where:{userId:id}});await db.aiExportRequest.deleteMany({where:{userId:id}});await db.aiReferenceScope.deleteMany({where:{userId:id}});await db.member.deleteMany({where:{id:{in:memberIds}}});await db.aiUserConsent.deleteMany({where:{userId:id}});await db.user.deleteMany({where:{id}});
  if(oldFlag===undefined)delete process.env.AI_PERSONAL_EXPORT_ENABLED;else process.env.AI_PERSONAL_EXPORT_ENABLED=oldFlag;
  if(oldAuto===undefined)delete process.env.AUTOMATION_ENABLED;else process.env.AUTOMATION_ENABLED=oldAuto;
 }
});
test.after(async()=>{if(enabled)await getDb().$disconnect();});
