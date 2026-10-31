import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";

import { parseMarkdown } from "@/shared/markdown/parse";

import { plainText } from "./text";
import { defineFormat } from "./types";

/** **kalın** parçalarını korur; bağlantı ve kod düz metin olur. */
const runs = (text: string) =>
  plainText(text.replace(/\*\*([^*]+)\*\*/g, "\u0001$1\u0001"))
    .split("\u0001")
    .map((part, index) => new TextRun({ text: part, bold: index % 2 === 1 }));

const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3];
const ALIGN = { left: AlignmentType.LEFT, right: AlignmentType.RIGHT, center: AlignmentType.CENTER } as const;

export const docxFormat = defineFormat({
  id: "docx",
  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  extension: "docx",
  render: async ({ title, markdown }) => {
    const children: (Paragraph | Table)[] = [new Paragraph({ text: title, heading: HeadingLevel.TITLE })];
    for (const block of parseMarkdown(markdown)) {
      if (block.type === "heading") children.push(new Paragraph({ children: runs(block.text), heading: HEADINGS[Math.min(block.level, 3) - 1] }));
      else if (block.type === "paragraph") children.push(new Paragraph({ children: runs(block.text), spacing: { after: 120 } }));
      else if (block.type === "list")
        block.items.forEach((item, index) =>
          children.push(block.ordered ? new Paragraph({ children: [new TextRun(`${index + 1}. `), ...runs(item)] }) : new Paragraph({ children: runs(item), bullet: { level: 0 } })),
        );
      else {
        const row = (cells: string[], header: boolean) =>
          new TableRow({
            tableHeader: header,
            children: block.header.map(
              (_, column) =>
                new TableCell({
                  shading: header ? { fill: "EEEEEE" } : undefined,
                  children: [new Paragraph({ alignment: ALIGN[block.align[column] ?? "left"], children: header ? [new TextRun({ text: plainText(cells[column] ?? ""), bold: true })] : runs(cells[column] ?? "") })],
                }),
            ),
          });
        children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [row(block.header, true), ...block.rows.map((cells) => row(cells, false))] }));
        children.push(new Paragraph({ text: "" }));
      }
    }
    return Packer.toBuffer(new Document({ creator: "Verein ERP", title, sections: [{ children }] })); // i18n-ignore (dosya meta verisi)
  },
});
