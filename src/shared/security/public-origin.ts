type HeadersLike = { get(name: string): string | null };

const LOCAL_HOST_RE = /^(localhost|127\.0\.0\.1|\[::1\])(?::(\d{1,5}))?$/i;

function normalizeConfiguredAppUrl(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || parsed.username || parsed.password) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * Resolves the canonical public origin (`scheme://host[:port]`) for external links,
 * OAuth callbacks, e-sign URLs, and webhook signature verification.
 *
 * Security rule:
 * - Always prefers the server-configured `APP_URL` environment variable and completely
 *   ignores attacker-controlled `Host` / `X-Forwarded-Host` / `X-Forwarded-Proto` headers.
 * - In `production`, fails closed (`null`) if `APP_URL` is unset or invalid, preventing
 *   Host-header injection and open redirects.
 * - In `development`/`test`, accepts only local loopback hosts (`localhost`, `127.0.0.1`, `[::1]`)
 *   when `APP_URL` is unset, rejecting arbitrary spoofed hosts.
 */
export function resolvePublicOrigin(
  headersLike?: HeadersLike | null,
  options?: { env?: { APP_URL?: string; NODE_ENV?: string } },
): string | null {
  const configured = normalizeConfiguredAppUrl(options?.env?.APP_URL ?? process.env.APP_URL);
  if (configured) return configured;

  const nodeEnv = options?.env?.NODE_ENV ?? process.env.NODE_ENV ?? "development";
  if (nodeEnv === "production") {
    return null;
  }

  const rawHost = headersLike?.get("host")?.trim() ?? "";
  if (!rawHost) return "http://localhost:3000";

  const match = LOCAL_HOST_RE.exec(rawHost);
  if (!match) return null;

  const port = match[2] ? Number(match[2]) : null;
  if (port !== null && (port < 1 || port > 65535)) return null;

  return `http://${match[1].toLowerCase()}${port ? `:${port}` : ""}`;
}
