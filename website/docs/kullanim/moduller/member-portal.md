---
sidebar_position: 41
title: "Üye Portalı"
description: "Parolasız sihirli bağlantı ve geçiş anahtarı ile üye self-servis portalı."
slug: /kullanim/moduller/member-portal
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Parolasız sihirli bağlantı ve geçiş anahtarı ile üye self-servis portalı.

| | |
|---|---|
| Anahtar | `member-portal` |
| Tür | Eklenti |
| Sürüm | 0.1.0 |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Üyeler](./members) | okuma | Üyenin kendi ana verilerini salt okunur göstermek için kullanılır. |
| [Öğrenciler](./students) | okuma | Veli bağlantılı öğrenci bilgilerini göstermek için kullanılır. |
| [E-posta Altyapısı](./mail) | yazma | Tek kullanımlık sihirli giriş bağlantısı göndermek için kullanılır. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Üye Portalı Yönetimi | görüntüleme, düzenleme | görüntüleme | — | — | — | — | — | — |

## Sürüm notları

### 0.1.0 — Parolasız üye portalı çekirdeği (P1)

_2026-11-23_

- **Yeni:** Sihirli bağlantı (15 dk, POST onaylı, nonce bağlı), oturum yönetimi (15 dk boşta / 8 sa mutlak / en fazla 3), WebAuthn passkey step-up ve salt okunur üye ana verisi eklendi.
