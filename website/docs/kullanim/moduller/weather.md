---
sidebar_position: 21
title: "Hava Durumu"
description: "Anlık konum bazlı hava durumu, tahminler, panel kartı ve sekreter etkinlik önerileri (Dış API: api.open-meteo.com)."
slug: /kullanim/moduller/weather
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Anlık konum bazlı hava durumu, tahminler, panel kartı ve sekreter etkinlik önerileri (Dış API: api.open-meteo.com).

| | |
|---|---|
| Anahtar | `weather` |
| Tür | Eklenti |
| Sürüm | 0.1.0 |
| Sayfalar | `/weather` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Dernek Bilgileri](./organization) | okuma | Dernek merkezi konumuna göre hava durumu tahminlerini almak için dernek adres bilgilerini okur. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Hava Durumu | görüntüleme, onay | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_current_weather`

## Sürüm notları

### 0.1.0 — Hava Durumu Modülü

_2026-11-20_

- **Yeni:** Konum bazlı anlık hava durumu, saatlik/günlük tahminler, şık dashboard kartı, AI aracı ve sekreter etkinlik önerisi entegrasyonu.
