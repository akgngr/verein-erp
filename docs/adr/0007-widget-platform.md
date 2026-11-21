# ADR 0007 — Extensible Widget Platform

Status: proposed (implementation foundation)
Target: alpha
Owner: UI Platform / ChatGPT

## Context
Modules should contribute small UI elements without modifying the shared workspace header for each module. The notifications bell is the first planned consumer. The current header must remain functional when notifications are disabled or unavailable.

## Decision
- Introduce a typed, declarative widget contract in `src/shared/widgets/` with stable IDs `<module>.<widget>`, placements, sizes, permission requirements, and lazy-loaded components.
- Render widgets only through a shared UI Platform slot host. Modules declare widgets in `src/modules/<module>/widgets.ts`; generated registry is built by `module:sync` after the generator is extended.
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
Existing `WorkspaceHeader` stays unchanged until phase 2. No fake bell or unread counts. Notification PR #369 must be reconciled rather than duplicated.
