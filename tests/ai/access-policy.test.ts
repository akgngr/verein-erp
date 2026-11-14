import test from "node:test";
import assert from "node:assert/strict";
import { checkCurrentAiAccess } from "@/modules/ai/services/access-policy";
import { openAiCompatibleAdapter } from "@/modules/ai/services/providers/openai-compatible";

test("fresh access loads catch revocation, module disable, actor/provider change and role loss", async () => {
  const state = {userId:"u1",consent:true,provider:"local",enabled:true,allowed:true};
  let loads=0;
  const deps = {user:async()=>{loads++;return {id:state.userId};}, modules:async()=>state.enabled?["ai"]:[], consent:async()=>state.consent, provider:async()=>state.provider, allowed:()=>state.allowed};
  assert.ok(await checkCurrentAiAccess("u1","local",deps));
  for (const key of ["consent","enabled","allowed"] as const) {
    state[key]=false; assert.equal(await checkCurrentAiAccess("u1","local",deps),null); state[key]=true;
  }
  state.userId="u2"; assert.equal(await checkCurrentAiAccess("u1","local",deps),null); state.userId="u1";
  state.provider="openai"; assert.equal(await checkCurrentAiAccess("u1","local",deps),null);
  assert.equal(loads,6);
});

test("provider checks access before each model round; revocation prevents the next outbound request", async () => {
  let requests=0; let authorized=true;
  const fakeFetch: typeof fetch = async () => {
    requests++;
    return new Response(JSON.stringify({id:"test",object:"chat.completion",created:0,model:"test",choices:[{index:0,finish_reason:"tool_calls",message:{role:"assistant",content:null,tool_calls:[{id:"call1",type:"function",function:{name:"read",arguments:"{}"}}]}}]}),{headers:{"content-type":"application/json"}});
  };
  const adapter=openAiCompatibleAdapter({apiKey:"test-key",fetch:fakeFetch});
  await assert.rejects(adapter.run({model:"test",system:"test",turns:[],tools:[],maxToolRounds:6,
    beforeRequest:async()=>{if(!authorized)throw new Error("REVOKED");},
    executeTool:async()=>{authorized=false;return {content:"{}",isError:false};},
  }),/REVOKED/);
  assert.equal(requests,1);
});
