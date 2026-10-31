import { renderToBuffer } from "@react-pdf/renderer";

import { registerSharedPdfFonts } from "@/shared/pdf/fonts";
import { MarkdownPdfDocument } from "@/shared/pdf/markdown-document";

import { defineFormat } from "./types";

/** Dernek antetli PDF (başlık, paragraf, liste, tablo). */
export const pdfFormat = defineFormat({
  id: "pdf",
  mimeType: "application/pdf",
  extension: "pdf",
  render: async ({ title, markdown, createdAt }, { letterhead, strings }) => {
    registerSharedPdfFonts();
    return renderToBuffer(<MarkdownPdfDocument data={{ organization: await letterhead(), title, markdown, createdAt, strings }} />);
  },
});
