---
sidebar_position: 36
title: "Sosyal Giriş"
description: "Harici kimlik sağlayıcıları ve bağlı hesaplar."
slug: /kullanim/moduller/social-login
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Harici kimlik sağlayıcıları ve bağlı hesaplar.

| | |
|---|---|
| Anahtar | `social-login` |
| Tür | Resmî modül |
| Sürüm | 1.0.0 |
| Sayfalar | `/ayarlar/sosyal-giris` |
| Gerektirir | [Kimlik Doğrulama](./auth) (1.5.0) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Modül Yönetimi](./system) | okuma | Modülün etkinliğini doğrular. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Salt okunur | Öğretmen | TAX_ADVISOR |
|---|---|---|---|---|---|---|---|---|
| Sosyal giriş | görüntüleme, düzenleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | — |

## Sürüm notları

### 1.0.0 — Sosyal giriş

_2026-11-26_

- **Yeni:** OAuth sağlayıcı ayarları ve güvenli kimlik eşleştirme altyapısı.
