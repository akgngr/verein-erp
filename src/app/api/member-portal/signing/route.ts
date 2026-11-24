import { handlePortalSigningPost } from "@/modules/member-portal/server";

export async function POST(request: Request) {
  return handlePortalSigningPost(request);
}
