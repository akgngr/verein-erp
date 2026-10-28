# Verein ERP — Module Development Guide & External AI Specification
> **Version:** 2.1 (Standardized Architecture for External AI Agents & Independent Developers)  
> **Target Audience:** External AI Agents (ChatGPT, Claude web/chat, Gemini, Cursor, Windsurf) and Independent Software Engineers

This guide outlines the architectural standards, vertical slice directory structure, boilerplate templates, and copy-paste prompt specifications required to build and integrate a new module into **Verein ERP** with **zero-touch core** principles.

---

## 1. Core Architectural Principles

1. **Zero-Touch Core Architecture:**
   When developing a new module or removing an existing one, you must **NEVER MANUALLY EDIT** core application files (`src/registry.ts`, `prisma/schema/*`, `messages/*.json`). All registration, schema symlinking, and translation merging are automated via built-in sync scripts (`pnpm module:sync`).
2. **Vertical Slice Isolation:**
   A module encapsulates its own database models, business logic, RBAC permissions, i18n translations, UI components, and page views entirely inside `src/modules/<module_name>/`.
3. **Strict Public API Boundaries (`eslint.config.mjs`):**
   Internal directories of a module (`queries/`, `actions/`, `components/`, `views/`, `services/`) are **strictly private**. External consumers and other modules may only interface through three designated public export files:
   - `@/modules/<module>` (`index.ts` — Isomorphic types, Zod schemas, permissions, moduleConfig)
   - `@/modules/<module>/server` (`server.ts` — "server-only" queries, server actions, permission guards)
   - `@/modules/<module>/ui` (`ui.ts` — React client and server view components)
4. **Mac-Style Declarative Top Bar (`menu/top.json`):**
   Sub-pages, module-specific configurations, and export tools (e.g., Excel downloads) must be declared in `menu/top.json` rather than cluttering page bodies with redundant buttons. They render dynamically in the sleek global top bar.
5. **Page Header Action Area Separation:**
   - **Page Header Action Area (`PageHeader actions`):** Reserved EXCLUSIVELY for the primary CRUD button (`+ New Item`, `+ New Entry`).
   - **Tools, Reports, Sub-page Links, and Exports:** Belongs in `menu/top.json` and must NOT be duplicated as buttons inside the main page body.
6. **Strict Server Component (RSC) vs Client Component Segregation:**
   - **Views (`views/*-view.tsx`) and Pages (`page.tsx`) are strictly Server Components (RSC):** Never mark them with `"use client"`. Never use React hooks (`useState`, `useEffect`, `useRouter`), never define inline `"use server"` closures, and NEVER import `@heroui/react` in them (RSC lacks React Context and will fail build with `createContext is not a function`). Use plain Tailwind CSS for static badges and indicators.
   - **All Client Interactivity belongs in `components/*.tsx`:** Forms, modals, buttons with click handlers, pagination, and data tables must be placed in separate files inside `components/` with `"use client";` at the very top. `@heroui/react` is allowed ONLY in these client component files.
7. **Official Import Paths Table:**
   - Database Singleton: `import { getDb } from "@/shared/db";` -> `const db = getDb();` (NEVER use `@/shared/lib/prisma` or `new PrismaClient()`)
   - Server Permission Check: `import { requirePermission } from "@/shared/lib/permissions-service";`
   - Permissions Definition: `import { definePermissions } from "@/shared/types/permissions";`
   - Page Header: `import { PageHeader } from "@/shared/components/ui/page-header";`
   - Empty State: `import { EmptyState } from "@/shared/components/ui/empty-state";`
   - Data Table: `import { DataTable, DataTablePagination } from "@/shared/components/data-table";`
   - Module-Internal Imports: Use relative imports (`./` or `../`).
   - Other Modules: Only import through public entrypoints (`@/modules/<mod>`, `@/modules/<mod>/server`, `@/modules/<mod>/ui`). Never import `src/app` inside modules.

---

## 2. Complete Module Directory Tree

For an external developer or AI agent without terminal access, **you NEVER touch `src/app/` directly**. All module files, including the Next.js page, are created inside `src/modules/<module_name>/`. The project's `pnpm module:sync` tool discovers `page.tsx` and automatically manages the `src/app/(dashboard)/<module_name>/page.tsx` bridge:

```text
src/
└── modules/
    └── <module_name>/                       # e.g., inventory
        ├── page.tsx                         # [AUTO ROUTE] Module Next.js page (zero-touch to src/app!)
        ├── module.config.ts                 # Metadata, sidebar nav, permission scope
        ├── permissions.ts                  # Role-based access definitions via definePermissions
        ├── schema.prisma                   # Module Prisma models (additive schema)
        ├── index.ts                        # Isomorphic public API entry point
        ├── server.ts                       # Server-only public API entry point ("server-only")
        ├── ui.ts                           # UI components & views public API
        │
        ├── menu/
        │   └── top.json                    # [STANDARD] Topbar tools, tabs, and export links
        │
        ├── messages/
        │   ├── tr.json                     # Turkish translations
        │   └── de.json                     # German translations (Verein terminology)
        │
        ├── types/ (or types.ts)            # Internal TypeScript types and interfaces
        ├── constants.ts                    # Filter constants, sort keys, defaults
        │
        ├── schemas/                        # Zod validation schemas
        │   └── <module_name>-schema.ts     # Create / Update input validation
        │
        ├── queries/                        # Read-only database queries (RSC)
        │   └── list-<module_name>.ts       # Paginated, filtered query
        │
        ├── actions/                        # Server Actions ("use server" mutations)
        │   └── <module_name>-actions.ts    # Create, update, delete mutations
        │
        ├── components/                     # Module-specific React components ("use client")
        │   ├── <module_name>-table.tsx     # Data table component
        │   ├── <module_name>-form-modal.tsx# Create / Edit modal dialog (@heroui/react)
        │   └── <module_name>-create-modal.tsx# Modal wrapper handling ?action=new cleanup
        │
        └── views/                          # Page-level Server Component views (RSC)
            └── <module_name>-list-view.tsx # Primary list view (pure RSC, no "use client")
```

---

## 3. Step-by-Step File Specifications & Boilerplates

### 1. `module.config.ts` (Module Identity & Navigation)
```typescript
import { Package } from "lucide-react"; // Relevant Lucide icon
import type { ModuleConfig, TopNavItem } from "@/shared/types/module";
import { inventoryPermissions } from "./permissions";
import topNav from "./menu/top.json";

export const moduleConfig: ModuleConfig = {
  key: "inventory",                       // MUST match directory name exactly
  label: "Envanter",                      // Display label
  description: "Club asset and equipment inventory management.",
  category: "EXTENSION",                  // 'EXTENSION' for plugins; 'CORE' / 'OFFICIAL' for system
  hasSchema: true,                        // true if database models exist
  topNav: topNav as TopNavItem[],         // Topbar link array from menu/top.json
  nav: [
    {
      href: "/inventory",
      label: "Envanter",
      labelKey: "inventory",              // Resolves to nav.<key> in translation
      icon: Package,
      group: "main",                      // 'main' (sidebar) or 'settings'
      order: 10,
      permission: { definition: inventoryPermissions, action: "view" },
    },
  ],
};
```

---

### 2. `menu/top.json` (Mac-Style Topbar Navigation)
Declare sub-pages, secondary settings, and export utilities here instead of adding buttons to the page body:
```json
[
  {
    "key": "overview",
    "label": "Genel Bakış",
    "href": "/inventory",
    "icon": "LayoutGrid"
  },
  {
    "key": "categories",
    "label": "Kategoriler",
    "href": "/inventory/kategoriler",
    "icon": "FolderTree"
  },
  {
    "key": "export",
    "label": "Excel'e Aktar",
    "href": "/api/inventory/export",
    "icon": "FileSpreadsheet",
    "isDownload": true
  }
]
```
> **Rule:** `href` must start with a leading slash `/`. `icon` must be a valid PascalCase Lucide icon name.

---

### 3. `permissions.ts` (Comprehensive 6-Role Permission Matrix)
Verein ERP has 6 system roles. The permission matrix must cover all of them:
```typescript
import { definePermissions } from "@/shared/permissions/define";

export const inventoryPermissions = definePermissions("inventory", {
  ADMIN: ["view", "create", "update", "delete", "approve"],
  BOARD: ["view", "create", "update"],
  SECRETARY: ["view", "create", "update"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  VIEWER: ["view"],
});
```

---

### 4. `schema.prisma` (Database Models & Collision Prevention)
- To prevent database table collisions across modules, **ALWAYS** prefix table mappings with `@@map("<module_name>_...")`.
- Use **Soft References** (`memberId String?`) instead of hard foreign key relations (`@relation`) across module boundaries.

```prisma
model InventoryItem {
  id          String   @id @default(uuid())
  title       String
  category    String   @default("GENEL")
  quantity    Int      @default(1)
  location    String?
  notes       String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("inventory_items")
}
```

---

### 5. `messages/tr.json` and `messages/de.json` (Bilingual i18n Dictionaries)
Module translations are automatically merged under the `messages.<module_name>` namespace.

```json
// messages/tr.json
{
  "title": "Envanter ve Demirbaş",
  "description": "Dernek malzemeleri, demirbaşlar ve zimmet kayıtları.",
  "newItem": "Yeni Demirbaş",
  "emptyTitle": "Demirbaş kaydı bulunamadı",
  "emptyDescription": "Yeni bir demirbaş eklemek için butona tıklayın.",
  "fields": {
    "title": "Başlık",
    "category": "Kategori",
    "quantity": "Adet",
    "location": "Konum"
  }
}
```

```json
// messages/de.json
{
  "title": "Inventar & Sachmittel",
  "description": "Verwaltung von Vereinsinventar und Sachmitteln.",
  "newItem": "Neuer Eintrag",
  "emptyTitle": "Keine Einträge vorhanden",
  "emptyDescription": "Klicken Sie auf den Button, um das erste Inventar anzulegen.",
  "fields": {
    "title": "Titel",
    "category": "Kategorie",
    "quantity": "Anzahl",
    "location": "Standort"
  }
}
```

---

### 6. Public API Entry Points (`index.ts`, `server.ts`, `ui.ts`)

#### `index.ts` (Isomorphic — Client & Server)
> **CRITICAL:** `index.ts` must **NEVER** include `import "server-only"`. Only types, schemas, and `moduleConfig` may be exported.
```typescript
export { moduleConfig } from "./module.config";
export { inventoryPermissions } from "./permissions";
```

#### `server.ts` (Server Only)
```typescript
import "server-only";

export { inventoryPermissions } from "./permissions";
export { listInventoryItems } from "./queries/list-inventory";
export { createInventoryAction, deleteInventoryAction } from "./actions/inventory-actions";
```

#### `ui.ts` (UI Views & Components)
```typescript
export { InventoryListView } from "./views/inventory-list-view";
```

---

### 7. Module Page (`src/modules/<module_name>/page.tsx`)
> **Note:** The Next.js App Router bridge (`src/app/(dashboard)/<module_name>/page.tsx`) is generated automatically by `pnpm module:sync`. You implement the page directly inside `src/modules/<module_name>/page.tsx` and never touch `src/app/` manually.

```typescript
import { InventoryListView } from "./views/inventory-list-view";

export const metadata = {
  title: "Inventory — Verein ERP",
  description: "Club asset and equipment tracking.",
};

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <InventoryListView searchParams={searchParams} />;
}
```

---

### 8. UI, Tables, HeroUI & CRITICAL SSR / React 19 Rules

1. **Page Header Actions (`PageHeader actions`):** Keep this area clean. Only place the primary CRUD button (`+ New ...`) here.
2. **Data Tables:** Utilize `@/shared/components/data-table` (`DataTable`, `DataTablePagination`).
3. ⚠️ **HeroUI (`@heroui/react`) Boundary Rule:**
   - `@heroui/react` components (Modal, Button, Input, Textarea, Checkbox) **MUST ONLY BE USED inside Client Components (`components/*.tsx`)** marked with `"use client"`.
   - Never import `@heroui/react` (Chip, Progress, Button, etc.) inside Server Component views (`views/*-view.tsx` or `page.tsx`). In React 19 Server Components runtime, `React.createContext` is unavailable, causing Next.js build to crash with `TypeError: createContext is not a function`. Use standard Tailwind CSS classes for badges, status chips, and progress bars in Server Components.
4. ⚠️ **CRITICAL SSR HYDRATION RULE (React 19 / Next.js 16):**
   - Never use HeroUI's `<Select>` inside table row loops (`map`) or dynamic lists. HeroUI's Select relies on dynamic React Aria IDs that diverge between server and client during SSR, causing hydration mismatch console errors.
   - Instead, always use an accessible, styled native HTML `<select>` inside table cells:
   ```tsx
   <div className="relative inline-block w-full">
     <select
       value={item.status}
       onChange={(e) => updateStatus(item.id, e.target.value)}
       className="h-8 w-full appearance-none rounded-medium bg-default-100 px-2.5 pr-8 text-xs font-medium text-foreground transition-colors hover:bg-default-200 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer border border-transparent focus:border-primary/50"
     >
       <option value="ACTIVE">Active</option>
       <option value="PASSIVE">Passive</option>
     </select>
     <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-default-400" aria-hidden="true" />
   </div>
   ```
5. ⚠️ **URL-Based Modal & Server Action Boundary:**
   - Never pass inline server actions like `onClose={async () => { "use server"; }}` from a Server Component to a Client Component (Build error: `It is not allowed to define inline "use server" annotated Server Actions in Client Components`).
   - Use a dedicated `"use client"` wrapper (`components/<module>-create-modal.tsx`) that clears the URL search parameter (`?action=new`) via `useRouter`.
6. ⚠️ **Database Singleton Rule:**
   - Never import from `@/shared/lib/prisma` or call `new PrismaClient()`. Always use the project singleton:
     `import { getDb } from "@/shared/db";` -> `const db = getDb();`
7. ⚠️ **React 19 Purity Rule:**
   - Never call `Date.now()` or `new Date()` inside render bodies (`react-hooks/purity`). Derive date comparisons (`isPast`) in database queries (`queries/`).

---

## 4. Prompt Template for External AI Agents (Offline / Web Chat)

Copy and paste the exact prompt below to an external AI agent (e.g. ChatGPT, Claude web, etc.) that does not have terminal access to the repository:

```markdown
You are a senior full-stack Next.js 16 / TypeScript / Prisma engineer building production-grade extension modules for Verein ERP (a German club management ERP).
I want you to build a complete, standalone extension module named `<MODULE_NAME>` (e.g., `inventory`, `sponsors`, `events`).

ARCHITECTURAL PRINCIPLES & BOUNDARY RULES:
1. Vertical Slice Architecture: All module files and the page route must live inside `src/modules/<MODULE_NAME>/`. NEVER write files to `src/app/`.
2. Zero-Touch Core: Never touch or edit `src/registry.ts`, `prisma/schema/base.prisma`, `src/app/`, or root `messages/*.json`.
3. Strict Public Import Boundaries: Never import internal files of other modules (e.g. `@/modules/auth/queries/...`). Only use `@/modules/<module>`, `@/modules/<module>/server`, and `@/modules/<module>/ui`. Never import `@/app/...` inside a module.
4. Database Singleton Access: Never import `@/shared/lib/prisma` or instantiate `new PrismaClient()`. Always use:
   `import { getDb } from "@/shared/db";` -> `const db = getDb();`
5. Server Component (RSC) vs Client Component Boundaries:
   - `views/*-view.tsx` and `page.tsx` are async SERVER COMPONENTS (RSC). NEVER put `"use client"` on them!
   - Never write inline server actions (`onClose={async () => { "use server"; }}`) inside Server Components.
   - `@heroui/react` is a Client Component library. ONLY use it inside `"use client"` components (`components/*.tsx`). Never import `@heroui/react` into Server Component views (`views/*.tsx`) as it triggers `createContext is not a function` during Next.js build; use Tailwind CSS instead.
6. URL-Based Modal Pattern (`<MODULE_NAME>-create-modal.tsx`):
   - Wrap creation modals in a `"use client"` component (`components/<MODULE_NAME>-create-modal.tsx`) that uses `useRouter` to clear `?action=new` on close.
7. UI Action Separation: In `PageHeader actions`, include ONLY the primary creation button (`+ New ...`). Put secondary sub-pages, tools, and export links inside `menu/top.json`.
8. SSR Hydration & React 19 Purity:
   - Never use HeroUI's `<Select>` inside table cells or row mapping loops. Use a styled native HTML `<select>` with Lucide `<ChevronDown>`.
   - Never call `Date.now()` during render (`react-hooks/purity`). Derive timestamp comparisons in database queries.

FILES YOU MUST GENERATE:
Provide the FULL PATH and COMPLETE, FUNCTIONAL CODE for each of the following 16 files without placeholders or TODOs:

1. `src/modules/<MODULE_NAME>/module.config.ts`:
   - `key: "<MODULE_NAME>"`, `category: "EXTENSION"`, `hasSchema: true`, `topNav: topNav as TopNavItem[]`, `nav: [...]` (with Lucide icon).
2. `src/modules/<MODULE_NAME>/menu/top.json`:
   - Topbar navigation array (`key`, `label`, `href` [starting with '/'], `icon` [PascalCase Lucide icon name]).
3. `src/modules/<MODULE_NAME>/permissions.ts`:
   - `definePermissions("<MODULE_NAME>", { ADMIN: [...], BOARD: [...], SECRETARY: [...], TREASURER: [...], AUDITOR: [...], VIEWER: [...] })` covering all 6 roles.
4. `src/modules/<MODULE_NAME>/schema.prisma`:
   - Prisma models with `@@map("<MODULE_NAME>_...")` table names. Use soft references (`memberId String?`).
5. `src/modules/<MODULE_NAME>/messages/tr.json` & `src/modules/<MODULE_NAME>/messages/de.json`:
   - Complete Turkish and German translations for all labels, buttons, headers, and messages.
6. `src/modules/<MODULE_NAME>/index.ts`:
   - Isomorphic public API (`moduleConfig`, permissions, types). MUST NOT import "server-only".
7. `src/modules/<MODULE_NAME>/server.ts`:
   - Server public API (first line must be `import "server-only";`). Exports queries, actions, and permissions.
8. `src/modules/<MODULE_NAME>/ui.ts`:
   - UI public API exporting view components.
9. `src/modules/<MODULE_NAME>/schemas/<MODULE_NAME>-schema.ts`:
   - Zod validation schema for form inputs.
10. `src/modules/<MODULE_NAME>/queries/list-<MODULE_NAME>.ts`:
    - Prisma query function using `getDb()` supporting search, sorting, and pagination.
11. `src/modules/<MODULE_NAME>/actions/<MODULE_NAME>-actions.ts`:
    - `"use server"` mutations (create, update, delete) protected by `requirePermission`.
12. `src/modules/<MODULE_NAME>/components/<MODULE_NAME>-table.tsx`:
    - `"use client"` Data table using native styled `<select>` for any inline dropdowns.
13. `src/modules/<MODULE_NAME>/components/<MODULE_NAME>-form-modal.tsx`:
    - `"use client"` Create / Edit modal form using `@heroui/react` (Modal, Input, etc.).
14. `src/modules/<MODULE_NAME>/components/<MODULE_NAME>-create-modal.tsx`:
    - `"use client"` Modal wrapper that manages closing and cleans up `?action=new` from the URL.
15. `src/modules/<MODULE_NAME>/views/<MODULE_NAME>-list-view.tsx`:
    - Async Server Component (RSC). NO `"use client"`. Renders `PageHeader`, filters, stats cards, table, and create modal.
16. `src/modules/<MODULE_NAME>/page.tsx`:
    - Module Next.js Server Component page. NOTE: Do NOT touch `src/app`; `pnpm module:sync` creates the App Router route automatically.
```

---

## 5. Post-Generation Verification Steps (CLI Commands)

Once the files are saved into the repository, execute the following commands in the terminal:

```bash
# 1. Automatically link schema, translations, and module registry
pnpm module:sync

# 2. Validate module against architectural standards and boundary rules
pnpm module:validate <MODULE_NAME>

# 3. Verify TypeScript build and run unit tests
pnpm typecheck
pnpm test

# 4. Apply database migration
pnpm db:migrate
```
