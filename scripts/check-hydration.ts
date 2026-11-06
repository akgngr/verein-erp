/**
 * Hydration smoke test: logs in, opens every static dashboard page in a real
 * browser and fails when React reports a hydration mismatch or the page throws.
 *
 * Hydration errors only appear when server HTML meets the client render, so
 * unit tests cannot catch them. Run against a running app (prefer a production
 * build: `pnpm build && pnpm start`; dev works but is slower):
 *
 *   E2E_EMAIL=... E2E_PASSWORD=... pnpm test:hydration
 *
 * Env:
 *   BASE_URL                 default http://localhost:3000
 *   E2E_EMAIL / E2E_PASSWORD  an active admin without forced password change (never printed)
 *   HYDRATION_ROUTES         optional comma-separated subset, e.g. "/automation,/uyeler"
 *   HYDRATION_STRICT=true    also fail on any other console error
 *   PLAYWRIGHT_CHROMIUM_PATH optional browser binary
 */
import fs from "node:fs";
import path from "node:path";

import { chromium, type ConsoleMessage } from "playwright";

const ROOT = process.cwd();
const DASHBOARD = path.join(ROOT, "src", "app", "(dashboard)");
const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const STRICT = process.env.HYDRATION_STRICT === "true";

const HYDRATION_PATTERNS = [
  /hydrat/i,
  /did not match/i,
  /server rendered HTML/i,
  /Text content does not match/i,
];

// Known third-party noise that is not a hydration problem.
const IGNORED_CONSOLE = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /favicon\.ico/i,
];

/** All static (non-dynamic) dashboard page routes, derived from the app directory. */
export function discoverRoutes(dir = DASHBOARD): string[] {
  const routes = new Set<string>();
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith("[") || entry.name.startsWith("_") || entry.name.startsWith("@")) continue;
        walk(full);
      } else if (entry.name === "page.tsx") {
        const segments = path.relative(dir, current).split(path.sep).filter((segment) => segment && !/^\(.*\)$/.test(segment));
        routes.add(`/${segments.join("/")}`);
      }
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return [...routes].sort();
}

function isHydration(text: string): boolean {
  return HYDRATION_PATTERNS.some((pattern) => pattern.test(text));
}

async function main() {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    console.error("[hydration] E2E_EMAIL ve E2E_PASSWORD gerekli (değerler yazdırılmaz).");
    process.exit(2);
  }

  const only = process.env.HYDRATION_ROUTES?.split(",").map((route) => route.trim()).filter(Boolean);
  const routes = only?.length ? only : discoverRoutes();
  console.info(`[hydration] ${routes.length} sayfa kontrol edilecek → ${BASE_URL}`);

  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(120_000);

  let current = "(login)";
  const hydration: { route: string; message: string }[] = [];
  const pageErrors: { route: string; message: string }[] = [];
  const consoleErrors: { route: string; message: string }[] = [];

  page.on("console", (message: ConsoleMessage) => {
    if (message.type() !== "error" && message.type() !== "warning") return;
    const text = message.text();
    if (IGNORED_CONSOLE.some((pattern) => pattern.test(text))) return;
    if (isHydration(text)) hydration.push({ route: current, message: text.slice(0, 400) });
    else if (message.type() === "error") consoleErrors.push({ route: current, message: text.slice(0, 300) });
  });
  page.on("pageerror", (error) => {
    const text = String(error?.message ?? error);
    if (isHydration(text)) hydration.push({ route: current, message: text.slice(0, 400) });
    else pageErrors.push({ route: current, message: text.slice(0, 300) });
  });

  // Login
  // Wait for hydration before submitting, otherwise the form may post natively.
  await page.goto(`${BASE_URL}/giris`, { waitUntil: "load" });
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((url) => !url.pathname.startsWith("/giris"), { timeout: 120_000 }).catch(() => undefined);
  if (new URL(page.url()).pathname.startsWith("/giris")) {
    console.error("[hydration] Giriş başarısız; E2E_EMAIL/E2E_PASSWORD'u kontrol edin.");
    await browser.close();
    process.exit(2);
  }

  const redirected: string[] = [];
  for (const route of routes) {
    current = route;
    const started = Date.now();
    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "load" });
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
      // Give React time to hydrate and report mismatches.
      await page.waitForTimeout(800);
    } catch (error) {
      pageErrors.push({ route, message: `navigation failed: ${String(error).slice(0, 200)}` });
    }
    const landed = new URL(page.url()).pathname;
    if (landed !== route && !landed.startsWith(route)) redirected.push(`${route} → ${landed}`);
    const marker = hydration.some((item) => item.route === route) ? "✖" : "✓";
    console.info(`[hydration] ${marker} ${route} (${Date.now() - started} ms)`);
  }
  await browser.close();

  if (redirected.length) {
    console.info(`[hydration] Yönlendirilen sayfalar (yetki/modül kapalı olabilir):\n  ${redirected.join("\n  ")}`);
  }
  if (consoleErrors.length) {
    console.warn(`[hydration] Diğer konsol hataları (${consoleErrors.length}):`);
    for (const item of consoleErrors.slice(0, 30)) console.warn(`  ${item.route}: ${item.message}`);
  }

  const failures = [...hydration, ...pageErrors, ...(STRICT ? consoleErrors : [])];
  if (hydration.length) {
    console.error(`[hydration] ${hydration.length} hydration hatası:`);
    for (const item of hydration) console.error(`  ${item.route}: ${item.message.split("\n")[0]}`);
  }
  if (pageErrors.length) {
    console.error(`[hydration] ${pageErrors.length} sayfa hatası:`);
    for (const item of pageErrors) console.error(`  ${item.route}: ${item.message}`);
  }
  if (failures.length) process.exit(1);
  console.info("[hydration] OK — hydration hatası yok.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error("[hydration] Beklenmeyen hata:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
