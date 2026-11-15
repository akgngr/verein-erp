import "server-only";
import {defineModuleAiV2} from "@/shared/ai/v2";
import {aiStatisticsTool} from "./services/ai-statistics-tool";

/** CRM: yalnız toplu sayılar; kişi adı, iletişim, not ve zaman akışı verilmez. */

export const ai = defineModuleAiV2({
  module: "crm",
  tools: [
    aiStatisticsTool,
  ],
  actions: {},
});
