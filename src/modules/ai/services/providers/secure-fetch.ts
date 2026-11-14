import "server-only";
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { isPrivateAddress, isPrivateEndpoint } from "./secure-endpoint";

async function withAbort<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  let abort: () => void = () => {};
  const cancelled = new Promise<never>((_accept, reject) => {
    abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
  });
  try { return await Promise.race([operation, cancelled]); }
  finally { signal.removeEventListener("abort", abort); }
}

const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;

/** No redirects; DNS is verified on each request, then pinned to the vetted address. */
export function createLocalFetch(baseURL: string, resolve = lookup): typeof fetch {
  const base = new URL(baseURL);
  return async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    // Query strings are allowed on SDK request paths, never as endpoint configuration.
    const endpoint = new URL(url); endpoint.search = "";
    if (!isPrivateEndpoint(baseURL) || url.origin !== base.origin || !isPrivateEndpoint(endpoint.href)) throw new Error("AI_LOCAL_ENDPOINT_REJECTED");
    const host = url.hostname.replace(/^\[|\]$/g, "");
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]);
    const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await withAbort(resolve(host, { all: true, verbatim: true }), signal);
    if (!addresses.length || addresses.some(({ address }) => !isPrivateAddress(address))) throw new Error("AI_LOCAL_DNS_REJECTED");
    const target = addresses[0];
    signal.throwIfAborted();
    const body = request.body ? Buffer.from(await request.arrayBuffer()) : undefined;
    return new Promise<Response>((accept, reject) => {
      const send = url.protocol === "https:" ? httpsRequest : httpRequest;
      const outgoing = send(url, {
        method: request.method,
        headers: Object.fromEntries(request.headers),
        signal,
        // Native IP literals bypass lookup; those have already been range checked above.
        lookup: (_hostname, options, callback) => {
          if (options.all) callback(null, [{ address: target.address, family: target.family }]);
          else callback(null, target.address, target.family);
        },
      }, (incoming) => {
        const status = incoming.statusCode ?? 502;
        if (status >= 300 && status < 400) { incoming.destroy(); reject(new Error("AI_LOCAL_REDIRECT_REJECTED")); return; }
        const chunks: Buffer[] = []; let bytes = 0;
        incoming.on("error", reject);
        incoming.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > MAX_RESPONSE_BYTES) incoming.destroy(new Error("AI_LOCAL_RESPONSE_TOO_LARGE"));
          else chunks.push(chunk);
        });
        incoming.on("end", () => {
          const headers = new Headers();
          for (const [key, value] of Object.entries(incoming.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
          const data = Buffer.concat(chunks);
          accept(new Response([204, 205, 304].includes(status) ? null : new Uint8Array(data), { status, headers }));
        });
      });
      outgoing.on("error", reject);
      outgoing.end(body);
    });
  };
}
