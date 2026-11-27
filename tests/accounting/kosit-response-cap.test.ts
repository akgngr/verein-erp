import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { validateWithKosit } from "@/modules/accounting/services/kosit";

// #638 review: a KoSIT response over the 2 MB cap must settle as { ok: false }, not hang.
test("an oversized KoSIT response is rejected instead of hanging", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "application/xml" });
    const block = Buffer.alloc(64 * 1024, "a");
    let sent = 0;
    const pump = () => {
      while (sent < 3 * 1024 * 1024) {
        sent += block.length;
        if (!response.write(block)) return void response.once("drain", pump);
      }
      response.end();
    };
    pump();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    const timeout = new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 5_000).unref());
    const result = await Promise.race([validateWithKosit(`http://127.0.0.1:${port}/`, "<Invoice/>", { allowPrivate: true }), timeout]);
    assert.deepEqual(result, { ok: false });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
