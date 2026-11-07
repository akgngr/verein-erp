import { z } from "zod";

/**
 * E-posta tasarımı (blok tabanlı şablon). Tasarım JSON olarak saklanır; gönderimde e-posta istemcileriyle
 * uyumlu, tablo düzenli ve satır içi stilli HTML'e ve düz metne çevrilir. Yer tutucular ({firstName})
 * olduğu gibi kalır; kişiselleştirme gönderimde (değerler HTML'de kaçışlanarak) yapılır.
 */

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const align = z.enum(["left", "center", "right"]);
const id = z.string().min(1).max(40);

const headingBlock = z.object({ id, type: z.literal("heading"), text: z.string().max(300), level: z.union([z.literal(1), z.literal(2), z.literal(3)]), align, color });
const textBlock = z.object({ id, type: z.literal("text"), text: z.string().max(10000), align, color, fontSize: z.number().int().min(10).max(28) });
const buttonBlock = z.object({ id, type: z.literal("button"), label: z.string().max(120), url: z.string().max(1000), align, background: color, color, radius: z.number().int().min(0).max(30) });
const imageBlock = z.object({ id, type: z.literal("image"), src: z.string().max(2000), alt: z.string().max(300), width: z.number().int().min(10).max(100), align, href: z.string().max(1000) });
const dividerBlock = z.object({ id, type: z.literal("divider"), color, thickness: z.number().int().min(1).max(8) });
const spacerBlock = z.object({ id, type: z.literal("spacer"), height: z.number().int().min(4).max(120) });
const footerBlock = z.object({ id, type: z.literal("footer"), text: z.string().max(2000), color });

const leafBlock = z.discriminatedUnion("type", [headingBlock, textBlock, buttonBlock, imageBlock, dividerBlock, spacerBlock, footerBlock]);
const columnsBlock = z.object({ id, type: z.literal("columns"), columns: z.array(z.array(leafBlock).max(20)).min(2).max(3), gap: z.number().int().min(0).max(40) });

export const blockSchema = z.union([leafBlock, columnsBlock]);
export const designSchema = z.object({
  version: z.literal(1),
  settings: z.object({ background: color, contentBackground: color, textColor: color, linkColor: color, fontFamily: z.enum(["sans", "serif", "mono"]), width: z.number().int().min(480).max(800) }),
  blocks: z.array(blockSchema).max(80),
});

export type LeafBlock = z.infer<typeof leafBlock>;
export type ColumnsBlock = z.infer<typeof columnsBlock>;
export type Block = z.infer<typeof blockSchema>;
export type EmailDesign = z.infer<typeof designSchema>;
export type BlockType = Block["type"];

const FONTS = { sans: "Arial, Helvetica, sans-serif", serif: "Georgia, 'Times New Roman', serif", mono: "'Courier New', monospace" } as const;

let counter = 0;
export const newId = () => `b${Date.now().toString(36)}${(counter++).toString(36)}`;

export const DEFAULT_SETTINGS: EmailDesign["settings"] = { background: "#f4f4f5", contentBackground: "#ffffff", textColor: "#1f2937", linkColor: "#2563eb", fontFamily: "sans", width: 600 };

/** Paletteki bileşenin varsayılan hâli. */
export function createBlock(type: BlockType, texts: { heading: string; text: string; button: string; footer: string }): Block {
  switch (type) {
    case "heading": return { id: newId(), type, text: texts.heading, level: 1, align: "left", color: "#111827" };
    case "text": return { id: newId(), type, text: texts.text, align: "left", color: "#1f2937", fontSize: 15 };
    case "button": return { id: newId(), type, label: texts.button, url: "https://", align: "center", background: "#2563eb", color: "#ffffff", radius: 6 };
    case "image": return { id: newId(), type, src: "", alt: "", width: 100, align: "center", href: "" };
    case "divider": return { id: newId(), type, color: "#e5e7eb", thickness: 1 };
    case "spacer": return { id: newId(), type, height: 24 };
    case "footer": return { id: newId(), type, text: texts.footer, color: "#6b7280" };
    case "columns": return { id: newId(), type, columns: [[], []], gap: 16 };
  }
}

/**
 * Düz metinden başlangıç tasarımı (eski taslaklar, varsayılan metin, asistan önerisi). İlk satır
 * selamlama ise başlık olur; "—" satırından sonrası alt bilgi olur.
 */
export function designFromText(text: string, footer?: string): EmailDesign {
  const [main, ...rest] = text.trim().split(/\n\s*—\s*\n/);
  const footerText = footer ?? rest.join("\n").trim();
  const lines = main.trim().split("\n");
  const blocks: Block[] = [];
  if (lines.length > 1 && lines[0].length <= 80) {
    blocks.push({ id: newId(), type: "heading", text: lines[0].replace(/,\s*$/, ""), level: 2, align: "left", color: "#111827" });
    lines.shift();
  }
  const body = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (body) blocks.push({ id: newId(), type: "text", text: body, align: "left", color: "#1f2937", fontSize: 15 });
  if (footerText) blocks.push({ id: newId(), type: "footer", text: footerText, color: "#6b7280" });
  return { version: 1, settings: { ...DEFAULT_SETTINGS }, blocks };
}

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Yalnız http(s), mailto, tel veya yer tutucuyla başlayan bağlantılar; diğerleri (javascript: vb.) atılır. */
export function safeUrl(url: string): string | null {
  const value = url.trim();
  if (!value || value === "https://" || value === "http://") return null;
  return /^(https?:\/\/|mailto:|tel:|\{\w+\})/i.test(value) ? value : null;
}

/** Hafif biçim: **kalın**, *italik*, [metin](bağlantı), satır sonları. Önce kaçışlanır. */
export function inlineMarkup(text: string, linkColor: string): string {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, url: string) => {
      const href = safeUrl(url.replace(/&amp;/g, "&"));
      return href ? `<a href="${escapeHtml(href)}" style="color:${linkColor};text-decoration:underline">${label}</a>` : label;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/\n/g, "<br>");
}

function renderLeaf(block: LeafBlock, settings: EmailDesign["settings"]): string {
  const font = FONTS[settings.fontFamily];
  switch (block.type) {
    case "heading": {
      const size = { 1: 28, 2: 22, 3: 18 }[block.level];
      return `<h${block.level} style="margin:0 0 12px;font-family:${font};font-size:${size}px;line-height:1.25;color:${block.color};text-align:${block.align}">${inlineMarkup(block.text, settings.linkColor)}</h${block.level}>`;
    }
    case "text":
      return `<p style="margin:0 0 14px;font-family:${font};font-size:${block.fontSize}px;line-height:1.6;color:${block.color};text-align:${block.align}">${inlineMarkup(block.text, settings.linkColor)}</p>`;
    case "button": {
      const href = safeUrl(block.url) ?? "#";
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 16px"><tr><td align="${block.align}"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;background:${block.background};color:${block.color};border-radius:${block.radius}px;font-family:${font};font-size:15px;font-weight:bold;text-decoration:none">${escapeHtml(block.label)}</a></td></tr></table>`;
    }
    case "image": {
      const src = safeUrl(block.src);
      if (!src) return "";
      const img = `<img src="${escapeHtml(src)}" alt="${escapeHtml(block.alt)}" width="${block.width}%" style="display:block;width:${block.width}%;max-width:100%;height:auto;border:0;margin:${block.align === "center" ? "0 auto" : block.align === "right" ? "0 0 0 auto" : "0"}">`;
      const href = safeUrl(block.href);
      return `<div style="margin:0 0 16px">${href ? `<a href="${escapeHtml(href)}">${img}</a>` : img}</div>`;
    }
    case "divider":
      return `<hr style="border:0;border-top:${block.thickness}px solid ${block.color};margin:16px 0">`;
    case "spacer":
      return `<div style="height:${block.height}px;line-height:${block.height}px;font-size:1px">&nbsp;</div>`;
    case "footer":
      return `<p style="margin:16px 0 0;font-family:${font};font-size:12px;line-height:1.5;color:${block.color};text-align:center">${inlineMarkup(block.text, block.color)}</p>`;
  }
}

function renderBlock(block: Block, settings: EmailDesign["settings"]): string {
  if (block.type !== "columns") return renderLeaf(block, settings);
  const width = Math.floor(100 / block.columns.length);
  const cells = block.columns.map((column, index) =>
    `<td class="col" width="${width}%" valign="top" style="padding:0 ${index < block.columns.length - 1 ? block.gap / 2 : 0}px 0 ${index > 0 ? block.gap / 2 : 0}px">${column.map((child) => renderLeaf(child, settings)).join("")}</td>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px"><tr>${cells}</tr></table>`;
}

/** Tam e-posta HTML'i (mobilde sütunlar alt alta). */
export function renderEmailHtml(design: EmailDesign, previewText = ""): string {
  const s = design.settings;
  const body = design.blocks.map((block) => renderBlock(block, s)).join("\n");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>@media (max-width:620px){.col{display:block!important;width:100%!important;padding:0!important}.container{width:100%!important}}</style></head>` // i18n-ignore (e-posta HTML iskeleti)
    + `<body style="margin:0;padding:0;background:${s.background}">`
    + (previewText ? `<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(previewText)}</div>` : "")
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${s.background}"><tr><td align="center" style="padding:24px 12px">`
    + `<table role="presentation" class="container" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${s.width}px;background:${s.contentBackground};border-radius:8px"><tr><td style="padding:24px;color:${s.textColor};font-family:${FONTS[s.fontFamily]};word-break:break-word">`
    + body
    + `</td></tr></table></td></tr></table></body></html>`;
}

const plain = (text: string) => text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1$2").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1 ($2)");

/** Düz metin sürümü (e-posta istemcilerinin metin bölümü, SMS benzeri kanallar). */
export function renderEmailText(design: EmailDesign): string {
  const leaf = (block: LeafBlock): string => {
    switch (block.type) {
      case "heading": return plain(block.text).toUpperCase();
      case "text": case "footer": return plain(block.text);
      case "button": return `${block.label}: ${safeUrl(block.url) ?? ""}`.trim();
      case "image": return block.alt ? `[${block.alt}]` : "";
      case "divider": return "—";
      case "spacer": return "";
    }
  };
  return design.blocks
    .flatMap((block) => (block.type === "columns" ? block.columns.flat().map(leaf) : [leaf(block)]))
    .filter((part, index, list) => part !== "" || (index > 0 && list[index - 1] !== ""))
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
