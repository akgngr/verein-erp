import "server-only";
export { createTabularFile } from "./services/tabular";
export { exportsPermissions } from "./permissions";

import {z} from "zod";
import {defineTask} from "@/shared/automation/define";
export const fileCleanupTask=defineTask({key:"exports.cleanup_files",version:1,description:"exports.cleanup_files",inputSchema:z.object({}).strict(),timeoutSeconds:120,retry:{maxAttempts:3},schedule:{input:()=>({}),minIntervalMinutes:60,automaticIntervalMinutes:60},handler:async()=>{const {purgeExpiredFiles,reconcileGeneratedStorage}=await import("./services/file-cleanup");const {purgeGenerationHistory}=await import("./services/generation");return {removed:await purgeExpiredFiles(),orphans:await reconcileGeneratedStorage(),generations:(await purgeGenerationHistory()).count};}});

export {markGeneratedFileForDeletion} from "./services/file-cleanup";

export {datasetExportPlanSchema} from "./services/dataset-export-tool";
export {prepareGenerationRequest,requestGeneration,startGeneration,finalizeGeneration,recordGenerationAttempt,cancelSourceGenerations,getGenerationState,getSourceGeneration,generationAttemptFileId,type GenerationLease} from "./services/generation";
export {getPublishedFileMetadata,listPublishedFileMetadata} from "./services/file-metadata";

export {createStreamingTabularFile} from "./services/tabular-stream";
export {createPipelineDocumentFile,DOCUMENT_LIMITS} from "./services/document-pipeline";
