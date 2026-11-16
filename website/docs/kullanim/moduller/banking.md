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
| Sürüm | 1.1.2 |
| Sayfalar | `/ayarlar/banka-baglantisi` |
| Gerektirir | [Muhasebe](./accounting) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Muhasebe](./accounting) | okuma, yazma | Banka hareketlerini muhasebe → Banka eşleştirmesine aktarmak ve banka hesaplarını listelemek için. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Banka bağlantısı | görüntüleme, düzenleme, onay | görüntüleme | — | görüntüleme, düzenleme, onay | görüntüleme | — | — |

## Sürüm notları

### 1.1.2 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.1.1 — Hydration düzeltmesi

_2026-11-06_

- **Düzeltme:** Banka bağlantısı ayarlarındaki sağlayıcı seçiminde oluşan hydration hatası giderildi.

### 1.1.0 — Bağımlılık

_2026-11-01_

- **İyileştirme:** Zorunlu: Muhasebe.

### 1.0.0 — Banka bağlantısı (PSD2)

_2026-11-01_

- **Yeni:** Lisanslı PSD2 sağlayıcısı (GoCardless Bank Account Data) ile banka bağlama; hesap eşleme ve hareket çekme. Hareketler Muhasebe → Banka eşleştirmesine düşer.
- **Güvenlik:** Banka giriş bilgileri uygulamaya gelmez; erişim salt okunur ve 90 günle sınırlı. Sağlayıcı anahtarları şifreli saklanır; IBAN ekranda maskelenir.
