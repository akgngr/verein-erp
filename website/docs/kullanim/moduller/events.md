---
sidebar_position: 13
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
| Sürüm | 1.2.3 |
| Sayfalar | `/events`, `/events?filter.timeFilter=upcoming`, `/events?filter.timeFilter=past` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Üyeler](./members) | okuma | Üyeye bağlı katılımcıların iletişim izinlerini (kampanya duyuruları) okumak için. |
| [Toplu e-posta](./mailings) | okuma | Katılımcılara duyuru için Kampanyalar sihirbazını hazır kaynakla açar. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Etkinlikler | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma, düzenleme, onay | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | — | görüntüleme |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`list_upcoming_events` · `propose_event`

## Sürüm notları

### 1.2.3 — Asistan araçları yeni veri sözleşmesinde

_2026-11-15_

- **Güvenlik:** Asistan araçları v2 veri sözleşmesine taşındı: modele giden her alan açıkça listelenir ve veri sınıfı bildirilir. Toplam ve kurumsal veriler denetimli bulut modunda da kullanılabilir; serbest kişisel içerik yalnız yerel modelde kalır.

### 1.2.2 — Sürümlü AI öneri ve sonuç sınırları

_2026-11-15_

- **Güvenlik:** Öneri araçları katı Zod girdisi ve sabit model sonucu kullanır; salt öneri sorguları gereksiz kişi detaylarını okumaz. Kalan eski okuma araçlarının dönüşümü ayrı sürer.

### 1.2.1 — AI veri sözleşmesi ve liste güvenilirliği

_2026-11-15_

- **İyileştirme:** AI çıktısı açık şema veya sayfalama metadatasıyla sınırlandırılır; kişi alanları eklenmez.

### 1.2.0 — Katılımcılara duyuru

_2026-11-07_

- **Yeni:** Etkinlik sayfasında "Katılımcılara duyur": Kampanyalar sihirbazı bu etkinliğin katılımcılarıyla açılır.

### 1.1.0 — Takvim entegrasyonu

_2026-11-06_

- **Yeni:** Kayıtlar Takvim modülünde salt okunur kaynak olarak görünür.

### 1.0.0 — İlk sürüm

_2026-10-29_

- **Yeni:** İlk sürüm.
