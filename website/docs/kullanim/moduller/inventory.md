---
sidebar_position: 12
title: "Envanter ve Demirbaş"
description: "Dernek demirbaşları, teknik ekipmanlar ve zimmet kayıtlarının takibi."
slug: /kullanim/moduller/inventory
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Dernek demirbaşları, teknik ekipmanlar ve zimmet kayıtlarının takibi.

| | |
|---|---|
| Anahtar | `inventory` |
| Tür | Resmî modül |
| Sürüm | 1.1.5 |
| Sayfalar | `/inventory`, `/inventory/kategoriler` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Muhasebe](./accounting) | yazma | İşaretli eşyaları muhasebede demirbaş (AfA) olarak açar ve senkron tutar. |
| [Modül Yönetimi](./system) | okuma | Muhasebe modülünün etkin olup olmadığını okur. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Envanter | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | — | görüntüleme |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_inventory_overview` · `list_inventory_items` · `propose_delete_inventory_item` · `propose_inventory_item` · `propose_inventory_status`

## Sürüm notları

### 1.1.5 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.1.4 — Asistan araçları yeni veri sözleşmesinde

_2026-11-15_

- **Güvenlik:** Asistan araçları v2 veri sözleşmesine taşındı: modele giden her alan açıkça listelenir ve veri sınıfı bildirilir. Toplam ve kurumsal veriler denetimli bulut modunda da kullanılabilir; serbest kişisel içerik yalnız yerel modelde kalır.

### 1.1.3 — Sürümlü AI öneri ve sonuç sınırları

_2026-11-15_

- **Güvenlik:** Öneri araçları katı Zod girdisi ve sabit model sonucu kullanır; salt öneri sorguları gereksiz kişi detaylarını okumaz. Kalan eski okuma araçlarının dönüşümü ayrı sürer.

### 1.1.2 — AI v2 takip paketi

_2026-11-15_

- **İyileştirme:** AI iş akışında sayfalama, sorgu sözleşmesi veya worker iptal kontrolü güçlendirildi.

### 1.1.1 — AI v2 güvenilirlik ve veri koruma

_2026-11-14_

- **Güvenlik:** Sunucu tarafından doğrulanan AI işlemleri, kapsamlı veri erişimi ve güvenilir yaşam döngüsü kontrolleri güncellendi.

### 1.1.0 — Muhasebe demirbaş senkronu

_2026-11-01_

- **Yeni:** "Muhasebede demirbaş (AfA) olarak izle": muhasebe modülü etkinse eşya demirbaş olarak açılır; ad, alım tarihi, bedel ve hurdaya çıkarma senkron.

### 1.0.0 — İlk sürüm

_2026-10-29_

- **Yeni:** İlk sürüm.
