import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { aiToolV2, assertUniqueToolNames } from "@/shared/ai/v2";
import type { ModuleAiContext } from "@/shared/ai/define";
const context: ModuleAiContext={loadDatasetDefinition:async()=>({year:2026}),createDataset:async()=>"opaque",user:{id:"u",name:"Private",email:"private@example.test",role:"ADMIN"},restore:x=>x,propose:()=>{},attachFile:()=>{}};
const make=(maxOutputBytes=65536)=>aiToolV2({name:"get_total",description:"Total",operation:"read",allowed:()=>true,input:z.object({}).strict(),result:z.object({total:z.number(),name:z.string()}),modelOutput:z.object({total:z.number()}).strict(),policy:{purpose:"aggregate",serverReads:["Member"],modelFields:["total"],processing:"approved_provider"},limits:{maxOutputBytes},run:async()=>({total:2,name:"PRIVATE_PERSON"}),projectForModel:r=>({total:r.total})});
test("v2 server result never automatically enters the model projection",async()=>{assert.deepEqual(await make().run({},context),{total:2});});
test("v2 rejects invalid inputs and oversized output",async()=>{await assert.rejects(make().run({unexpected:true},context));await assert.rejects(make(2).run({},context),/AI_OUTPUT_BYTE_LIMIT/);});
test("duplicate tool names are rejected across modules",()=>{assert.throws(()=>assertUniqueToolNames([{name:"same"},{name:"same"}]),/AI_DUPLICATE/);});
test("unsupported model input transforms fail at definition time",()=>{
 assert.throws(()=>aiToolV2({name:"unsafe",description:"x",operation:"read",allowed:()=>true,input:z.object({q:z.string().transform(x=>x.length)}),result:z.number(),modelOutput:z.number(),policy:{purpose:"x",serverReads:[],modelFields:[],processing:"local_only"},run:async()=>1,projectForModel:x=>x}));
});
