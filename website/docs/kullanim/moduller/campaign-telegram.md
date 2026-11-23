---
sidebar_position: 37
title: "Telegram"
description: "Kampanyalar için Telegram kanalı (Bot API). Kişi davet bağlantısıyla abone olur; /stop ile ayrılır."
slug: /kullanim/moduller/campaign-telegram
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Kampanyalar için Telegram kanalı (Bot API). Kişi davet bağlantısıyla abone olur; /stop ile ayrılır.

| | |
|---|---|
| Anahtar | `campaign-telegram` |
| Tür | Eklenti |
| Sürüm | 1.0.1 |
| Gerektirir | [Toplu e-posta](./mailings) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Toplu e-posta](./mailings) | okuma | Webhook'ta bot ayarlarını (şifreli) okumak için. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Telegram | görüntüleme | görüntüleme | görüntüleme | — | görüntüleme | — | — |

## Sürüm notları

### 1.0.0 — İlk sürüm

_2026-11-07_

- **Yeni:** Kampanyalar için Telegram kanalı (Bot API). Kişi davet bağlantısıyla abone olur; /stop ile ayrılır.
