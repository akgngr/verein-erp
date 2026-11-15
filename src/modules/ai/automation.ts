import "server-only";
import { z } from "zod";
import {AI_EXPORT_RETRY_POLICY} from "./services/export-retry-policy";
import { defineTask } from "@/shared/automation/define";

/** Administrator schedules cleanup with the existing automation scheduler. */
export const aiCleanupTask = defineTask({
  key: "ai.cleanup_history",
  version: 1,
  description: "ai.cleanup_history",
  inputSchema: z.object({}).strict(),
  timeoutSeconds: 120,
  retry: { maxAttempts: 3, initialDelaySeconds: 30, maxDelaySeconds: 300, backoffMultiplier: 2 },
  schedule: { input: () => ({}), minIntervalMinutes: 60, automaticIntervalMinutes:60 },
  idempotencyKey: () => `ai:cleanup:${Math.floor(Date.now() / 3_600_000)}`,
  handler: async () => {
    const { cleanupAiHistory } = await import("./services/cleanup");
    return cleanupAiHistory();
  },
});

export const aiDatasetExportTask=defineTask({
 key:"ai.export_dataset",version:1,description:"ai.export_dataset",
 inputSchema:z.object({generationId:z.string().min(1).max(128)}).strict(),
 timeoutSeconds:120,retry:AI_EXPORT_RETRY_POLICY,idempotencyKey:input=>`ai-export:${input.generationId}`,
 handler:async(input,context)=>{
  const {runDatasetExport}=await import("./services/dataset-export");
  try{return await runDatasetExport(input.generationId,context.signal,{userId:context.requestedById??"",executionId:context.executionId});}
  catch(error){const {failDatasetExportAttempt}=await import("./services/export-attempt");return failDatasetExportAttempt(input.generationId,context,error);}
 },
});
