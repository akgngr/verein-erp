import "server-only";

import { getTranslations } from "next-intl/server";
import { NextResponse } from "next/server";

import { isPortalEnabled } from "../../../services/auth-core";
import { confirmPortalConsentOptIn } from "../../../services/self-service";

/**
 * #580: Çift onaylı rıza (double opt-in) bağlantısı.
 * - GET yalnız onay sayfası gösterir; bağlantı tarayıcıları/önizlemeler rızayı kendiliğinden onaylamaz
 *   (önceden GET doğrudan rızayı değiştiriyordu).
 * - POST (sayfadaki düğme) onaylar ve portala yönlendirir.
 * Kişinin dili bilinmez: metin Almanca ve Türkçe birlikte gösterilir.
 */
async function confirmPage(token: string): Promise<Response> {
  const [de, tr] = await Promise.all([
    getTranslations({ locale: "de", namespace: "member-portal.consentConfirm" }),
    getTranslations({ locale: "tr", namespace: "member-portal.consentConfirm" }),
  ]);
  const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string);
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">`; // i18n-ignore (HTML meta, not UI text)
  const html = `<!doctype html><html lang="de"><head>${head}<title>${de("title")} / ${tr("title")}</title></head><body><main><h1>${de("title")} / ${tr("title")}</h1><p>${de("text")}</p><p>${tr("text")}</p><form method="post"><input type="hidden" name="token" value="${escape(token)}"><button type="submit">${de("button")} / ${tr("button")}</button></form></main></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function GET(request: Request): Promise<Response> {
  if (!isPortalEnabled()) {
    return NextResponse.json({ ok: false, error: "notFound" }, { status: 404 });
  }
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!token || token.length > 512) return NextResponse.json({ ok: false, error: "invalidOrExpired" }, { status: 400 });
  return confirmPage(token);
}

export async function POST(request: Request): Promise<Response> {
  if (!isPortalEnabled()) {
    return NextResponse.json({ ok: false, error: "notFound" }, { status: 404 });
  }
  const form = await request.formData().catch(() => null);
  const token = String(form?.get("token") ?? "");
  if (!token || token.length > 512) return NextResponse.json({ ok: false, error: "invalidOrExpired" }, { status: 400 });
  const result = await confirmPortalConsentOptIn(token);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: "invalidOrExpired" }, { status: 400 });
  }
  return NextResponse.redirect(new URL("/portal?consent=confirmed", request.url), 303);
}
