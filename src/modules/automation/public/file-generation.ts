import "server-only";

// Registry-independent entry: safe for module definition imports. No workflow/runtime registry.
export {insertTaskExecution} from "../services/execution-store";
export {getExecutionState,assertActiveExecutionLease} from "../services/execution-state";
export {assertTaskModulesUsable} from "../services/module-availability";
export {getAutomationRuntimeConfig} from "../runtime-config";
export {assertFileGenerationTask} from "../services/file-task";
