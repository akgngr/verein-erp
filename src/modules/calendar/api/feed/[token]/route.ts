import { getTranslations } from "next-intl/server";

import { buildFeedForToken } from "../../../services/feed";

/**
 * GET /api/calendar/feed/<token> — read-only ICS subscription.
 * No session: the secret, revocable per-user token authenticates the request
 * (excluded from the auth proxy in src/proxy.ts). Unknown tokens get 404.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations({ locale: "de", namespace: "calendar" });
  const body = await buildFeedForToken(token.replace(/\.ics$/, ""), t("feedName"));
  if (!body) return new Response(null, { status: 404 });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="calendar.ics"',
      "Cache-Control": "private, max-age=300",
    },
  });
}
