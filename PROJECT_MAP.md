# PROJECT MAP — Dernek Yönetim Sistemi (Almanya Verein)

> **Bu dosya ne işe yarar:** Her yeni özellik talebinde projeyi baştan taramak yerine
> bu haritadan doğrudan ilgili dosyalara gidilir. **Güncelleme protokolü:** her task
> bitiminde (worklog Task kaydıyla birlikte) etkilenen bölüm burada da güncellenir.
> Son güncelleme: Task 13 (2026-10-27).

---

## 1. Teknoloji yığını

| Katman | Teknoloji |
|---|---|
| Framework | Next.js 16.4.3 (App Router, Turbopack, `src/proxy.ts` = middleware rolü) |
| UI | HeroUI (react-aria) + Tailwind + lucide-react ikonları |
| Veritabanı | PostgreSQL 17.6 (userspace) + Prisma ORM |
| Auth | next-auth v5 (JWT) + bcrypt; oturum çerezleri `requireUser()` ile okunur |
| i18n | next-intl 4.x **non-routing** (NEXT_LOCALE cookie; `src/i18n/request.ts` default export) |
| Paket | bun (dev: `bun dev`, port 3000) |

## 2. Dizin haritası

```
src/
├── proxy.ts                      # middleware (auth yönlendirme; ?pasif=1 döngü kırıcı)
├── registry.ts                   # TÜM modüllerin moduleConfig listesi → sidebar + erişim
├── heroui.ts                     # HeroUI plugin yapılandırması
├── i18n/
│   ├── config.ts                 # Locale, SUPPORTED_LOCALES, LOCALE_LABELS, toLocale()
│   └── request.ts                # getRequestConfig (default export!) — cookie → messages
├── app/
│   ├── layout.tsx                # kök: getLocale/getMessages/Timezone → NextIntlClientProvider
│   ├── providers.tsx             # HeroUIProvider(locale, navigate) → ThemeProvider
│   ├── globals.css
│   ├── (auth)/giris/             # login; ?pasif=1 bilgilendirmesi
│   ├── (dashboard)/
│   │   ├── layout.tsx            # requireUser → SidebarProvider + DesktopSidebar/MobileSidebar
│   │   ├── _components/          # sidebar.tsx (collapse+footer), user-menu.tsx, theme-toggle.tsx
│   │   ├── page.tsx              # Panel (dashboard)
│   │   ├── evrak/                # documents modülü sayfaları (page.tsx = server view çağırır)
│   │   ├── toplantilar/          # meetings
│   │   ├── uyeler/               # members
│   │   ├── ayarlar/kullanicilar/ # users
│   │   ├── ayarlar/dernek/       # organization (form + logo + salt-okunur görünüm)
│   │   ├── profil/               # kendi profili
│   ├── api/                      # Route Handlers: documents (files/export), meetings (minutes-pdf ?lang=), organization (logo GET/POST/DELETE), health
├── modules/
│   ├── auth/        # actions (login, set-locale), services/session, server.ts (requireUser, requirePermission)
│   ├── documents/   # evrak — bkz. §5 modül anatomisi
│   ├── meetings/    # toplantılar + tutanak (PDF, MINUTES_STRINGS de/tr)
│   ├── members/     # üyeler (Almanya pivotu: kimlikNo serbest, Alman adres)
│   ├── users/       # kullanıcı yönetimi
│   ├── audit/       # denetim kaydı (kimlikNo audit'e YAZILMAZ)
│   └── organization/ # dernek ana verileri (singleton) + logo; PDF antetinin veri kaynağı
├── shared/
│   ├── components/
│   │   ├── data-table/          # DataTable + Toolbar + Pagination + useListQueryState (+idPrefix KARARI)
│   │   ├── ui/                  # PageHeader, ConfirmDialog, AccessDenied, LinkButton, pdf-split-button
│   │   ├── theme-provider.tsx   # ÖZEL tema sağlayıcı (useSyncExternalStore; next-themes KALDIRILDI)
│   │   └── forms/
│   ├── permissions/define.ts    # can(role, definition, action)
│   ├── files/file-types.ts      # INLINE_PREVIEW_EXTENSIONS (pdf/jpg/png)
│   ├── pdf/                     # letterhead.tsx (antet+logo), i18n.ts (resolvePdfLang), format.ts (tarih/para), money.ts (toCents)
│   ├── list-params.ts           # parseListParams (q/sort/dir/page/filter.*)
│   ├── roles.ts                 # Role + ROLE_LABELS + ROLE_COLORS (6 rol)
│   ├── audit/, security/, db.ts, env.ts, utils.ts
└── types/                        # next-auth tip genişletmeleri (Session.user.locale)

prisma/schema/    # base, auth, documents, meetings, members, organization, audit → tek şemaya derlenir
prisma/seed.ts    # idempotent demo veri (5 üye, Alman adresli; DEMO_USERS=1 → 5 rol kullanıcısı)
messages/         # tr.json, de.json (tüm modüller + organization + pdfLanguage)
worklog.md        # zamana dayalı iş kayıtları (Task ID'ler) — her oturumda İLK okunur
PROJECT_MAP.md    # BU DOSYA — mekânsal harita
```

## 3. Mimari akış (graph)

```mermaid
flowchart LR
  B[Tarayıcı] -->|HTTP| P[src/proxy.ts<br/>auth gate]
  P --> RSC[app/(dashboard)/page.tsx<br/>server view çağırır]
  RSC --> V[modules/*/views/*-view.tsx<br/>RSC: veri çeker]
  V --> C[modules/*/components/*.tsx<br/>client: tablo/form/modal]
  C -->|server action| A[modules/*/actions/*.ts<br/>zod + requirePermission]
  A --> S[modules/*/services/*.ts<br/>iş mantığı]
  S --> PR[prisma client] --> DB[(PostgreSQL)]
  V --> Q[modules/*/queries/*.ts<br/>list/detail/stats]
  Q --> PR
  R[registry.ts] --> SB[sidebar.tsx<br/>nav + can() filtresi]
```

Kritik bağlantılar:
- **Sayfa → view:** `app/(dashboard)/evrak/page.tsx` yalnızca `DocumentListView` çağırır (kalıp: sayfa dosyası ince, iş modülde).
- **Nav:** `src/registry.ts` → `moduleConfig.nav[]` (NavItem: href/label/icon/group/order/permission). Yeni sayfa = registry nav öğesi + `(dashboard)` altına route.
- **Yetki:** her action `requirePermission(<modul>Permissions, "create|update|delete|view")` ile açılır; view'da `can()` ile buton gizlenir.

## 4. Yeni özellik ekleme tarifleri

### 4a. Yeni modül (örn. "Finans") — kalıp: documents modülü
1. `prisma/schema/<modul>.prisma` model + `bunx prisma migrate dev --name add_x` (schema/ altındaki parça dosyalar tek şemaya derlenir)
2. `src/modules/<modul>/`: `permissions.ts`, `types.ts`, `constants.ts`, `schemas/` (zod), `queries/` (list/get/stats), `actions/` (create/update/delete; hepsi zod + requirePermission + audit), `components/`, `views/`, `module.config.ts`, `index.ts`
3. `src/registry.ts`'e moduleConfig ekle (nav etiketleri şimdilik TR hardcoded — i18n devri açık)
4. `src/app/(dashboard)/<modul>/page.tsx` → view çağırır
5. Listeyse paylaşılan `DataTable` kullan (columns + filters + renderToolbar)

### 4b. Mevcut listeye yeni filtre/kolon
- Filtre: `list-params.ts` filterKeys'e ekle → query'de where'e işle → `*Toolbar`/`DataTableToolbar`'a kontrol ekle (react-aria kontrolüne **sabit id** ver: `id={`${idPrefix}-filter-x`}` → hydration KARARI, §6)
- Kolon: view'da `listDocuments` select'ine alan → `DocumentRow` tipi → `columns[]`'a ekle

### 4c. Yeni dosya davranışı (önizleme/indirme)
- İçerik türü kısıtı: `src/shared/files/file-types.ts` (`INLINE_PREVIEW_EXTENSIONS`)
- API: `src/app/api/documents/files/[id]/route.ts` — `?inline=1` yalnızca izinli uzantılarda
- Modal: `modules/documents/components/file-list.tsx` (pdf→iframe, görsel→img; next/image YASAK — auth çerezi taşınmaz, §6)

### 4d. Sidebar/header UI
- `src/app/(dashboard)/_components/sidebar.tsx`: collapse durumu `useSyncExternalStore` + localStorage (`dernek.sidebar-collapsed`); tema + kullanıcı menüsü `SidebarFooter`'da (Topbar kalktı, header yalnızca mobil tetikleyici)
- Daraltılmış mod: sadece ikon (`title`/`aria-label` ile etiket korunur), UserMenu `compact` prop

## 5. Modül anatomisi (documents örneği — hepsi aynı kalıpta)

```
src/modules/documents/
├── permissions.ts         # documentsPermissions + categoriesPermissions (grants: ADMIN/BOARD/...)
├── module.config.ts       # nav + modül meta → registry
├── index.ts / server.ts   # public girişler (eslint no-restricted-imports koruması)
├── constants.ts           # STATUS_FILTER_OPTIONS, SUBJECT_TRUNCATE_LENGTH
├── utils.ts               # berlinToday, berlinMonthRange (date-only, Europe/Berlin)
├── schemas/               # zod şemaları (action girişleri)
├── queries/               # list-documents, get-document, list-categories, get-document-stats
├── actions/               # create/update/delete-document, delete-file, add-note, change-status, category-actions
├── services/              # dosya kaydetme, numara üretimi vb.
├── handlers/              # API route yardımcıları
├── components/            # DocumentTable(client), DocumentToolbar, FileList, StatusBadge, ...
└── views/                 # DocumentListView(RSC), document-detail-view, create/edit-view
```

## 6. Kritik KARAR'lar (bozulmaması gerekenler)

1. **react-aria hydration (React DOM 19.2+ useId hatası, facebook/react#35399):** HeroUI Select/Dropdown vb. kontrollere **deterministik id** ver (`idPrefix` kalıbı — bkz. `data-table-toolbar.tsx` başındaki yorum). Yeni react-aria kontrolünde uyarı görülürse aynı deseni uygula.
2. **HeroUI `Card` RSC'de kullanılmaz** (createContext hatası) — server view'da düz div; Card/modal yalnızca client bileşende.
3. **Tema:** `src/shared/components/theme-provider.tsx` (özel, useSyncExternalStore). next-themes geri gelmez (React 19 "script tag" hatası). FOUC: root layout'ta `THEME_INIT_SCRIPT` beforeInteractive.
4. **i18n non-routing:** `NEXT_LOCALE` cookie; dil değişimi `setLocaleAction` (DB User.locale + cookie + `unstable_update`) → `router.refresh()`. `request.ts` **default export** olmalı. Eksik: evrak/toplantı/sidebar registry etiketleri hardcoded TR.
5. **Tarihler date-only, Europe/Berlin takvimi** (`berlinToday`); sorgu UTC gece yarısı evreni.
6. **Gizlilik:** VIEWER kimlikNo göremez (maskeleme); kimlikNo audit log'a yazılmaz.
7. **Dosya API'si auth'lu; next/image kullanma** (optimize edici çerezi taşımaz → 401). Önizleme `?inline=1` sadece pdf/jpg/png.
8. **Silme = soft delete** (denetim izlenebilir; kayıt numarası yeniden kullanılmaz).
9. **Üyelik numarası atomik:** MemberCounter upsert + P2002 retry (UYE-YYYY-0001).
10. **signOut:** redirect:false + client `router.push("/giris")` (vekil arkasında host sızıntısı yok).
11. **Dosya yolları:** tüm çıktılar `/home/z/my-project/` altında; üretilebilir scriptler `scripts/`'e yazılır (inline python -c yasak).
12. **next-intl anahtar çakışması:** aynı namespace'te bir anahtar HEM string HEM object olamaz (örn. documents.categories) — `t("categories")` INSUFFICIENT_PATH hatası verir. String gerekiyorsa ayrı anahtar kullan (örn. categoriesButton).
13. **react-aria DropdownItem:** startContent/description'lı her DropdownItem'a `textValue` ver — yoksa konsol "non-plain text contents" uyarıları üretilir.
14. **Toolbar filtre etiketleri:** filtre opsiyonlarının label'ları RSC'de `t(status.X)` ile üretilir; constants'taki TR LABELS yalnızca sunucu içi (audit/export) kullanım içindir. Excel export başlıkları hâlâ TR (devri açık).
15. **Metadata:** sayfa başlıkları `generateMetadata` + `meta` namespace (19 sayfa, scripts/i18n-metadata.py ile topluca çevrildi); root layout appName/appDescription da i18n'li.
16. **next-intl açı parantezi:** mesaj metninde `TOP-<yıl>` gibi açı parantezli örnekler ICU etiketi sanılır → UNCLOSED_TAG sunucu hatası. Biçim açıklamaları parantezsiz yazılır ("TOP-YIL-SIRA biçiminde").
17. **PDF yerelleştirme (Faz 4, 4.3):** `resolvePdfLang(request)` + `MINUTES_STRINGS[lang]` sözlüğü (eksik çeviri DERLEME HATASI); varsayılan dil env `DOCUMENT_LANGUAGE` (de). Tüm PDF butonları `PdfSplitButton` kullanır (ana tıklama varsayılan dil, açılır menü `?lang=`). PDF dosya adı da dil izler (protokoll-/tutanak-).
18. **PDF antet (Letterhead):** `shared/pdf/letterhead.tsx` yapısal `LetterheadProfile` alır — shared modül import edemez; veriyi çağıran modül public giriş (`@/modules/organization/server`) üzerinden toplar (ESLint sınır kuralı public girişlere izin verir). Logo: PNG/JPG ≤2 MB, `UPLOAD_DIR/organization/<uuid>` + data URI ile react-pdf Image (objectFit contain, 84×56 pt).
19. **Modül içi scripts:** `scripts/test-minutes-pdf.tsx` `bun` ile çalıştırılır (tsx CJS'te top-level await + @react-pdf/hyphenate alt yolu çözümlenemedi).
20. **Prisma client değişince dev sunucusu ZORUNLU yeniden başlatılır** (eski client bellekten atılmaz — migrate deploy + generate yetmez; pkill next + start-dev-daemon.sh).
21. **Prisma migrate interaktif onay ortamda çalışmaz** (non-interactive): şema diff'i `bunx prisma migrate diff --from-schema-datasource prisma/schema --to-schema-datamodel prisma/schema --script` ile üretilir; migration klasörü elle kurulur (enum değişimlerinde SQL elle düzenlenir: ALTER TYPE … RENAME VALUE) ve `migrate deploy` uygulanır.
22. **RSC → Client bileşene FONKSİYON prop geçilemez** ("Functions cannot be passed directly to Client Components") — etiket verisi RSC'de string olarak hazırlanır (year-closing lockedByFormatted kalıbı).
23. **Ortak PDF font kaydı:** yeni PDF modülleri `shared/pdf/fonts.ts` (registerSharedPdfFonts) kullanır; font dosyaları `src/shared/pdf/fonts/` (NotoSans OFL). Her yeni PDF rotası next.config `outputFileTracingIncludes`'a eklenir.
24. **Aidat/muhasebe DB koruması:** AccountingBooking/File DELETE engelli; fişte bookingNumber/year/sequence/createdAt değişmez (trigger'lar). MemberPayment silme action'ı YOK (yalnız void).
25. **Muhasebe aritmetiği:** tüm tutarlar integer cent (shared/money.ts); Decimal(12,2) yalnız kalıcılık; raporlar tek servis (report-builders) — ekran/Excel/PDF aynı sayıları gösterir.
26. **Fiş metni gizliliği:** muhasebe fişlerinde üye NUMARASI (ad asla); audit'te description/counterparty içeriği yazılmaz; Kassenminus CASH hesapta DB-öncesi servis katmanında zorlanır.
27. **Şema değişikliği YALNIZCA migration ile (A-1):** `pnpm db:migrate --name <x>` → migration klasörü commit'lenir; sunucuda `pnpm db:deploy` (migrate deploy + `scripts/verify-db-integrity.mjs`). `prisma db push` YASAK — migration kaydı üretmez ve değişmezlik trigger'larını (AuditLog, AccountingBooking, Donation, ZuwendungConfirmation…) KURMAZ. Yerel deneme için yalnızca `pnpm db:push:dev` (üretimde reddeder). Push ile kurulmuş veritabanı: `pnpm db:baseline -- --yes` (bkz. docs/operations/MIGRATION_BASELINE.md). `module:validate`, migration'ı olmayan tabloyu HATA sayar. Docker konteyneri doğrulama başarısızsa başlamaz.
28. **Server Actions yalnızca aynı kaynaktan (A-2):** `next.config.ts` izinli kaynak listeleri boştur; ek kaynak gerekiyorsa `SERVER_ACTIONS_ALLOWED_ORIGINS` (derleme anında okunur). Caddyfile yalnızca uygulamaya yönlendirir (`APP_DOMAIN`, `APP_UPSTREAM`); sorgu parametresiyle iç porta yönlendirme kuralı kaldırıldı ve geri eklenmez.

## 7. i18n durum haritası

| Yüzey | Durum |
|---|---|
| Sidebar (nav registry + brand + ayarlar grubu), tema/kullanıcı menüsü | t() bağlı (nav/sidebar) |
| Panel sayfası | t() bağlı (panel) |
| Üyeler modülü | t() bağlı (members) — tam |
| Evrak modülü | t() bağlı (documents) — tam (Excel export başlıkları hariç) |
| Sayfa başlıkları (metadata) | t() bağlı (meta, 19 sayfa) |
| Shared DataTable (toolbar/pagination) | t() bağlı (common) — tüm modül listeleri otomatik |
| Toplantılar modülü | t() bağlı (meetings) — tam; PDF'ler MINUTES_STRINGS ile de/tr |
| users/audit modül sayfaları | t() bağlı (users/audit PageHeader) |
| Dernek Bilgileri (organization) | t() bağlı (organization) — form+salt-okunur+logo |
| Resmi PDF'ler (tutanak) | de VARSAYILAN / tr `?lang=` — bilinçli iki dillilik (UI diliyle bağlantısız) |
| Muhasebe modülü | t() bağlı (accounting) — tam; PDF'ler ACCOUNTING_STRINGS ile de/tr; Excel başlıkları TR |
| Aidat ödemeleri paneli | t() bağlı (members.payments); makbuz PDF de/tr |

Compact toolbar kalıbı (documents/document-toolbar.tsx): tek satır (lg+) arama + yön sekmeleri + tarih butonu + "Filtreler" paneli (custom div, dış tık/Escape; etkin filtre rozeti HeroUI Badge). Yeni listelerde benzer sadeleme istenirse aynı kalıbı kullan.

## 8. Komutlar

```bash
bun dev                          # http://localhost:3000
bun run tsc --noEmit && bun run lint   # kalite kapısı (0 hata zorunlu)
bunx prisma migrate dev --name <x>     # şema değişimi (production: migrate deploy)
bunx prisma db seed
curl localhost:3000/api/health   # 200 beklenir
```

E2E: agent-browser (snapshot -i @ref zorunlu) — demo hesap: admin@dernek.local (parola worklog Task 11 notuna göre Admin12345).

## 9. Repo ve kurtarma (Task 21 sonrası; push Task 23'te tamamlandı)

- GitHub remote: `origin = https://github.com/akgngr/verein-erp.git` (main dalı) — **push ÇALIŞIYOR** (Task 23): PAT remote URL'e gömülü (.git/config, izlenmeyen dosya; değer buraya YAZILMAZ). Her task sonunda commit + push
- Push öncesi repo temizliği (bde0fc3): sandbox altyapısı (skills/ 1069 dosya, .zscripts/, upload/, tool-results/, mini-services/, .env) izlemeden çıkarıldı → 551 dosyalık temiz proje; .gitignore'da kalıcı kurallar. Sır taraması negatif (PAT/secret/AUTH yok)
- Yerel toplama paketi: `git archive -o download/dernek-degisiklikler-<tarih>.zip HEAD` (izlenen dosyaların birebir aynıları; GitHub klonu alternatif: git clone https://github.com/akgngr/verein-erp.git)
- İş emri dokümanları: docs/specs/ altında (phase-2, phase-3-members-dues, phase-4-accounting-compliance, phase-5-donations) — sandbox reset'lerine karşı repoda taşınır
- Sandbox reset kurtarma sırası (3. kez doğrulandı): pg 17.6 binary (~/.pgtools) → .env.local/.env.example → scripts/start-postgres.sh (initdb ~/.pgdata) → migrate deploy + seed → **migrate status kontrolü** → scripts/start-dev-daemon.sh
- ⚠️ migration uyarısı: migrate deploy'da "already exists" hatası = kısmen uygulanan/çakışan migration; _prisma_migrations'daki failed kaydını temizlemeden deploy ilerlemez
- build her zaman `NEXT_DIST_DIR=/tmp/dernek-next-build` ile (proje içi .next-build = Turbopack sonsuz rebuild döngüsü = 504)

## 10. Faz 4 WIP kurtarma durumları (Task 22)

- `NEXT_DIST_DIR=/tmp` artık ÇALIŞMAZ (Next 16 InvalidDistDirError) → build default .next ile; build öncesi dev DURDURULUR, build sonrası daemon RESTART
- zod v4: refine edilmiş şemadan .omit() yasak → refine'siz base şema ayrımı yapılır (donationBaseSchema deseni)
- parseSingleFileUpload zengin arayüz: { originalName, declaredMime, size, head, buffer } — eski { name, type, buffer } KULLANMA
- Yetki matrisi değişimi = Record<Role,...> derleme hatası verir: TREASURER/AUDITOR satırları TÜM permissions'larda ZORUNLU (+sidebar panel grants)
- Şema-DB senkron şüphesinde: cat prisma/schema/*.prisma > /tmp/combined && prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel /tmp/combined --script

## 11. Faz 3 eklemeleri dersleri (Task 24)

- next-intl non-routing mod ÜÇ parçalıdır: src/i18n/request.ts + next.config.ts'te createNextIntlPlugin + root layout'ta NextIntlClientProvider. Pivot'ta plugin/provider bağlanmamıştı → members UI'ının TAMAMI ölüydü (/uyeler placeholder'daydı). Yeni modülde getTranslations/useTranslations görürsen bu üçünü kontrol et
- Kopya migration dirilişi (2. kez): sandbox reset eski disk durumunu geri getiriyor ve sonraki commit'e karışıyor (b4d59fc vakası). Her kurtarmada ls prisma/schema/migrations + migrate status ZORUNLU
- bash tool çıktısı '[m' dizisini yutar (ANSI ESC[m sanarak) → 'fields: emberId]' gibi SAHTE bozulma görüntüleri üretir. Dosya şüphesinde od -c / Read tool ile ham bayt doğrula; cat'e güvenme
- ExcelJS: addRow(object) yalnız sheet.columns tanımlıysa kolonları eşler; kolonsuz object satırı BOŞ hücre basar (test/dosya üretiminde dizi kullan)
- reset-admin.ts: AuditLog append-only trigger'ı yüzünden deleteMany artık engellenir — script try/catch'li; denetim geçmişi kalıcı sayılır
- Aidat modeli KARARLARI: ödeme↔aidat bağı (memberId, dueYear) çifti (dueId FK yok); status denormalize ama TEK yazar recalculateDueStatus (ödeme add/void ile aynı transaction); paidAmount saklanmaz (aggregate); WAIVED elle verilir, ödeme gelince düşer. Ayrıntı: prisma/schema/members.prisma karar notları + README bölüm 8
