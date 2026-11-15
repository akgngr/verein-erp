import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

// Auth.js imports Next's client navigation entry. Exercise its real runtime without
// the react-server condition used by the worker-safe module test suite.
test("Auth.js route, token, cookie and permission behavior",async()=>{
 const env:NodeJS.ProcessEnv={...process.env,NODE_OPTIONS:""};delete env.NODE_TEST_CONTEXT;
 const result=await promisify(execFile)(process.execPath,["--import","tsx","--test","tests/security/fixtures/auth-behavior.ts"],{cwd:process.cwd(),env,timeout:30000}).catch(error=>{
  assert.fail(`${error.stdout ?? ""}\n${error.stderr ?? ""}`);
 });
 assert.match(result.stdout,/pass 7/);
});
