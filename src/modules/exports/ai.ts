import "server-only";

import { z } from "zod";

import { aiTool, defineModuleAi } from "@/shared/ai/define";
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
export const ai = defineModuleAi({
  module: "exports",
  tools: [
    aiTool({
      name: "create_file",
      operation: "create",
      allowed: (user) => can(user.role, exportsPermissions, "create"),
      description:
        `Creates a downloadable file from markdown you provide (headings, paragraphs, lists, tables). Formats: pdf (letterhead), xlsx (every table becomes a sheet; numbers stay numeric), docx, md, csv (tables only)${EXTRA_HINTS.length ? `, ${EXTRA_HINTS.join(", ")}` : ""}. Use it whenever the user asks for a file/PDF/Excel/Word of an answer, table or summary. Put the complete content into markdown; it does not fetch data itself. A download button is shown to the user automatically: never write a link, URL or file path.`, // i18n-ignore (model-facing tool text)
      schema: z.object({ format: z.enum(FORMAT_IDS), title: z.string().min(1).max(150), markdown: z.string().min(1).max(FILES_MAX_CONTENT_CHARS) }),
      inputSchema: {
        type: "object",
        properties: {
          format: { type: "string", enum: [...FORMAT_IDS] },
          title: { type: "string" },
          markdown: { type: "string", description: "Full content in markdown (tables allowed)" }, // i18n-ignore (model-facing tool text)
        },
        required: ["format", "title", "markdown"],
        additionalProperties: false,
      },
      run: async ({ format, title, markdown }, { user, restore, attachFile }) => {
        const file = await createGeneratedFile({ ownerId: user.id, title: restore(title), format, markdown: restore(markdown), source: "ai" });
        attachFile({ title: file.title, url: file.url, format });
        return { status: "created", format, note: "The file is ready; a download button is shown below your answer. Do not write any link or path." }; // i18n-ignore (model-facing tool text)
      },
    }),
  ],
  actions: {},
});
