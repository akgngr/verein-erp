import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { PseudonymVault } from "../src/modules/ai/services/privacy";

describe("AI gizlilik katmanı", () => {
  test("e-posta, IBAN ve telefon maskelenir, yanıtta geri çözülür", () => {
    const vault = new PseudonymVault();
    const text = "Ayşe'ye ayse.yilmaz@example.de adresinden yaz, IBAN DE89 3704 0044 0532 0130 00, Tel. +49 69 1234567 veya 0171 2345678.";
    const redacted = vault.redact(text);
    assert.ok(!redacted.includes("ayse.yilmaz@example.de"));
    assert.ok(!redacted.includes("0532 0130"));
    assert.ok(!redacted.includes("1234567"));
    assert.ok(!redacted.includes("2345678"));
    assert.match(redacted, /\[EMAIL_1\]/);
    assert.match(redacted, /\[IBAN_1\]/);
    assert.equal(vault.restore(redacted), text);
  });

  test("aynı değer aynı belirteci alır; yapılandırılmış veriler de maskelenir", () => {
    const vault = new PseudonymVault();
    const first = vault.redact("info@verein.de");
    const nested = vault.redactValue({ rows: [{ contact: "info@verein.de", amount: 1250 }] });
    assert.equal(nested.rows[0].contact, first);
    assert.equal(nested.rows[0].amount, 1250);
    assert.equal(vault.size, 1);
  });

  test("tutarlar, tarihler ve fiş numaraları dokunulmadan kalır", () => {
    const vault = new PseudonymVault();
    const text = "2026 gelirleri 12.450,00 € — fiş B-2026-0042, tarih 14.03.2026, fatura R-2026-0007.";
    assert.equal(vault.redact(text), text);
  });
});

describe("AI gizlilik katmanı – kayıtlı kişiler", () => {
  test("kayıtlı tam adlar ve numaralar büyük/küçük harften bağımsız maskelenir ve geri açılır", () => {
    const vault = new PseudonymVault({ names: ["Ayşe Yılmaz", "Jan Becker"], references: ["M-0042"] });
    const text = "ayşe yılmaz ile Jan  Becker (üye M-0042) için görev aç; Becker soyadı tek başına kalır.";
    const redacted = vault.redact(text);
    assert.ok(!/ayşe yılmaz/i.test(redacted));
    assert.ok(!redacted.includes("Jan  Becker"));
    assert.ok(!redacted.includes("M-0042"));
    assert.match(redacted, /\[PERSON_1\].*\[PERSON_2\].*\[REF_1\]/);
    assert.equal(vault.restore("[PERSON_2] için görev oluşturuldu."), "Jan  Becker için görev oluşturuldu.");
  });

  test("ad başka bir kelimenin parçasıysa maskelenmez", () => {
    const vault = new PseudonymVault({ names: ["Ali Can"] });
    assert.equal(vault.redact("Kalinka Cantata"), "Kalinka Cantata");
  });
});

describe("AI sağlayıcı izinli listesi", () => {
  test("yerel model yalnızca özel ağ adresinde kabul edilir", async () => {
    const { isPrivateEndpoint, AI_PROVIDER_IDS } = await import("../src/modules/ai/services/providers/registry");
    for (const url of ["http://localhost:11434/v1", "http://127.0.0.1:8000/v1", "http://ollama:11434/v1", "http://10.0.0.5/v1", "http://172.20.1.2:8000/v1", "http://192.168.1.20/v1", "http://llm.internal/v1", "http://[::1]:8080/v1"]) {
      assert.equal(isPrivateEndpoint(url), true, url);
    }
    for (const url of ["https://api.deepseek.com/v1", "https://open.bigmodel.cn/api/paas/v4", "https://api.openai.com/v1", "http://172.32.0.1/v1", "http://8.8.8.8/v1", "not a url"]) {
      assert.equal(isPrivateEndpoint(url), false, url);
    }
    assert.deepEqual([...AI_PROVIDER_IDS], ["local", "mistral", "anthropic", "openai"]);
  });
});
