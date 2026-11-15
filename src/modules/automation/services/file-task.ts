import "server-only";
import type {TaskDefinition} from "@/shared/automation/define";

/** Deferred registry access avoids module-definition cycles during startup. */
export async function assertFileGenerationTask(task:TaskDefinition,generationId:string){
 const {automationTasks}=await import("../tasks/registry");
 const registered=automationTasks.find(entry=>entry.key===task.key&&entry.version===task.version);
 if(!registered||!registered.inputSchema.safeParse({generationId}).success)throw new Error("FILE_GENERATOR_INVALID");
}
