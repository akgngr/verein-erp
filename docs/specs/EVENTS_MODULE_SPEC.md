# Verein ERP — Etkinlik ve Katılım Modülü (Events) Teknik Şartnamesi
> **Sürüm:** 1.0 (Dış AI Agent & Geliştirici İçin Doğrudan Kopyala-Yapıştır Şartname)  
> **Hedef:** Bu şartnameyi doğrudan harici bir yapay zekaya (ChatGPT, Claude, Cursor, Windsurf vb.) vererek `events` modülünün eksiksiz, üretim standartlarında ve çekirdek koda sıfır temasla üretilmesini sağlayabilirsiniz.

---

## 📋 Harici AI'ya Verilecek Hazır Şartname & Görev İstemi

```markdown
Sen Verein ERP dernek yönetim sistemi için üretim kalitesinde (production-ready) eklenti modülü geliştiren kıdemli bir Full-Stack Next.js 16 / TypeScript / Prisma mühendisisin.
Senden projemiz için dernek etkinliklerini, seminerlerini, atölyelerini, genel kurul dışındaki sosyal/eğitim aktivitelerini ve katılımcı kayıtlarını yöneten "events" (Etkinlikler) modülünü geliştirmeni istiyorum.

Projede katı dikey dilim izolasyonu (Vertical Slice Architecture), sıfır çekirdek teması (Zero-Touch Core) ve katı modül kamu sınırları uygulanmaktadır.

================================================================================
1. MODÜL İŞLEVSELLİĞİ & İŞ GEREKSİNİMLERİ
================================================================================
- Modül Anahtarı (Key): "events"
- Başlık: "Etkinlikler" (TR) / "Veranstaltungen" (DE)
- İkon: CalendarDays veya PartyPopper (lucide-react)
- Temel İşlevler:
  1. Etkinlik Yönetimi:
     - Başlık, Açıklama, Tür (WORKSHOP, SEMINAR, SOCIAL, CULTURAL, SPORTS, OTHER),
     - Başlangıç ve Bitiş Zamanı (Tarih ve Saat),
     - Konum (Fiziksel Adres veya Online Bağlantı URL'si),
     - Kontenjan (Kapasite Limiti: Boş ise sınırsız),
     - Durum (DRAFT, PUBLISHED, COMPLETED, CANCELLED).
  2. Katılımcı Kaydı (RSVP & Attendee Tracking):
     - Dernek Üyesi katılımcı (`memberId String?` soft reference) VEYA Dış Misafir (Ad, Soyad, E-posta, Telefon).
     - Katılım Durumu (REGISTERED [Kayıtlı], ATTENDED [Katıldı], CANCELLED [İptal]).
     - Kayıt Tarihi ve Özel Notlar (örn: Diyet/Alerji tercihi).
     - Kontenjan doluluk kontrolü.
  3. Arama, Tür ve Duruma Göre Filtreleme, Tarih Sıralaması, Sayfalama.
  4. Yeni Etkinlik Oluşturma ve Düzenleme (Modal veya Form).
  5. Etkinlik Detayı: Katılımcı listesi, hızlı katıldı/gelmedi işaretleme, etkinlik iptal etme.
  6. Üst Bar Araçları (menu/top.json): Genel Bakış, Yaklaşan Etkinlikler, Geçmiş Etkinlikler, Excel Dışa Aktar.

================================================================================
2. MİMARİ VE TEKNİK KURALLAR (KESİNLİKLE ÇİĞNENEMEZ)
================================================================================
1. SIFIR ÇEKİRDEK TEMASI (ZERO-TOUCH CORE):
   - Yalnızca `src/modules/events/` altında çalış. `src/app` dizinine ASLA manuel dosya yazma.
   - `src/registry.ts`, `prisma/schema/base.prisma`, `src/app/` veya kök `messages/*.json` dosyalarına ASLA dokunma! (Bunlar `pnpm module:sync` ile otomatik senkronize edilir).

2. TABLO İSİMLENDİRME KURALI:
   - Tüm tablolarda çakışmayı önlemek için mutlaka `@@map("events_...")` kullan (Örn: `@@map("events_items")`, `@@map("events_attendees")`).
   - Dış modül tablolarına zorlayıcı `@relation` yazma, yumuşak referans kullan (`memberId String?`).

3. RESMİ İTHALAT (IMPORT) YOLLARI TABLOSU:
   Modül içinde projenin çekirdek servislerini kullanırken YALNIZCA şu resmi yolları kullan:
   - Veritabanı Singleton: `import { getDb } from "@/shared/db";` -> `const db = getDb();` (ASLA `@/shared/lib/prisma` veya `new PrismaClient()` yazma!)
   - Yetki Denetimi: `import { requirePermission } from "@/shared/lib/permissions-service";`
   - Yetki Tanımlama: `import { definePermissions } from "@/shared/types/permissions";`
   - Sayfa Başlığı: `import { PageHeader } from "@/shared/components/ui/page-header";`
   - Boş Durum: `import { EmptyState } from "@/shared/components/ui/empty-state";`
   - Veri Tablosu: `import { DataTable, DataTablePagination } from "@/shared/components/data-table";`
   - Modül Tipleri: `import type { ModuleConfig, TopNavItem } from "@/shared/types/module";`
   - Modül İçi İthalatlar: Kendi modülün içindeki dosyaları import ederken göreli yollar (`./` veya `../`) kullan.

4. SERVER COMPONENT (RSC) VE CLIENT COMPONENT KATI DOSYA AYRIMI:
   - `views/*-view.tsx` ve `page.tsx` dosyaları ASENKRON SERVER COMPONENT'TİR:
     - Dosyanın başında ASLA `"use client";` YER ALAMAZ!
     - İçinde `useState`, `useEffect`, `useRouter` gibi React hook'ları KULLANILAMAZ!
     - İçinde `@heroui/react` (Button, Modal, Chip, Progress vb.) ASLA IMPORT EDİLEMEZ! (React 19 Server ortamında `createContext` olmadığı için build çöker). Rozet ve barlar için saf Tailwind sınıfları kullanılır.
     - İçinde `onClose={async () => { "use server"; }}` gibi inline server action ASLA YAZILAMAZ!
   - ETKİLEŞİMLİ TÜM KODLAR YALNIZCA `components/` ALTINDA YAŞAR:
     - Modal, form, buton tıklamaları, sayfalama ve tablo etkileşimleri için mutlaka `components/` altında ayrı bir bileşen yazılır.
     - Bu bileşenlerin ilk satırında `"use client";` bulunur.
     - `@heroui/react` kütüphanesi YALNIZCA bu `"use client"` bileşenleri içinde kullanılır.

5. "SERVICES" VE "HELPERS" KATI AYRIMI (İNCE GÖRÜNÜM / THIN VIEWS PRENSİBİ):
   - `views/*-view.tsx` dosyalarında ASLA inline hesaplama, matematiksel işlem veya karmaşık mantık yazma! View yalnızca orkestratördür.
   - **`helpers/` (Saf Hesaplama ve Yardımcı Fonksiyonlar - Pure Functions):**
     - Dış dünyaya yan etkisi olmayan deterministik hesaplamalar (örn: `calculateCapacityRatio`, `isEventPast`, `formatEventDateTime`).
   - **`services/` (İş Mantığı & Dış Entegrasyonlar):**
     - Çok adımlı iş süreçleri, dış API entegrasyonları, Excel veri hazırlama veya bildirim orkestrasyonu (örn: `event-export-service.ts`).
   - **`queries/` (Salt-Okunur Veri Okuma):**
     - Yalnızca Prisma `SELECT` sorguları.
   - **`actions/` (Mutasyonlar):**
     - Yalnızca `"use server"` form mutasyonları (`create`, `update`, `delete`).

6. URL TABANLI MODAL PATTERNİ (`components/event-create-modal.tsx`):
   - Server Component (`event-list-view.tsx`) içindeki `+ Yeni Etkinlik` butonu `<Link href="/events?action=new">` linkidir.
   - Sayfada modalı açmak için `isModalOpen = searchParams.action === "new"` denetlenir ve `<EventCreateModal isOpen={isModalOpen} />` render edilir.
   - `EventCreateModal` bir `"use client"` bileşenidir; kapatıldığında `useRouter` ile URL'deki `action` parametresini temizler.
   - Böylece Server Component'ten Client Component'e fonksiyon geçilmez, inline server action ihtiyacı kalmaz.

7. KRİTİK SSR HYDRATION VE REACT 19 SAFLIK KURALLARI:
   - Tablo satırları (`map`) içinde HeroUI `<Select>` KULLANMA! Bunun yerine stillendirilmiş native HTML `<select>` ve yanında Lucide `<ChevronDown>` kullan (SSR ID mismatch hatasını önler).
   - Render esnasında `Date.now()` veya `new Date()` çağırma (`react-hooks/purity`). `isPast` gibi tarih karşılaştırmalarını `queries/list-events.ts` veya `helpers/event-helpers.ts` içinde yapıp `EventRow` nesnesine ekle.

===============================================================================
3. ÜRETMEN GEREKEN TÜM DOSYALAR (EKSİKSİZ KOD LİSTESİ - 24 DOSYA)
================================================================================
Lütfen bana her bir dosyanın TAM DOSYA YOLUNU ve EKSİKSİZ, ÇALIŞMAYA HAZIR KODUNU sırasıyla ver:

1. `src/modules/events/module.config.ts`:
   - `key: "events"`, `label: "Etkinlikler"`, `category: "EXTENSION"`, `hasSchema: true`, `topNav: topNav as TopNavItem[]`, `nav: [...]`
2. `src/modules/events/menu/top.json`:
   - Topbar sekmeleri: "Genel Bakış" (`/events`), "Yaklaşanlar" (`/events?durum=upcoming`), "Geçmiş" (`/events?durum=past`), "Excel'e Aktar" (`/api/events/export`)
3. `src/modules/events/permissions.ts`:
   - `definePermissions("events", { ADMIN: [...], BOARD: [...], SECRETARY: [...], TREASURER: [...], AUDITOR: [...], VIEWER: [...] })` (6 rol eksiksiz)
4. `src/modules/events/schema.prisma`:
   - `Event` (`@@map("events_items")`) ve `EventAttendee` (`@@map("events_attendees")`) modelleri.
5. `src/modules/events/messages/tr.json`:
   - Türkçe arayüz sözlüğü (title, description, fields, types, status, attendeeStatus, actions, empty states)
6. `src/modules/events/messages/de.json`:
   - Almanca arayüz sözlüğü (Veranstaltungen, Teilnehmer, Status, Typen vb. tam Verein terminolojisi)
7. `src/modules/events/index.ts`:
   - `moduleConfig`, `eventsPermissions` ve tipleri dışa aktar. KESİNLİKLE 'server-only' içermez.
8. `src/modules/events/server.ts`:
   - `import "server-only";`, sorgular, eylemler, servisler ve izinleri dışa aktar.
9. `src/modules/events/ui.ts`:
   - `EventListView`, `EventDetailView`, `EventTable`, `EventFormModal`, `EventCreateModal`, `AttendeeList` bileşenlerini dışa aktar.
10. `src/modules/events/types.ts`:
    - TypeScript arayüzleri (`EventRow` [içinde `isPast?: boolean`], `EventAttendeeItem`, `EventStats`, `EventType`, `EventStatus`).
11. `src/modules/events/constants.ts`:
    - Tür ve durum etiketleri (TR/DE), sıralama sabitleri, varsayılan sayfalama.
12. `src/modules/events/schemas/event-schema.ts`:
    - Zod şemaları (`eventCreateSchema`, `eventUpdateSchema`, `attendeeAddSchema`).
13. `src/modules/events/helpers/event-helpers.ts`:
    - Saf yardımcı fonksiyonlar: `calculateCapacityRatio(registered, capacity)`, `formatDateTimeTr(date)`, `formatDateRange(start, end)`.
14. `src/modules/events/services/event-export-service.ts`:
    - Excel ve raporlama için veri hazırlama / dışa aktarma iş mantığı servisi.
15. `src/modules/events/queries/list-events.ts`:
    - `getDb()` ile filtrelenebilir (arama, tür, durum, yaklaşan/geçmiş), sıralanabilir sorgu fonksiyonu. Her item için `isPast: item.startDate < new Date()` hesapla.
16. `src/modules/events/queries/get-event.ts`:
    - `getDb()` ile tek bir etkinliğin detaylarını ve katılımcılarını getiren sorgu.
17. `src/modules/events/actions/event-actions.ts`:
    - `"use server"` Server Actions: `createEventAction`, `updateEventAction`, `deleteEventAction`, `addAttendeeAction`, `updateAttendeeStatusAction` (`requirePermission` denetimiyle ve `getDb()` ile).
18. `src/modules/events/components/event-form-modal.tsx`:
    - `"use client"` Yeni etkinlik ekleme ve düzenleme formu (HeroUI Modal, Input, Textarea, native select, form doğrulama).
19. `src/modules/events/components/event-create-modal.tsx`:
    - `"use client"` URL'deki `?action=new` parametresini dinleyen ve modal kapandığında `useRouter` ile temizleyen sarmalayıcı bileşen.
20. `src/modules/events/components/event-table.tsx`:
    - `"use client"` `DataTablePagination` ile sayfalama yapan, satır içi düzenleme/silme destekleyen etkinlik tablosu.
21. `src/modules/events/components/attendee-list.tsx`:
    - `"use client"` Etkinlik detayında katılımcıları listeleyen, katıldı/gelmedi native select içeren interaktif tablo.
22. `src/modules/events/views/event-list-view.tsx`:
    - Asenkron Server Component (RSC). `"use client"` İÇERMEZ! İnce orkestratör: `listEvents` sorgusunu çağırır; `PageHeader`, istatistik kartları, araç çubuğu, `<EventTable>` ve `<EventCreateModal>` bileşenlerini render eder.
23. `src/modules/events/views/event-detail-view.tsx`:
    - Asenkron Server Component (RSC). `"use client"` İÇERMEZ! İnce orkestratör: `getEventById` sorgusunu ve `calculateCapacityRatio` helper'ını çağırır. HeroUI import etmez; rozet ve bar için Tailwind kullanır. `<AttendeeList>` client component'ini render eder.
24. `src/modules/events/page.tsx`:
    - Modülün ana Next.js Server Component sayfası (searchParams ile liste veya detay görünümünü render eder). NOT: `src/app` dizinine ASLA kod yazma; `pnpm module:sync` Next.js App Router köprüsünü otomatik oluşturur.

Lütfen kodları placeholder veya "TODO" bırakmadan, projeye yapıştırıldığında doğrudan çalışacak şekilde eksiksiz üret.
```

---

## 🛠️ Kodlar Alındıktan Sonraki Terminal Adımları

Harici AI bu dosyaları ürettikten sonra projede sırasıyla şu komutları koşturmanız yeterlidir:

```bash
# 1. Şemayı, çevirileri ve menü kaydını sisteme otomatik bağla
pnpm module:sync

# 2. Modülün standartlara uygunluğunu otomatik denetle
pnpm module:validate events

# 3. Veritabanı tablolarını oluştur
pnpm db:migrate
```
