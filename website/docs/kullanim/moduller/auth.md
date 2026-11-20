---
sidebar_position: 22
title: "Kimlik Doğrulama"
description: "Kullanıcı girişi, oturum yönetimi ve parola güvenliği."
slug: /kullanim/moduller/auth
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Kullanıcı girişi, oturum yönetimi ve parola güvenliği.

| | |
|---|---|
| Anahtar | `auth` |
| Tür | Çekirdek (her zaman açık) |
| Sürüm | 1.0.7 |

## Sürüm notları

### 1.0.6 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.0.5 — Giriş ve profil yüzeyleri ortak kart katmanında

_2026-11-17_

- **İyileştirme:** Kart ve yüzey görünümleri ortak SurfaceCard/StatCard pattern'ine taşındı; modül bu kullanımda HeroUI Card implementasyonuna doğrudan bağlı değil.

### 1.0.4 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.0.3 — AI v2 güvenilirlik ve veri koruma

_2026-11-14_

- **Güvenlik:** Sunucu tarafından doğrulanan AI işlemleri, kapsamlı veri erişimi ve güvenilir yaşam döngüsü kontrolleri güncellendi.

### 1.0.2 — Silinme hakkı

_2026-11-07_

- **Güvenlik:** Kullanıcı silinince silinir: Kullanıcı profili (banka, adres, iletişim).

### 1.0.1 — Güvenlik ve oturum sağlamlaştırması

_2026-11-05_

- **Güvenlik:** Giriş denemesi kilitleme politikası ortaklaştırıldı ve test edilebilir hale getirildi.
- **Düzeltme:** Dosya yolu doğrulaması Windows ayraçlarını ve kontrol karakterlerini güvenli biçimde işler.

### 1.0.0 — İlk sürüm

_2026-10-29_

- **Yeni:** İlk sürüm.
