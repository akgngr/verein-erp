import { NextResponse, type NextRequest } from "next/server";

import { bankCallbackHandler } from "../../server";

export const GET = (request: NextRequest): Promise<NextResponse> => bankCallbackHandler(request);
