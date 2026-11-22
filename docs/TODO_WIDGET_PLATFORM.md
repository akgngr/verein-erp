# Widget Platform — implementation checklist

## WP-0 Foundation
- [x] ADR and staged rollout
- [x] Typed widget contract and pure validation/resolution helpers
- [ ] Unit tests for duplicate IDs, invalid placement, permission filtering and stable order

## WP-1 Registry and renderer
- [ ] Extend `module:sync` to generate trusted `widget-registry.ts` from module widgets entrypoints
- [ ] Slot host with lazy loading, error isolation and loading fallback
- [ ] Permission and tenant/module gates (server-authoritative)
- [ ] Header right slot integration, desktop/mobile; no direct module import
- [ ] Shared UI kit, accessibility, hydration and reduced-motion tests

## WP-2 User configuration
- [ ] Persist tenant+user scoped enabled/order preferences; migration and defaults
- [ ] Settings screen with reorder, reset, enable/disable and mobile preview
- [ ] Mandatory widgets cannot be hidden; admin policy wins
- [ ] Optimistic save with rollback on errors and server-side validation

## WP-3 Notifications consumer
- [ ] Reconcile #369 and #378 with slot host; do not duplicate notification logic
- [ ] Real unread count, list, mark read, snooze and settings deep link
- [ ] No fake data; disabled notifications module means no bell
- [ ] Mobile, keyboard, screen reader and error-path coverage

## WP-4 Platform expansion
- [ ] Add slots only with explicit size/overflow contracts
- [ ] Performance budget and observability without personal data
- [ ] Document module development standard, bilingual releases where modules change
- [ ] Run quality, security, docs and module-version CI before merge

## Coordination
UI Platform owns the host and registry. Notifications owns bell data and behavior. Coordinate changes to `workspace-header.tsx` and notifications PRs #369/#378 before merging.


## Product-owner architecture update — 2026-11-21
- [ ] Create CORE `src/modules/widgets/` module as registry/configuration owner.
- [ ] Each module contributes widgets via its own singular `src/modules/<moduleId>/widget.ts`; modules without this file contribute none.
- [ ] Extend `pnpm module:sync` to discover and validate module-local `widget.ts` files at build time and generate a static trusted registry.
- [ ] Lazy-load trusted components from generated registry; never scan runtime filesystem or accept executable paths from preferences.
- [ ] Complete generic registry, header slot, tenant/user preferences and settings UI before integrating the notifications bell.
- [ ] Use an independent system widget to test the platform first.
- [ ] Migrate notification bell from #355 / PR #369 via `src/modules/notifications/widget.ts` in #439; never hardcode the bell in Header.
- [ ] Notification backend/channel work may continue independently.
- [ ] Follow dependency sequence: #435 -> (#436 and #437) -> #438 -> #439; #440 browser checks and #441 final rollout.
