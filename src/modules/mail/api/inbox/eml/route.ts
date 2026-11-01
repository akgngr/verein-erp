import { uploadEmlHandler } from "../../../server";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return uploadEmlHandler(request);
}
