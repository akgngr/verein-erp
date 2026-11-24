import { handlePortalConsentConfirmGet } from "@/modules/member-portal/server";

export async function GET(request: Request) {
  return handlePortalConsentConfirmGet(request);
}
