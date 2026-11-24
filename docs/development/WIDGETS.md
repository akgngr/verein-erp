# Widget extension contract

The CORE `widgets` module owns preferences and policy. The shared slot host owns placement and failure isolation. Each contributing module owns its widget data, UI, permissions and server actions. The header owns layout only.

## Add a widget

1. Create exactly `src/modules/<moduleId>/widget.ts` and export `widgets = defineModuleWidgets("<moduleId>", [...])` from `@/shared/widgets/registry`. A module without this file contributes no widgets.
2. Use an ID `<moduleId>.<widgetName>`, a stable translation `titleKey`, a supported size (`compact`, `inline`, `popover`), a default state and explicit `requiredPermissions`. Use `mandatory` only for controls that users must not hide; it never overrides server authorization or disabled modules.
3. Set `load: () => import("./widgets/<component>")` to a component owned by the same module. Keep `widget.ts` client-safe: no `server-only`, direct database reads, runtime filesystem scan or dynamic path from a preference. Server actions in the owning module re-check user, tenant and permission.
4. Run `pnpm module:sync` to regenerate `src/widget-registry.ts` and root translations. Do not edit generated files by hand. Run `pnpm module:validate`, `pnpm docs:modules`, typecheck, lint, i18n, hardcoded-text and focused tests. A module change requires `module.config.ts` version and bilingual `releases.json` entries.

The `defineModuleWidgets` validator checks ownership, duplicate IDs, slots, sizes, loaders and permission syntax. The build-time registry rejects cross-module duplicates. User preference stores only ID, enabled and order; it cannot supply executable code. Server-derived access takes priority over preference, even for mandatory widgets.

## Placement and size

`header.right` is accepted. It is horizontally scrollable and constrained to `30vw` desktop / `35vw` mobile. The type union reserves `header.left`, `header.center`, `sidebar.top`, `dashboard`, `footer`; do not mount them without a separate size/overflow, permission and accessibility review. Keep critical navigation and security controls outside optional widgets.

## Performance and privacy budgets

| Gate | Budget and evidence |
|---|---|
| Registry and denied widget | Zero component loader invocations and zero network requests before an authorized widget mounts. The test guards the build-time registry and denied resolver; the slot returns `null` before lazy render. |
| Policy resolution | 100 registered definitions resolved 200 times in under 1 second in CI after warmup (`widget-rollout-budget.test.ts`). This is a resolver budget, not a browser paint measurement. |
| Notification bell initial load | At most two authenticated read actions plus one same-origin SSE connection after mounting. It loads no data at registration. |
| Subsequent reads | Visible fallback poll no faster than every 30 seconds; with SSE active, safety poll no faster than every 90 seconds. Hidden tabs do not poll; unmount closes the stream and timers. |
| Failure and observability | Per-widget error boundary with localized fallback; never log exception payloads, identities, association data or secrets. The slot does not transmit to external endpoints. |

The renderer uses React lazy and a per-loader cache, Suspense fallback and isolated error boundary. Test keyboard, screen reader, reduced-motion, desktop/mobile overflow and hydration with the WP6 suite. A real authenticated browser session remains necessary for a release smoke check; the static suite does not establish cross-browser support by itself.
