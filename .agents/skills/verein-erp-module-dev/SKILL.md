---
name: verein-erp-module-dev
description: End-to-end module development playbook for Verein ERP (Next.js 16 App Router, React 19, TypeScript, Prisma 7, next-intl, ERP UI Platform). Use whenever creating a new module, extending an existing module, adding schema/migrations/permissions/routes/APIs/UI/i18n, or integrating extension points (dashboard cards, AI v2 tools, automation tasks/events, widgets, notifications, secretary, calendar, compliance, campaign channels, formats, demo data, lifecycle/GDPR erasure, OAuth providers). Triggers on "yeni modül", "modül geliştir", "modül ekle", "create module", "module:create", "module:sync", "module:validate", "src/modules", "extension point", or any work inside Verein ERP modules.
metadata:
  author: verein-erp
  version: "1.0.0"
---

# Verein ERP — Modül Geliştirme Playbook'u

Bu skill, Verein ERP kod tabanında (`akgngr/verein-erp`) çekirdeğe dokunmadan (**zero-touch**), tüm ESLint / doğrulayıcı / test / CI kapılarından tek seferde geçen üretim kalitesinde modül geliştirmenin eksiksiz sürecini tanımlar.

> **Detaylı referanslar (gerektiğinde `get_skill_resources` veya dosya okuyarak yükle):**
> - `references/architecture-and-files.md` — Klasör anatomisi, `module.config.ts`, `nav.json`, `permissions.ts`, `schema.prisma`, `DATA_POLICY`, 18 otomatik registry, cross-module `access` kuralları, `public/` rotaları.
> - `references/ui-forms-tables-i18n.md` — W6 UI kilidi (`@/shared/components/kit`, `fields`, `forms`, `ui`), RSC sınırı, `FormDrawer`, `DataTable` + bulk actions, PDF/dosya/para/tarih yardımcıları, TR/DE i18n ve `check-hardcoded-text` kuralları.
> - `references/extension-points.md` — 15 sıfır-dokunuş eklenti sözleşmesi (`cards`, `ai.ts` v2, `automation.ts`, `lifecycle.ts`, `demo.ts`, `widget.ts`, `secretary.ts`, `notifications.ts`, `calendar.ts`, `calendar-sync.ts`, `channels.ts`, `recipients.ts`, `formats.ts`, `compliance.ts`, `auth-providers.ts`).
> - `references/verification-troubleshooting.md` — Tam CI doğrulama zinciri, offline migration, `.vmod` paketleme ve **Hata → Anında Çözüm** tablosu.

---

## 1. Adım Adım Modül Geliştirme Akışı (Sırayla Uygula)

### Adım 0 — Tasarım Kararlarını Netleştir
Başlamadan önce şu 6 soruyu cevapla:
1. **Anahtar & Kategori:** `key` yalnız küçük harf, rakam, tire (`/^[a-z][a-z0-9-]*$/`, örn. `sponsors`). Yeni modüller varsayılan `category: "EXTENSION"` (çekirdek dışı; `CORE` yalnız kilitli altyapı, `OFFICIAL` resmi dernek modülleri).
2. **Rota & Yerleşim:** Ana sayfa (`page.tsx` → `/<basePath>` veya ilk `nav.href`), alt sayfalar (`routes/<yol>/page.tsx`), API (`api/<yol>/route.ts`), oturumsuz sayfa (`public/<yol>/page.tsx`), veya sayfasız eklenti (headless). Sol menü grubu: `nav.json` (`association | finance | education | communication | operations`) veya ayar ekranı (`group: "settings"` / `menu[].key === "settings"`).
3. **Veri Modeli & Gizlilik:** Hangi Prisma tabloları eklenecek? Her modelin `src/shared/data-policy.ts` sınıfı (`K0 | K1 | K2 | K3`) ne? `userId` / `ownerId` alanı var mı (varsa silinme hakkı kararı zorunlu)?
4. **Yetkiler:** Hangi kaynaklar (`definePermissions`) ve kapsam izinleri (scope permissions) gerek? Yeni modül rolü (`roles`) gerekiyor mu?
5. **Modüller Arası Bağ:** Başka modülden veri/API/sayfa/paket kullanacak mı (`access`, `requires`, `recommends`, `dependencies`)?
6. **Eklenti Katkıları:** Panel kartı, AI v2 aracı, arka plan görevi/olayı, bildirim, takvim, sekreter, widget, demo verisi, yaşam döngüsü kancası gerekiyor mu?

### Adım 1 — İskeletle Başla (Önerilen En Güvenli Yol)
```bash
pnpm module:create <anahtar> "<Türkçe Ad>" "<Almanca Ad>"
```
Bu komut `src/modules/<anahtar>/` altında çalışan tam bir dikey dilim (liste, arama, filtre, sıralama, sayfalama, bulk action, sağ çekmece form, silme onayı, audit, TR/DE çeviriler, `releases.json`) üretir ve `module:sync` + `prisma generate` çalıştırır.
- Sayfasız (headless) eklentilerde (ör. yalnız `calendar-sync.ts`, `channels.ts`, `formats.ts`, `auth-providers.ts`) `page.tsx`/`views/`/`components/` kaldırılabilir; `nav: []` ve `basePath` yokken doğrulayıcı bunu headless eklenti olarak kabul eder.

### Adım 2 — Veritabanı Şeması ve Zorunlu `DATA_POLICY` Kaydı
1. `src/modules/<anahtar>/schema.prisma` dosyasına modelleri ekle (`module.config.ts` içinde `hasSchema: true`):
   - `EXTENSION` tabloları **mutlaka** `@@map("<anahtar_altcizgili>_...")` öneki taşır (tire → alt çizgi, örn. `campaign_sms_logs`).
   - Başka modülün tablosuna Prisma `@relation` **KURMA**; yumuşak referans (`memberId String?` + anlık etiket snapshot'ı) kullan.
2. **KRİTİK — `src/shared/data-policy.ts` Güncellemesi (Unutulursa `tests/shared/data-policy.test.ts` DÜŞER):**
   - `schema.prisma`'daki **her yeni model** için `DATA_POLICY` içine `{ owner: "<anahtar>", category: "K0"|"K1"|"K2"|"K3", reason: "...", sensitiveFields: [...] }` ekle.
   - Modelde `userId` veya `ownerId` varsa (`tests/shared/user-deletion.test.ts` ZORUNLU TUTAR):
     - Kişisel kullanıcı verisi ise: `personalOwnerField: "userId"` (veya `"ownerId"`) ekle **VE** `src/modules/<anahtar>/lifecycle.ts` içinde `onUserDeleted(userId)` kancasında `db.<model>.deleteMany({ where: { userId } })` çağır.
     - Kurumsal/yasal saklanan kayıt ise: `src/shared/data-policy.ts → USER_LINK_RETAINED` içine gerekçesiyle ekle.
3. **Migration Üret (`db push` YASAK):**
   ```bash
   pnpm db:migrate --name add_<anahtar>
   ```
   `validate-module.ts` her modelin `CREATE TABLE "<tablo>"` ifadesini `prisma/schema/migrations` içinde arar; CI `prisma migrate diff` ile şema-migration sapmasını reddeder. Ağ kısıtlı ortamda yerel PostgreSQL (Docker) kullan; elle SQL yazma.

### Adım 3 — Konfigürasyon, İzinler ve Public Giriş Noktaları
- `permissions.ts`: `definePermissions("<kaynak>", { ADMIN, BOARD, SECRETARY, TREASURER, AUDITOR, TAX_ADVISOR, TEACHER, VIEWER })` — tüm sistem rolleri + ilgili modül rolleri. Her kaynak için `messages/{tr,de}.json → permissions.<kaynak>.label` ve `.description` zorunlu.
- `module.config.ts`: `key` (klasör adıyla birebir aynı), `version` (`releases.json[0].version` ile aynı), `category`, `hasSchema`, `nav`, isteğe bağlı `menu`, `basePath`, `access`, `requires`, `recommends`, `roles`, `dependencies`, `license`.
- `nav.json` (ana menü modülleri için): `{ "categoryGroup": "association|finance|education|communication|operations", "order": 50 }` (alt modülse `"parentModule": "<ust-modul>"`).
- **3 Zorunlu Public Giriş Noktası:**
  - `index.ts`: İzomorfik (istemci+sunucu güvenli) — **`import "server-only"` YASAK!** `moduleConfig`, izinler, tipler, sabitler, şemalar buradan dışa aktarılır.
  - `server.ts`: İlk satırda `import "server-only";` — diğer modüllerin çağırabileceği sunucu sorgu/servis/action API'si.
  - `ui.ts`: Görünümler ve dışa açılan UI bileşenleri.

### Adım 4 — İş Mantığı, UI, Formlar, Tablolar ve Çeviriler
- `schemas/`: Zod şemaları; tüm hata mesajları çeviri anahtarı (`"<anahtar>.validation.<kural>"`).
- `queries/`: `import "server-only";`, `getDb()`, `ListParams` → `ListResult<Row>`, yeniden kullanılabilir `build<X>Where()`.
- `actions/`: İlk satır `"use server";`. Her mutasyon `createAction({ permission, schema, handler: async ({ input, user, audit }) => ... })` (`@/modules/auth/server`) ile yazılır; her mutasyonda PII içermeyen `audit(...)` kaydı atılır; hatalar `throw new ActionError("<anahtar>.errors.<kod>")`.
- `services/` & `helpers/`: Çok adımlı iş akışları, dışa aktarma, saf hesaplamalar.
- `components/`: İlk satır `"use client";`. Yalnız `@/shared/components/kit`, `@/shared/components/fields`, `@/shared/components/forms/*`, `@/shared/components/ui/*`, `@/shared/components/data-table/*`.
- `views/` & `page.tsx`: Sunucu bileşenleri (hook yok, `"use client"` yok, `@heroui/react` yok, compound kit alt bileşeni yok). `page.tsx` içinde `generateMetadata()` ile sayfa başlığı.
- `messages/tr.json` ve `messages/de.json`: Birebir aynı yaprak anahtarlar, gerçek Almanca çeviriler (Türkçe kopyası değil), `<...>` açılı ayraçsız geçerli ICU metinleri.

### Adım 5 — Ek Paketler ve Eklenti Katkıları (Varsa)
- Çekirdekte olmayan npm paketi gerekiyorsa kök `package.json`'a elle ekleme: `module.config.ts → dependencies` içine yaz ve `pnpm module:deps` çalıştır.
- İhtiyaç duyulan eklenti sözleşmelerini (`cards/index.tsx`, `ai.ts`, `automation.ts`, `lifecycle.ts`, `demo.ts`, `widget.ts`, `secretary.ts`, `notifications.ts`, `calendar.ts`, `channels.ts`, `recipients.ts`, `formats.ts`, `compliance.ts`, `auth-providers.ts`) `references/extension-points.md` şablonlarına göre ekle.

### Adım 6 — Sürüm Artışı (`releases.json`) ve Senkronizasyon
- Mevcut bir modülde **herhangi bir dosya** değiştiyse veya yeni modül eklendiyse:
  1. `releases.json` dizisinin **en üstüne** yeni sürüm ekle (`version`, `date: YYYY-MM-DD`, `title.tr/de`, `changes[{ type, tr, de }]`).
  2. `module.config.ts → version` değerini aynı sürüme güncelle.
- Senkronize et ve dokümantasyon modül kataloğunu güncelle:
  ```bash
  pnpm module:sync
  pnpm docs:modules
  ```
  `module:sync` tüm şemaları, çevirileri, 18 registry dosyasını, `nav-defaults.generated.ts` dosyasını ve `(dashboard)/(modules)`, `api/(modules)`, `(public)/(modules)` rota köprülerini otomatik üretir. `docs:modules` ise `website/docs/kullanim/moduller/` kataloğunu günceller (**unutulursa `tests/docs/module-docs.test.ts` DÜŞER**). **Üretilen dosyaların tamamı commit'lenmelidir** (CI `module:sync` sonrası `git diff --exit-code` bekler).

### Adım 7 — Eksiksiz Doğrulama Kapısı (Bitirmeden Önce Hepsi Yeşil Olmalı)
```bash
pnpm module:sync
pnpm docs:modules
pnpm exec prisma validate
pnpm module:validate
pnpm module:deps --check
pnpm exec tsx scripts/check-i18n-keys.ts
pnpm exec tsx scripts/check-hardcoded-text.ts
pnpm exec tsx scripts/check-module-versions.ts
pnpm typecheck
pnpm lint
pnpm test
```
Değişiklik genişse veya yeni rota/UI eklendiyse `pnpm build` (ve gerekirse `pnpm test:hydration`) ile son kontrolü yap.

---

## 2. Asla Çiğnenmemesi Gereken 18 Kırmızı Çizgi (CI/Test Kırıcılar)

Bu kuralların her biri ESLint, `validate-module.ts` veya `tests/**` tarafından otomatik denetlenir:

1. **Zero-Touch Kuralı (`tests/shared/zero-touch.test.ts`):** `src/app/` altına elle sayfa/API yazma; `src/*-registry.ts`, `src/dashboard-cards.ts`, `src/module-releases.ts`, `prisma/schema/*`, kök `messages/*.json`, `src/shared/navigation/nav-defaults.generated.ts` dosyalarını elle düzenleme. Hepsini `pnpm module:sync` üretir. *(İstisnalar: `src/shared/data-policy.ts` ve oturumsuz rota varsa `src/proxy.ts` matcher.)*
2. **W6 UI Kilidi (`eslint.config.mjs`, `tests/shared/ui-platform-contract.test.ts`):** `src/modules/**` içinde `@heroui/react` import veya re-export **KESİNLİKLE YASAK** (ESLint error + test fail). Tüm temel bileşenleri `@/shared/components/kit`, `@/shared/components/fields`, `@/shared/components/forms/*`, `@/shared/components/ui/*` üzerinden al.
3. **RSC Alt Bileşen Tuzağı (`tests/shared/ui-platform-contract.test.ts`):** `"use client"` olmayan (sunucu) `.tsx` dosyalarında `<Card.Header>`, `<Tabs.Tab>`, `<Table.*>`, `<Dialog.*>`, `<Sheet.*>`, `<Select.*>`, `<ComboBox.*>`, `<Dropdown.*>` **YAZMA** (çalışma anında çöker). Sunucu bileşenlerinde ayrı export'ları (`CardHeader`, `CardContent`, `CardFooter`) veya `components/` altındaki istemci bileşenlerini kullan.
4. **Direktif Konumu (`tests/shared/directives.test.ts`):** `"use client";` ve `"use server";` daima dosyanın **1. satırı** olmalıdır (önünde yorum/import olamaz).
5. **API Link Yasağı (`eslint.config.mjs`, `tests/shared/pdf-and-export-links.test.ts`):** Next.js `<Link href="/api/...">` **YASAK** (RSC prefetch export/PDF endpoint'ini tetikler). İndirme bağlantıları için `<a href="/api/..." download>` veya `<LinkButton href="/api/..." download>` kullan; menüde `isDownload: true` ver.
6. **PDF Font Tek Nokta Kuralı (`tests/shared/pdf-and-export-links.test.ts`):** Modüllerde `Font.register(...)` çağrısı **YASAK**. Daima `registerSharedPdfFonts()` (`@/shared/pdf/fonts`) kullan. Genel dosya üretimi için `exports` modülünün `createGeneratedFile` servisini tercih et.
7. **`DATA_POLICY` & Silinme Hakkı (`tests/shared/data-policy.test.ts`, `tests/shared/user-deletion.test.ts`):** Her yeni Prisma modeli `src/shared/data-policy.ts → DATA_POLICY` içinde sınıflandırılır. `userId`/`ownerId` kolonu olan her model ya `personalOwnerField` + `lifecycle.ts → onUserDeleted` (`deleteMany`), ya da `USER_LINK_RETAINED` gerekçesi alır.
8. **Katı Modül Sınırları (`tests/modules/module-boundaries.test.ts`, `validate-module.ts`, `eslint.config.mjs`):**
   - Başka modülün iç dosyasına import yasak; yalnız public girişler (`@/modules/<m>`, `/server`, `/ui`, `/automation`).
   - Başka modülün Prisma tablosuna `getDb().<model>` erişimi yasak.
   - Başka modülden **her** import, `/api/<m>/...` çağrısı veya `/<sayfa>` linki `module.config.ts` içinde bildirilmek **zorundadır** (`access`, `requires`, `recommends`, `menu[].module`) ve her `access` için `messages/{tr,de}.json → access.<m>` gerekçesi zorunludur. (`auth` altyapı olarak muaftır.)
9. **Rol Adı Kontrolü Yasağı (`validate-module.ts`):** `user.role === "ADMIN"` / `ROLES.includes(role)` yazmak **HATA**dır. Daima `can(user.role, permissions, action)` veya `requirePermission(...)` kullan; kapsam kuralları için ayrı izin kaynağı tanımla (örn. `coursesAll`).
10. **Sıfır Sabit Metin & Birebir TR/DE (`check-hardcoded-text.ts`, `check-i18n-keys.ts`):** Arayüzde, JSX'te, prop'larda, Zod'da ve `ActionError`'da düz metin yasak. TR ve DE dosyaları aynı anahtarlara sahip olmalı; ICU mesajlarında `<...>` açılı ayraç kullanma (`{degisken}` kullan). `page.tsx` sabit `metadata` değil `generateMetadata()` kullanır.
11. **Toast / Bildirim Standardı (`tests/shared/w1-notify-no-heroui-toast.test.ts`):** HeroUI toast değil `notify.success(...)` / `notify.error(...)` (`@/shared/components/ui/notify`) kullan.
12. **Form Çekmecesi & `zodResolver` Tipi:** Oluşturma/düzenleme formları ayrı sayfa/modal değil sağ çekmecede (`?yeni`, `?duzenle=<id>`, `?duzenle`) `FormDrawer` ile açılır. Şemada `z.preprocess` veya `.default()` varsa `resolver: zodResolver(schema) as unknown as Resolver<FormValues>` kullan.
13. **DataTable & Bulk Action Sözleşmesi (`tests/shared/ui-platform-contract.test.ts`):** Modül içinde `data-table.ts(x)` adlı dosya oluşturma; ortak `DataTable` kullan. Her `actions/bulk-*.ts` dosyası `createAction`, `permission`, `parseBulkSelection`, `allowedFilterKeys` ve `audit` içermek **zorundadır**.
14. **Dış Ağ İsteği & Egress (`validate-module.ts`, `tests/modules/egress-ledger.test.ts`):** Modül kodunda çıplak `fetch("https://...")` **YASAK**. İstemciden yalnız göreli `fetch("/api/...")`; dış API'lere yalnız sunucuda `channelFetch(allowedHosts, url)` (`@/shared/campaigns/channel`) veya `syncFetch(...)` (`@/shared/calendar/sync`) ile çık.
15. **AI v2 Tek Sözleşme (`tests/ai/ai-contract-v2-only.test.ts`):** `ai.ts` yalnız `defineModuleAiV2` + `aiToolV2` kullanır (v1 `defineModuleAi`/`aiTool` yasak). Her araç `src/shared/data-policy.ts → AI_TOOL_POLICY` içine `serverReads` + tam `modelFields` listesiyle eklenir. Yazma araçları yalnız `propose(...)` üretir, doğrudan yazmaz.
16. **Hydration, Tarih, Para, JSON Güvenliği:**
    - Render sırasında `Date.now()`, `new Date()`, `Math.random()`, `typeof window` kullanma; `useHydrated()` (`@/shared/hooks/use-hydrated`) ve `formatDate`/`formatDateTime` (`@/shared/utils`) kullan.
    - Para aritmetiği daima **integer cent** (`toCents`, `centsToDecimalString`, `formatMoney` — `@/shared/money`), asla float değil.
    - Kullanıcı etiketi: `buildUserLabel(user.name, user.email)` (`@/shared/utils` — 2 string alır, user nesnesi değil).
    - Prisma `Json` kolonlarına yazarken `JSON.parse(JSON.stringify(val))` ve `Prisma.JsonNull` / `Prisma.DbNull` kullan (`structuredClone` değil; `tests/shared/prisma-json-contract.test.ts`).
17. **Sürüm Artışı Kuralı (`scripts/check-module-versions.ts`):** Bir modül altında tek satır bile değiştiyse `releases.json` en üste yeni sürüm ekle ve `module.config.ts → version` ile eşitle.
18. **Test & Gizlilik:** `any` kullanma (`catch (error)` + `error instanceof Error`). Audit, worker log ve otomasyon payload'larına PII (e-posta, ad, telefon, IBAN, token) yazma.
