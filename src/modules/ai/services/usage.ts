import "server-only";
import {aiCostReservation} from "./cost-policy";
import {referenceDeployment} from "./references";
import { getDb } from "@/shared/db";

/** Shared PostgreSQL counters, not per-process memory. Reservations fail closed. */
export async function reserveAiUsage(userId:string,kind:"request"|"model",inputBytes=0,now=new Date(),pricing?:{provider:string;model:string}) {
  const windowStart=new Date(now);
  if(kind==="request")windowStart.setUTCSeconds(0,0);
  else windowStart.setUTCHours(0,0,0,0);
  if(inputBytes>65_536) throw new Error("AI_INPUT_BUDGET");
  const tokens=kind==="model"?inputBytes+4096:0;
  if(kind==="model"&&process.env.AI_DAILY_COST_BUDGET_MICRO_EUR&&!pricing)throw new Error("AI_COST_POLICY_MISSING");
  const cost=kind==="model"&&pricing?aiCostReservation(pricing.provider,pricing.model,inputBytes):null;
  await getDb().$transaction(async tx=>{
  const bucket=await tx.aiUsageBucket.upsert({where:{scopeKey_windowStart:{scopeKey:`${kind}:${userId}`,windowStart}},create:{scopeKey:`${kind}:${userId}`,windowStart,calls:1,tokens},update:{calls:{increment:1},tokens:{increment:tokens}}});
  const limit=Number(process.env.AI_DAILY_TOKEN_BUDGET ?? 1_000_000);
  if((kind==="request"&&bucket.calls>15)||(kind==="model"&&(!Number.isSafeInteger(limit)||limit<1||bucket.tokens>limit))) throw new Error("AI_USAGE_LIMIT");
  if(cost){
    const scopeKey=`cost:${referenceDeployment()}`;
    const total=await tx.aiUsageBucket.upsert({where:{scopeKey_windowStart:{scopeKey,windowStart}},create:{scopeKey,windowStart,calls:1,costMicros:cost.microEur},update:{calls:{increment:1},costMicros:{increment:cost.microEur}}});
    if(total.costMicros>cost.limit)throw new Error("AI_USAGE_LIMIT");
  }
  });
}
