---
sidebar_position: 19
title: "Google Takvim"
description: "Google Takvim hesabını takvime salt okunur bağlar (OAuth; yönetici kendi Google Cloud uygulamasını girer)."
slug: /kullanim/moduller/calendar-google
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Google Takvim hesabını takvime salt okunur bağlar (OAuth; yönetici kendi Google Cloud uygulamasını girer).

| | |
|---|---|
| Anahtar | `calendar-google` |
| Tür | Eklenti |
| Sürüm | 1.0.1 |
| Gerektirir | [Takvim](./calendar) |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Google Takvim | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | — | görüntüleme | görüntüleme |

## Sürüm notları

### 1.0.1 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.0.0 — İlk sürüm

_2026-11-06_

- **Yeni:** Google Takvim hesabını takvime salt okunur bağlar (OAuth; yönetici kendi Google Cloud uygulamasını girer).
