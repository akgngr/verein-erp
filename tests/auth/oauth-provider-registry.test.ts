import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  defineAuthProviders,
  loadAuthProviders,
  selectAuthProviders,
  type ModuleAuthProviders,
} from "@/shared/auth/providers";
import { safeRedirect } from "@/modules/auth/services/safe-redirect";

const fakeProvider = (id: string) => ({ id, name: id, type: "oauth" as const });
const def = (moduleKey: string, ids: string[], load?: (id: string) => unknown): ModuleAuthProviders =>
  defineAuthProviders({
    moduleKey,
    providers: ids.map((id) => ({ id, label: id, load: () => (load ? load(id) : fakeProvider(id)) as never })),
  });

/** #612: Sağlayıcı kaydı — deterministik, benzersiz kimlik, modül kapısı, kapalı-güvenli yükleme. */
describe("auth provider selection (#612)", () => {
  it("keeps only providers of usable modules, sorted by id", () => {
    const { selected, rejected } = selectAuthProviders(
      [def("social-login", ["microsoft", "google"]), def("off-module", ["github"])],
      new Set(["social-login"]),
    );
    assert.deepEqual(selected.map((s) => s.definition.id), ["google", "microsoft"]);
    assert.deepEqual(rejected, [{ moduleKey: "off-module", id: "github", reason: "module_unavailable" }]);
  });

  it("rejects BOTH entries of a duplicate id instead of picking one", () => {
    const { selected, rejected } = selectAuthProviders([def("a", ["google"]), def("b", ["google", "x-corp"])], new Set(["a", "b"]));
    assert.deepEqual(selected.map((s) => s.definition.id), ["x-corp"]);
    assert.deepEqual(rejected.map((r) => `${r.moduleKey}:${r.reason}`).sort(), ["a:duplicate_id", "b:duplicate_id"]);
  });

  it("rejects reserved and malformed ids (credentials can never be replaced)", () => {
    const { selected, rejected } = selectAuthProviders([def("m", ["credentials", "Google", "a", "ok-id"])], new Set(["m"]));
    assert.deepEqual(selected.map((s) => s.definition.id), ["ok-id"]);
    assert.deepEqual(rejected.map((r) => `${r.id}:${r.reason}`), ["credentials:reserved_id", "Google:invalid_id", "a:invalid_id"]);
  });

  it("is deterministic regardless of registry order", () => {
    const entries = [def("z", ["zeta"]), def("a", ["alpha"]), def("m", ["mid"])];
    const one = selectAuthProviders(entries, new Set(["a", "m", "z"])).selected.map((s) => s.definition.id);
    const two = selectAuthProviders([...entries].reverse(), new Set(["a", "m", "z"])).selected.map((s) => s.definition.id);
    assert.deepEqual(one, two);
  });
});

describe("auth provider loading fails closed (#612)", () => {
  it("skips providers that throw, time out, are not configured or report another id", async () => {
    const entries = [
      def("m", ["broken", "slow", "unset", "liar", "good"], (id) => {
        if (id === "broken") throw new Error("secret=should-not-leak");
        if (id === "slow") return new Promise((resolve) => setTimeout(() => resolve(fakeProvider("slow")), 200));
        if (id === "unset") return null;
        if (id === "liar") return fakeProvider("credentials");
        return fakeProvider(id);
      }),
    ];
    const { selected } = selectAuthProviders(entries, new Set(["m"]));
    const { loaded, skipped } = await loadAuthProviders(selected, 50);
    assert.deepEqual(loaded.map((l) => l.id), ["good"]);
    assert.deepEqual(
      skipped.map((s) => `${s.id}:${s.reason}`).sort(),
      ["broken:unavailable", "liar:id_mismatch", "slow:unavailable", "unset:not_configured"],
    );
    // Hata mesajı (olası sır) sonuca taşınmaz.
    assert.doesNotMatch(JSON.stringify(skipped), /should-not-leak/);
  });
});

describe("safe redirect after sign-in (#612)", () => {
  const base = "https://verein.example";
  it("allows relative paths and the same origin only", () => {
    assert.equal(safeRedirect("/uyeler", base), "https://verein.example/uyeler");
    assert.equal(safeRedirect("https://verein.example/a?b=1", base), "https://verein.example/a?b=1");
    assert.equal(safeRedirect("https://evil.example/x", base), "https://verein.example/");
    assert.equal(safeRedirect("//evil.example/x", base), "https://verein.example/");
    assert.equal(safeRedirect("/\\evil.example", base), "https://verein.example/");
    assert.equal(safeRedirect("javascript:alert(1)", base), "https://verein.example/");
  });

  it("is not fooled by control characters between the leading slashes (#620 review)", () => {
    for (const evil of ["/\t/evil.example", "/\n/evil.example", "/\r/evil.example", "\t//evil.example", "/\t\\evil.example"]) {
      assert.equal(new URL(safeRedirect(evil, base)).origin, "https://verein.example", JSON.stringify(evil));
    }
  });
});

/** Statik denetimler: parola girişi değişmedi, auth sağlayıcı adı bilmiyor, edge zinciri temiz. */
describe("auth wiring (#612)", () => {
  const root = process.cwd();
  const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

  it("keeps Credentials first and unchanged, with the same authorize", () => {
    const source = read("src/modules/auth/auth.ts");
    assert.match(source, /providers:\s*\[credentials,\s*\.\.\.external\.providers\]/);
    assert.match(source, /Credentials\(\{[\s\S]*otp:[\s\S]*reissue:[\s\S]*authorize,\s*\}\)/);
    assert.match(source, /account\.provider === "credentials"\) return true/);
  });

  it("never links by e-mail and never provisions users", () => {
    const identity = read("src/modules/auth/services/oauth-identity.ts");
    const auth = read("src/modules/auth/auth.ts");
    assert.match(identity, /authIdentity\.findUnique\(\{ where: \{ provider_subject:/);
    assert.doesNotMatch(identity, /user\.findUnique\(\{\s*where:\s*\{\s*email/);
    assert.doesNotMatch(identity + auth, /user\.create\(/);
  });

  it("has no provider-specific imports in the auth module", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
      }
    };
    walk(path.join(root, "src", "modules", "auth"));
    const offenders = files.filter((file) => /next-auth\/providers\/(?!credentials["'])/.test(fs.readFileSync(file, "utf8")));
    assert.deepEqual(offenders, []);
  });

  it("keeps the edge entry free of Prisma, the provider registry and server-only code", () => {
    const seen = new Set<string>();
    const resolve = (from: string, spec: string): string | null => {
      const baseDir = path.dirname(from);
      const raw = spec.startsWith("@/") ? path.join(root, "src", spec.slice(2)) : spec.startsWith(".") ? path.join(baseDir, spec) : null;
      if (!raw) return null;
      for (const candidate of [raw, `${raw}.ts`, `${raw}.tsx`, path.join(raw, "index.ts")]) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
      }
      return null;
    };
    const visit = (file: string) => {
      if (seen.has(file)) return;
      seen.add(file);
      const text = fs.readFileSync(file, "utf8");
      assert.doesNotMatch(text, /import "server-only"/, `server-only reached from edge: ${path.relative(root, file)}`);
      for (const match of text.matchAll(/from\s+["']([^"']+)["']/g)) {
        const spec = match[1];
        assert.ok(!/auth-provider-registry|@prisma|shared\/db/.test(spec), `edge imports ${spec} in ${path.relative(root, file)}`);
        const next = resolve(file, spec);
        if (next) visit(next);
      }
    };
    visit(path.join(root, "src", "modules", "auth", "edge.ts"));
    assert.ok(seen.size >= 2);
  });

  it("the generated registry is server-only and produced by module:sync", () => {
    const registry = read("src/auth-provider-registry.ts");
    assert.match(registry, /otomatik üretilir \(pnpm module:sync\)/);
    assert.match(registry, /import "server-only"/);
    assert.match(read("src/shared/modules/sync-registry.ts"), /"auth-providers\.ts", "authProviders"/);
  });
});
