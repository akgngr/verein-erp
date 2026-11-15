import test from "node:test";
import assert from "node:assert/strict";
import {aiCostReservation} from "@/modules/ai/services/cost-policy";
test("currency reservations use integer micro-EUR and fail closed for missing quotes",()=>{
 const env:Record<string,string|undefined>={AI_DAILY_COST_BUDGET_MICRO_EUR:"1000000",AI_MODEL_COSTS_JSON:JSON.stringify({"test:model":{inputMicroEurPerMillion:1000000,outputMicroEurPerMillion:2000000}})};
 assert.deepEqual(aiCostReservation("test","model",1000,env),{limit:1000000,microEur:9192});
 assert.throws(()=>aiCostReservation("test","unknown",1,env),/AI_COST_POLICY_MISSING/);
 assert.throws(()=>aiCostReservation("test","model",65537,env));
 assert.throws(()=>aiCostReservation("test","model",1,{...env,AI_DAILY_COST_BUDGET_MICRO_EUR:"NaN"}));
 assert.equal(aiCostReservation("test","model",1,{}),null);
});
