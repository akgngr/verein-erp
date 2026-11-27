import { getTranslations } from "next-intl/server";

import { unsubscribeByToken } from "../../../../services/channel-consent";

/**
 * #581: Tek tıkla abonelikten çıkış. Oturum yok (alıcı ve e-posta istemcisi çağırır); belirteç rastgele ve
 * kişiye özeldir.
 * - POST: RFC 8058 "List-Unsubscribe=One-Click" (Gmail/Yahoo) veya sayfadaki düğme → hemen işlenir.
 * - GET: yalnız onay sayfası (bağlantı tarayıcıları/önizlemeler kimseyi kendiliğinden çıkarmaz).
 * Kişinin dili bilinmez: metin Almanca ve Türkçe birlikte gösterilir.
 */
async function page(kind: "confirm" | "done" | "unknown" | "unsupported", token: string): Promise<Response> {
  const [de, tr] = await Promise.all([
    getTranslations({ locale: "de", namespace: "mailings.unsubscribe" }),
    getTranslations({ locale: "tr", namespace: "mailings.unsubscribe" }),
  ]);
  const both = (key: string) => `${de(key as never)} / ${tr(key as never)}`;
  const form = kind === "confirm"
    ? `<form method="post" action="/api/mailings/t/u/${encodeURIComponent(token)}"><button type="submit">${both("button")}</button></form>`
    : "";
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">`; // i18n-ignore (HTML meta, not UI text)
  const html = `<!doctype html><html lang="de"><head>${head}<title>${both("title")}</title></head><body><main><h1>${both("title")}</h1><p>${de(kind)}</p><p>${tr(kind)}</p>${form}</main></body></html>`;
  return new Response(html, { status: kind === "unknown" ? 404 : 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return page("confirm", token);
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await unsubscribeByToken(token);
  // İstemci (Gmail/Yahoo) gövdeyi okumaz; düğmeyle gelen tarayıcıya sonuç sayfası gösterilir.
  if ((request.headers.get("accept") ?? "").includes("text/html")) return page(result, token);
  return new Response(null, { status: result === "unknown" ? 404 : 200 });
}
