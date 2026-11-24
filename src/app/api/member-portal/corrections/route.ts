import { handlePortalCorrectionPost } from "@/modules/member-portal/server";

export async function POST(request: Request) {
  return handlePortalCorrectionPost(request);
}
