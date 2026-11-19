import assert from "node:assert/strict";
import test from "node:test";

/**
 * Günlük özet worker'da (Next.js dışında, `react-server` koşuluyla) çalışır. Bu zincirdeki hiçbir dosya
 * next-auth / React istemci kodunu yüklememeli; aksi halde iş her çalışmada hata verir veya sağlayıcı
 * sessizce `failures` listesine düşer. Bu test zinciri gerçek importlarla doğrular (bağımlılık enjeksiyonu yok).
 */
const WORKER_CHAIN = [
  "@/modules/secretary/automation",
  "@/modules/secretary/services/daily-briefing-runner",
  "@/modules/secretary/services/briefing",
  "@/secretary-registry",
] as const;

test("secretary worker chain loads without Next.js/next-auth", async () => {
  for (const specifier of WORKER_CHAIN) {
    await assert.doesNotReject(() => import(specifier), `${specifier} must be worker-safe`);
  }
  const { moduleSecretaryRegistry } = await import("@/secretary-registry");
  assert.ok(moduleSecretaryRegistry.length >= 6, "all registered providers load in the worker chain");
});
