---
sidebar_position: 36
title: "Takvim"
description: "Kişisel ve ortak takvimler; etkinlik, toplantı, görev ve son tarihler tek görünümde."
slug: /kullanim/moduller/calendar
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Kişisel ve ortak takvimler; etkinlik, toplantı, görev ve son tarihler tek görünümde.

| | |
|---|---|
| Anahtar | `calendar` |
| Tür | Resmî modül |
| Sürüm | 1.3.17 |
| Sayfalar | `/calendar`, `/calendar/ayarlar` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Etkinlikler](./events) | yazma | Takvim kaydını tek tıkla etkinlik taslağına dönüştürmek için. |
| [Kullanıcılar](./users) | okuma | Takvim aboneliği ve senkronizasyonda kullanıcının adını ve yetkisini doğrulamak için. |
| [Modül Yönetimi](./system) | okuma | Takvime kaynak veren modüllerin kurulu ve açık olduğunu denetlemek için. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Takvim | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma, düzenleme, silme | görüntüleme, oluşturma, düzenleme | görüntüleme | — | görüntüleme, oluşturma, düzenleme | görüntüleme |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`list_shared_calendar_entries` · `list_shared_calendars` · `propose_calendar_entry`

## Sürüm notları

### 1.3.17 — Kanonik APP_URL abonelik bağlantıları

_2026-11-25_

- **Güvenlik:** Takvim abonelik bağlantıları artık kanonik APP_URL kökü üzerinden üretiliyor (#574).

### 1.3.16 — ICS aboneliği ve ortak takvim düzeltmeleri

_2026-11-25_

- **Düzeltme:** ICS: noktalı virgül doğru kaçışlanır; tüm gün kayıtlar Berlin tarihine göre ve dışlayıcı bitişle yazılır (tek günlük kayıtlar Apple/Google'da kaybolmaz).
- **Düzeltme:** Abonelik dış takvimlerden senkronlanan kayıtları geri yayımlamaz, sahibinin takvim yetkisini denetler ve bağlantı dilini kullanır.
- **Düzeltme:** Ortak takvimden silmek silme yetkisi ister; ortak takvim, abonelik bağlantısı ve dış takvim işlemleri denetim kaydına yazılır.
- **Düzeltme:** iCloud yönlendirmeleri izinli sunuculara izlenir; izin verilmeyen sunucu adresi için anlaşılır hata.

### 1.3.15 — nav.json kategori ve alt modül tanımı

_2026-11-24_

- **İyileştirme:** Kullanıcı bazlı sol menü gruplama ve alt modül hiyerarşisi için nav.json eklendi.

### 1.3.14 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.3.13 — Çalışma zamanı modernizasyonu

_2026-11-20_

- **İyileştirme:** Günlük sütun yerleşiminde (layoutDay) dizi sıralama modern ECMAScript toSorted metoduyla yenilendi.

### 1.3.12 — Kod bakımı

_2026-11-19_

- **İyileştirme:** Kullanılmayan kod temizlendi; formlar alan değişikliklerini React Compiler ile uyumlu şekilde izliyor. Görünüm ve davranış değişmedi.

### 1.3.11 — Takvim sekreter özeti

_2026-11-18_

- **Yeni:** Kişisel ve ortak takvimlerin bugünkü/yarınki kayıt sayıları ve saat çakışmaları, gizlilik sınırları korunarak özetlenir.

### 1.3.10 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

Daha eski 15 herkese açık sürüm notu.
