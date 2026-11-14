import test from "node:test";
import assert from "node:assert/strict";
import {extractTextFromBytes} from "@/shared/files/extract-text";
test("document extraction failures do not log raw exception text or document content",async()=>{
 const logs:unknown[][]=[],old=console.error;
 console.error=(...args:unknown[])=>logs.push(args);
 try{
  const result=await extractTextFromBytes(Buffer.from("PRIVATE_DOCUMENT_SENTINEL"),"application/pdf");
  assert.equal(result.reason,"failed");
  assert.ok(!JSON.stringify(logs).includes("PRIVATE_DOCUMENT_SENTINEL"));
  assert.ok(logs.some(args=>args[0]==="[shared/files] TEXT_EXTRACTION_FAILED"));
 }finally{console.error=old;}
});
