import {
  deleteOrganizationLogoHandler,
  getOrganizationLogoHandler,
  uploadOrganizationLogoHandler,
} from "@/modules/organization/server";

export const runtime = "nodejs";

/**
 * Dernek logosu (kullanıcı isteği) — ince sarmalayıcı; mantık
 * modules/organization/handlers/logo.ts'te. Proxy matcher'da api/organization
 * muaftır: oturumsuz istek yönlendirme değil 401 JSON alır.
 */
export async function GET(): Promise<Response> {
  return getOrganizationLogoHandler();
}

export async function POST(request: Request): Promise<Response> {
  return uploadOrganizationLogoHandler(request);
}

export async function DELETE(): Promise<Response> {
  return deleteOrganizationLogoHandler();
}
