import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {checkModuleAi} from "../../scripts/validate-module";
test("module validator accepts only the v2 factory and rejects legacy tools (§9b)",()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"ai-v2-module-")),dir=path.join(root,"example");fs.mkdirSync(dir);
 try{
  for(const [factory,tool,expected] of [["defineModuleAi","aiTool",1],["defineModuleAiV2","aiToolV2",0],["defineModuleAiV2","aiTool",1]] as const){
   fs.writeFileSync(path.join(dir,"ai.ts"),`import "server-only";\nexport const ai = ${factory}({module:"example",tools:[${tool}({name:"example_tool"})],actions:{}});`);
   const problems:string[]=[];checkModuleAi(dir,problems);assert.equal(problems.length,expected,problems.join("\n"));
  }
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
