import {z} from "zod";
import {PROPOSED} from "./define";
export const datasetRefSchema=z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const datasetResultSchema=z.object({datasetRef:datasetRefSchema,count:z.number().int().min(0).max(100000)}).strict();
export const proposalAcknowledgementSchema=z.object({status:z.literal("proposed"),note:z.literal(PROPOSED.note)}).strict();
