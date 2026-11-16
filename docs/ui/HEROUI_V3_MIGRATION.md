# HeroUI v3 and the workspace theme

Application release: **0.41.0**. HeroUI is pinned to **3.2.7** through the canonical `@heroui/react` and `@heroui/styles` packages. All application controls now use native v3 APIs. The AI tool contract migration belongs to the other agent and is outside this change.

## Scope

- Dashboard, navigation, login/public forms and all module-specific interfaces use the same v3 components and application palette.
- Forms compose TextField/Input, Select/ListBox, ComboBox, DatePicker/Calendar, CheckboxGroup, RadioGroup and Switch. Controlled values, RHF focus refs, validation and existing server actions remain application contracts.
- Modals/drawers, tables, tabs, menus, tooltips, progress, sliders, badges and global toast notifications use native compounds. Copyable values use a localized application clipboard action.
- Both multiple-select lists declare multiple selection; date fields preserve date bounds and offer year navigation. The React Aria locale provider follows Turkish/German selection, and its router provider integrates library links with Next.js navigation.
- V2 dependencies, temporary v3 aliases, HeroUIProvider, ClientSelect and the v2 Tailwind plugin were removed. CSS owns the native v3 variables plus application ink/brand/status palettes. Unused framer-motion and next-themes dependencies were removed. The installation resolves 232 fewer packages than the mixed migration tree.

## Theme

A compact administration workspace inspired by commerce back offices: graphite navigation, warm neutral work surfaces, restrained green actions, thin borders, clear typography and less decorative shadow. Light/dark/system preferences, sidebar persistence, mobile navigation, permission-filtered routes and URL-driven filters/drawers remain intact.

The existing application ThemeProvider owns theme persistence and workflow editor appearance. Native CSS variables control field surfaces, borders, radii and semantic colors. Application action/status helpers express action intent and the additional violet status color; they are not wrappers implementing v2 controls.

## Release notes

Application release notes are in `src/modules/system/changelog.json` and are visible at `/ayarlar/surum-notlari`. Each of the 30 changed modules also has a version increment and Turkish/German release entry associated with application version 0.41.0. The generated module catalog is synchronized.

## Acceptance

The production hydration runner opens every static dashboard route and records hydration/page errors. With `HYDRATION_CAPTURE_DIR`, it also checks light/dark switching and persistence, desktop/mobile navigation, pagination/search/row menus, controlled input/select/switch/checkbox values, year/date selection, tabs and custom ComboBox text. Screenshots cover dashboard and members in both themes, forms, permissions and mobile layouts. Synthetic CI-only members exercise real table data. No form is submitted by these checks.

Typecheck, lint, translation validation, module validation, release/version checks, database migration/drift tests and the database-backed suite are required. Browser acceptance runs in CI because local Chromium cannot launch in this environment. Final CI results and screenshot review are recorded in the pull request; implementation alone is not browser acceptance.

The existing HeroUI client-boundary regression test now distinguishes erased type-only imports from runtime imports. No exemption remains for the deleted v2 Tailwind plugin. Existing unrelated Tiptap/auth peer warnings remain outside this migration.
