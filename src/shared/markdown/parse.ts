/**
 * Sohbet yanıtları için küçük, güvenli markdown çözümleyici (saf; istemci ve testlerde çalışır).
 * Desteklenen: başlık (#), madde/numaralı liste, GFM tablo (| a | b | + |---|), paragraf.
 * Ham HTML hiçbir zaman çizilmez; satır içi biçim bileşende ayrıca ele alınır.
 */
export type MdBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; header: string[]; align: ("left" | "right" | "center")[]; rows: string[][] };

const isTableRow = (line: string) => /^\s*\|.*\|\s*$/.test(line);
const isSeparator = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

export function parseMarkdown(source: string): MdBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: MdBlock[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join("\n") });
    paragraph = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === "") {
      flush();
      continue;
    }
    // Tablo: başlık satırı + ayırıcı satır, ardından tablo satırları.
    if (isTableRow(line) && index + 1 < lines.length && isSeparator(lines[index + 1])) {
      flush();
      const header = cells(line);
      const align = cells(lines[index + 1]).map((spec) => (spec.startsWith(":") && spec.endsWith(":") ? "center" : spec.endsWith(":") ? "right" : "left") as "left" | "right" | "center");
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && isTableRow(lines[index])) {
        const row = cells(lines[index]);
        rows.push(header.map((_, column) => row[column] ?? ""));
        index += 1;
      }
      index -= 1;
      blocks.push({ type: "table", header, align: header.map((_, column) => align[column] ?? "left"), rows });
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2].trim() });
      continue;
    }
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flush();
      const ordered = Boolean(numbered);
      const item = (bullet ?? numbered)![1];
      const last = blocks[blocks.length - 1];
      if (last?.type === "list" && last.ordered === ordered) last.items.push(item);
      else blocks.push({ type: "list", ordered, items: [item] });
      continue;
    }
    paragraph.push(line);
  }
  flush();
  return blocks;
}
