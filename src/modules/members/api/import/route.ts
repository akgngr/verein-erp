import { importMembersHandler } from "../../server";

export const runtime = "nodejs";

/**
 * POST üye içe aktarma (?dryRun=1|0, multipart "file") — ince sarmalayıcı;
 * mantık handlers/import-members.ts'te (dry-run + commit).
 */
export async function POST(request: Request): Promise<Response> {
  return importMembersHandler(request);
}
