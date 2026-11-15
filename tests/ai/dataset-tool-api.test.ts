import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {makeDuesDatasetTool} from "@/modules/members/services/dues-ai-tool";
import {makeDatasetExportTool} from "@/modules/exports/services/dataset-export-tool";
import type {ModuleAiContext} from "@/shared/ai/define";

test("canonical dataset API accepts only the registered source and typed query; the old alias remains valid",()=>{
 const tool=makeDuesDatasetTool({name:"create_dataset"});assert.equal(tool.contractVersion,2);
 assert.equal(tool.schema.safeParse({source:"members.dues",query:{year:2026}}).success,true);
 for(const input of [{source:"users",query:{year:2026}},{source:"members.dues",query:{year:2026,name:"Private"}},{source:"members.dues",query:{year:2026,sql:"select *"}}])assert.equal(tool.schema.safeParse(input).success,false);
 assert.equal(makeDuesDatasetTool({name:"create_dues_dataset"}).schema.safeParse({year:2026}).success,true);
});
test("export_dataset only proposes confirmation and emits a fixed acknowledgement",async()=>{
 const tool=makeDatasetExportTool({name:"export_dataset"}),proposals:unknown[]=[];
 const context:ModuleAiContext={user:{id:"actor",name:"Actor",email:"test@example.test",role:"ADMIN"},restore:v=>v,propose:p=>proposals.push(p),createDataset:async()=>{throw new Error("No data query before confirmation");},loadDatasetDefinition:async()=>{throw new Error("No data query before confirmation");},attachFile:()=>{throw new Error("No file before confirmation");}};
 const result=await tool.run({datasetRef:"A".repeat(43),format:"csv",columns:["member.fullName"]},context);
 assert.equal(proposals.length,1);assert.deepEqual(result,{status:"proposed",note:"A confirmation card was shown to the user; nothing changes until they confirm."});
 await assert.rejects(tool.run({datasetRef:"A".repeat(43),format:"csv",columns:["member.iban"]},context));
});
test("canonical and compatibility dataset tools have nonempty TR/DE descriptions",()=>{
 const tools=[makeDuesDatasetTool({name:"create_dataset"}),makeDuesDatasetTool({name:"create_dues_dataset"}),makeDatasetExportTool({name:"export_dataset"}),makeDatasetExportTool({name:"propose_dataset_export"})];
 for(const tool of tools)for(const language of ["tr","de"]){
  assert.ok(tool.descriptionKey);const [module,...keys]=tool.descriptionKey.split(".");
  let value:unknown=JSON.parse(fs.readFileSync(`src/modules/${module}/messages/${language}.json`,"utf8"));
  for(const key of keys)value=(value as Record<string,unknown>)[key];
  assert.equal(typeof value,"string");assert.ok((value as string).length>30);
 }
});
