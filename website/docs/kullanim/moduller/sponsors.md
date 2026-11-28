---
sidebar_position: 37
title: "Sponsorlar"
description: "Kurumsal ve bireysel sponsorluk kayıtlarının yönetimi."
slug: /kullanim/moduller/sponsors
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Kurumsal ve bireysel sponsorluk kayıtlarının yönetimi.

| | |
|---|---|
| Anahtar | `sponsors` |
| Tür | Eklenti |
| Sürüm | 1.1.0 |
| Sayfalar | `/sponsors` |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Sponsorlar | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma, düzenleme, silme | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | — | görüntüleme |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_sponsor_statistics`

## Sürüm notları

### 1.1.0 — Panel kartı, yapay zekâ istatistik aracı ve otomasyon olayı

_2026-11-28_

- **Yeni:** Ana panel için sponsor özet kartı (cards/index.tsx) eklendi.
- **Yeni:** Asistan v2 için kişisel veri içermeyen toplu istatistik aracı (get_sponsor_statistics) eklendi.
- **Yeni:** Yeni sponsor eklendiğinde tetiklenen iş akışı olayı (sponsors.created) eklendi.

### 1.0.0 — İlk sürüm — Sponsorluk yönetimi

_2026-11-27_

- **Yeni:** Sponsorluk kayıtları, seviye ve durum filtreleri, EUR tutar takibi, sağ çekmece formu ve toplu durum güncelleme eklendi.
