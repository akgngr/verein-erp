---
sidebar_position: 2
title: "Apple Takvim"
description: "iCloud takvimini CalDAV ile salt okunur bağlar (Apple ID + uygulamaya özel parola)."
slug: /kullanim/moduller/calendar-apple
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

iCloud takvimini CalDAV ile salt okunur bağlar (Apple ID + uygulamaya özel parola).

| | |
|---|---|
| Anahtar | `calendar-apple` |
| Tür | Eklenti |
| Sürüm | 1.0.2 |
| Gerektirir | [Takvim](./calendar) |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Apple Takvim | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | — | görüntüleme | görüntüleme |

## Sürüm notları

### 1.0.2 — iCloud bağlantısı düzeltmeleri

_2026-11-25_

- **Düzeltme:** Takvim listesi kapanış etiketli CalDAV yanıtlarını da tanır; bölüm sunucusuna yönlendirmeler izlenir; tüm gün kayıtlar Berlin tarihine göre saklanır.

### 1.0.1 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.0.0 — İlk sürüm

_2026-11-06_

- **Yeni:** iCloud takvimini CalDAV ile salt okunur bağlar (Apple ID + uygulamaya özel parola).
