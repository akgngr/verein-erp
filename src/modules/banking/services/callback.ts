import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { requirePermission } from "@/modules/auth/server";

import { bankingPermissions } from "../permissions";
import { findConnectionByReference, markError, refreshConnection } from "./connections";

/**
 * Banka onayından dönüş (GET /api/banking/callback?ref=…). Oturum ve yetki zorunludur; ref
 * tek kullanımlık rastgele değerdir. Sonuç ne olursa olsun kullanıcı bağlantı sayfasına döner.
 */
/** Kullanıcının geldiği adres (proxy arkasında X-Forwarded-*); iç adres (request.url) kullanılmaz. */
function publicOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export async function bankCallbackHandler(request: NextRequest): Promise<NextResponse> {
  const origin = publicOrigin(request);
  const back = new URL("/ayarlar/banka-baglantisi", origin);
  try {
    await requirePermission(bankingPermissions, "update");
  } catch {
    return NextResponse.redirect(new URL("/giris", origin));
  }
  const reference = request.nextUrl.searchParams.get("ref") ?? "";
  const connection = reference ? await findConnectionByReference(reference) : null;
  if (!connection) {
    back.searchParams.set("sonuc", "hata");
    return NextResponse.redirect(back);
  }
  try {
    const status = await refreshConnection(connection.id);
    back.searchParams.set("sonuc", status === "LINKED" ? "baglandi" : "bekliyor");
  } catch (err) {
    console.error("[banking] callback:", err instanceof Error ? err.message : err);
    await markError(connection.id, "provider");
    back.searchParams.set("sonuc", "hata");
  }
  return NextResponse.redirect(back);
}
