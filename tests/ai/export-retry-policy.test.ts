import test from "node:test";
import assert from "node:assert/strict";
import {AI_EXPORT_RETRY_POLICY,permanentExportFailure} from "@/modules/ai/services/export-retry-policy";
test("export retries are bounded; stale/denied/cancelled datasets never retry",()=>{
 assert.equal(AI_EXPORT_RETRY_POLICY.maxAttempts,3);
 for(const code of ["AI_DATASET_STALE_PREVIEW","AI_EXPORT_ACCESS_REVOKED","AI_EXPORT_CANCELLED","AI_EXPORT_EXECUTION_MISMATCH","EXPORT_BYTE_LIMIT"])assert.equal(permanentExportFailure(new Error(code)),true);
 assert.equal(permanentExportFailure(new Error("ECONNRESET")),false);
});
