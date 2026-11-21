---
sidebar_position: 41
title: "Widget Platformu"
description: "Modüllerin üst çubuk ve paneller için bileşenlerini güvenli biçimde toplar."
slug: /kullanim/moduller/widgets
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Modüllerin üst çubuk ve paneller için bileşenlerini güvenli biçimde toplar.

| | |
|---|---|
| Anahtar | `widgets` |
| Tür | Çekirdek (her zaman açık) |
| Sürüm | 0.1.0 |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Widget'lar | görüntüleme, düzenleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme |

## Sürüm notları

### 0.1.0 — Widget kayıt altyapısı

_2026-11-21_

- **Yeni:** Modüller widget'larını kendi widget.ts dosyalarında tanımlar; kayıt derleme anında güvenli biçimde üretilir. Görünür değişiklik sonraki sürümlerde gelir.
