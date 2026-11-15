import test from "node:test";
import assert from "node:assert/strict";
import {isPublicModuleEntry} from "../../scripts/validate-module";
test("only the declared narrow generation entry bypasses the broad automation registry",()=>{
 assert.equal(isPublicModuleEntry("automation","public/file-generation"),true);
 for(const path of ["services/execution-state","services/execution-store","public/../services/execution-state","public/file-generation/other"]){assert.equal(isPublicModuleEntry("automation",path),false);}
 assert.equal(isPublicModuleEntry("members","public/file-generation"),false);
});

test("unprepared generation arguments cannot enqueue an execution",async()=>{
 const {requestGeneration}=await import("@/modules/exports/services/generation");
 await assert.rejects(requestGeneration({} as never),/FILE_GENERATION_NOT_PREPARED/);
});
