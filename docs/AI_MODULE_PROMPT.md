# Verein ERP — Harici AI Modül Geliştirme İstemi (Prompt Template)

Bu belge, projeye terminal veya dosya sistemi erişimi **olmayan** harici bir yapay zekaya (ChatGPT, Claude web, Gemini vb.) verilmek üzere hazırlanmış eksiksiz, tek parça istem şablonudur.

---

## 📋 Harici AI'ya Verilecek Kopyala-Yapıştır İstem (Prompt)

Aşağıdaki metin bloğunun tamamını kopyalayıp harici AI'ya veriniz:

```markdown
Sen Verein ERP dernek yönetim sistemi için üretim kalitesinde (production-ready) modül geliştiren uzman bir Full-Stack Next.js 16 / TypeScript / Prisma mühendisisin.
Senden projemiz için `<MODUL_ADI>` (örn: `inventory`, `sponsors`, `events`) adında yeni bir bağımsız eklenti modülü geliştirmeni istiyorum.

PROJE MİMARİSİ VE SINIR KURALLARI:
1. Dikey Dilim İzolasyonu (Vertical Slice Architecture): Modüle ait tüm dosyalar ve sayfa rotası İSTİSNASIZ `src/modules/<MODUL_ADI>/` altında olmalıdır. `src/app` dizinine ASLA dosya yazma.
2. Sıfır Çekirdek Teması (Zero-Touch Core): `src/registry.ts`, `prisma/schema/base.prisma`, `src/app/` veya kök `messages/` dosyalarına DOKUNMA. Kod yazma.
3. Katı İthalat Sınırları (Strict Imports): Başka bir modülün iç dosyalarını ASLA doğrudan import etme. Yalnızca `@/modules/<modul>`, `@/modules/<modul>/server` ve `@/modules/<modul>/ui` public API'larını kullan. Modül içinden `src/app` katmanını ASLA import etme.
4. Resmi İthalat (Import) Yolları Tablosu:
   - Veritabanı Singleton: `import { getDb } from "@/shared/db";` -> `const db = getDb();` (ASLA `@/shared/lib/prisma` veya `new PrismaClient()` yazma!)
   - Yetki Tanımlama (permissions.ts): `import { definePermissions } from "@/shared/permissions/define";` (ASLA `@/shared/types/permissions` yazma!)
   - Yetki Denetimi (Server Actions & Queries): `import { requirePermission } from "@/modules/auth/server";` (ASLA `@/shared/lib/permissions-service` yazma!)
   - Sayfa Başlığı: `import { PageHeader } from "@/shared/components/ui/page-header";`
   - Boş Durum: `import { EmptyState } from "@/shared/components/ui/empty-state";`
   - Veri Tablosu: `import { DataTable, DataTablePagination } from "@/shared/components/data-table";`
   - Modül Tipleri: `import type { ModuleConfig, TopNavItem } from "@/shared/types/module";`
5. Sıfır "any" Kuralı ve Güçlü Tipleme (ESLint @typescript-eslint/no-explicit-any):
   - Projede ESLint katı `no-explicit-any` kuralı devrededir; `any` kullanımı derlemeyi bozar.
   - ASLA `as any` veya `: any` KULLANMA!
   - `const db = getDb()` doğrudan tipli PrismaClient döndürür. Modül şeması derlendiğinde tablolar tam tiplidir. ASLA `const db = getDb() as any` veya `(db as any)...` yazma!
   - Hata yakalamada ASLA `catch (error: any)` yazma! `catch (error: unknown)` veya doğrudan `catch (error)` yazıp `error instanceof Error ? error.message : "..."` kullan.
   - Dizi işlemlerinde `(item: any) => ...` YERİNE TypeScript tip çıkarımına güven (`(item) => ...`) veya arayüz tiplerini kullan.
6. Server Component (RSC) vs Client Component Sınırı:
   - `views/*-view.tsx` ve `page.tsx` asenkron SERVER COMPONENT'tir (RSC). Başlarına ASLA `"use client"` koyma!
   - Server Component içine ASLA `onClose={async () => { "use server"; }}` gibi inline server action yazma.
   - `@heroui/react` bir Client Component kütüphanesidir. `@heroui/react` bileşenlerini (Button, Modal, Input vb.) YALNIZCA `"use client"` olan `components/*.tsx` dosyalarında kullan. Server Component (`views/*.tsx`) içinde `@heroui/react` import etme (Next.js build `createContext is not a function` hatası verir); bunun yerine Tailwind CSS kullan.
7. "Services", "Helpers", "Queries" ve "Actions" Katı Ayrımı (İnce Görünüm / Thin Views Kuralı):
   - `views/*-view.tsx` dosyalarında KESİNLİKLE hesaplama, matematiksel işlem, formatlama veya karmaşık lojik yazma. View yalnızca bir orkestratördür: parametreyi alır, sorgu/servis/helper'ı çağırır, çıkan sonucu bileşenlere props olarak iletir.
   - **`helpers/`:** Dış dünyaya yan etkisi olmayan saf (pure) fonksiyonlar: oran/kontenjan hesaplamaları, tarih/para formatlama, durum türetme.
   - **`services/`:** Çok adımlı iş süreçleri, dış API entegrasyonları, dosya dışa aktarma (Excel/PDF) motorları.
   - **`queries/`:** Yalnızca veritabanı okuma (SELECT) Prisma sorguları.
   - **`actions/`:** Yalnızca `"use server"` form mutasyonları (`create`, `update`, `delete`).
8. URL Tabanlı Modal Kapatma (`<MODUL_ADI>-create-modal.tsx`):
   - `?action=new` modalını açıp kapatmak için `"use client"` olan bir `components/<MODUL_ADI>-create-modal.tsx` sarmalayıcısı yaz. Bu bileşenin `onClose` fonksiyonu `useRouter` ile URL'deki `action` parametresini temizler.
9. Sayfa Eylem Ayrımı: `PageHeader actions` alanına YALNIZCA doğrudan ana CRUD butonunu (`+ Yeni Ekle`) koy. Araçlar, raporlar ve dışa aktarma bağlantılarını `menu/top.json` içinde tanımla.
10. KRİTİK SSR Hydration & Saflık Kuralları (React 19 / Next.js 16):
   - Tablo satırları (`map`) içinde asla HeroUI'ın `<Select>` bileşenini kullanma. Bunun yerine stillendirilmiş native HTML `<select>` ve yanında Lucide `<ChevronDown>` kullan.
   - Render esnasında `Date.now()` çağırma (`react-hooks/purity`). Tarih karşılaştırmalarını (`isPast` vb.) sorguda (`queries/`) veya saf helper'da (`helpers/`) hesapla.

SENİN ÜRETMEN GEREKEN DOSYALAR:
Lütfen bana her bir dosyanın TAM DOSYA YOLUNU ve EKSİKSİZ ÇALIŞAN KODUNU sırasıyla ver:

1. `src/modules/<MODUL_ADI>/module.config.ts`:
   - `key: "<MODUL_ADI>"`, `category: "EXTENSION"`, `hasSchema: true`, `topNav: topNav as TopNavItem[]`, `nav: [...]` (Lucide ikonu ile).
2. `src/modules/<MODUL_ADI>/menu/top.json`:
   - Üst bar (Mac-tarzı Topbar) araçları, filtreleri veya sekmeleri dizisi (`key`, `label`, `href` ['/' ile başlayan], `icon` [Lucide ikon adı]).
3. `src/modules/<MODUL_ADI>/permissions.ts`:
   - `definePermissions("<MODUL_ADI>", { ADMIN: [...], BOARD: [...], SECRETARY: [...], TREASURER: [...], AUDITOR: [...], VIEWER: [...] })` şeklinde 6 rolü de tanımla.
4. `src/modules/<MODUL_ADI>/schema.prisma`:
   - Veritabanı modeli. Tablo isimlerinde çakışmayı önlemek için mutlaka `@@map("<MODUL_ADI>_...")` kullan. Yumuşak referanslar (`memberId String?`) tercih et.
5. `src/modules/<MODUL_ADI>/messages/tr.json` ve `src/modules/<MODUL_ADI>/messages/de.json`:
   - Başlıklar, butonlar, alanlar, hata mesajları için Türkçe ve Almanca tam çeviri sözlükleri.
6. `src/modules/<MODUL_ADI>/index.ts`:
   - İzomorfik kamuya açık dosya (`moduleConfig`, yetkiler, tipler). KESİNLİKLE 'server-only' içermez.
7. `src/modules/<MODUL_ADI>/server.ts`:
   - Sunucu kamuya açık dosyası. İlk satırında `import "server-only";` bulunmalı. Sorgu, servis ve mutasyonları dışa aktar.
8. `src/modules/<MODUL_ADI>/ui.ts`:
   - UI kamuya açık dosyası. Görünüm bileşenlerini dışa aktar.
9. `src/modules/<MODUL_ADI>/schemas/<MODUL_ADI>-schema.ts`:
   - Zod doğrulama şeması.
10. `src/modules/<MODUL_ADI>/helpers/<MODUL_ADI>-helpers.ts`:
    - Saf matematiksel, biçimlendirme ve hesaplama fonksiyonları (Pure Functions).
11. `src/modules/<MODUL_ADI>/services/<MODUL_ADI>-service.ts`:
    - Çok adımlı iş mantığı süreçleri, Excel/PDF veya dış API entegrasyon servisleri.
12. `src/modules/<MODUL_ADI>/queries/list-<MODUL_ADI>.ts`:
    - `getDb()` ile veritabanından veri çeken sayfalama ve filtreleme destekli sorgu fonksiyonu.
13. `src/modules/<MODUL_ADI>/actions/<MODUL_ADI>-actions.ts`:
    - `"use server"` Server Action mutasyon fonksiyonları (ekleme, güncelleme, silme). `requirePermission` ile yetki denetimi yap.
14. `src/modules/<MODUL_ADI>/components/<MODUL_ADI>-table.tsx`:
    - `"use client"` Tablo bileşeni. SSR Hydration Mismatch hatası vermemesi için tablo satırlarında HeroUI Select YERİNE native HTML `<select>` kullan.
15. `src/modules/<MODUL_ADI>/components/<MODUL_ADI>-form-modal.tsx`:
    - `"use client"` Ekleme / düzenleme modal formu (`@heroui/react` Modal, Input vb.).
16. `src/modules/<MODUL_ADI>/components/<MODUL_ADI>-create-modal.tsx`:
    - `"use client"` URL query (`?action=new`) yöneten modal sarmalayıcısı.
17. `src/modules/<MODUL_ADI>/views/<MODUL_ADI>-list-view.tsx`:
    - Saf asenkron Server Component (RSC). `"use client"` İÇERMEZ. İnce orkestratör: `queries` ve `helpers` çağırıp `<MODUL_ADI>-table` ve `<MODUL_ADI>-create-modal` bileşenlerini render eder.
18. `src/modules/<MODUL_ADI>/page.tsx`:
    - Modülün Next.js Server Component sayfası. NOT: `src/app` dizinine ASLA kod yazma; sistem `pnpm module:sync` ile Next.js App Router köprüsünü otomatik oluşturur.

Lütfen kodları placeholder veya "TODO" bırakmadan, çalışmaya hazır ve eksiksiz olarak üret.
```

---

## 🛠️ Kodlar Geldikten Sonra Yapılacaklar (Terminal Adımları)

Dosyaları ilgili dizinlere oluşturduktan sonra projede şu komutları sırasıyla çalıştırmanız yeterlidir:

```bash
# 1. Şemaları, çevirileri ve registry kaydını sisteme otomatik bağla
pnpm module:sync

# 2. Modülün standartlara uygunluğunu doğrula
pnpm module:validate <MODUL_ADI>

# 3. Tip kontrolünü ve testleri koştur
pnpm typecheck
pnpm test

# 4. Migration üret (şema varsa ZORUNLU — `db push` KULLANMA; bkz. docs/operations/MIGRATION_BASELINE.md)
#    Oluşan prisma/schema/migrations/<zaman>_add_<modul>/ klasörünü commit'le.
#    Not: migration üretilene kadar `module:validate` "migration bulunamadı" hatası verir; bu adımdan sonra 2. adımı tekrar çalıştır.
pnpm db:migrate --name add_<MODUL_ADI>
```
