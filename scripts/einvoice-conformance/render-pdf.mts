import path from "node:path";
import { createElement as h } from "react";
import { Document, Font, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";

import type { XInvoiceData } from "../../src/modules/accounting/services/einvoice-out.ts";

/**
 * Base PDF for the ZUGFeRD check, rendered with the same engine (@react-pdf) and the same embedded
 * Noto Sans fonts as the app. The app's InvoiceDocument cannot be loaded outside the Next.js bundler
 * (CJS/ESM interop of react-pdf), so the layout here is simplified; the PDF/A-3 conversion and the
 * embedded CII come from the real accounting code (toZugferdPdf / buildCiiInvoice).
 */
const FONTS = path.join(process.cwd(), "src/shared/pdf/fonts");
Font.register({ family: "NotoSans", fonts: [
  { src: path.join(FONTS, "NotoSans_400Regular.ttf"), fontWeight: 400 },
  { src: path.join(FONTS, "NotoSans_700Bold.ttf"), fontWeight: 700 },
] });

const money = (cents: number) => `${(cents / 100).toFixed(2).replace(".", ",")} €`;

export async function renderZugferdBasePdf(data: XInvoiceData): Promise<Uint8Array> {
  const text = (value: string, bold = false) => h(Text, { style: { fontWeight: bold ? 700 : 400 } }, value);
  const doc = h(Document, { title: `Rechnung ${data.number}` },
    h(Page, { size: "A4", style: { fontFamily: "NotoSans", fontSize: 10, padding: 50 } },
      text(data.seller.name, true),
      text(`${data.seller.street ?? ""}, ${data.seller.postalCode ?? ""} ${data.seller.city ?? ""}`),
      h(View, { style: { marginTop: 24 } }, text(data.buyer.name), text(`${data.buyer.street ?? ""}, ${data.buyer.postalCode ?? ""} ${data.buyer.city ?? ""}`)),
      h(View, { style: { marginTop: 24 } }, text(`${data.typeCode === 381 ? "Stornorechnung" : "Rechnung"} ${data.number}`, true), text(`Datum: ${data.issueDate}`)),
      h(View, { style: { marginTop: 16 } }, ...data.lines.map((line) =>
        text(`${line.position}. ${line.description} · ${line.quantity} × ${money(line.unitPriceCents)} · ${line.taxRate} % · ${money(line.netCents)}`))),
      h(View, { style: { marginTop: 16 } }, text(`Netto ${money(data.netCents)} · USt ${money(data.taxCents)} · Brutto ${money(data.grossCents)}`, true)),
      data.smallBusiness ? text("Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.") : null,
    ));
  return new Uint8Array(await renderToBuffer(doc));
}
