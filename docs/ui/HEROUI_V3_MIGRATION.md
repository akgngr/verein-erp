# HeroUI v3 and the workspace theme

Status: **first migration slice; v2 removal is not complete**. Based on main after #166. AI tool contract migration belongs to the other agent and is outside this change.

## Direction

A compact administration workspace inspired by commerce back offices: charcoal navigation, warm neutral work surfaces, restrained green actions, thin borders, clear typography, and less decorative shadow. Existing Turkish/German translations, permission-filtered navigation, light/dark/system preferences, sidebar collapse cookie, URL-based filters and form drawers remain the application contracts.

## Native v3 components in this slice

- Desktop and mobile navigation, account menu and appearance menu.
- Shared DataTable, sorting indicators, row action menu, search/filter popover, and pagination with first/last destinations.
- RHF text, textarea, password, select and switch fields; native input/trigger refs for focus; field descriptions and validation errors.
- Shared URL-driven FormDrawer, form surface, submit action and confirmation dialog.
- Shared route actions, PDF language menu, dashboard editing actions and chips.

Dependencies are pinned to HeroUI **3.2.7** under `@heroui-v3/react` and `@heroui-v3/styles`, following the official [incremental migration](https://heroui.com/en/docs/react/migration/incremental-migration). v2's plugin/provider remain while module-specific components still import v2. Temporary costs: both runtimes/styles are bundled; type and CSS conflicts need acceptance checks. This is not a compatibility implementation of v2 controls on top of v3.

Application action helpers keep their existing semantic `color`/`variant` inputs and translate them to v3 button variants centrally. Direct v3 component uses follow the v3 API. The custom application ThemeProvider continues to own the existing `theme` and workflow editor preferences.

## Remaining migration order

- [ ] Shared date picker and date range filter, including month/year navigation and locale verification.
- [ ] Existing ClientSelect callers, country/state controls, role chips and global toast API/provider.
- [ ] Module-specific modals, drawers, selects, checkboxes, tabs, tables and action buttons.
- [ ] Login/public forms and remaining special controls (autocomplete, progress, snippet replacements).
- [ ] Remove v2 imports/dependencies/provider/Tailwind plugin; replace alias imports with canonical v3 package names.
- [ ] Remove v2-specific token/slot overrides after their last consumer moves; measure the production bundle.

Inventory commands (mixed files can import both versions during migration):

```sh
rg -l 'from "@heroui/react"' src
rg -l 'from "@heroui-v3/react"' src
```

## Acceptance

`HYDRATION_CAPTURE_DIR` enables additional acceptance in the existing production hydration runner. CI opens every static dashboard route, then checks light/dark switching and persistence, sidebar collapse/expand, controlled member form input/select/switch, URL drawer close, mobile overflow, mobile navigation/Escape and mobile appearance switching. It saves screenshots as the five-day `theme-preview` artifact. It never screenshots the credential page and does not submit the sample member.

Typecheck, lint, translation checks, module validation and the DB-backed suite must pass. Actual browser checks and visual inspection must be recorded from CI before declaring this slice accepted. Local Chromium cannot launch in the current restricted environment; no local visual acceptance is claimed.

Local validation on the #166 base: 497 tests across 100 suites passed, none skipped; baseline upgrade and migration drift checks passed. Typecheck, lint, translation and module checks passed. Browser acceptance is pending CI. Existing Tiptap and auth/mail peer warnings are unchanged; no HeroUI peer conflict was reported.

The first CI browser run opened all static routes and captured dashboard/member light/dark screenshots. It caught duplicate interactive tooltip roles; native v3 buttons now act directly as tooltip triggers, while collapsed navigation forwards trigger props to the actual anchor. The follow-up adds twelve synthetic CI-only members to exercise pagination, debounced search and row menus. Fixture seeding refuses any non-CI/non-loopback/non-`verein_ci` database.
