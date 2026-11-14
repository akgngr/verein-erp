import "server-only";
import { getDb } from "@/shared/db";
export async function recordAiMetric(kind:"usage_denied"|"request_denied"|"request_failed"|"export_failed") {
 const windowStart=new Date();windowStart.setUTCMinutes(0,0,0);
 const scopeKey=`metric:${kind}`;
 try{await getDb().aiUsageBucket.upsert({where:{scopeKey_windowStart:{scopeKey,windowStart}},create:{scopeKey,windowStart,calls:1},update:{calls:{increment:1}}});}catch{console.error("[ai] METRIC_WRITE_FAILED");}
}
