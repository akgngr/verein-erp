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
| Sürüm | 0.1.4 |
| Sayfalar | `/weather` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Dernek Bilgileri](./organization) | okuma | Dernek merkezi konumuna göre hava durumu tahminlerini almak için dernek adres bilgilerini okur. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Hava Durumu | görüntüleme, onay | görüntüleme | görüntüleme | görüntüleme | görüntüleme | — | görüntüleme | görüntüleme |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_current_weather`

## Sürüm notları

### 0.1.4 — nav.json kategori ve alt modül tanımı

_2026-11-24_

- **İyileştirme:** Kullanıcı bazlı sol menü gruplama ve alt modül hiyerarşisi için nav.json eklendi.

### 0.1.3 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 0.1.1 — Sunucu Taraflı Open-Meteo İstekleri ve Güvenlik Sıkılaştırma

_2026-11-20_

- **Düzeltme:** Hava durumu ve coğrafi arama (geocoding) istekleri tarayıcıdan sunucu eylemlerine (Server Action) taşındı; harici ağ istekleri channelFetch korumasına alındı; başarısız ağ durumlarında sahte veri yerine açık unavailable durumu sağlandı.

### 0.1.0 — Hava Durumu Modülü

_2026-11-20_

- **Yeni:** Konum bazlı anlık hava durumu, saatlik/günlük tahminler, şık dashboard kartı, AI aracı ve sekreter etkinlik önerisi entegrasyonu.
