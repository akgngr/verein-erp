import {spawn} from "node:child_process";
import assert from "node:assert/strict";
import {getDb} from "@/shared/db";

/** Real worker/pg-boss transport; only the explicitly isolated test database is permitted. */
export async function runExportThroughWorker(generationId:string,executionId:string,options:{onRetry?:(state:{status:string;attempt:number;lastErrorCode:string|null})=>Promise<void>}={}):Promise<void>{
 if(!process.env.AI_TEST_DATABASE_URL||process.env.AI_TEST_DATABASE_URL!==process.env.DATABASE_URL)throw new Error("ISOLATED_TEST_DATABASE_REQUIRED");
 const env:NodeJS.ProcessEnv={...process.env,AUTOMATION_ENABLED:"true",AUTOMATION_WORKER_ENABLED:"true",NODE_OPTIONS:"--conditions=react-server"};
 delete env.NODE_TEST_CONTEXT;
 const worker=spawn(process.execPath,["--import","tsx","src/modules/automation/worker/main.ts"],{cwd:process.cwd(),env,stdio:["ignore","pipe","pipe"]});
 let output="",startupError:Error|undefined;
 worker.stdout.on("data",chunk=>{output=(output+String(chunk)).slice(-16000);});
 worker.stderr.on("data",chunk=>{output=(output+String(chunk)).slice(-16000);});
 worker.on("error",error=>{startupError=error;});
 try{
  const deadline=Date.now()+45000;
  while(Date.now()<deadline){
   if(startupError)throw startupError;
   if(worker.exitCode!==null||worker.signalCode!==null)assert.fail(`Worker exited before completion: ${output}`);
   const [job,execution]=await Promise.all([getDb().aiExportRequest.findUniqueOrThrow({where:{id:generationId}}),getDb().automationExecution.findUniqueOrThrow({where:{id:executionId}})]);
   if(options.onRetry)await options.onRetry(execution);
   if(job.status==="READY"&&execution.status==="SUCCEEDED"){
    assert.ok(job.fileId);
    assert.equal(await getDb().generatedFile.count({where:{id:job.fileId}}),1);
    assert.ok(!output.includes("PRIVATE_NAME_SENTINEL"));
    const outbox=await getDb().automationOutbox.findFirst({where:{executionId,eventType:"automation.task.requested"}});
    assert.equal(outbox?.status,"PUBLISHED");
    return;
   }
   if(job.status==="FAILED"||execution.status==="FAILED")assert.fail(`Worker execution failed (${execution.lastErrorCode}): ${output}`);
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.fail(`Worker did not complete within 45 seconds: ${output}`);
 }finally{
  if(worker.exitCode===null&&worker.signalCode===null){
   await new Promise<void>(resolve=>{
    const timer=setTimeout(()=>{worker.kill("SIGKILL");},20000);
    worker.once("exit",()=>{clearTimeout(timer);resolve();});
    worker.kill("SIGTERM");
   });
  }
  assert.equal(worker.signalCode,null,`Worker needed forced termination: ${output}`);
  assert.equal(worker.exitCode,0,`Worker did not exit cleanly: ${output}`);
 }
}
