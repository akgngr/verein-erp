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
4. Veritabanı Singleton Erişimi: Veritabanına erişirken `@/shared/lib/prisma` veya `new PrismaClient()` ASLA kullanma. YALNIZCA singleton veritabanı sağlayıcısını kullan:
   `import { getDb } from "@/shared/db";` -> `const db = getDb();`
5. Server Component (RSC) vs Client Component Sınırı:
   - `views/*-view.tsx` ve `page.tsx` asenkron SERVER COMPONENT'tir (RSC). Başlarına ASLA `"use client"` koyma!
   - Server Component içine ASLA `onClose={async () => { "use server"; }}` gibi inline server action yazma.
   - `@heroui/react` bir Client Component kütüphanesidir. `@heroui/react` bileşenlerini (Button, Modal, Input vb.) YALNIZCA `"use client"` olan `components/*.tsx` dosyalarında kullan. Server Component (`views/*.tsx`) içinde `@heroui/react` import etme (Next.js build `createContext is not a function` hatası verir); bunun yerine Tailwind CSS kullan.
6. URL Tabanlı Modal Kapatma (`<MODUL_ADI>-create-modal.tsx`):
   - `?action=new` modalını açıp kapatmak için `"use client"` olan bir `components/<MODUL_ADI>-create-modal.tsx` sarmalayıcısı yaz. Bu bileşenin `onClose` fonksiyonu `useRouter` ile URL'deki `action` parametresini temizler.
7. Sayfa Eylem Ayrımı: `PageHeader actions` alanına YALNIZCA doğrudan ana CRUD butonunu (`+ Yeni Ekle`) koy. Araçlar, raporlar ve dışa aktarma bağlantılarını `menu/top.json` içinde tanımla.
8. KRİTİK SSR Hydration & Saflık Kuralları (React 19 / Next.js 16):
   - Tablo satırları (`map`) içinde asla HeroUI'ın `<Select>` bileşenini kullanma. Bunun yerine stillendirilmiş native HTML `<select>` ve yanında Lucide `<ChevronDown>` kullan.
   - Render esnasında `Date.now()` çağırma (`react-hooks/purity`). Tarih karşılaştırmalarını (`isPast` vb.) sorguda (`queries/`) hesapla.

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
   - Sunucu kamuya açık dosyası. İlk satırında `import "server-only";` bulunmalı. Sorgu ve mutasyonları dışa aktar.
8. `src/modules/<MODUL_ADI>/ui.ts`:
   - UI kamuya açık dosyası. Görünüm bileşenlerini dışa aktar.
9. `src/modules/<MODUL_ADI>/schemas/<MODUL_ADI>-schema.ts`:
   - Zod doğrulama şeması.
10. `src/modules/<MODUL_ADI>/queries/list-<MODUL_ADI>.ts`:
    - `getDb()` ile veritabanından veri çeken sayfalama ve filtreleme destekli sorgu fonksiyonu.
11. `src/modules/<MODUL_ADI>/actions/<MODUL_ADI>-actions.ts`:
    - `"use server"` Server Action mutasyon fonksiyonları (ekleme, güncelleme, silme). `requirePermission` ile yetki denetimi yap.
12. `src/modules/<MODUL_ADI>/components/<MODUL_ADI>-table.tsx`:
    - `"use client"` Tablo bileşeni. SSR Hydration Mismatch hatası vermemesi için tablo satırlarında HeroUI Select YERİNE native HTML `<select>` kullan.
13. `src/modules/<MODUL_ADI>/components/<MODUL_ADI>-form-modal.tsx`:
    - `"use client"` Ekleme / düzenleme modal formu (`@heroui/react` Modal, Input vb.).
14. `src/modules/<MODUL_ADI>/components/<MODUL_ADI>-create-modal.tsx`:
    - `"use client"` URL query (`?action=new`) yöneten modal sarmalayıcısı.
15. `src/modules/<MODUL_ADI>/views/<MODUL_ADI>-list-view.tsx`:
    - Saf asenkron Server Component (RSC). `"use client"` İÇERMEZ. `PageHeader`, arama filtreleri, istatistik kartları, `<MODUL_ADI>-table` ve `<MODUL_ADI>-create-modal` bileşenlerini render eder.
16. `src/modules/<MODUL_ADI>/page.tsx`:
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

# 4. Veritabanı tablosunu oluştur
pnpm db:migrate
```
