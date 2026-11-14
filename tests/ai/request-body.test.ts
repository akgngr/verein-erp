import test from "node:test";
import assert from "node:assert/strict";
import {readAiRequestBody} from "@/modules/ai/services/request-body";
test("AI request bodies reject oversized and invalid JSON before parsing into action data",async()=>{
 assert.deepEqual(await readAiRequestBody(new Request("https://app.test/api/ai/chat",{method:"POST",body:'{"message":"test"}'})),{message:"test"});
 assert.equal(await readAiRequestBody(new Request("https://app.test/api/ai/chat",{method:"POST",body:'{"message":"'+"x".repeat(9000)+'"}'})),null);
 assert.equal(await readAiRequestBody(new Request("https://app.test/api/ai/chat",{method:"POST",body:'bad json'})),null);
});
