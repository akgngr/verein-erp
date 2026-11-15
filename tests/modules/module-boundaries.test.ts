/**
 * Modüller arası bağ: yalnız bildirimle (MODULE_DEVELOPMENT_GUIDE.md §8e — KATI KURAL).
 *
 * Bir modülün kodu başka bir modüle ancak module.config.ts'de BİLDİRDİĞİ ölçüde dokunabilir:
 *  1. İçe aktarım (`@/modules/<m>`, `@/modules/<m>/server`, `@/modules/<m>/automation` …)
 *     → hedef `access`, `requires` ya da bir menü öğesinin `module` alanında olmalı.
 *  2. Başka modülün API yolu (`"/api/<m>/…"`, fetch dahil) → hedef `access`'te olmalı.
 *  3. Başka modülün sayfasına bağlantı (`"/<sayfa>…"`) → hedef `access`, `requires`, `recommends`
 *     ya da menü `module` alanında olmalı (kurulu/açık değilse bağlantı gösterilmemeli).
 * `auth` altyapıdır (oturum, createAction): hedef olarak da kaynak olarak da muaftır. Bu test bilerek basit metin taraması yapar; yanlış pozitif görürseniz
 * kuralı gevşetmeyin, bildirimi ekleyin.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { allModules } from "@/registry";

const ROOT = path.join(process.cwd(), "src/modules");
const EXEMPT = new Set(["auth"]);

type Ref = { file: string; target: string; kind: "import" | "api" | "page"; text: string };

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : walk(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });

/** Sayfa yolu ilk parçası → sahibi modül (birden çok modül paylaşıyorsa "*": paylaşılan alan, ör. /ayarlar). */
function pageOwners(): Map<string, string> {
  const owners = new Map<string, string>();
  for (const mod of allModules) {
    for (const item of mod.nav ?? []) {
      const segment = item.href.split(/[/?#]/)[1];
      if (!segment || segment === "api") continue;
      owners.set(segment, owners.has(segment) && owners.get(segment) !== mod.key ? "*" : mod.key);
    }
  }
  return owners;
}

const apiOwners = new Set(allModules.filter((mod) => fs.existsSync(path.join(ROOT, mod.key, "api"))).map((mod) => mod.key));

function collectReferences(moduleKey: string, owners: Map<string, string>): Ref[] {
  const dir = path.join(ROOT, moduleKey);
  if (!fs.existsSync(dir)) return [];
  const refs: Ref[] = [];
  for (const file of walk(dir)) {
    const code = fs.readFileSync(file, "utf8");
    const rel = path.relative(process.cwd(), file);
    for (const match of code.matchAll(/(?:from\s+|import\s*\(\s*)["']@\/modules\/([a-z0-9-]+)((?:\/[a-z0-9-]+)*)["']/g)) {
      refs.push({ file: rel, target: match[1], kind: "import", text: `@/modules/${match[1]}${match[2]}` });
    }
    for (const match of code.matchAll(/["'`]\/(api\/)?([a-z0-9-]+)(?=[/?#"'`$])/g)) {
      const target = match[1] ? (apiOwners.has(match[2]) ? match[2] : undefined) : owners.get(match[2]);
      if (target && target !== "*") refs.push({ file: rel, target, kind: match[1] ? "api" : "page", text: `/${match[1] ?? ""}${match[2]}` });
    }
  }
  return refs;
}

test("modüller başka modüllere yalnız module.config.ts'de bildirdikleri ölçüde bağlanır (§8e)", () => {
  const owners = pageOwners();
  const violations: string[] = [];
  for (const mod of allModules) {
    if (EXEMPT.has(mod.key)) continue;
    const access = new Set((mod.access ?? []).map((item) => item.module));
    const requires = new Set((mod.requires ?? []).map((item) => item.module));
    const recommends = new Set(mod.recommends ?? []);
    const menu = new Set((mod.menu ?? []).flatMap((item) => (item.module ? [item.module] : [])));
    for (const ref of collectReferences(mod.key, owners)) {
      if (ref.target === mod.key || EXEMPT.has(ref.target)) continue;
      const ok =
        ref.kind === "api" ? access.has(ref.target)
        : ref.kind === "import" ? access.has(ref.target) || requires.has(ref.target) || menu.has(ref.target)
        : access.has(ref.target) || requires.has(ref.target) || recommends.has(ref.target) || menu.has(ref.target);
      if (!ok) {
        const fix = ref.kind === "page" ? `recommends: ["${ref.target}"] (ya da requires/access)` : `access: [{ module: "${ref.target}", operations: [...] }]`;
        violations.push(`${mod.key} → ${ref.target} [${ref.kind}] ${ref.text} (${ref.file}) — ekleyin: ${fix}`);
      }
    }
  }
  assert.deepEqual([...new Set(violations)], [], `Bildirilmemiş modüller arası bağ:\n${[...new Set(violations)].join("\n")}`);
});

test("bildirilen her erişim hedefi bilinen bir modüldür ve TR/DE gerekçesi vardır", () => {
  const keys = new Set(allModules.map((mod) => mod.key));
  const problems: string[] = [];
  for (const mod of allModules) {
    for (const { module: target } of mod.access ?? []) {
      if (!keys.has(target)) problems.push(`${mod.key}: bilinmeyen access hedefi "${target}"`);
      for (const locale of ["tr", "de"]) {
        const file = path.join(ROOT, mod.key, "messages", `${locale}.json`);
        const messages = fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as { access?: Record<string, string> }) : {};
        if (!messages.access?.[target]?.trim()) problems.push(`${mod.key}: messages/${locale}.json → access.${target} gerekçesi eksik`);
      }
    }
    for (const target of mod.recommends ?? []) if (!keys.has(target)) problems.push(`${mod.key}: bilinmeyen recommends hedefi "${target}"`);
  }
  assert.deepEqual(problems, []);
});

test("tarayıcı ihlalleri yakalar (kendi kendini sınama)", () => {
  const sample = `import { x } from "@/modules/foo/server";\nconst u = "/api/foo/bar";\nconst p = \`/foo-sayfa?x=1\`;`;
  const imports = [...sample.matchAll(/(?:from\s+|import\s*\(\s*)["']@\/modules\/([a-z0-9-]+)((?:\/[a-z0-9-]+)*)["']/g)].map((m) => m[1]);
  const paths = [...sample.matchAll(/["'`]\/(api\/)?([a-z0-9-]+)(?=[/?#"'`$])/g)].map((m) => `${m[1] ?? ""}${m[2]}`);
  assert.deepEqual(imports, ["foo"]);
  assert.deepEqual(paths, ["api/foo", "foo-sayfa"]);
});
