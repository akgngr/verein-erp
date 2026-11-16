import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "website", "docs", "kullanim", "muhasebe");

test("ACC-9 accounting guide index exists and every relative guide link resolves", () => {
  const indexPath = path.join(DIR, "index.md");
  assert.ok(fs.existsSync(indexPath), "website/docs/kullanim/muhasebe/index.md eksik");

  const source = fs.readFileSync(indexPath, "utf8");
  const links = [...source.matchAll(/\]\((\.\.?\/[^)#]+)(?:#[^)]+)?\)/g)].map((match) => match[1]);
  assert.ok(links.length >= 5, "Muhasebe rehber indeksi beklenen alt sayfaları içermiyor");

  for (const link of links) {
    const absolute = path.resolve(DIR, link);
    const candidates = [
      absolute,
      `${absolute}.md`,
      path.join(absolute, "index.md"),
    ];
    assert.ok(
      candidates.some((candidate) => fs.existsSync(candidate)),
      `Kırık muhasebe doküman bağlantısı: ${link}`,
    );
  }
});

test("ACC-9 core user guides remain present", () => {
  for (const file of [
    "panel.md",
    "ana-panel-kartlari.md",
    "kpi-hesaplama-kurallari.md",
    "gecmis-kategoriler.md",
    "kasa-defteri-tarih-ve-bakiye.md",
  ]) {
    assert.ok(fs.existsSync(path.join(DIR, file)), `Eksik muhasebe kullanıcı rehberi: ${file}`);
  }
});
