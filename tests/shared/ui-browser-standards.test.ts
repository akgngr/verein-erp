import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";

const ROOT = process.cwd();

describe("UI Platform — Tarayıcı Standartları ve Color-Scheme (Issue #328)", () => {
  test("src/app/globals.css W3C Baseline standart scrollbar özelliklerini içerir", () => {
    const css = fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");

    // Standart scrollbar özellikleri
    assert.match(css, /scrollbar-width:\s*thin;/, "globals.css scrollbar-width: thin içermelidir");
    assert.match(
      css,
      /scrollbar-color:\s*var\(--scrollbar-thumb\)\s+var\(--scrollbar-track\);/,
      "globals.css scrollbar-color tanımını içermelidir",
    );
    assert.match(css, /--scrollbar-thumb:/, "globals.css --scrollbar-thumb değişkenini tanımlamalıdır");
    assert.match(css, /--scrollbar-track:/, "globals.css --scrollbar-track değişkenini tanımlamalıdır");

    // Yüksek karşıtlık (forced-colors) modu
    assert.match(
      css,
      /@media\s*\(forced-colors:\s*active\)\s*\{\s*[\s\S]*?scrollbar-color:\s*auto;/,
      "globals.css forced-colors modunda scrollbar-color: auto içermelidir",
    );

    // Eski WebKit fallback kuralı @supports not altında olmalıdır
    assert.match(
      css,
      /@supports\s+not\s+\(scrollbar-color:\s*auto\)\s*\{[\s\S]*?::-webkit-scrollbar/,
      "::-webkit-scrollbar fallback'i @supports not (scrollbar-color: auto) bloğunda olmalıdır",
    );
  });

  test("src/app/layout.tsx viewport colorScheme meta verisini tanımlar", () => {
    const layout = fs.readFileSync(path.join(ROOT, "src/app/layout.tsx"), "utf8");

    assert.match(layout, /export\s+const\s+viewport:\s*Viewport\s*=/, "layout.tsx viewport export etmelidir");
    assert.match(layout, /colorScheme:\s*["']light dark["']/, "viewport colorScheme 'light dark' olmalıdır");
  });

  test("THEME_INIT_SCRIPT hidrasyon öncesi meta[name=color-scheme] senkronunu içerir", () => {
    const provider = fs.readFileSync(
      path.join(ROOT, "src/shared/components/theme-provider.tsx"),
      "utf8",
    );
    assert.match(
      provider,
      /export\s+const\s+THEME_INIT_SCRIPT\s*=[\s\S]*?meta\[name="color-scheme"\]/,
      "THEME_INIT_SCRIPT meta[name=color-scheme] seçicisini içermelidir",
    );
    assert.match(
      provider,
      /document\.documentElement\.style\.colorScheme=r/,
      "THEME_INIT_SCRIPT style.colorScheme senkronizasyonunu korumalıdır",
    );
  });

  test("theme-provider.tsx kaynak kodunda DOM uygulama fonksiyonu meta[name=color-scheme] günceller", () => {
    const provider = fs.readFileSync(
      path.join(ROOT, "src/shared/components/theme-provider.tsx"),
      "utf8",
    );

    assert.match(
      provider,
      /document\.querySelector\(['"]meta\[name="color-scheme"\]['"]\)/,
      "applyThemeToDom meta elemanını sorgulamalıdır",
    );
    assert.match(
      provider,
      /meta\.setAttribute\(['"]content['"],\s*resolved\)/,
      "applyThemeToDom meta content özniteliğini resolved temayla güncellemelidir",
    );
  });
});
