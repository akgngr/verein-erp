---
sidebar_position: 15
title: "Etkinlikler"
description: "Dernek etkinlikleri, seminerler, atölyeler ve katılımcı yönetimi."
slug: /kullanim/moduller/events
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Dernek etkinlikleri, seminerler, atölyeler ve katılımcı yönetimi.

| | |
|---|---|
| Anahtar | `events` |
| Tür | Resmî modül |
| Sürüm | 1.2.14 |
| Sayfalar | `/events`, `/events?filter.timeFilter=upcoming`, `/events?filter.timeFilter=past` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Üyeler](./members) | okuma | Üyeye bağlı katılımcıların iletişim izinlerini (kampanya duyuruları) okumak için. |
| [Toplu e-posta](./mailings) | okuma | Katılımcılara duyuru için Kampanyalar sihirbazını hazır kaynakla açar. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Etkinlikler | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma, düzenleme, onay | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | — | — | görüntüleme |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`list_upcoming_events` · `propose_event`

## Sürüm notları

### 1.2.14 — URL protokol doğrulaması ve kanonik APP_URL

_2026-11-25_

- **Güvenlik:** Etkinlik bağlantılarında güvenli protokol doğrulaması ve kanonik APP_URL kökü uygulandı (#573, #574).

### 1.2.13 — Doğrulama, saat dilimi, yetki ve denetim düzeltmeleri

_2026-11-25_

- **Düzeltme:** Bitiş başlangıçtan önce olamaz; güncellemede gönderilmeyen alanlar varsayılanla ezilmez; uzunluk sınırları eklendi.
- **Düzeltme:** Saatler Europe/Berlin olarak girilir ve gösterilir; sunucu saat dilimine bağlı kayma giderildi.
- **Düzeltme:** Etkinlik ve katılımcı işlemleri denetim kaydına yazılır; etkinlik silme artık yumuşak silmedir.
- **Düzeltme:** Kontenjan ve aynı üyenin ikinci kaydı eşzamanlı isteklerde de engellenir; katılımcı formuna üye seçici eklendi.
- **Düzeltme:** Etkinlik sayfaları görüntüleme yetkisi ister; oluşturma, düzenleme ve katılımcı yönetimi yetkiye göre gösterilir.

### 1.2.12 — nav.json kategori ve alt modül tanımı

_2026-11-24_

- **İyileştirme:** Kullanıcı bazlı sol menü gruplama ve alt modül hiyerarşisi için nav.json eklendi.

### 1.2.11 — Üye portalı etkinlik kaydı sözleşmesi

_2026-11-24_

- **Yeni:** Yayımlanan etkinlikleri listeleme ve üye kaydı oluşturma sözleşmesi eklendi.

### 1.2.10 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.2.9 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

### 1.2.7 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.2.6 — Mobilde alttan açılan çekmece

_2026-11-16_

- **İyileştirme:** Form/ayrıntı çekmecesi mobilde alttan açılır (masaüstünde sağdan).

Daha eski 8 herkese açık sürüm notu.
