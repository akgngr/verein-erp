import test from "node:test";
import assert from "node:assert/strict";
import type {PrismaClient} from "@prisma/client";
import {aiProposalTools as calendarTools} from "@/modules/calendar/services/ai-proposal-tools";
import {aiProposalTools as coursesTools} from "@/modules/courses/services/ai-proposal-tools";
import {aiProposalTools as documentsTools} from "@/modules/documents/services/ai-proposal-tools";
import {aiProposalTools as eventsTools} from "@/modules/events/services/ai-proposal-tools";
import {aiProposalTools as inventoryTools} from "@/modules/inventory/services/ai-proposal-tools";
import {aiProposalTools as meetingsTools} from "@/modules/meetings/services/ai-proposal-tools";
import {aiProposalTools as tasksTools} from "@/modules/tasks/services/ai-proposal-tools";
const tools=[...calendarTools,...coursesTools,...documentsTools,...eventsTools,...inventoryTools,...meetingsTools,...tasksTools];
import {AI_TOOL_POLICY} from "@/shared/data-policy";
import {PROPOSED,type ModuleAiContext} from "@/shared/ai/define";
process.env.AUTH_SECRET??="test-proposal-key-123456";
process.env.DATABASE_URL??="postgresql://unused/never-connected";
const globals=globalThis as unknown as {prisma?:PrismaClient};

const fixtures:Record<string,Record<string,unknown>>={
 propose_task:{title:"Private name SENTINEL",description:null,priority:"NORMAL",dueDate:null},
 propose_complete_task:{taskId:"record"},propose_delete_task:{taskId:"record"},
 propose_course:{kind:"COURSE",title:"Private name SENTINEL",subject:null,startDate:"2026-11-15",endDate:null,description:null},
 propose_course_status:{courseId:"record",status:"ACTIVE"},propose_delete_course:{courseId:"record"},
 propose_document:{direction:"INCOMING",documentDate:"2026-11-15",counterparty:"Private name SENTINEL",subject:"Private name SENTINEL",summary:null,dueDate:null},
 propose_document_status:{documentId:"record",status:"COMPLETED"},propose_delete_document:{documentId:"record"},
 propose_meeting:{type:"BOARD",title:"Private name SENTINEL",meetingDate:"2026-11-15",startTime:null,location:null,description:null},
 propose_meeting_status:{meetingId:"record",status:"HELD",reason:null},propose_delete_meeting:{meetingId:"record"},
 propose_inventory_item:{name:"Private name SENTINEL",category:"OTHER",quantity:1,status:"IN_USE",location:null,description:null},
 propose_inventory_status:{itemId:"record",name:"Private name SENTINEL",status:"IDLE"},propose_delete_inventory_item:{itemId:"record",name:"Private name SENTINEL"},
 propose_event:{title:"Private name SENTINEL",description:null,type:"OTHER",startDate:"2026-11-15T10:00",endDate:null,location:null,isOnline:false},
 propose_calendar_entry:{calendarId:"calendar",title:"Private name SENTINEL",date:"2026-11-15",startTime:"10:00",endTime:"11:00",location:null,description:null},
};
test("migrated proposal tools expose strict schemas, fixed acknowledgements and metadata-only source reads",async()=>{
 const previous=globals.prisma;const reads:unknown[]=[];
 const target=(fields:string[])=>new Proxy({findFirst:async(args:{select:Record<string,boolean>})=>{
  assert.deepEqual(Object.keys(args.select).sort(),fields.toSorted());reads.push(args);
  return Object.fromEntries(fields.map(field=>[field,field==="id"?"record":"Private name SENTINEL"]));
 }},{get(object,key){if(key in object)return object[key as keyof typeof object];throw new Error(`Unexpected operation ${String(key)}`);}});
 globals.prisma={document:target(["id","registryNumber","subject"]),course:target(["id","code","title"]),meeting:target(["id","meetingNumber","title"]),task:{findUnique:async(args:unknown)=>{assert.deepEqual(args,{where:{id:"record"},select:{id:true,title:true}});return {id:"record",title:"Private name SENTINEL"};}},calendar:{findFirst:async()=>({id:"calendar"})}} as unknown as PrismaClient;
 try{
  for(const [name,input]of Object.entries(fixtures)){
   const tool=tools.find(t=>t.name===name)!;assert.ok(tool,name);
   assert.equal((tool as unknown as {contractVersion:number}).contractVersion,2);
   assert.equal(tool.processing,"local_only");assert.equal(tool.inputSchema.additionalProperties,false);
   assert.equal(tool.schema.safeParse({...input,sql:"select secrets"}).success,false);
   const cards:unknown[]=[];
   const context:ModuleAiContext={user:{id:"actor",name:"Actor",email:"actor@example.test",role:"ADMIN"},propose:card=>{cards.push(card);},restore:v=>v,createDataset:async()=>{throw new Error("No dataset here");},loadDatasetDefinition:async()=>{throw new Error("No dataset here");},attachFile:()=>{throw new Error("No file here");}};
   assert.deepEqual(await tool.run(input,context),PROPOSED,name);assert.equal(cards.length,1,name);
   assert.ok(!JSON.stringify(await tool.run(input,{...context,propose:()=>{}})).includes("SENTINEL"));
   const policy=AI_TOOL_POLICY[name as keyof typeof AI_TOOL_POLICY];assert.ok("serverReads" in policy);assert.deepEqual(policy.modelFields,["status","note"]);
  }
  assert.ok(reads.length>=6);
 }finally{globals.prisma=previous;}
});

test("missing proposal targets produce a closed not_found result without creating a card",async()=>{
 const previous=globals.prisma;
 globals.prisma={course:{findFirst:async()=>null},document:{findFirst:async()=>null},meeting:{findFirst:async()=>null},task:{findUnique:async()=>null}} as unknown as PrismaClient;
 try{
  for(const name of ["propose_course_status","propose_delete_course","propose_document_status","propose_delete_document","propose_meeting_status","propose_delete_meeting","propose_complete_task","propose_delete_task"]){
   const tool=tools.find(t=>t.name===name)!;
   assert.deepEqual(await tool.run(fixtures[name],{user:{id:"actor",name:"Actor",email:"actor@example.test",role:"ADMIN"},propose:()=>{throw new Error("Missing target cannot propose");}} as unknown as ModuleAiContext),{status:"not_found"});
  }
 }finally{globals.prisma=previous;}
});
