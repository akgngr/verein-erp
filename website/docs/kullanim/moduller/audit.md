---
sidebar_position: 9
title: "Denetim Kayıtları"
description: "Sistem işlemlerinin değiştirilemez güvenlik ve denetim logları."
slug: /kullanim/moduller/audit
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Sistem işlemlerinin değiştirilemez güvenlik ve denetim logları.

| | |
|---|---|
| Anahtar | `audit` |
| Tür | Çekirdek (her zaman açık) |
| Sürüm | 1.0.2 |
| Sayfalar | `/ayarlar/denetim-kaydi` |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Salt okunur | Sayman | Denetçi | Öğretmen |
|---|---|---|---|---|---|---|---|
| Güvenlik & Değişiklik Günlüğü | görüntüleme | — | — | — | — | — | — |

## Sürüm notları

### 1.0.2 — Denetim eylem rozeti ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Rozet/çip görünümleri ortak StatusChip pattern'ine taşındı; modül düzeyindeki doğrudan HeroUI Chip bağımlılığı azaltıldı.

### 1.0.1 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.0.0 — İlk sürüm

_2026-10-29_

- **Yeni:** İlk sürüm.
