import { z } from "zod";

const integer=z.number().int().min(0).max(2_000_000_000);
const prices=z.record(z.string(),z.object({inputMicroEurPerMillion:integer,outputMicroEurPerMillion:integer}).strict());
export type CostReservation={limit:number;microEur:number};

/** Operator quotes are configuration, never inferred from a model name or model output. */
export function aiCostReservation(provider:string,model:string,inputBytes:number,env:Record<string,string|undefined>=process.env):CostReservation|null {
 if(!env.AI_DAILY_COST_BUDGET_MICRO_EUR)return null;
 const limit=integer.min(1).parse(Number(env.AI_DAILY_COST_BUDGET_MICRO_EUR));
 if(!Number.isSafeInteger(inputBytes)||inputBytes<0||inputBytes>65536)throw new Error("AI_INPUT_BUDGET");
 const quote=prices.parse(JSON.parse(env.AI_MODEL_COSTS_JSON??"{}"))[`${provider}:${model}`];
 if(!quote)throw new Error("AI_COST_POLICY_MISSING");
 // Reserve one token per UTF-8 byte plus 4096 output tokens for every provider round.
 // No refund on failure or ambiguous delivery; account-level provider caps remain separate.
 const numerator=BigInt(inputBytes)*BigInt(quote.inputMicroEurPerMillion)+BigInt(4096)*BigInt(quote.outputMicroEurPerMillion);
 const microEur=Number((numerator+BigInt(999999))/BigInt(1000000));
 return {limit,microEur:integer.parse(microEur)};
}
