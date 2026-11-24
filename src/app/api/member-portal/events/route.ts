import { handlePortalEventRegisterPost } from "@/modules/member-portal/server";

export async function POST(request: Request) {
  return handlePortalEventRegisterPost(request);
}
