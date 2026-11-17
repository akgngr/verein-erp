import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

// react-dom/server is unavailable under the "react-server" condition used by the test runner,
// so the fields are rendered in a child process with default conditions.
const env = { ...process.env, NODE_OPTIONS: (process.env.NODE_OPTIONS ?? "").replace(/--conditions=react-server/g, "").trim() };
const html = JSON.parse(execFileSync(path.join(process.cwd(), "node_modules/.bin/tsx"), ["tests/fixtures/render-fields.tsx"], { env, encoding: "utf8" })) as Record<"text" | "textNoLabel" | "area" | "check" | "sw" | "radio", string>;

test("TextInputField: label is bound, error marks the input invalid, prefix renders", () => {
  const inputId = /<input id="([^"]+)"/.exec(html.text)?.[1];
  assert.ok(inputId);
  assert.match(html.text, new RegExp(`<label[^>]*for="${inputId}"`));
  assert.match(html.text, /aria-invalid="true"/);
  assert.match(html.text, /required=""/);
  assert.match(html.text, />€</);
  assert.match(html.text, />Hilfe</);
});

test("TextInputField without visible label uses ariaLabel", () => {
  assert.match(html.textNoLabel, /aria-label="Suche"/);
  assert.doesNotMatch(html.textNoLabel, /<label/);
});

test("TextAreaField renders rows and label", () => {
  assert.match(html.area, /<textarea[^>]*rows="4"/);
  assert.match(html.area, />Notiz</);
});

test("CheckboxField, SwitchField and RadioGroupField expose native semantics", () => {
  assert.match(html.check, /type="checkbox"[^>]*checked=""/);
  assert.match(html.sw, /role="switch"/);
  assert.match(html.radio, /role="radiogroup"/);
  assert.equal((html.radio.match(/type="radio"/g) ?? []).length, 2);
});

test("field API does not leak framework types or slot props", () => {
  const dir = path.join(process.cwd(), "src/shared/components/fields");
  const types = fs.readFileSync(path.join(dir, "types.ts"), "utf8");
  assert.doesNotMatch(types, /@heroui/);
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".tsx"))) {
    const source = fs.readFileSync(path.join(dir, file), "utf8");
    const propsBlock = source.slice(source.indexOf("export type"), source.indexOf("export function"));
    assert.doesNotMatch(propsBlock, /classNames|variant\??:|color\??:|data-slot/, `${file} exposes framework styling props`);
  }
});
