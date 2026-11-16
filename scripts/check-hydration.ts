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
 *   HYDRATION_CAPTURE_DIR   optional screenshot directory + theme/form acceptance checks
 */
import fs from "node:fs";
import path from "node:path";

import { chromium, type ConsoleMessage } from "playwright";

const ROOT = process.cwd();
const DASHBOARD = path.join(ROOT, "src", "app", "(dashboard)");
const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);
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
        if (
          entry.name.startsWith("[") ||
          entry.name.startsWith("_") ||
          entry.name.startsWith("@")
        )
          continue;
        walk(full);
      } else if (entry.name === "page.tsx") {
        const segments = path
          .relative(dir, current)
          .split(path.sep)
          .filter((segment) => segment && !/^\(.*\)$/.test(segment));
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
    console.error(
      "[hydration] E2E_EMAIL ve E2E_PASSWORD gerekli (değerler yazdırılmaz).",
    );
    process.exit(2);
  }

  const only = process.env.HYDRATION_ROUTES?.split(",")
    .map((route) => route.trim())
    .filter(Boolean);
  const routes = only?.length ? only : discoverRoutes();
  console.info(
    `[hydration] ${routes.length} sayfa kontrol edilecek → ${BASE_URL}`,
  );

  const captureDir = process.env.HYDRATION_CAPTURE_DIR;
  if (captureDir) fs.mkdirSync(captureDir, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(120_000);

  let current = "(login)";
  const hydration: { route: string; message: string }[] = [];
  const pageErrors: { route: string; message: string }[] = [];
  const consoleErrors: { route: string; message: string }[] = [];

  page.on("console", (message: ConsoleMessage) => {
    if (message.type() !== "error" && message.type() !== "warning") return;
    const text = message.text();
    if (IGNORED_CONSOLE.some((pattern) => pattern.test(text))) return;
    if (isHydration(text))
      hydration.push({ route: current, message: text.slice(0, 400) });
    else if (message.type() === "error")
      consoleErrors.push({ route: current, message: text.slice(0, 300) });
  });
  page.on("pageerror", (error) => {
    const text = String(error?.message ?? error);
    if (isHydration(text))
      hydration.push({ route: current, message: text.slice(0, 400) });
    else pageErrors.push({ route: current, message: text.slice(0, 300) });
  });

  // Login
  // Wait for hydration before submitting, otherwise the form may post natively.
  await page.goto(`${BASE_URL}/giris`, { waitUntil: "load" });
  await page
    .waitForLoadState("networkidle", { timeout: 30_000 })
    .catch(() => undefined);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.locator('button[type="submit"]').first().click();
  await page
    .waitForURL((url) => !url.pathname.startsWith("/giris"), {
      timeout: 120_000,
    })
    .catch(() => undefined);
  if (new URL(page.url()).pathname.startsWith("/giris")) {
    console.error(
      "[hydration] Giriş başarısız; E2E_EMAIL/E2E_PASSWORD'u kontrol edin.",
    );
    await browser.close();
    process.exit(2);
  }

  const redirected: string[] = [];
  for (const route of routes) {
    current = route;
    const started = Date.now();
    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "load" });
      await page
        .waitForLoadState("networkidle", { timeout: 15_000 })
        .catch(() => undefined);
      // Give React time to hydrate and report mismatches.
      await page.waitForTimeout(800);
    } catch (error) {
      pageErrors.push({
        route,
        message: `navigation failed: ${String(error).slice(0, 200)}`,
      });
    }
    const landed = new URL(page.url()).pathname;
    if (landed !== route && !landed.startsWith(route))
      redirected.push(`${route} → ${landed}`);
    const marker = hydration.some((item) => item.route === route) ? "✖" : "✓";
    console.info(`[hydration] ${marker} ${route} (${Date.now() - started} ms)`);
  }
  // Optional theme acceptance on the disposable CI database. No login/credential screenshots.
  if (captureDir) {
    try {
      page.setDefaultTimeout(30_000);
      for (const [route, label] of [
        ["/", "dashboard"],
        ["/uyeler", "members"],
        ["/muhasebe/panel", "accounting"],
      ]) {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle" });
        for (const [theme, name] of [
          ["light", /^(Açık|Hell)$/],
          ["dark", /^(Koyu|Dunkel)$/],
        ] as const) {
          await page
            .getByRole("button", { name: /^(Tema seçimi|Design wählen)$/ })
            .click();
          await page.getByRole("menuitemradio", { name }).click();
          await page.waitForFunction(
            (value) => document.documentElement.classList.contains(value),
            theme,
          );
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.screenshot({
            path: path.join(captureDir, `${label}-${theme}.png`),
            fullPage: true,
            animations: "disabled",
          });
        }
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${BASE_URL}/muhasebe/panel`, { waitUntil: "networkidle" });
      for (const [theme, name] of [
        ["light", /^(Açık|Hell)$/],
        ["dark", /^(Koyu|Dunkel)$/],
      ] as const) {
        await page.getByRole("button", { name: /^(Tema seçimi|Design wählen)$/ }).click();
        await page.getByRole("menuitemradio", { name }).click();
        await page.waitForFunction(
          (value) => document.documentElement.classList.contains(value),
          theme,
        );
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: path.join(captureDir, `accounting-mobile-${theme}.png`),
          fullPage: true,
          animations: "disabled",
        });
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.reload({ waitUntil: "networkidle" });
      if (!(await page.locator("html.dark").count()))
        throw new Error("THEME_PERSISTENCE_FAILED");
      await page
        .getByRole("button", { name: /^(Menüyü daralt|Menü einklappen)$/ })
        .click();
      await page.waitForFunction(() => {
        const aside = document.querySelector("aside");
        return aside !== null && aside.getBoundingClientRect().width < 100;
      });
      await page
        .getByRole("button", { name: /^(Menüyü genişlet|Menü ausklappen)$/ })
        .click();
      await page.waitForFunction(() => {
        const aside = document.querySelector("aside");
        return aside !== null && aside.getBoundingClientRect().width > 200;
      });
      // The CI fixture has twelve synthetic members: exercise real table rows and pagination.
      if (process.env.CI === "true") {
        await page
          .getByRole("button", { name: /^(Sonraki sayfa|Nächste Seite)$/ })
          .click();
        await page.waitForURL((url) => url.searchParams.get("page") === "2");
        await page.waitForLoadState("networkidle");
        if ((await page.getByRole("row").count()) !== 3)
          throw new Error("V3_TABLE_PAGINATION_FAILED");
        await page
          .getByRole("button", { name: /^(Önceki sayfa|Vorherige Seite)$/ })
          .click();
        await page.waitForURL((url) => !url.searchParams.has("page"));
        await page.locator("#dt-search-input").fill("Mitglied01");
        await page.waitForURL(
          (url) => url.searchParams.get("q") === "Mitglied01",
        );
        await page.waitForLoadState("networkidle");
        if ((await page.getByRole("row").count()) !== 2)
          throw new Error("V3_TABLE_SEARCH_FAILED");
        await page
          .getByRole("button", { name: /^(Satır işlemleri|Zeilenaktionen)$/ })
          .click();
        await page.getByRole("menu").waitFor();
        await page.keyboard.press("Escape");
        await page.getByRole("menu").waitFor({ state: "hidden" });
      }
      current = "/uyeler?yeni";
      await page.goto(`${BASE_URL}/uyeler?yeni`, { waitUntil: "networkidle" });
      const memberDialog = page.getByRole("dialog");
      await memberDialog.waitFor();
      const firstName = memberDialog.locator('input[name="firstName"]');
      await firstName.fill("Theme preview");
      if ((await firstName.inputValue()) !== "Theme preview")
        throw new Error("V3_TEXT_FIELD_VALUE_FAILED");
      const selectTrigger = memberDialog
        .locator('[data-slot="select-trigger"]')
        .first();
      await selectTrigger.click();
      await page.getByRole("listbox").waitFor();
      await page.keyboard.press("End");
      await page.keyboard.press("Enter");
      await page.getByRole("listbox").waitFor({ state: "hidden" });
      const consent = memberDialog.getByRole("switch");
      await memberDialog.locator('[data-slot="switch-content"]').click();
      if (!(await consent.isChecked()))
        throw new Error("V3_SWITCH_POINTER_FAILED");
      await consent.focus();
      await consent.press("Space");
      if (await consent.isChecked())
        throw new Error("V3_SWITCH_KEYBOARD_FAILED");
      await consent.press("Space");
      if (!(await consent.isChecked()))
        throw new Error("V3_SWITCH_VALUE_FAILED");
      const sms = memberDialog.getByRole("checkbox", {
        name: "SMS",
        exact: true,
      });
      await memberDialog
        .locator('[data-slot="checkbox-content"]')
        .filter({ hasText: "SMS" })
        .click();
      if (!(await sms.isChecked()))
        throw new Error("V3_CHECKBOX_POINTER_FAILED");
      await sms.focus();
      await sms.press("Space");
      if (await sms.isChecked()) throw new Error("V3_CHECKBOX_KEYBOARD_FAILED");
      await memberDialog
        .getByRole("button", { name: /Doğum tarihi|Geburtsdatum/ })
        .click();
      const calendar = page.locator('[data-slot="calendar"]');
      await calendar.waitFor();
      await calendar
        .locator('[data-slot="calendar-year-picker-trigger"]')
        .click();
      const years = calendar.getByRole("listbox");
      await years.waitFor();
      await years.getByRole("button", { name: "2020", exact: true }).click();
      const day = calendar
        .locator(
          '[data-slot="calendar-cell"][role="button"]:not([aria-disabled="true"])',
        )
        .first();
      await day.click();
      await calendar.waitFor({ state: "hidden" });
      const dateValues = await memberDialog
        .locator('input[name="birthDate"]')
        .evaluateAll((nodes) =>
          nodes.map((node) => (node as HTMLInputElement).value),
        );
      if (
        !dateValues.length ||
        dateValues.some((value) => !value.startsWith("2020-")) ||
        new Set(dateValues).size !== 1
      )
        throw new Error("V3_DATE_FIELD_VALUE_FAILED");
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: path.join(captureDir, "member-form-dark.png"),
        fullPage: true,
        animations: "disabled",
      });
      await page.keyboard.press("Escape");
      await memberDialog.waitFor({ state: "hidden" });
      await page.waitForURL((url) => !url.searchParams.has("yeni"));
      current = "/ayarlar/kullanicilar";
      await page.goto(`${BASE_URL}/ayarlar/kullanicilar`, {
        waitUntil: "networkidle",
      });
      const roleTab = page.getByRole("tab", {
        name: /Roller ve Yetki Matrisi|Rollen und Berechtigungsmatrix/,
      });
      await roleTab.click();
      if ((await roleTab.getAttribute("aria-selected")) !== "true")
        throw new Error("V3_TABS_FAILED");
      await page.screenshot({
        path: path.join(captureDir, "users-permissions-dark.png"),
        fullPage: true,
        animations: "disabled",
      });
      current = "/evrak?yeni=gelen";
      await page.goto(`${BASE_URL}/evrak?yeni=gelen`, {
        waitUntil: "networkidle",
      });
      const documentDialog = page.getByRole("dialog");
      await documentDialog.waitFor();
      const counterparty = documentDialog.getByRole("combobox", {
        name: /Gönderen|Absender/,
      });
      await counterparty.fill("Synthetic preview organisation");
      await counterparty.press("Tab");
      if (
        (await counterparty.inputValue()) !== "Synthetic preview organisation"
      )
        throw new Error("V3_COMBOBOX_CUSTOM_VALUE_FAILED");
      await page.screenshot({
        path: path.join(captureDir, "document-form-dark.png"),
        fullPage: true,
        animations: "disabled",
      });
      await page.keyboard.press("Escape");
      await documentDialog.waitFor({ state: "hidden" });
      await page.goto(`${BASE_URL}/uyeler`, { waitUntil: "networkidle" });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload({ waitUntil: "networkidle" });
      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )
      )
        throw new Error("MOBILE_PAGE_OVERFLOW");
      await page.screenshot({
        path: path.join(captureDir, "members-mobile.png"),
        fullPage: true,
        animations: "disabled",
      });
      await page
        .getByRole("button", { name: /^(Menüyü aç|Menü öffnen)$/ })
        .click();
      await page.getByRole("dialog").waitFor();
      await page.screenshot({
        path: path.join(captureDir, "mobile-navigation.png"),
        fullPage: true,
        animations: "disabled",
      });
      await page.keyboard.press("Escape");
      if (await page.getByRole("dialog").count())
        await page.getByRole("dialog").waitFor({ state: "hidden" });
      await page
        .getByRole("button", { name: /^(Tema seçimi|Design wählen)$/ })
        .click();
      await page.getByRole("menuitemradio", { name: /^(Açık|Hell)$/ }).click();
      await page.waitForFunction(() =>
        document.documentElement.classList.contains("light"),
      );
      console.info(
        "[theme] Light/dark, persistence, sidebar, controlled fields, dates, tabs, ComboBox, drawer URL and mobile acceptance passed.",
      );
    } catch (error) {
      await page
        .screenshot({
          path: path.join(captureDir, "acceptance-failure.png"),
          fullPage: true,
          animations: "disabled",
        })
        .catch(() => undefined);
      // Labels only: no input values or credentials in failure diagnostics.
      console.error(
        "[theme] Visible button labels:",
        await page.getByRole("button").evaluateAll((nodes) =>
          nodes.map((node) => ({
            text: node.textContent?.trim(),
            label: node.getAttribute("aria-label"),
            labelledBy: node.getAttribute("aria-labelledby"),
            slot: node.getAttribute("data-slot"),
          })),
        ),
      );
      throw error;
    }
  }
  await browser.close();

  if (redirected.length) {
    console.info(
      `[hydration] Yönlendirilen sayfalar (yetki/modül kapalı olabilir):\n  ${redirected.join("\n  ")}`,
    );
  }
  if (consoleErrors.length) {
    console.warn(
      `[hydration] Diğer konsol hataları (${consoleErrors.length}):`,
    );
    for (const item of consoleErrors.slice(0, 30))
      console.warn(`  ${item.route}: ${item.message}`);
  }

  const failures = [
    ...hydration,
    ...pageErrors,
    ...(STRICT ? consoleErrors : []),
  ];
  if (hydration.length) {
    console.error(`[hydration] ${hydration.length} hydration hatası:`);
    for (const item of hydration)
      console.error(`  ${item.route}: ${item.message.split("\n")[0]}`);
  }
  if (pageErrors.length) {
    console.error(`[hydration] ${pageErrors.length} sayfa hatası:`);
    for (const item of pageErrors)
      console.error(`  ${item.route}: ${item.message}`);
  }
  if (failures.length) process.exit(1);
  console.info("[hydration] OK — hydration hatası yok.");
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(__filename)
) {
  main().catch((error) => {
    console.error(
      "[hydration] Beklenmeyen hata:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  });
}
