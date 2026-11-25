import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("finance and weather register optional permission-scoped header widgets", () => {
  for (const moduleId of ["finance", "weather"]) {
    const declaration = read(`src/modules/${moduleId}/widget.ts`);
    assert.match(declaration, /defineModuleWidgets/);
    assert.match(declaration, /slot: "header.right"/);
    assert.match(declaration, /defaultEnabled: false/);
    assert.match(declaration, new RegExp(`"${moduleId}:view"`));
    assert.match(declaration, /load: \(\) => import\(/);
    assert.doesNotMatch(declaration, /@heroui\/react|fetch\(|localStorage/);
    const config = read(`src/modules/${moduleId}/module.config.ts`);
    const releases = JSON.parse(read(`src/modules/${moduleId}/releases.json`)) as { releases: Array<{ version: string }> };
    assert.equal(releases.releases[0]?.version, "0.2.0");
    assert.match(config, /version: "0.2.0"/);
  }
});

test("header widgets reuse authorized server actions without background polling or invented trends", () => {
  const finance = read("src/modules/finance/widgets/rates-header.tsx");
  const weather = read("src/modules/weather/widgets/current-header.tsx");
  assert.match(finance, /fetchExchangeRatesAction/);
  assert.match(weather, /searchCityWeatherAction/);
  assert.match(weather, /Frankfurt am Main/);
  for (const source of [finance, weather]) {
    assert.doesNotMatch(source, /setInterval|setTimeout|navigator\.geolocation|Math\.random|@heroui\/react/);
    assert.match(source, /motion-reduce:animate-none/);
    assert.match(source, /focus-visible:outline/);
    assert.match(source, /aria-expanded/);
  }
});
