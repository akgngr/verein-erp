"use client";

import { PdfSplitButton } from "@/shared/components/ui/pdf-split-button";

/** Sunucu view'larından kullanılabilen PDF butonu: dil seçimi ?lang= ile eklenir. */
export function AccountingPdfButton({ href, label }: { href: string; label: string }) {
  return <PdfSplitButton buildHref={(lang) => `${href}${href.includes("?") ? "&" : "?"}lang=${lang}`} label={label} aria={label} />;
}
