import { handlePortalArt15DownloadGet } from "@/modules/member-portal/server";

export async function GET(request: Request) {
  return handlePortalArt15DownloadGet(request);
}
