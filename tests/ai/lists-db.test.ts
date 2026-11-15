import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {getDb} from "@/shared/db";
import {listAiSharedCalendars,listAiSharedCalendarEntries} from "@/modules/calendar/services/ai-lists";
import {listAiCourses} from "@/modules/courses/queries/ai-courses";
const enabled=Boolean(process.env.AI_TEST_DATABASE_URL);
if(enabled&&process.env.AI_TEST_DATABASE_URL!==process.env.DATABASE_URL)throw new Error("Use an isolated database");

test("calendar list pages exclude personal/inactive calendars and never silently truncate",{skip:!enabled},async()=>{
 const db=getDb(),prefix=`list-${randomUUID()}`,ids=[randomUUID(),randomUUID(),randomUUID()];
 try{
  await db.calendar.createMany({data:[{id:ids[0],name:prefix,kind:"SHARED"},{id:ids[1],name:"PRIVATE_SENTINEL",kind:"PERSONAL",ownerId:prefix},{id:ids[2],name:"INACTIVE_SENTINEL",kind:"SHARED",isActive:false}]});
  const base={startsAt:new Date("2026-11-15T10:00:00Z"),endsAt:new Date("2026-11-15T11:00:00Z"),createdById:prefix,createdByLabel:"PRIVATE_CREATOR"};
  await db.calendarEntry.createMany({data:[...Array.from({length:61},(_,i)=>({...base,calendarId:ids[0],title:`${prefix}-${i}`})),{...base,calendarId:ids[1],title:"PRIVATE_SENTINEL"},{...base,calendarId:ids[2],title:"INACTIVE_SENTINEL"}]});
  const calendars=await listAiSharedCalendars();assert.ok(calendars.items.some(c=>c.id===ids[0]));assert.ok(!JSON.stringify(calendars).includes("PRIVATE_SENTINEL"));
  const first=await listAiSharedCalendarEntries({from:"2026-11-15",to:"2026-11-15"});
  assert.equal(first.status,"ok");assert.ok("items" in first);assert.equal(first.items.length,50);assert.equal(first.hasMore,true);
  const second=await listAiSharedCalendarEntries({from:"2026-11-15",to:"2026-11-15",cursor:first.nextCursor!});
  assert.equal(second.status,"ok");assert.ok("items" in second);assert.equal(second.items.length,11);assert.equal(second.hasMore,false);
  assert.equal(new Set([...first.items,...second.items].map(row=>row.title)).size,61);
  assert.ok(!JSON.stringify([first,second]).includes("PRIVATE_SENTINEL"));assert.ok(!JSON.stringify(first).includes("PRIVATE_CREATOR"));
  const invalid=await listAiSharedCalendarEntries({from:"2026-02-31",to:"2026-03-01"});assert.equal(invalid.status,"invalid_range");
  await db.calendarEntry.createMany({data:Array.from({length:501},()=>({...base,calendarId:ids[0],title:prefix}))});
  const overflow=await listAiSharedCalendarEntries({from:"2026-11-15",to:"2026-11-15"});assert.equal(overflow.status,"refine_range");assert.equal(overflow.completeness,"partial");assert.ok(!("items" in overflow));
 }finally{await db.calendar.deleteMany({where:{id:{in:ids}}});}
});

test("calendar all-day dates and Berlin timed boundaries are distinct",{skip:!enabled},async()=>{
 const db=getDb(),id=randomUUID(),base={calendarId:id,createdById:id,createdByLabel:"test"};
 try{
  await db.calendar.create({data:{id,name:id,kind:"SHARED"}});
  await db.calendarEntry.createMany({data:[
   {...base,title:"previous-all-day",allDay:true,startsAt:new Date("2026-11-14T00:00:00Z"),endsAt:new Date("2026-11-15T00:00:00Z")},
   {...base,title:"current-all-day",allDay:true,startsAt:new Date("2026-11-15T00:00:00Z"),endsAt:new Date("2026-11-16T00:00:00Z")},
   {...base,title:"Berlin-midnight",startsAt:new Date("2026-11-14T23:05:00Z"),endsAt:new Date("2026-11-14T23:20:00Z")},
  ]});
  const result=await listAiSharedCalendarEntries({from:"2026-11-15",to:"2026-11-15"});assert.ok("items" in result);
  assert.deepEqual(result.items.map(r=>r.title).sort(),["Berlin-midnight","current-all-day"]);
 }finally{await db.calendar.deleteMany({where:{id}});}
});

test("course pages return explicit non-personal fields, have cursors and exclude deleted courses",{skip:!enabled},async()=>{
 const db=getDb(),prefix=`course-list-${randomUUID()}`;
 try{
  await db.course.createMany({data:Array.from({length:62},(_,i)=>({id:`${prefix}-${i}`,code:`${prefix}-${i}`,title:`Course ${i}`,kind:"COURSE" as const,year:2026,sequence:10000+i,startDate:new Date("2026-11-15"),createdById:prefix,createdByLabel:"PRIVATE_CREATOR",...(i===61?{deletedAt:new Date()}:{})}))});
  const first=await listAiCourses(),second=await listAiCourses(first.nextCursor!);
  assert.equal(first.items.length,50);assert.equal(second.items.length,11);assert.equal(second.hasMore,false);
  assert.equal(first.completeness,"partial");assert.ok(!JSON.stringify(first).includes("PRIVATE_CREATOR"));
  assert.equal(new Set([...first.items,...second.items].map(row=>row.id)).size,61);
 }finally{await db.course.deleteMany({where:{createdById:prefix}});}
});
test("progress AI counts never query the protected child-notes table",{skip:!enabled},async()=>{
 const {getProgressAiStats}=await import("@/modules/progress/queries/ai-stats");
 let protectedReads=0;
 const reader=new Proxy(getDb(),{get(target,key){if(key==="progressNote"){protectedReads++;throw new Error("K0_QUERY_MUST_NOT_RUN");}return Reflect.get(target,key);}});
 const result=await getProgressAiStats(30,reader);assert.equal(protectedReads,0);
 assert.deepEqual(Object.keys(result).sort(),["assessments","attendance","days"]);
});
test.after(async()=>{if(enabled)await getDb().$disconnect();});
