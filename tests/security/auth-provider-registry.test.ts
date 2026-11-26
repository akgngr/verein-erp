import { describe, expect, it } from "vitest";
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
    expect(await collectAuthProviders([registration("disabled")], async () => false)).toEqual([]);
  });
  it("quarantines duplicate provider ids", async () => {
    expect(await collectAuthProviders([registration("a"), registration("b")], async () => true)).toEqual([]);
  });
  it("isolates failed provider configuration", async () => {
    const broken = { ...registration("broken"), load: async () => { throw new Error("unavailable"); } };
    const entries = await collectAuthProviders([broken, registration("working")], async () => true);
    expect(entries.map((entry) => entry.provider.id)).toEqual(["google"]);
    expect(await entries[0].resolveUserId("google", "unknown")).toBeNull();
  });
});
