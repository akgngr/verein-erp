import "server-only";
import { aiToolV2, defineModuleAiV2 } from "@/shared/ai/v2";

import { z } from "zod";
import {makeDatasetExportTool,datasetExportPlanSchema} from "./services/dataset-export-tool";

import {aiAction} from "@/shared/ai/define";
import { can } from "@/shared/permissions/define";

import { FILES_MAX_CONTENT_CHARS } from "./constants";
import { allFormats } from "./formats/index";

/** Asistanın bildiği formatlar: yerleşikler + modüllerin formats.ts eklentileri (kullanılabilirlik çalışırken denetlenir). */
const FORMAT_IDS = allFormats().map((entry) => entry.plugin.id) as [string, ...string[]];
const EXTRA_HINTS = allFormats().filter((entry) => entry.moduleKey !== "exports" && entry.plugin.hint).map((entry) => `${entry.plugin.id} (${entry.plugin.hint})`);
import { exportsPermissions } from "./permissions";
import { createGeneratedFile } from "./services/files";

/**
 * Dosyalar: asistan, kullanıcının istediği içeriği (başlık + markdown) PDF, Excel, Word, Markdown
 * veya CSV dosyasına çevirir. KARAR: "oluşturma" izni ister ama onay kartı GEREKMEZ — dernek
 * verisini değiştirmez, yalnızca kullanıcıya ait, şifreli ve süreli bir dosya üretir. Bağlantı modele
 * değil arayüze gider (yanıtın altında indirme düğmesi). Sözleşme: src/shared/ai/define.ts.
 */
export const ai = defineModuleAiV2({
  module: "exports",
  tools: [
    makeDatasetExportTool({name:"export_dataset"}),
    makeDatasetExportTool({name:"propose_dataset_export"}),
    aiToolV2({
      name: "create_file",
      operation: "create",
      allowed: (user) => can(user.role, exportsPermissions, "create"),
      description:
        `Creates a downloadable file from markdown you provide (headings, paragraphs, lists, tables). Formats: pdf (letterhead), xlsx (every table becomes a sheet; numbers stay numeric), docx, md, csv (tables only)${EXTRA_HINTS.length ? `, ${EXTRA_HINTS.join(", ")}` : ""}. Use it whenever the user asks for a file/PDF/Excel/Word of an answer, table or summary. Put the complete content into markdown; it does not fetch data itself. A download button is shown to the user automatically: never write a link, URL or file path.`, // i18n-ignore (model-facing tool text)
      input: z.object({ format: z.enum(FORMAT_IDS), title: z.string().min(1).max(150), markdown: z.string().min(1).max(FILES_MAX_CONTENT_CHARS) }),
      run: async ({ format, title, markdown }, { user, restore, attachFile, revealAliases }) => {
        // Maskeler ([PERSON_n]) ve takma adlar ([[Kn]]) yalnız sunucuda, kullanıcının canlı yetkisiyle gerçek değere çevrilir;
        // dosya yalnız bu kullanıcıya aittir ve sonuç modele dönmez.
        const reveal = async (text: string) => (revealAliases ? revealAliases(restore(text)) : restore(text));
        const file = await createGeneratedFile({ ownerId: user.id, title: await reveal(title), format, markdown: await reveal(markdown), source: "ai" });
        attachFile({ title: file.title, url: file.url, format });
        return { status: "created", format, note: "The file is ready; a download button is shown below your answer. Do not write any link or path." }; // i18n-ignore (model-facing tool text)
      },
      result: z.unknown(), modelOutput: z.unknown(), projectForModel: (result) => result,
      policy: {"purpose": "exports-create-file", "serverReads": [], "modelFields": ["status", "format", "note"], "processing": "approved_provider", "modelDataClass": "internal"},
    }),
  ],
  actions: {
    datasetExport:aiAction({operation:"create",schema:datasetExportPlanSchema,execute:async(input,context)=>{
    if(!context)return {ok:false};
    return {ok:true,jobId:await context.requestDatasetExport(input)};
  }})},
});
