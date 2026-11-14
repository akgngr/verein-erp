import "server-only";
import { getDb } from "@/shared/db";

/** Shared PostgreSQL counters, not per-process memory. Reservations fail closed. */
export async function reserveAiUsage(userId:string,kind:"request"|"model",inputBytes=0,now=new Date()) {
  const windowStart=new Date(now);
  if(kind==="request")windowStart.setUTCSeconds(0,0);
  else windowStart.setUTCHours(0,0,0,0);
  if(inputBytes>65_536) throw new Error("AI_INPUT_BUDGET");
  const tokens=kind==="model"?inputBytes+4096:0;
  const bucket=await getDb().aiUsageBucket.upsert({where:{scopeKey_windowStart:{scopeKey:`${kind}:${userId}`,windowStart}},create:{scopeKey:`${kind}:${userId}`,windowStart,calls:1,tokens},update:{calls:{increment:1},tokens:{increment:tokens}}});
  const limit=Number(process.env.AI_DAILY_TOKEN_BUDGET ?? 1_000_000);
  if((kind==="request"&&bucket.calls>15)||(kind==="model"&&(!Number.isSafeInteger(limit)||limit<1||bucket.tokens>limit))) throw new Error("AI_USAGE_LIMIT");
}
