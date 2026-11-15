import "server-only";
export { createTabularFile } from "./services/tabular";
export { exportsPermissions } from "./permissions";

import {z} from "zod";
import {defineTask} from "@/shared/automation/define";
export const fileCleanupTask=defineTask({key:"exports.cleanup_files",version:1,description:"exports.cleanup_files",inputSchema:z.object({}).strict(),timeoutSeconds:120,retry:{maxAttempts:3},schedule:{input:()=>({}),minIntervalMinutes:60,automaticIntervalMinutes:60},handler:async()=>{const {purgeExpiredFiles,reconcileGeneratedStorage}=await import("./services/file-cleanup");return {removed:await purgeExpiredFiles(),orphans:await reconcileGeneratedStorage()};}});

export {markGeneratedFileForDeletion} from "./services/file-cleanup";
