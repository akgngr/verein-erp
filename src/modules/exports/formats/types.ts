/** Yerleşik formatlar; sözleşme @/shared/formats/define'da (diğer modüller formats.ts ile ekler). */
export { defineFormat, type FileContent, type FileFormatPlugin, type RenderContext } from "@/shared/formats/define";

export const FILE_FORMATS = ["pdf", "xlsx", "docx", "md", "csv"] as const;
/** Format kimliği: yerleşikler + modüllerin formats.ts ile eklediği formatlar. */
export type FileFormatId = string;
