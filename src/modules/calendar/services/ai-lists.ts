import "server-only";
import type {Prisma} from "@prisma/client";
import {parseDate} from "@internationalized/date";
import {getDb} from "@/shared/db";
import {aiListPage,aiPageInfo} from "@/shared/ai/pagination";
import {expandOccurrences} from "../lib/recurrence";

const PAGE_SIZE=50;
export async function listAiSharedCalendars(cursor?:string){
 const page=aiListPage(cursor),where={kind:"SHARED" as const,isActive:true};
 const [items,total]=await Promise.all([
  getDb().calendar.findMany({where,select:{id:true,name:true},orderBy:[{name:"asc"},{id:"asc"}],skip:(page-1)*PAGE_SIZE,take:PAGE_SIZE}),
  getDb().calendar.count({where}),
 ]);
 return {...aiPageInfo(page,PAGE_SIZE,total),items};
}

export async function listAiSharedCalendarEntries(args:{from:string;to:string;cursor?:string}){
 const page=aiListPage(args.cursor);
 let start:Date,end:Date,floatingStart:Date,floatingEnd:Date;
 try{
  const first=parseDate(args.from),last=parseDate(args.to),days=last.compare(first)+1;
  if(days<1||days>120)return {status:"invalid_range" as const,completeness:"partial" as const};
  start=first.toDate("Europe/Berlin");end=last.add({days:1}).toDate("Europe/Berlin");
  floatingStart=new Date(`${first.toString()}T00:00:00Z`);floatingEnd=new Date(`${last.add({days:1}).toString()}T00:00:00Z`);
 }catch{return {status:"invalid_range" as const,completeness:"partial" as const};}
 const overlap=(from:Date,to:Date):Prisma.CalendarEntryWhereInput=>({startsAt:{lt:to},OR:[{recurrence:"NONE",endsAt:{gt:from}},{recurrence:{not:"NONE"}}]});
 const entries=await getDb().calendarEntry.findMany({
  where:{calendar:{kind:"SHARED",isActive:true},OR:[{allDay:true,...overlap(floatingStart,floatingEnd)},{allDay:false,...overlap(start,end)}]},
  select:{id:true,title:true,startsAt:true,endsAt:true,allDay:true,recurrence:true,recurrenceInterval:true,recurrenceUntil:true,calendar:{select:{name:true}}},
  orderBy:{id:"asc"},take:501,
 });
 if(entries.length>500)return {status:"refine_range" as const,completeness:"partial" as const};
 const items:{calendar:string;title:string;start:string;end:string;allDay:boolean}[]=[];
 for(const {title,calendar,...entry} of entries){
  for(const occurrence of expandOccurrences(entry,entry.allDay?floatingStart:start,entry.allDay?floatingEnd:end)){
   items.push({calendar:calendar.name,title,start:entry.allDay?occurrence.start.toISOString().slice(0,10):occurrence.start.toISOString(),end:entry.allDay?occurrence.end.toISOString().slice(0,10):occurrence.end.toISOString(),allDay:entry.allDay});
   if(items.length>5000)return {status:"refine_range" as const,completeness:"partial" as const};
  }
 }
 items.sort((a,b)=>a.start.localeCompare(b.start)||a.calendar.localeCompare(b.calendar)||a.title.localeCompare(b.title));
 return {...aiPageInfo(page,PAGE_SIZE,items.length),status:"ok" as const,items:items.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE)};
}
