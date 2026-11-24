# ADR 0007 — Extensible Widget Platform

Status: accepted for `header.right` (WP1–WP6 merged; WP7 rollout verification pending)
Target: alpha
Owner: UI Platform / ChatGPT

## Context
Modules should contribute small UI elements without modifying the shared workspace header for each module. The notifications bell is the first planned consumer. The current header must remain functional when notifications are disabled or unavailable.

## Decision
- Introduce a typed, declarative widget contract in `src/shared/widgets/` with stable IDs `<module>.<widget>`, placements, sizes, permission requirements, and lazy-loaded components.
- Render widgets only through a shared UI Platform slot host. Modules declare widgets in the singular `src/modules/<moduleId>/widget.ts`; `pnpm module:sync` generates the trusted static `src/widget-registry.ts` at build time.
- Initial slot: `header.right`. Future slots `header.left`, `header.center`, `sidebar.top`, `dashboard`, `footer` require separate acceptance and layout policies.
- Users can enable/disable and reorder optional widgets. Preferences are tenant-scoped and user-scoped. Admin policy, module enablement and permission checks always override user preference.
- Preserve accessibility, keyboard navigation, reduced motion, mobile overflow, theme tokens and safe fallback on widget errors.
- A widget must not fetch data merely because it is registered; render-time loading is lazy and its network work must be bounded.
- No arbitrary remote JS, HTML or dynamic import paths from stored user preferences. Registry entries are build-time trusted code.
- Widget registration does not grant permissions or data access. Server actions re-check authorization and tenant boundaries.
- Critical navigation and security controls cannot be removed by user customization.
- Keep notifications business logic in the notifications module. Header owns only layout and slot mounting.

## Rollout
1. Typed contract, validation and tests; ADR/TODO.
2. Generator support, generated registry, permission-gated slot host.
3. Persist user ordering and visibility; settings UI and mobile behavior.
4. Adapt notifications bell and preferences; retire hardcoded header insertion.
5. Extend placements only after performance and accessibility checks.

## Compatibility
The header mounts the generated `header.right` slot on desktop and mobile. The notifications bell is contributed by `src/modules/notifications/widget.ts`; no fake bell or unread counts. Earlier direct-header work from #369/#378 is superseded by the registered consumer.

## Accepted implementation and rollout gates

WP1–WP6 (#435–#440) are closed on `alpha`; the source-of-truth checklist is `docs/TODO_WIDGET_PLATFORM.md`. `header.right` is the only accepted mounted slot. Other declared slot names are reserved, not approved for expansion. The widget guide at `docs/development/WIDGETS.md` defines the extension and network budgets. `tests/shared/widget-rollout-budget.test.ts` exercises resolver throughput, denied-load behavior, bounded notification polling and privacy-safe error paths. Release still requires final CI/Security/Docs checks and environment-specific browser verification; source-level tests do not prove every browser in the matrix.
