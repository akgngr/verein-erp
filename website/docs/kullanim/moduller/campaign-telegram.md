---
sidebar_position: 39
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
| Sürüm | 1.1.0 |
| Gerektirir | [Toplu e-posta](./mailings) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Toplu e-posta](./mailings) | okuma, yazma | Webhook'ta bot ayarlarını (şifreli) okumak ve /start, /stop ile verilen/geri alınan Telegram rızasını kişinin kaydına yazmak için. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Telegram | görüntüleme | görüntüleme | görüntüleme | — | görüntüleme | — | — | — |

## Sürüm notları

### 1.1.0 — Açık rıza ve tek kullanımlık davet

_2026-11-25_

- **Güvenlik:** Telegram mesajı yalnız kişinin kaydında açık Telegram rızası varsa gönderilir; rızasını geri alan kişiye artık gitmez.
- **Güvenlik:** Davet bağlantısı ilk kullanımda yenilenir; iletilmiş eski bağlantı başka bir sohbeti bağlayamaz. /start rızayı kaydeder, /stop geri alır.
- **Güvenlik:** Webhook gövdesi boyutla sınırlıdır. Rıza eşitlemesi için Kampanyalar erişimi 'yazma' içerir; yönetici onayı yenilenmelidir.

### 1.0.2 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.0.0 — İlk sürüm

_2026-11-07_

- **Yeni:** Kampanyalar için Telegram kanalı (Bot API). Kişi davet bağlantısıyla abone olur; /stop ile ayrılır.
