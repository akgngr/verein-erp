import { isIP } from "node:net";

/** Only actual IP literals are classified by range; hostnames never match IP prefixes. */
export function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
  }
  if (isIP(address) === 6) {
    const normalized = new URL(`http://[${address}]/`).hostname.slice(1, -1);
    return normalized === "::1" || /^(fc|fd)[0-9a-f]{2}:/.test(normalized);
  }
  return false;
}

export function isPrivateEndpoint(baseURL: string): boolean {
  let url: URL;
  try { url = new URL(baseURL); } catch { return false; }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.hash || url.search) return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (isIP(host)) return isPrivateAddress(host);
  if (host === "localhost" || host === "host.docker.internal") return true;
  // DNS names are provisional. Every network connection must resolve and pin private IPs.
  return /\.(local|internal|lan|home\.arpa)$/.test(host) || /^[a-z0-9-]+$/.test(host);
}
