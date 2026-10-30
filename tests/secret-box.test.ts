import test, { describe } from "node:test";
import assert from "node:assert/strict";

process.env.AUTH_SECRET ??= "test-only-secret";

describe("Şifreli sır saklama (API anahtarları)", () => {
  test("şifreli metin düz anahtarı içermez ve aynı amaçla geri açılır", async () => {
    const { openSecret, sealSecret } = await import("../src/shared/security/secret-box");
    const sealed = sealSecret("ai-provider-key", "sk-test-1234567890");
    assert.ok(!sealed.includes("sk-test"));
    assert.equal(openSecret("ai-provider-key", sealed), "sk-test-1234567890");
  });

  test("başka amaç etiketi veya bozulmuş veri çözülemez", async () => {
    const { openSecret, sealSecret } = await import("../src/shared/security/secret-box");
    const sealed = sealSecret("ai-provider-key", "geheim");
    assert.equal(openSecret("mail", sealed), null);
    assert.equal(openSecret("ai-provider-key", sealed.slice(0, -4) + "AAAA"), null);
  });
});
