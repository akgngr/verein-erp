/**
 * Dokümantasyon sitesi için modül kataloğu üretir (website/docs/kullanim/moduller/).
 * Tek kaynak: module.config.ts, permissions.ts, messages/tr.json, releases.json, AI_TOOL_POLICY.
 * Elle düzenlemeyin: `pnpm docs:modules`. CI, üretilen dosyaların güncel olduğunu denetler
 * (tests/docs/module-docs.test.ts).
 */
import fs from "node:fs";
import path from "node:path";

import { allModules } from "@/registry";
import { AI_TOOL_POLICY } from "@/shared/data-policy";
import type { PermissionDefinition } from "@/shared/permissions/define";

export const MODULE_DOCS_DIR = path.join(process.cwd(), "website/docs/kullanim/moduller");

const CATEGORY: Record<string, string> = { CORE: "Çekirdek (her zaman açık)", OFFICIAL: "Resmî modül", EXTENSION: "Eklenti" };
const OPERATION: Record<string, string> = { read: "okuma", write: "yazma", delete: "silme" };
const ACTION: Record<string, string> = { view: "görüntüleme", create: "oluşturma", update: "düzenleme", delete: "silme", export: "dışa aktarma", approve: "onay" };
const TYPE: Record<string, string> = { feature: "Yeni", improvement: "İyileştirme", fix: "Düzeltme", security: "Güvenlik" };
const RELEASE_LIMIT = 8;
const ROLE: Record<string, string> = { ADMIN: "Yönetici", BOARD: "Yönetim Kurulu", SECRETARY: "Sekreter", TREASURER: "Sayman", AUDITOR: "Denetçi", TEACHER: "Öğretmen", VIEWER: "Salt okunur" };

type Messages = { access?: Record<string, string>; permissions?: Record<string, { label?: string; description?: string }> };
type Release = { version: string; date?: string; title?: { tr?: string }; changes?: Array<{ type: string; tr: string }> };

const esc = (text: string) => text.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").replace(/</g, "&lt;");
const readJson = <T>(file: string, fallback: T): T => (fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as T) : fallback);

async function permissionDefinitions(key: string): Promise<PermissionDefinition[]> {
  const file = path.join(process.cwd(), "src/modules", key, "permissions.ts");
  if (!fs.existsSync(file)) return [];
  const exported = (await import(file)) as Record<string, unknown>;
  return Object.values(exported).filter((value): value is PermissionDefinition => !!value && typeof value === "object" && "resource" in value && "grants" in value);
}

async function modulePage(mod: (typeof allModules)[number], labels: Map<string, string>): Promise<string> {
  const dir = path.join(process.cwd(), "src/modules", mod.key);
  const messages = readJson<Messages>(path.join(dir, "messages/tr.json"), {});
  const releases = readJson<{ releases: Release[] }>(path.join(dir, "releases.json"), { releases: [] }).releases;
  const name = (key: string) => labels.get(key) ?? key;
  const out: string[] = [
    "---",
    `title: ${JSON.stringify(mod.label)}`,
    `description: ${JSON.stringify(mod.description ?? "")}`,
    `slug: /kullanim/moduller/${mod.key}`,
    "---",
    "",
    "<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->",
    "",
    mod.description ?? "",
    "",
    "| | |",
    "|---|---|",
    `| Anahtar | \`${mod.key}\` |`,
    `| Tür | ${CATEGORY[mod.category] ?? mod.category} |`,
    `| Sürüm | ${mod.version ?? "—"} |`,
  ];
  const pages = [...(mod.nav ?? []).map((item) => item.href), ...(mod.menu ?? []).filter((item) => !item.isDownload).map((item) => item.href)];
  if (pages.length) out.push(`| Sayfalar | ${[...new Set(pages)].map((href) => `\`${href}\``).join(", ")} |`);
  if (mod.requires?.length) out.push(`| Gerektirir | ${mod.requires.map((item) => `[${name(item.module)}](./${item.module})${item.version ? ` (${item.version})` : ""}`).join(", ")} |`);
  if (mod.recommends?.length) out.push(`| Önerir | ${mod.recommends.map((key) => `[${name(key)}](./${key})`).join(", ")} |`);

  if (mod.access?.length) {
    out.push("", "## Diğer modüllere erişim", "", "Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).", "", "| Modül | İşlem | Gerekçe |", "|---|---|---|");
    for (const item of mod.access) out.push(`| [${esc(name(item.module))}](./${item.module}) | ${item.operations.map((op) => OPERATION[op] ?? op).join(", ")} | ${esc(messages.access?.[item.module] ?? "—")} |`);
  }

  const definitions = await permissionDefinitions(mod.key);
  if (definitions.length) {
    const roles = [...new Set(definitions.flatMap((definition) => Object.keys(definition.grants)))];
    out.push("", "## Varsayılan yetkiler", "", "Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.", "", `| İzin | ${roles.map((role) => ROLE[role] ?? role).join(" | ")} |`, `|---|${roles.map(() => "---").join("|")}|`);
    for (const definition of definitions) {
      const label = messages.permissions?.[definition.resource]?.label ?? definition.resource;
      const grants = definition.grants as Record<string, readonly string[]>;
      out.push(`| ${esc(label)} | ${roles.map((role) => (grants[role]?.length ? grants[role].map((action) => ACTION[action] ?? action).join(", ") : "—")).join(" | ")} |`);
    }
  }

  const tools = Object.entries(AI_TOOL_POLICY).filter(([, entry]) => entry.module === mod.key).map(([tool]) => tool).sort();
  if (tools.length) out.push("", "## Asistan araçları", "", "Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):", "", tools.map((tool) => `\`${tool}\``).join(" · "));

  if (releases.length) {
    out.push("", "## Sürüm notları", "");
    for (const release of releases.slice(0, RELEASE_LIMIT)) {
      out.push(`### ${release.version}${release.title?.tr ? ` — ${release.title.tr}` : ""}`, "", release.date ? `_${release.date}_` : "", "");
      for (const change of release.changes ?? []) out.push(`- **${TYPE[change.type] ?? change.type}:** ${change.tr.replace(/\r?\n/g, " ").replace(/</g, "&lt;")}`);
      out.push("");
    }
    if (releases.length > RELEASE_LIMIT) out.push(`Daha eski ${releases.length - RELEASE_LIMIT} sürüm: [releases.json](https://github.com/akgngr/verein-erp/blob/main/src/modules/${mod.key}/releases.json)`, "");
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

export async function renderModuleDocs(): Promise<Map<string, string>> {
  const modules = [...allModules].sort((a, b) => a.label.localeCompare(b.label, "tr"));
  const labels = new Map(modules.map((mod) => [mod.key, mod.label]));
  const files = new Map<string, string>();
  const groups: Array<[string, typeof modules]> = [
    ["Çekirdek modüller", modules.filter((mod) => mod.category === "CORE")],
    ["Resmî modüller", modules.filter((mod) => mod.category === "OFFICIAL")],
    ["Eklentiler", modules.filter((mod) => mod.category === "EXTENSION")],
  ];
  const index = [
    "---", "title: Modül kataloğu", "description: Tüm modüller, sürümleri, yetkileri ve sürüm notları.", "slug: /kullanim/moduller", "sidebar_position: 1", "---", "",
    "<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->", "",
    `Verein ERP ${modules.length} modülden oluşur. Modüller **Ayarlar → Modül Yönetimi** ekranından açılıp kapatılır; çekirdek modüller her zaman açıktır. Her sayfa modülün kendi tanımından otomatik üretilir.`, "",
  ];
  for (const [title, list] of groups) {
    if (!list.length) continue;
    index.push(`## ${title}`, "", "| Modül | Açıklama | Sürüm |", "|---|---|---|");
    for (const mod of list) index.push(`| [${esc(mod.label)}](./moduller/${mod.key}) | ${esc(mod.description ?? "")} | ${mod.version ?? "—"} |`);
    index.push("");
  }
  files.set("index.md", index.join("\n").trimEnd() + "\n");
  files.set("_category_.json", JSON.stringify({ label: "Modüller", position: 2, link: { type: "doc", id: "kullanim/moduller/index" } }, null, 2) + "\n");
  for (const [position, mod] of modules.entries()) files.set(`${mod.key}.md`, (await modulePage(mod, labels)).replace("---\n", `---\nsidebar_position: ${position + 2}\n`));
  return files;
}

async function main() {
  const files = await renderModuleDocs();
  fs.rmSync(MODULE_DOCS_DIR, { recursive: true, force: true });
  fs.mkdirSync(MODULE_DOCS_DIR, { recursive: true });
  for (const [name, content] of files) fs.writeFileSync(path.join(MODULE_DOCS_DIR, name), content);
  console.log(`[docs] ${files.size} dosya → ${path.relative(process.cwd(), MODULE_DOCS_DIR)}`); // i18n-ignore (CLI)
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) void main();
