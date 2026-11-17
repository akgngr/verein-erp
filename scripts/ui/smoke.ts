/**
 * W0 UI platform browser smoke: login, keyboard navigation and theme/responsiveness.
 *
 * Run against a seeded instance:
 * BASE_URL=http://localhost:3000 E2E_EMAIL=... E2E_PASSWORD=... pnpm exec tsx scripts/ui/smoke.ts
 *
 * Optional:
 * UI_SMOKE_ROUTES=/uyeler,/ayarlar/kullanicilar
 * UI_SMOKE_SCREENSHOT_DIR=/tmp/erp-ui-smoke
 * PLAYWRIGHT_CHROMIUM_PATH=/path/to/chromium
 *
 * Intentional: no writes to business data. Notification success/error flows are
 * reserved for wave-specific fixtures; W0 only establishes the browser harness.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";

const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const routes = (process.env.UI_SMOKE_ROUTES ?? "/uyeler,/ayarlar/kullanicilar")
  .split(",").map((x) => x.trim()).filter(Boolean);
const capture = process.env.UI_SMOKE_SCREENSHOT_DIR;

function assert(ok: boolean, message: string): asserts ok {
  if (!ok) throw new Error(message);
}

async function login(page: Page) {
  await page.goto(base + "/giris", { waitUntil: "load" });
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  assert(Boolean(email && password), "E2E_EMAIL and E2E_PASSWORD required");
  await page.locator('input[type="email"]').fill(email!);
  await page.locator('input[type="password"]').fill(password!);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((url) => !url.pathname.startsWith("/giris"), { timeout: 60_000 });
}

async function runViewport(context: BrowserContext, width: number, height: number, mode: "desktop" | "mobile") {
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error.message).slice(0, 200)));
  await page.setViewportSize({ width, height });
  await login(page);
  for (const theme of ["light", "dark"] as const) {
    const toggle = page.getByRole("button", { name: /^(Tema seçimi|Design wählen)$/ });
    await toggle.click();
    const themeName = theme === "light" ? /^(Açık|Hell)$/ : /^(Koyu|Dunkel)$/;
    await page.getByRole("menuitemradio", { name: themeName }).click();
    await page.waitForFunction((value) => document.documentElement.classList.contains(value), theme);
    for (const route of routes) {
      await page.goto(base + route, { waitUntil: "load" });
      await page.getByRole("main").first().waitFor({ timeout: 30_000 });
      const pathname = new URL(page.url()).pathname;
      assert(pathname === route, `Route unexpected: ${route} -> ${pathname}`);
      assert(await page.locator("body").isVisible(), `Blank page: ${route}`);
      // A11y/navigation baseline: keyboard focus must be reachable, never hidden.
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return false;
        const box = el.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      });
      assert(focused, `No reachable keyboard focus: ${route}`);
      if (mode === "mobile") {
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
        assert(!overflow, `Horizontal overflow: ${route}`);
      }
      if (capture) {
        fs.mkdirSync(capture, { recursive: true });
        const safe = route.replace(/[^a-z\d]+/gi, "-");
        await page.screenshot({ path: path.join(capture, `${mode}-${theme}-${safe}.png`), animations: "disabled" });
      }
      console.info(`[ui-smoke] OK ${mode} ${theme} ${route}`);
    }
  }
  assert(!errors.length, "Uncaught page errors: " + errors.join(" | "));
  await page.close();
}

async function main() {
  if (!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD) {
    console.error("[ui-smoke] E2E_EMAIL / E2E_PASSWORD required; values never printed");
    process.exitCode = 2;
    return;
  }
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
  try {
    const context = await browser.newContext({ locale: "de-DE", reducedMotion: "reduce" });
    await runViewport(context, 1440, 900, "desktop");
    await runViewport(context, 390, 844, "mobile");
    await context.close();
  } finally {
    await browser.close();
  }
}

void main().catch((error) => {
  console.error("[ui-smoke]", String(error));
  process.exitCode = 1;
});
