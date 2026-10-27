import { exportMembersHandler } from "@/modules/members/server";

export const runtime = "nodejs";

/** GET üye defteri Excel — ince sarmalayıcı (4.6); mantık handlers/export-members.ts'te. */
export async function GET(request: Request): Promise<Response> {
  return exportMembersHandler(request);
}
