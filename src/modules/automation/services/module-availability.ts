import "server-only";
import {getModuleAvailability} from "@/modules/system/automation";
import {taskModuleKey} from "@/shared/automation/define";
export async function assertTaskModulesUsable(taskKey:string,sourceModule?:string):Promise<void>{
 const modules=new Set([taskModuleKey(taskKey),"automation",...(sourceModule?[sourceModule]:[])]);
 for(const key of modules)if(await getModuleAvailability(key)!=="available")throw new Error("AUTOMATION_MODULE_UNAVAILABLE");
}
