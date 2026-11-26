import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Google from "next-auth/providers/google";
import { collectAuthProviders, type ModuleAuthProviders } from "../../src/shared/auth/providers";

function registration(module: string): ModuleAuthProviders {
  return {
    module,
    load: async () => [Google({ clientId: "test", clientSecret: "test" })],
    resolveUserId: async () => null,
  };
}

describe("OAuth module registry", () => {
  it("does not load disabled modules", async () => {
    assert.deepEqual(await collectAuthProviders([registration("disabled")], async () => false), []);
  });
  it("quarantines duplicate provider ids", async () => {
    assert.deepEqual(await collectAuthProviders([registration("a"), registration("b")], async () => true), []);
  });
  it("isolates failed provider configuration", async () => {
    const broken = { ...registration("broken"), load: async () => { throw new Error("unavailable"); } };
    const entries = await collectAuthProviders([broken, registration("working")], async () => true);
    assert.deepEqual(entries.map((entry) => entry.provider.id), ["google"]);
    assert.equal(await entries[0].resolveUserId("google", "unknown"), null);
  });
});
