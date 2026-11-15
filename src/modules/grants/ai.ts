import "server-only";
import {defineModuleAiV2} from "@/shared/ai/v2";
import {aiStatisticsTool} from "./services/ai-statistics-tool";

/** Hibeler: yalnız toplu sayılar (fiş, karşı taraf ve rapor metni verilmez). */

export const ai = defineModuleAiV2({
  module: "grants",
  tools: [
    aiStatisticsTool,
  ],
  actions: {},
});
