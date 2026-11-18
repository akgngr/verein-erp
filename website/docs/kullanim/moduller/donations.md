---
sidebar_position: 3
title: "Bağışlar"
description: "Bağış kayıtları, bağış makbuzu (Zuwendungsbestätigung) ve bağışçı takibi."
slug: /kullanim/moduller/donations
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Bağış kayıtları, bağış makbuzu (Zuwendungsbestätigung) ve bağışçı takibi.

| | |
|---|---|
| Anahtar | `donations` |
| Tür | Resmî modül |
| Sürüm | 1.1.8 |
| Sayfalar | `/bagislar`, `/bagislar/bagiscilar`, `/bagislar/bildirimler`, `/bagislar/bildirimler/olustur`, `/bagislar/ayarlar` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Muhasebe](./accounting) | okuma, yazma | Bağışları gelir fişi olarak yazar ve iptal eder. |
| [Üyeler](./members) | okuma | Bağış makbuzu için üye adresini ve aidat ödemelerini okur. |
| [Dernek Bilgileri](./organization) | okuma | Bağış makbuzunda dernek bilgilerini kullanır. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Bağış ve Makbuzlar | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme | — | görüntüleme, oluşturma, düzenleme, silme, onay | — | — | — |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_donation_statistics`

## Sürüm notları

### 1.1.8 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

### 1.1.6 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.1.5 — İstatistik kartları ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Kart ve yüzey görünümleri ortak SurfaceCard/StatCard pattern'ine taşındı; modül bu kullanımda HeroUI Card implementasyonuna doğrudan bağlı değil.

### 1.1.4 — İptal eylemi ortak buton katmanında

_2026-11-17_

- **İyileştirme:** Buton görünümü ve etkileşim semantiği ortak ActionButton pattern'ine taşındı; modül bu kullanımda HeroUI Button implementasyonuna doğrudan bağlı değil.

### 1.1.3 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.1.2 — AI veri sınıfı

_2026-11-15_

- **İyileştirme:** Bağış istatistiği aracı AI veri sınıfı "aggregate" olarak işaretlendi.

### 1.1.1 — AI veri sözleşmesi ve liste güvenilirliği

_2026-11-15_

- **İyileştirme:** AI çıktısı açık şema veya sayfalama metadatasıyla sınırlandırılır; kişi alanları eklenmez.

### 1.1.0 — İş akışı tetikleyicileri

_2026-11-06_

- **Yeni:** İş akışı tetikleyicisi: "Bağış kaydedildiğinde" (yöntem, tutar; {{donation.donorName}} vb.).

Daha eski 1 herkese açık sürüm notu.
