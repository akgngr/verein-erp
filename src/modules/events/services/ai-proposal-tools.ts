import "server-only";
import {z} from "zod";
import {aiToolV2} from "@/shared/ai/v2";
import {proposalAcknowledgementSchema} from "@/shared/ai/dataset";
import {PROPOSED} from "@/shared/ai/define";
import {can} from "@/shared/permissions/define";
import {eventsPermissions} from "../permissions";

/** Server-only proposal definitions; domain actions are invoked only by explicit confirmation. */
export const aiProposalTools=[
aiToolV2({
      name: "propose_event",
      operation: "create",
      allowed: (user) => can(user.role, eventsPermissions, "create"),
      description: "PROPOSES a new event. Nothing is created until the user confirms the card. Dates as ISO 8601 local time (YYYY-MM-DDTHH:mm).", // i18n-ignore (model-facing tool text)
      input:(z.object({
        title: z.string().min(3).max(200),
        description: z.string().max(2000).nullable(),
        type: z.enum(["WORKSHOP", "SEMINAR", "SOCIAL", "CULTURAL", "SPORTS", "OTHER"]),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).nullable(),
        location: z.string().max(200).nullable(),
        isOnline: z.boolean(),
      })).strict(),
      result:proposalAcknowledgementSchema,modelOutput:proposalAcknowledgementSchema,
      policy:{"purpose":"events-proposal","serverReads":[],"modelFields":["status","note"],"processing":"local_only"},projectForModel:result=>result,
      run: async (input, { propose }) => {
        propose({ action: "create", title: input.title, details: [input.type, input.startDate.replace("T", " "), input.isOnline ? "online" : (input.location ?? "")].filter(Boolean), payload: input });
        return PROPOSED;
      },
    })
];
