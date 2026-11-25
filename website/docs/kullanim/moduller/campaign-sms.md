---
sidebar_position: 35
title: "SMS"
description: "Kampanyalar için SMS kanalı (seven.io veya Twilio). Yalnız SMS izni verenlere gider."
slug: /kullanim/moduller/campaign-sms
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Kampanyalar için SMS kanalı (seven.io veya Twilio). Yalnız SMS izni verenlere gider.

| | |
|---|---|
| Anahtar | `campaign-sms` |
| Tür | Eklenti |
| Sürüm | 1.1.3 |
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
| SMS | görüntüleme | görüntüleme | görüntüleme | — | görüntüleme | — | — | — |

## Sürüm notları

### 1.1.3 — Webhook sertleştirme

_2026-11-25_

- **Güvenlik:** Twilio ve seven.io webhook gövdeleri boyutla sınırlıdır; uygulama sırrı (AUTH_SECRET) yoksa seven.io gizli adresi üretilmez (fail closed).

### 1.1.2 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.1.0 — Teslim raporları

_2026-11-07_

- **Yeni:** seven.io (webhook) ve Twilio (mesaj başına durum bildirimi, imza doğrulamalı) teslim raporları.

### 1.0.0 — İlk sürüm

_2026-11-07_

- **Yeni:** Kampanyalar için SMS kanalı (seven.io veya Twilio). Yalnız SMS izni verenlere gider.
