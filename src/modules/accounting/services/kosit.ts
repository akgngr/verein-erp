import "server-only";

import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

/**
 * İsteğe bağlı tam doğrulama: kendi sunucusunda çalışan resmî KoSIT doğrulayıcısı (itplr-kosit/validator,
 * `-D` daemon modu). XML gövdeyle POST edilir; 200 = kabul edilebilir, 406 = kabul edilemez. Rapordaki
 * bulgular (rep:message) kısaltılarak döner. Adres yalnız yöneticinin girdiği ayardan gelir.
 *
 * SSRF koruması: DNS çözünürlüğü her istekte doğrulanır ve sabitlenir (DNS rebinding engeli).
 * Bulut metadata/link-local adresleri her zaman engellenir; özel/loopback adresler yalnız
 * `KOSIT_ALLOW_PRIVATE=true` ortam değişkeniyle açıkça izin verildiğinde kabul edilir.
 */
export type KositResult = { ok: true; valid: boolean; messages: { code: string; level: string; text: string }[] } | { ok: false };

const MAX_RESPONSE_BYTES = 2_000_000;

function normalizeIpv6(address: string): string {
  try {
    return new URL(`http://[${address}]/`).hostname.slice(1, -1).toLowerCase();
  } catch {
    return address.toLowerCase();
  }
}

function extractMappedIpv4(normalizedIpv6: string): string | null {
  if (!normalizedIpv6.startsWith("::ffff:")) return null;
  const rest = normalizedIpv6.slice("::ffff:".length);
  if (isIP(rest) === 4) return rest;
  const hexMatch = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(rest);
  if (!hexMatch) return null;
  const hi = Number.parseInt(hexMatch[1], 16);
  const lo = Number.parseInt(hexMatch[2], 16);
  return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
}

/**
 * Verilen IP adresinin KoSIT doğrulayıcı hedefi olarak güvenli olup olmadığını denetler.
 * Cloud metadata / link-local / unspecified / multicast adresler her koşulda reddedilir.
 */
export function isAllowedKositAddress(address: string, options?: { allowPrivate?: boolean }): boolean {
  const allowPrivate = options?.allowPrivate ?? process.env.KOSIT_ALLOW_PRIVATE === "true";
  const family = isIP(address);
  if (family === 4) {
    const parts = address.split(".").map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;
    const [a, b] = parts;
    // Always blocked: 0.0.0.0/8, 169.254.0.0/16 (link-local & cloud metadata), 224.0.0.0/4+, CGNAT 100.64.0.0/10
    if (a === 0 || (a === 169 && b === 254) || a >= 224 || (a === 100 && b >= 64 && b <= 127)) return false;
    // Loopback & RFC1918 private ranges: blocked unless explicitly opted-in by operator
    const isPrivateOrLoopback =
      a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
    return allowPrivate || !isPrivateOrLoopback;
  }
  if (family === 6) {
    const normalized = normalizeIpv6(address);
    const mappedV4 = extractMappedIpv4(normalized);
    if (mappedV4) return isAllowedKositAddress(mappedV4, { allowPrivate });
    // Always blocked: unspecified (::), link-local (fe80::/10), multicast (ff00::/8), AWS IPv6 metadata (fd00:ec2::254)
    if (
      normalized === "::" ||
      /^fe[89ab][0-9a-f]:/.test(normalized) ||
      /^ff[0-9a-f]{2}:/.test(normalized) ||
      normalized === "fd00:ec2::254"
    ) {
      return false;
    }
    const isPrivateOrLoopback = normalized === "::1" || /^(fc|fd)[0-9a-f]{2}:/.test(normalized);
    return allowPrivate || !isPrivateOrLoopback;
  }
  return false;
}

export async function validateWithKosit(
  url: string,
  xml: string,
  deps?: { resolve?: typeof lookup; allowPrivate?: boolean },
): Promise<KositResult> {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return { ok: false };
  }
  if ((target.protocol !== "http:" && target.protocol !== "https:") || target.username || target.password) {
    return { ok: false };
  }

  const allowPrivate = deps?.allowPrivate ?? process.env.KOSIT_ALLOW_PRIVATE === "true";
  const resolveDns = deps?.resolve ?? lookup;
  const host = target.hostname.replace(/^\[|\]$/g, "");

  try {
    const addresses = isIP(host)
      ? [{ address: host, family: isIP(host) }]
      : await resolveDns(host, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => !isAllowedKositAddress(address, { allowPrivate }))) {
      return { ok: false };
    }
    const pinned = addresses[0];
    const body = Buffer.from(xml, "utf8");
    const signal = AbortSignal.timeout(20_000);

    const { status, text } = await new Promise<{ status: number; text: string }>((resolve, reject) => {
      const send = target.protocol === "https:" ? httpsRequest : httpRequest;
      const req = send(
        target,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/xml",
            "Content-Length": String(body.byteLength),
          },
          signal,
          lookup: (_hostname, options, callback) => {
            if (options.all) callback(null, [{ address: pinned.address, family: pinned.family }]);
            else callback(null, pinned.address, pinned.family);
          },
        },
        (incoming) => {
          const code = incoming.statusCode ?? 502;
          if (code >= 300 && code < 400) {
            incoming.destroy();
            reject(new Error("KOSIT_REDIRECT_REJECTED"));
            return;
          }
          const chunks: Buffer[] = [];
          let bytes = 0;
          incoming.on("error", reject);
          incoming.on("data", (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > MAX_RESPONSE_BYTES) {
              chunks.push(chunk.subarray(0, Math.max(0, MAX_RESPONSE_BYTES - (bytes - chunk.length))));
              incoming.destroy();
              return;
            }
            chunks.push(chunk);
          });
          incoming.on("end", () => {
            resolve({ status: code, text: Buffer.concat(chunks).toString("utf8").slice(0, MAX_RESPONSE_BYTES) });
          });
        },
      );
      req.on("error", reject);
      req.end(body);
    });

    if (status !== 200 && status !== 406) return { ok: false };
    const messages = [...text.matchAll(/<rep:message\b([^>]*)>([\s\S]*?)<\/rep:message>/g)].slice(0, 50).map((match) => ({
      code: /\bcode="([^"]+)"/.exec(match[1])?.[1] ?? "",
      level: /\blevel="([^"]+)"/.exec(match[1])?.[1] ?? "",
      // Düz metin: tüm açılı ayraçlar kaldırılır (arayüzde ayrıca React kaçışıyla gösterilir).
      text: match[2].replace(/[<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 400),
    }));
    return { ok: true, valid: status === 200, messages };
  } catch {
    return { ok: false };
  }
}
