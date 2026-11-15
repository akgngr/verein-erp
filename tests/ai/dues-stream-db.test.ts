import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {getDb} from "@/shared/db";
import {describeDuesDataset,streamDuesDataset,loadDuesDataset} from "@/modules/members/automation";
const enabled=Boolean(process.env.AI_TEST_DATABASE_URL);
if(enabled&&process.env.AI_TEST_DATABASE_URL!==process.env.DATABASE_URL)throw new Error("Use isolated database");

test("dues streaming uses keyset batches beyond 5000, aggregates payments, and stops on revoke/abort",{skip:!enabled},async()=>{
 const db=getDb(),owner=`stream-${randomUUID()}`,prefix=`${owner}-`,count=6001;
 try{
  await db.user.create({data:{id:owner,name:"Streaming actor",email:`${owner}@example.test`,passwordHash:"test",role:"ADMIN"}});
  for(let start=0;start<count;start+=500){
   const ids=Array.from({length:Math.min(500,count-start)},(_,i)=>`${prefix}${String(start+i).padStart(5,"0")}`);
   await db.member.createMany({data:ids.map((id,i)=>({id,year:2002,sequence:start+i+1,membershipNumber:id,firstName:"PRIVATE_STREAM_NAME",lastName:"Member",joinDate:new Date("2002-01-01"),createdById:owner,createdByLabel:"Test"}))});
   await db.memberDue.createMany({data:ids.map(id=>({id:`due-${id}`,memberId:id,year:2002,amountDue:100,dueDate:new Date("2002-02-01"),createdById:owner,createdByLabel:"Test"}))});
  }
  const first=`${prefix}00000`;
  await db.memberPayment.createMany({data:[{year:2002,sequence:1,receiptNumber:`${owner}-r1`,memberId:first,amount:12.34,dueYear:2002,paidAt:new Date("2002-01-01"),method:"CASH",createdById:owner,createdByLabel:"Test"},{year:2002,sequence:2,receiptNumber:`${owner}-r2`,memberId:first,amount:7.66,dueYear:2002,paidAt:new Date("2002-02-01"),method:"CASH",createdById:owner,createdByLabel:"Test"}]});
  const query={year:2002,status:"ALL" as const};
  const preview=await describeDuesDataset(query);assert.equal(preview.count,count);
  const subset=await describeDuesDataset({...query,maximumRemainingCents:8000});assert.equal(subset.count,1);
  let calls=0,seen=0,previous="";
  for await(const row of streamDuesDataset(query,{signal:AbortSignal.timeout(15000),beforeBatch:async()=>{calls++;}})){
   assert.ok(!previous||row.id>previous);previous=row.id;seen++;
   if(row.memberId===first){assert.equal(row.paidCents,2000);assert.equal(row.remainingCents,8000);assert.equal(row.lastPaymentAt,"2002-02-01");}
  }
  assert.equal(seen,count);assert.ok(calls>=26); // before + after each 500-row page
  await assert.rejects(loadDuesDataset(query),/AI_DATASET_ROW_LIMIT/); // existing v1 maximum remains intact
  await db.member.update({where:{id:first},data:{lastName:"Changed"}});
  assert.notEqual((await describeDuesDataset(query)).fingerprint,preview.fingerprint);
  let emitted=0,checks=0;
  await assert.rejects(async()=>{for await(const _row of streamDuesDataset(query,{signal:AbortSignal.timeout(15000),beforeBatch:async()=>{if(++checks===3)throw new Error("AI_EXPORT_ACCESS_REVOKED");}})){void _row;emitted++;}},/AI_EXPORT_ACCESS_REVOKED/);
  assert.equal(emitted,500);
  const controller=new AbortController();emitted=0;
  await assert.rejects(async()=>{for await(const _row of streamDuesDataset(query,{signal:controller.signal})){void _row;emitted++;controller.abort();}},/abort/i);assert.equal(emitted,1);
 }finally{
  await db.memberPayment.deleteMany({where:{createdById:owner}});await db.memberDue.deleteMany({where:{createdById:owner}});await db.member.deleteMany({where:{createdById:owner}});await db.user.deleteMany({where:{id:owner}});
 }
});
