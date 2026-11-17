---
sidebar_position: 31
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
| Sürüm | 1.3.8 |
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

### 1.3.4 — Asistan araçları yeni veri sözleşmesinde

_2026-11-15_

- **Güvenlik:** Asistan araçları v2 veri sözleşmesine taşındı: modele giden her alan açıkça listelenir ve veri sınıfı bildirilir. Toplam ve kurumsal veriler denetimli bulut modunda da kullanılabilir; serbest kişisel içerik yalnız yerel modelde kalır.

### 1.3.3 — Kullanıcı ve sistem bağı bildirildi

_2026-11-15_

- **Güvenlik:** Takvim senkronizasyonunun kullandığı kullanıcı ve modül durumu bilgileri artık bildirilmiş erişimle okunur. Yönetici erişimi bir kez yeniden onaylar.

### 1.3.2 — Sürümlü AI öneri ve sonuç sınırları

_2026-11-15_

- **Güvenlik:** Öneri araçları katı Zod girdisi ve sabit model sonucu kullanır; salt öneri sorguları gereksiz kişi detaylarını okumaz. Kalan eski okuma araçlarının dönüşümü ayrı sürer.

### 1.3.1 — AI listelerinde eksiksizlik ve sınır kontrolü

_2026-11-15_

- **Düzeltme:** AI listeleri sayfalama ve eksiksizlik bilgisi taşır; aşırı büyük takvim aralıkları kontrollü reddedilir.

Daha eski 7 sürüm: [releases.json](https://github.com/akgngr/verein-erp/blob/main/src/modules/calendar/releases.json)
