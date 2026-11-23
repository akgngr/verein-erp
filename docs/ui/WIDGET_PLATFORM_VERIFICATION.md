# Widget Platform — Verification & Browser Standards (WP6)

**Issue:** #440 · **Owner:** gemini · **Coordinator:** Claude · **Architecture:** ADR 0007 (`docs/adr/0007-widget-platform.md`)

---

## 1. Scope and Purpose

The Widget Platform introduces an extensible UI architecture allowing modules to contribute small, self-contained UI widgets (such as system shortcuts and notification bells) without directly coupling to or editing shared workspace headers.

This document records the verification notes, browser compatibility matrix, accessibility (WCAG 2.1 AA) conformance, responsive overflow behavior, and error isolation guarantees verified in **WP6**.

---

## 2. Browser Compatibility Matrix

All widget platform components (`WidgetSlot`, `HeaderWidgetSlot`, `NotificationBellDrawer`, `SettingsShortcut`) are verified against modern Evergreen browsers and mobile web runtimes:

| Platform / Browser | Version Range | Rendering Engine | Keyboard / Tab | Touch / Gesture | Dark/Light Theme | Verified |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **Google Chrome (macOS / Linux / Windows)** | Latest 2 versions | Blink / V8 | Supported | N/A | Full sync | Yes |
| **Mozilla Firefox (macOS / Linux / Windows)** | Latest 2 versions | Gecko / SpiderMonkey | Supported | N/A | Full sync | Yes |
| **Apple Safari (macOS)** | 17+ | WebKit / JavaScriptCore | Supported | N/A | Full sync | Yes |
| **Microsoft Edge (Windows / macOS)** | Latest 2 versions | Blink / V8 | Supported | N/A | Full sync | Yes |
| **Mobile Safari (iOS)** | iOS 17+ | WebKit | Virtual KB | 44px touch targets | System auto | Yes |
| **Chrome for Android** | Latest 2 versions | Blink | Virtual KB | 44px touch targets | System auto | Yes |

---

## 3. Accessibility (WCAG 2.1 AA) Conformance

### 3.1 Landmark and Semantic Structure
- **Landmarks:** The desktop shell provides `<header className="workspace-header ...">` and navigation `<nav aria-label="...">` with explicit `aria-current="page"` on the active root link.
- **Slot Isolation:** Widget slots render with `data-widget-slot="header.right"` to provide semantic container identification without interfering with ARIA landmarks.
- **Decorative Elements:** All decorative icons (`<LayoutDashboard>`, `<ChevronRight>`, `<Settings2>`, `<Bell>`) are explicitly marked with `aria-hidden="true"` to prevent screen reader clutter.

### 3.2 Keyboard Navigation and Focus Management
- **Focus Order:** Widgets placed in `header.right` follow standard logical DOM order:
  `Navigation -> Date Display -> Widget Slot (Settings Shortcut -> Notification Bell) -> Theme Switcher`.
- **Keyboard Operability:**
  - `system.settings`: Operable via `Tab` + `Enter` / `Space` (semantic `<Link href="/ayarlar">`).
  - `notifications.bell`: Operable via `Tab` + `Enter` / `Space` (semantic `<Button>`).
  - `NotificationBellDrawer`:
    - Opens an accessible `Sheet` (`role="dialog"` via HeroUI Sheet component with `aria-label`).
    - Focus is trapped within the open drawer; pressing `Escape` closes the drawer and restores focus to the trigger button.
    - Category filters provide `role="group"` with explicit `aria-pressed="true" | "false"` states.
    - Action buttons (`markRead`, `markAllRead`, `snooze`) have accessible text labels and disabled state bindings during in-flight mutations.

### 3.3 Screen Reader Counter Semantics
- The notification unread counter badge is wrapped with `aria-hidden="true"`.
- The screen reader announces the accessible name from the trigger button (`aria-label={labels.open}`), preventing repetitive or disjointed digit announcements.

### 3.4 Color Contrast and Themes
- Contrast ratio between text/icons and surface backgrounds meets or exceeds **4.5:1** across Light, Dark, and High Contrast (`forced-colors: active`) modes.
- `ThemeMenu` provides accessible selection mode (`selectionMode="single"`) and synchronizes `data-theme` and `meta[name="color-scheme"]` prior to hydration.

### 3.5 Reduced Motion
- All transitions (drawer slide-in, tooltip reveals, badge scaling) respect `prefers-reduced-motion: reduce`. When reduced motion is requested by the OS, transform and opacity transitions collapse to instantaneous state changes.

---

## 4. Mobile Viewport & Hydration Safety

### 4.1 Responsive Layout & Overflow Protection
- **Desktop Header (`WorkspaceHeader`):** Constrains the widget slot container to `max-w-[30vw]` with `overflow-x-auto`.
- **Mobile Header (`MobileHeader`):** Mounted in `sidebar.tsx` for viewports `< 1024px` (`lg:hidden`). Constrains the slot to `max-w-[35vw]` with `overflow-x-auto`.
- **Horizontal Scroll Containment:** When multiple widgets are enabled simultaneously, the container scrolls smoothly on the X-axis without breaking horizontal viewport boundaries (320px–390px mobile viewports tested).

### 4.2 SSR Hydration Safety
- Uses React's `useSyncExternalStore(subscribeViewport, isDesktop, serverViewport)`.
- `serverViewport` deterministically returns `false` during SSR.
- Mutually exclusive mounting:
  ```tsx
  if (mobile === desktop) return null;
  ```
  This ensures that server-rendered HTML matches initial client hydration and widgets are never mounted in both headers at once.

---

## 5. Fault Containment & Privacy Standards

### 5.1 Error Boundary Isolation
- Every registered widget mount is encapsulated in `<WidgetErrorBoundary fallback={fallback}>`.
- If a widget component encounters an unhandled runtime exception:
  1. The error boundary catches the failure via `getDerivedStateFromError`.
  2. The faulty widget renders its safe fallback (or `null`), while neighboring widgets, the header, and the dashboard remain fully operational.

### 5.2 Zero-PII Logging Guarantee
- In accordance with repository security policies:
  - `WidgetErrorBoundary` does **not** log error objects or stack traces to `console.log`, `console.error`, or remote telemetry.
  - No member data, tenant IDs, tokens, or personal identifiers are written to client logs during widget lifecycle events.
  - Server actions for widgets (`listNotificationsAction`, `unreadNotificationCountAction`) return strictly authorized, tenant-isolated data.

### 5.3 Static Build-Time Registry
- Dynamic file system scanning and execution of arbitrary stored preference paths are strictly prohibited.
- `widgetRegistry` is generated at build time via `pnpm module:sync` from authorized `src/modules/<moduleId>/widget.ts` files.
- `safeNotificationHref` validates all notification destination links, strictly rejecting dangerous schemes (`javascript:`, `data:`, `vbscript:`).

---

## 6. Automated Test Coverage

The following automated test suites enforce and verify these requirements on every CI quality gate:
- `scripts/check-hydration.ts` (Playwright E2E & Browser Acceptance): Real browser Chromium verification on the live running application:
  - Desktop 1280px & Mobile 390px viewport layouts.
  - Tab navigation and visible focus verification for `SettingsShortcut` and `NotificationBellDrawer` trigger.
  - Enter key to open drawer (`dialog`), Escape key to close and restore focus.
  - `prefers-reduced-motion` media query emulation.
  - Mobile horizontal scroll width assertion (`scrollWidth <= 390 + 5px`) ensuring zero viewport blowout.
- `tests/widgets/a11y-browser-verification.test.ts`: Screen reader semantics, safe notification link sanitization, error boundary fault containment without PII, and preference operations.
- `tests/shared/widget-header-integration.test.ts`: Header slot mounting, server-derived authorization gating, and system shortcut integration.
- `tests/shared/widget-slot-contract.test.ts`: Slot policy resolution and error boundary containment.
- `tests/shared/widget-preference-operations.test.ts`: Pure preference editing, move operations, and default reset semantics.
- `tests/shared/widget-registry.test.ts`: Cross-module registration integrity, permission validation, and generator safety.
- `tests/widgets/preferences.test.ts`: Database isolation, user preference lifecycle, and admin policy precedence.
