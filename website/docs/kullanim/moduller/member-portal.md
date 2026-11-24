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
| Sürüm | 0.2.0 |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Üyeler](./members) | okuma, yazma | Üyenin kendi ana verilerini salt okunur göstermek, düzeltme talebi kuyruğu ve rıza yönetimi için kullanılır. |
| [Bağışlar](./donations) | okuma | Üyenin kendi bağış makbuzlarını (Zuwendungsbestätigung) PDF olarak indirmesi için kullanılır. |
| [Öğrenciler](./students) | okuma | Veli bağlantılı öğrenci bilgilerini göstermek için kullanılır. |
| [E-posta Altyapısı](./mail) | yazma | Tek kullanımlık sihirli giriş bağlantısı ve çift onaylı rıza bağlantısı göndermek için kullanılır. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Üye Portalı Yönetimi | görüntüleme, düzenleme | görüntüleme | — | — | — | — | — | — |

## Sürüm notları

### 0.2.0 — Self-servis: düzeltme kuyruğu, rızalar ve makbuzlar (P2)

_2026-11-24_

- **Yeni:** Yönetim kurulu onay kuyruklu veri düzeltme önerileri, anında geri çekme + çift onaylı rıza yönetimi ve step-up korumalı imzalı PDF makbuz indirme eklendi.

### 0.1.0 — Parolasız üye portalı çekirdeği (P1)

_2026-11-23_

- **Yeni:** Sihirli bağlantı (15 dk, POST onaylı, nonce bağlı), oturum yönetimi (15 dk boşta / 8 sa mutlak / en fazla 3), WebAuthn passkey step-up ve salt okunur üye ana verisi eklendi.
