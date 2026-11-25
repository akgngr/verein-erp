import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { requirePermission } from "@/modules/auth/server";
import { resolvePublicOrigin } from "@/shared/security/public-origin";

import { bankingPermissions } from "../permissions";
import { findPendingConnectionByReference, markError, refreshConnection } from "./connections";

/**
 * Banka onayından dönüş (GET /api/banking/callback?ref=…). Oturum ve yetki zorunludur; ref
 * tek kullanımlık rastgele değerdir. Yalnızca sunucu tarafından yapılandırılmış kanonik kök
 * adrese yönlendirilir (Host-header enjeksiyonu / açık yönlendirme kapalıdır).
 */
export async function bankCallbackHandler(request: NextRequest): Promise<NextResponse> {
  const origin = resolvePublicOrigin(request.headers);
  if (!origin) {
    return NextResponse.json({ ok: false, error: "APP_URL is not configured" }, { status: 500 });
  }
  const back = new URL("/ayarlar/banka-baglantisi", origin);
  try {
    await requirePermission(bankingPermissions, "update");
  } catch {
    return NextResponse.redirect(new URL("/giris", origin));
  }
  const reference = request.nextUrl.searchParams.get("ref") ?? "";
  const connection = reference ? await findPendingConnectionByReference(reference) : null;
  if (!connection) {
    back.searchParams.set("sonuc", "hata");
    return NextResponse.redirect(back);
  }
  try {
    const status = await refreshConnection(connection.id, { consumeReference: true });
    back.searchParams.set("sonuc", status === "LINKED" ? "baglandi" : "bekliyor");
  } catch (err) {
    console.error("[banking] callback:", err instanceof Error ? err.message : err);
    await markError(connection.id, "provider");
    back.searchParams.set("sonuc", "hata");
  }
  return NextResponse.redirect(back);
}
