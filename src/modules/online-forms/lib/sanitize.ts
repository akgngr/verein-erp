import "server-only";

import sanitizeHtml from "sanitize-html";

/**
 * Belge HTML'i (Tiptap çıktısı) için izin listesi: yalnız metin biçimlendirme, listeler, tablolar ve
 * güvenli bağlantılar. Betik, stil sayfası, olay öznitelikleri, iframe/görsel yok. Kaydederken ve
 * gösterirken uygulanır.
 */
export function sanitizeDocumentHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "h1", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "mark", "ul", "ol", "li", "blockquote", "hr", "a", "table", "thead", "tbody", "tr", "th", "td", "colgroup", "col", "span"],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      p: ["style"], h1: ["style"], h2: ["style"], h3: ["style"], h4: ["style"],
      th: ["colspan", "rowspan", "colwidth"], td: ["colspan", "rowspan", "colwidth"], col: ["style"],
    },
    allowedStyles: { "*": { "text-align": [/^(left|right|center|justify)$/] }, col: { width: [/^\d+px$/] } },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: { a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer nofollow" }) },
  }).slice(0, 200_000);
}

const ENTITIES: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" };

/** PDF ve özet için düz metin: bloklar satır sonu, liste öğeleri madde işaretiyle. */
export function documentHtmlToText(html: string): string {
  const withBreaks = html
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/(p|h[1-4]|li|tr|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/t[dh]>/gi, "\t");
  return sanitizeHtml(withBreaks, { allowedTags: [], allowedAttributes: {} })
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (_, name: string) => ENTITIES[name] ?? "")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
