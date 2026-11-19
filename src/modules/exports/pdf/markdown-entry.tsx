import { renderToBuffer } from "@react-pdf/renderer";

import { registerSharedPdfFonts } from "@/shared/pdf/fonts";
import { MarkdownPdfDocument } from "@/shared/pdf/markdown-document";

/** Alt işlem (render-markdown-cli.mjs) girdisi: JSON ile gelir; tarih metin, altbilgi şablon ("{page}", "{total}"). */
export type MarkdownRenderInput = {
  organization: Parameters<typeof MarkdownPdfDocument>[0]["data"]["organization"];
  title: string;
  markdown: string;
  createdAt: string;
  strings: { createdAt: string; note: string; footerTemplate: string };
};

export async function renderMarkdown(input: MarkdownRenderInput): Promise<Buffer> {
  registerSharedPdfFonts();
  const footer = (page: number, total: number) => input.strings.footerTemplate.replace("{page}", String(page)).replace("{total}", String(total));
  const organization = { ...input.organization, exemptionNoticeDate: input.organization.exemptionNoticeDate ? new Date(input.organization.exemptionNoticeDate) : null };
  return renderToBuffer(<MarkdownPdfDocument data={{ organization, title: input.title, markdown: input.markdown, createdAt: new Date(input.createdAt), strings: { createdAt: input.strings.createdAt, note: input.strings.note, footer } }} />);
}
