---
sidebar_position: 32
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
| Sürüm | 1.3.13 |
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

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Takvim | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma, düzenleme, silme | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme, oluşturma, düzenleme | görüntüleme |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`list_shared_calendar_entries` · `list_shared_calendars` · `propose_calendar_entry`

## Sürüm notları

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

### 1.3.8 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.3.7 — Mobilde alttan açılan çekmece

_2026-11-16_

- **İyileştirme:** Form/ayrıntı çekmecesi mobilde alttan açılır (masaüstünde sağdan).

### 1.3.6 — Asistan önerileri bulutta

_2026-11-16_

- **İyileştirme:** Asistanın öneri araçları (onay kartlı) bulut sağlayıcıda denetimli modda da kullanılabilir.

### 1.3.5 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

Daha eski 11 herkese açık sürüm notu.
