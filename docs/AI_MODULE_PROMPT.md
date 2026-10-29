# Verein ERP — Harici AI için Modül İstemi

> Kurallar ve gerekçeleri: [`MODULE_DEVELOPMENT_GUIDE.md`](MODULE_DEVELOPMENT_GUIDE.md) (tek kaynak).
> Bu dosya yalnızca depoya **erişimi olmayan** bir AI'ya (web sohbeti) verilecek istemdir.

**Önerilen yol:** Önce `pnpm module:create <anahtar> "<TR ad>" "<DE ad>"` ile çalışan iskeleti üret,
ardından AI'ya iskeletin dosyalarını da yapıştırıp "bunu şu alanlarla genişlet" de. AI sıfırdan
yazacaksa aşağıdaki istemi kullan.

---

## Kopyala-yapıştır istem

```markdown
Sen Verein ERP (Next.js 16 App Router, React 19, TypeScript, Prisma 6, HeroUI v2, next-intl)
için üretim kalitesinde modül yazan bir mühendissin. `<ANAHTAR>` modülünü yaz: <işlevi kısaca anlat>.

KURALLAR (her biri CI'da otomatik denetlenir):
1. Tüm dosyalar `src/modules/<ANAHTAR>/` altında. `src/app`, `src/registry.ts`, `prisma/schema/*`,
   kök `messages/*.json` dosyalarına DOKUNMA (köprüleri `pnpm module:sync` üretir).
2. Başka modüller yalnızca `@/modules/<m>`, `@/modules/<m>/server`, `@/modules/<m>/ui` üzerinden.
3. `views/*.tsx` ve `page.tsx` sunucu bileşenidir: "use client" YOK, hook YOK, `@heroui/react` YOK.
   HeroUI yalnızca ilk satırı `"use client";` olan `components/*.tsx` dosyalarında.
   "use client" / "use server" DAİMA dosyanın ilk satırıdır.
4. Arayüzde SABİT METİN YOK. Her metin `messages/tr.json` ve `messages/de.json` içinde, iki dosya
   aynı anahtarlarla. Zorunlu: `nav.<ANAHTAR>`, `module.label`, `module.description`, `meta.list`,
   her menü öğesi için `menu.<key>`. Almanca gerçek Almanca olmalı (Türkçenin kopyası değil).
5. Zod ve ActionError mesajları çeviri ANAHTARIDIR: `"<ANAHTAR>.validation.titleRequired"`,
   `throw new ActionError("<ANAHTAR>.errors.notFound")`. Enum etiketleri kodda değil, mesajlarda.
   Mesaj içinde `<...>` açılı ayraç kullanma.
6. Formlar sağ çekmecede açılır: liste sayfası `?yeni` ve `?duzenle=<id>` parametrelerini okuyup
   `<FormDrawer title description>` içinde formu render eder. Yardımcılar
   `@/shared/components/forms/form-drawer`: FormDrawer, FormDrawerButton (param="yeni"),
   useFormDrawerHref, useFormDrawerClose, FormSurface. Silme onayı: `ConfirmDialog`
   (`@/shared/components/ui/confirm-dialog`).
7. Mutasyonlar `createAction({ permission: { definition, action }, schema, handler: async ({ input, user, audit }) => ... })`
   ile (`@/modules/auth/server`); her mutasyonda `audit({ action, entity, entityId, before?, after? })`.
8. Veritabanı: `import { getDb } from "@/shared/db"; const db = getDb();`. Tablolar `@@map("<ANAHTAR>_...")`.
   Başka modüle `@relation` yok; yumuşak referans (`memberId String?`).
9. Liste: `parseListParams` (`@/shared/list-params`) + `DataTable` (`@/shared/components/data-table/data-table`).
   Sayfa başlığı `PageHeader` (`@/shared/components/ui/page-header`); başlıkta yalnızca ana "Yeni" butonu.
   Alt sayfalar ve dışa aktarma `module.config.ts → menu`.
10. `page.tsx` başlığı `generateMetadata` + `getTranslations("<ANAHTAR>.meta")` ile.
11. `permissions.ts` 6 rolün tamamını içerir: ADMIN, BOARD, SECRETARY, TREASURER, AUDITOR, VIEWER
    (`definePermissions` — `@/shared/permissions/define`).
12. `any` yok; `catch (error)` + `error instanceof Error`. Render sırasında `Date.now()` yok.
    Liste satırlarında HeroUI Select yerine native `<select>`.

ÜRETECEĞİN DOSYALAR (tam yol + eksiksiz kod, TODO bırakma):
module.config.ts, permissions.ts, schema.prisma, types.ts, index.ts, server.ts ("server-only"), ui.ts,
page.tsx, messages/tr.json, messages/de.json, schemas/item-schema.ts, queries/list-items.ts,
actions/item-actions.ts ("use server"), components/item-form.tsx, components/item-table.tsx,
views/item-list-view.tsx, views/item-create-view.tsx, views/item-edit-view.tsx
(+ gereken alt sayfalar `routes/<yol>/page.tsx`, API'ler `api/<yol>/route.ts`).
```

---

## Kod geldikten sonra

```bash
pnpm module:sync
pnpm db:migrate --name add_<anahtar>
pnpm module:validate
pnpm exec tsx scripts/check-i18n-keys.ts && pnpm exec tsx scripts/check-hardcoded-text.ts
pnpm typecheck && pnpm lint && pnpm test
```

Bir adım kırmızıysa hata çıktısını AI'ya geri ver; kurallar çıktıda adıyla geçer.
