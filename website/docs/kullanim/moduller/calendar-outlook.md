---
sidebar_position: 29
title: "Outlook Takvim"
description: "Microsoft 365 / Outlook takvimini salt okunur bağlar (OAuth; yönetici kendi Azure uygulamasını girer)."
slug: /kullanim/moduller/calendar-outlook
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Microsoft 365 / Outlook takvimini salt okunur bağlar (OAuth; yönetici kendi Azure uygulamasını girer).

| | |
|---|---|
| Anahtar | `calendar-outlook` |
| Tür | Eklenti |
| Sürüm | 1.0.1 |
| Gerektirir | [Takvim](./calendar) |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Outlook Takvim | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | — | görüntüleme | görüntüleme |

## Sürüm notları

### 1.0.1 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.0.0 — İlk sürüm

_2026-11-06_

- **Yeni:** Microsoft 365 / Outlook takvimini salt okunur bağlar (OAuth; yönetici kendi Azure uygulamasını girer).
