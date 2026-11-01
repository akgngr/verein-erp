import { uploadPackageHandler } from "../../server";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return uploadPackageHandler(request);
}
