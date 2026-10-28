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
3. KATI İTHALAT (IMPORT) SINIRLARI (`eslint.config.mjs`):
   - Başka bir modülün iç dosyalarını (örn: `@/modules/auth/queries/...`, `@/modules/members/components/...`) ASLA import etme! Sadece public girişleri kullan:
     - `@/modules/auth/server` (`requirePermission`, `ForbiddenError`)
     - `@/shared/permissions/define` (`definePermissions`, `can`)
     - `@/shared/components/ui/...` (`PageHeader`, `AccessDenied`, `EmptyState`, `Badge`)
     - `@/shared/components/data-table` (`DataTable`, `DataTablePagination`)
   - Modül içinden `src/app` katmanını ASLA import etme.
4. PUBLIC API SINIRLARI:
   - `index.ts`: İzomorfik public API. KESİNLİKLE `import "server-only"` İÇEREMEZ.
   - `server.ts`: Sunucu public API. İlk satırında `import "server-only";` bulunmalı.
   - `ui.ts`: Dışa aktarılan React görünümleri.
5. UI VE SAYFA EYLEM AYRIMI:
   - `PageHeader actions` alanına YALNIZCA doğrudan ana CRUD butonunu (`+ Yeni Etkinlik`) koy.
   - Yaklaşan/Geçmiş filtreleri veya Excel aktarımı gibi ikincil linkleri sayfa içine yığma, `menu/top.json` içinde tanımla.
6. KRİTİK SSR HYDRATION KURALI (React 19 / Next.js 16):
   - Tablo satırları (`map`) içinde katılım durumu değişimi için HeroUI `<Select>` KULLANMA! Bunun yerine stillendirilmiş native HTML `<select>` ve yanında Lucide `<ChevronDown>` kullan (SSR ID mismatch hatasını önler).

================================================================================
3. ÜRETMEN GEREKEN TÜM DOSYALAR (EKSİKSİZ KOD LİSTESİ)
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
   - `moduleConfig`, `eventsPermissions` ve tipleri dışa aktar.
8. `src/modules/events/server.ts`:
   - `import "server-only";`, sorgular, eylemler ve izinleri dışa aktar.
9. `src/modules/events/ui.ts`:
   - `EventListView`, `EventDetailView`, `EventCreateView` bileşenlerini dışa aktar.
10. `src/modules/events/types.ts`:
    - TypeScript arayüzleri (`EventRow`, `EventAttendeeItem`, `EventFilters`, `EventType`, `EventStatus`).
11. `src/modules/events/constants.ts`:
    - Tür ve durum etiketleri (TR/DE), sıralama sabitleri, varsayılan sayfalama.
12. `src/modules/events/schemas/event-schema.ts`:
    - Zod şemaları (`eventCreateSchema`, `eventUpdateSchema`, `attendeeAddSchema`).
13. `src/modules/events/queries/list-events.ts`:
    - Prisma ile filtrelenebilir (arama, tür, durum, yaklaşan/geçmiş), sıralanabilir sorgu fonksiyonu.
14. `src/modules/events/queries/get-event.ts`:
    - Tek bir etkinliğin detaylarını ve katılımcılarını getiren sorgu.
15. `src/modules/events/actions/event-actions.ts`:
    - `"use server"` Server Actions: `createEventAction`, `updateEventAction`, `deleteEventAction`, `addAttendeeAction`, `updateAttendeeStatusAction` (`requirePermission` denetimiyle).
16. `src/modules/events/components/event-form-modal.tsx`:
    - Yeni etkinlik ekleme ve düzenleme formu (HeroUI Modal, Input, Textarea, native select, form doğrulama).
17. `src/modules/events/components/event-table.tsx`:
    - `DataTable` ile etkinlik listesi, tarih, katılımcı sayısı/kapasite göstergesi, durum rozetleri.
18. `src/modules/events/components/attendee-list.tsx`:
    - Etkinlik detayında katılımcıları listeleyen, katıldı/gelmedi native select içeren tablo.
19. `src/modules/events/views/event-list-view.tsx`:
    - `PageHeader`, istatistik kartları (Toplam, Yaklaşan, Bu Ayki Katılımcı), araç çubuğu ve tabloyu içeren ana RSC görünümü.
20. `src/modules/events/views/event-detail-view.tsx`:
    - Etkinlik bilgileri, konum/bağlantı, kapasite barı, katılımcı yönetimi ve silme/düzenleme butonları.
21. `src/modules/events/page.tsx`:
    - Modülün ana Next.js Server Component sayfası (searchParams ile liste veya detay görünümünü render eder). `src/app/(dashboard)/events/page.tsx` köprüsü `pnpm module:sync` ile otomatik bağlanır.

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
