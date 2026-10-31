import type { MdBlock } from "@/shared/markdown/parse";

/** Satır içi markdown'ı düz metne çevirir (**kalın**, [metin](yol), `kod`). */
export const plainText = (text: string) =>
  text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/`([^`]+)`/g, "$1");

/** "1.234,56 €", "50,00", "12%" gibi hücreleri sayıya çevirir; değilse null. */
export function parseNumber(cell: string): number | null {
  const value = plainText(cell).replace(/\s*(€|EUR|%)\s*$/i, "").trim();
  if (!/^-?\d{1,3}(\.\d{3})*(,\d+)?$|^-?\d+(,\d+)?$|^-?\d+(\.\d+)?$/.test(value)) return null;
  const normalized = value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

/** Tablo olmayan blokları satırlara çevirir (Excel/CSV'de tablo yoksa kullanılır). */
export function blockLines(blocks: MdBlock[]): string[] {
  return blocks.flatMap((block) => {
    if (block.type === "heading" || block.type === "paragraph") return [plainText(block.text)];
    if (block.type === "list") return block.items.map((item, index) => `${block.ordered ? `${index + 1}.` : "•"} ${plainText(item)}`);
    return [];
  });
}
