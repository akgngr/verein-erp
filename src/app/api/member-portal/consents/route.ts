import { handlePortalConsentPost } from "@/modules/member-portal/server";

export async function POST(request: Request) {
  return handlePortalConsentPost(request);
}
