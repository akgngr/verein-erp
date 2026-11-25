---
sidebar_position: 17
title: "Finans"
description: "Canlı döviz kurları, piyasa göstergeleri, kur çevirici ve finansal AI asistanı."
slug: /kullanim/moduller/finance
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Canlı döviz kurları, piyasa göstergeleri, kur çevirici ve finansal AI asistanı.

| | |
|---|---|
| Anahtar | `finance` |
| Tür | Eklenti |
| Sürüm | 0.2.1 |
| Sayfalar | `/finance`, `/finance/ayarlar` |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Finans | görüntüleme, onay | görüntüleme | görüntüleme | görüntüleme, onay | görüntüleme | görüntüleme | görüntüleme | görüntüleme |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_exchange_rates`

## Sürüm notları

### 0.2.1 — Sayfa yetkileri

_2026-11-25_

- **Güvenlik:** Döviz sayfası görüntüleme, ayarlar sayfası onay (ADMIN, TREASURER) izni ister; VIEWER ayarları doğrudan URL ile açamaz.

### 0.2.0 — Hafif döviz header widget'ı

_2026-11-24_

- **Yeni:** Kullanıcı tarafından açılabilen, yetki kontrollü ve tembel yüklenen EUR döviz widget'ı; manuel yenileme ve azaltılmış hareket desteği.

### 0.1.4 — nav.json kategori ve alt modül tanımı

_2026-11-24_

- **İyileştirme:** Kullanıcı bazlı sol menü gruplama ve alt modül hiyerarşisi için nav.json eklendi.

### 0.1.3 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR rolü için salt okunur görüntüleme izni tanımlandı.

### 0.1.1 — Sunucu Taraflı Kur Getirme ve Güvenlik Sıkılaştırma

_2026-11-20_

- **Düzeltme:** Döviz kuru istekleri tarayıcıdan sunucu eylemine (Server Action) taşındı; harici ağ istekleri channelFetch korumasına alındı.

### 0.1.0 — Finans ve Döviz Modülü

_2026-11-20_

- **Yeni:** Canlı döviz kurları (EUR, USD, TRY, CHF, GBP), kur çevirici, ayarlar, modern panel kartı ve AI aracı.
