import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { isPrivateEndpoint } from "@/modules/ai/services/providers/secure-endpoint";
import { createLocalFetch } from "@/modules/ai/services/providers/secure-fetch";

test("local configuration rejects public IP lookalikes, metadata, userinfo and non-HTTP schemes", () => {
  for (const value of ["https://10.attacker.example/v1", "https://127.attacker.example/v1", "http://169.254.169.254/v1", "ftp://localhost/v1", "http://user:pass@localhost/v1", "http://[::ffff:7f00:1]/v1", "http://172.32.0.1/v1", "https://public.example/v1"]) assert.equal(isPrivateEndpoint(value), false, value);
  for (const value of ["http://ollama:11434/v1", "http://localhost/v1", "http://10.0.0.2/v1", "http://[::1]/v1", "http://[fd00::1]/v1"]) assert.equal(isPrivateEndpoint(value), true, value);
});

test("local transport rejects public and mixed DNS answers before opening a socket", async () => {
  for (const answers of [[{address: "8.8.8.8",family:4}], [{address:"127.0.0.1",family:4},{address:"8.8.8.8",family:4}]]) {
    const resolve = (async () => answers) as unknown as typeof import("node:dns/promises").lookup;
    await assert.rejects(createLocalFetch("http://llm.internal/v1", resolve)("http://llm.internal/v1/chat/completions"), /AI_LOCAL_DNS_REJECTED/);
  }
});

test("local transport forwards JSON to a private endpoint and refuses redirects", async () => {
  let requests = 0;
  const server = createServer((request, response) => {
    requests++;
    if (request.url === "/redirect") { response.writeHead(302, {location: "https://example.com"}); response.end(); }
    else { response.setHeader("content-type", "application/json"); response.end(JSON.stringify({host: request.headers.host, ok:true})); }
  });
  server.listen(Number(process.env.AI_TEST_PORT ?? 0), "127.0.0.1"); await once(server, "listening");
  try {
    const address = server.address(); assert.ok(address && typeof address !== "string");
    const base = `http://127.0.0.1:${address.port}`;
    const resolve = (async () => [{address:"127.0.0.1",family:4}]) as unknown as typeof import("node:dns/promises").lookup;
    const send = createLocalFetch(base, resolve);
    const response = await send(`${base}/v1/chat/completions`, {method:"POST", body:'{"model":"local"}'});
    assert.deepEqual(await response.json(), {host:`127.0.0.1:${address.port}`,ok:true});
    await assert.rejects(send(`${base}/redirect`), /AI_LOCAL_REDIRECT_REJECTED/);
    await assert.rejects(send("http://localhost:1234/"), /AI_LOCAL_ENDPOINT_REJECTED/);
    assert.equal(requests,2);
  } finally { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});


test("aborting during DNS resolution prevents an outbound connection", async () => {
  const resolve = (() => new Promise(() => {})) as unknown as typeof import("node:dns/promises").lookup;
  const controller = new AbortController();
  const result = createLocalFetch("http://llm.internal/v1", resolve)("http://llm.internal/v1/chat/completions", {signal:controller.signal});
  controller.abort(new Error("TEST_CANCELLED"));
  await assert.rejects(result,/TEST_CANCELLED/);
});
