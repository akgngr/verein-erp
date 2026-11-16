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
| Sürüm | 1.1.2 |
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

### 1.1.2 — AI veri sınıfı

_2026-11-15_

- **İyileştirme:** Bağış istatistiği aracı AI veri sınıfı "aggregate" olarak işaretlendi.

### 1.1.1 — AI veri sözleşmesi ve liste güvenilirliği

_2026-11-15_

- **İyileştirme:** AI çıktısı açık şema veya sayfalama metadatasıyla sınırlandırılır; kişi alanları eklenmez.

### 1.1.0 — İş akışı tetikleyicileri

_2026-11-06_

- **Yeni:** İş akışı tetikleyicisi: "Bağış kaydedildiğinde" (yöntem, tutar; {{donation.donorName}} vb.).

### 1.0.0 — İlk sürüm

_2026-10-29_

- **Yeni:** İlk sürüm.
