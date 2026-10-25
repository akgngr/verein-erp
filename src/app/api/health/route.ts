import { NextResponse } from "next/server";

// Coolify sağlık kontrolü için kullanılır; veritabanına dokunmaz.
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
