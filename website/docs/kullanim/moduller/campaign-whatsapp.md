---
sidebar_position: 41
title: "WhatsApp"
description: "Kampanyalar için WhatsApp kanalı (Meta Cloud API, onaylı şablonla). Yalnız WhatsApp izni verenlere gider."
slug: /kullanim/moduller/campaign-whatsapp
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Kampanyalar için WhatsApp kanalı (Meta Cloud API, onaylı şablonla). Yalnız WhatsApp izni verenlere gider.

| | |
|---|---|
| Anahtar | `campaign-whatsapp` |
| Tür | Eklenti |
| Sürüm | 1.1.2 |
| Gerektirir | [Toplu e-posta](./mailings) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Toplu e-posta](./mailings) | okuma, yazma | Sağlayıcının teslim/okundu bildirimlerini doğrulayıp kampanya gönderim kaydına yazmak için. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| WhatsApp | görüntüleme | görüntüleme | görüntüleme | — | görüntüleme | — | — | — |

## Sürüm notları

### 1.1.2 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.1.0 — Teslim ve okundu bildirimi

_2026-11-07_

- **Yeni:** Meta webhook ile teslim edildi / okundu / başarısız (App Secret imzası doğrulanır).

### 1.0.0 — İlk sürüm

_2026-11-07_

- **Yeni:** Kampanyalar için WhatsApp kanalı (Meta Cloud API, onaylı şablonla). Yalnız WhatsApp izni verenlere gider.
