---
sidebar_position: 4
title: "Banka bağlantısı"
description: "Banka hesaplarını lisanslı PSD2 sağlayıcısı üzerinden bağlar, hareketleri muhasebeye aktarır."
slug: /kullanim/moduller/banking
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Banka hesaplarını lisanslı PSD2 sağlayıcısı üzerinden bağlar, hareketleri muhasebeye aktarır.

| | |
|---|---|
| Anahtar | `banking` |
| Tür | Resmî modül |
| Sürüm | 1.1.9 |
| Sayfalar | `/ayarlar/banka-baglantisi` |
| Gerektirir | [Muhasebe](./accounting) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Muhasebe](./accounting) | okuma, yazma | Banka hareketlerini muhasebe → Banka eşleştirmesine aktarmak ve banka hesaplarını listelemek için. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Banka bağlantısı | görüntüleme, düzenleme, onay | görüntüleme | — | görüntüleme, düzenleme, onay | görüntüleme | — | — | — |

## Sürüm notları

### 1.1.9 — Callback tekrar koruma ve GoCardless belirteç sertleştirmesi

_2026-11-25_

- **Güvenlik:** Banka callback tekrar oynatma koruması, kanonik APP_URL doğrulaması ve GoCardless belirteç önbelleği / 401-429 hata yönetimi eklendi (#574).

### 1.1.8 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.1.6 — Kod bakımı

_2026-11-19_

- **İyileştirme:** Kullanılmayan kod temizlendi; formlar alan değişikliklerini React Compiler ile uyumlu şekilde izliyor. Görünüm ve davranış değişmedi.

### 1.1.5 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

### 1.1.3 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.1.2 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.1.1 — Hydration düzeltmesi

_2026-11-06_

- **Düzeltme:** Banka bağlantısı ayarlarındaki sağlayıcı seçiminde oluşan hydration hatası giderildi.

### 1.1.0 — Bağımlılık

_2026-11-01_

- **İyileştirme:** Zorunlu: Muhasebe.

Daha eski 1 herkese açık sürüm notu.
