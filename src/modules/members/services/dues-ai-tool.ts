import "server-only";
import {z} from "zod";
import {datasetResultSchema} from "@/shared/ai/dataset";
import {aiToolV2} from "@/shared/ai/v2";
import {can} from "@/shared/permissions/define";
import {memberPaymentsPermissions} from "../permissions";
import {describeDuesDataset,duesDatasetQuerySchema,DUES_DATASET_COLUMNS,streamDuesDataset} from "./ai-dataset";

/** Worker-safe definition shared by the live registry and provider-wire integration tests. */
export function makeDuesDatasetTool(args:{name:"create_dues_dataset"|"create_dataset"}){
 const input=args.name==="create_dataset"?z.object({source:z.literal("members.dues"),query:duesDatasetQuerySchema}).strict():duesDatasetQuerySchema;
 return aiToolV2({name:args.name,operation:"read",allowed:user=>can(user.role,memberPaymentsPermissions,"view"),
  description:"Canonical create_dataset uses source=members.dues and a query object; the compatibility alias accepts direct query fields. Prepare a server-side dataset of dues using year, status (default OVERDUE) and optional minimum/maximum outstanding integer cents. Returns only a temporary datasetRef and count; no identities. Use propose_dataset_export for a file with real names.", // i18n-ignore (model-facing)
  descriptionKey:`members.ai.tools.${args.name}.description`,
  input,result:datasetResultSchema,modelOutput:datasetResultSchema,
  policy:{purpose:"dues-export",serverReads:["Member","MemberDue","MemberPayment"],modelFields:["datasetRef","count"],processing:"approved_provider",modelDataClass:"internal"},projectForModel:result=>result,
  run:async(raw,context)=>{
   const query=duesDatasetQuerySchema.parse("query" in raw?raw.query:raw);
   const data=await describeDuesDataset(query,context.signal);
   const datasetRef=await context.createDataset({definition:query,selection:data,queryVersion:2,columns:[...DUES_DATASET_COLUMNS]});
   return {datasetRef,count:data.count};
  },
 });
}

const PAGE_SIZE = 50;

/**
 * Takma adlı kişi düzeyi aidat listesi (modelDataClass: pseudonymous). Model kişiyi yalnız [[Kn]]
 * olarak görür; ad, üye numarası, kesin tarih ve kuruş gönderilmez (tutar tam avroya yuvarlanır,
 * vade ay düzeyinde). Bulutta yalnız "takma adlı kişi verisi" ayarı açıksa sunulur.
 */
export function makePseudonymousDuesTool(args: { name: "list_dues_by_person" }) {
  const row = z.object({ person: z.string(), remainingEur: z.number().int(), membershipType: z.string(), dueMonth: z.string(), status: z.string() }).strict();
  const output = z.object({ year: z.number().int(), total: z.number().int(), page: z.number().int(), hasMore: z.boolean(), rows: z.array(row) }).strict();
  return aiToolV2({
    name: args.name,
    operation: "read",
    allowed: (user) => can(user.role, memberPaymentsPermissions, "view"),
    description: "List membership dues per person for a year (default status OVERDUE), 50 per page. People appear only as aliases like [[K3]]; amounts are whole euros, due dates are months. Use it to analyse or rank who owes what; never ask for real names.", // i18n-ignore (model-facing)
    input: duesDatasetQuerySchema.extend({ page: z.number().int().min(1).max(100).default(1) }),
    result: output,
    modelOutput: output,
    policy: { purpose: "dues-analysis", serverReads: ["Member", "MemberDue", "MemberPayment"], modelFields: ["year", "total", "page", "hasMore", "rows", "rows.person", "rows.remainingEur", "rows.membershipType", "rows.dueMonth", "rows.status"], processing: "approved_provider", modelDataClass: "pseudonymous" },
    limits: { maxRows: PAGE_SIZE },
    projectForModel: (result) => result,
    run: async (query, context) => {
      if (!context.pseudonym) throw new Error("AI_PSEUDONYM_UNAVAILABLE");
      const { page, ...filter } = query;
      // Akış: tüm seçim belleğe alınmaz; toplam sayılır, yalnız istenen sayfa toplanır.
      const slice: Array<{ memberId: string; remainingCents: number; type: string; dueDate: string; status: string }> = [];
      let total = 0;
      for await (const item of streamDuesDataset(filter, { signal: context.signal })) {
        if (total >= (page - 1) * PAGE_SIZE && slice.length < PAGE_SIZE) slice.push(item);
        total++;
      }
      const rows = [];
      for (const item of slice) {
        rows.push({ person: await context.pseudonym("members", item.memberId), remainingEur: Math.round(item.remainingCents / 100), membershipType: item.type, dueMonth: item.dueDate.slice(0, 7), status: item.status });
      }
      return { year: filter.year, total, page, hasMore: page * PAGE_SIZE < total, rows };
    },
  });
}
