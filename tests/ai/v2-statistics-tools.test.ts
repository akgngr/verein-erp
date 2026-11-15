import test from "node:test";
import assert from "node:assert/strict";
import type {PrismaClient} from "@prisma/client";
import {aiStatisticsTool as members} from "@/modules/members/services/ai-statistics-tool";
import {aiStatisticsTool as crm} from "@/modules/crm/services/ai-statistics-tool";
import {aiStatisticsTool as grants} from "@/modules/grants/services/ai-statistics-tool";
import type {ModuleAiContext} from "@/shared/ai/define";
process.env.AUTH_SECRET??="test-statistics-key-123456";
process.env.DATABASE_URL??="postgresql://unused/never-connected";
const globals=globalThis as unknown as {prisma?:PrismaClient};

test("aggregate v2 projections preserve nullable dues rates and exclude private fields",async()=>{
 const previous=globals.prisma;
 const context={user:{id:"actor",name:"Actor",email:"actor@example.test",role:"ADMIN"},propose:()=>{throw new Error("Statistics cannot propose");}} as unknown as ModuleAiContext;
 let stage="OPEN";
 globals.prisma={member:{count:async()=>0,groupBy:async()=>[]},memberDue:{findMany:async()=>[]},memberPayment:{groupBy:async()=>[]},crmDeal:{groupBy:async()=>[{stage,_count:{_all:1},_sum:{amountCents:12345},title:"PRIVATE_SENTINEL"}]},grant:{findMany:async(args:unknown)=>{assert.deepEqual(args,{select:{status:true,approvedCents:true,reportDueAt:true,reportSubmittedAt:true}});return [{status:"APPROVED",approvedCents:2500,reportDueAt:null,reportSubmittedAt:null}];}}} as unknown as PrismaClient;
 try{
  const result=await members.run({year:2026},context) as {dues:{collectionRatePercent:number|null}};
  assert.equal(result.dues.collectionRatePercent,null);
  assert.deepEqual(await crm.run({},context),{deals:{OPEN:{count:1,amount:123.45}}});
  const grantResult=await grants.run({},context) as {byStatus:{APPROVED:number};approvedTotal:number};assert.equal(grantResult.byStatus.APPROVED,1);assert.equal(grantResult.approvedTotal,25);
  assert.ok(!JSON.stringify(grantResult).includes("PRIVATE_SENTINEL"));
  stage="PRIVATE_SENTINEL";await assert.rejects(crm.run({},context),error=>error instanceof Error&&error.name==="ZodError");
  for(const tool of [members,crm,grants]){assert.equal(tool.contractVersion,2);assert.equal(tool.inputSchema.additionalProperties,false);}
 }finally{globals.prisma=previous;}
});
