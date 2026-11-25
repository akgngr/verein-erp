---
sidebar_position: 23
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
| Sürüm | 1.1.2 |

## Sürüm notları

### 1.1.2 — Zorunlu parola değişimi kilidi ve oturum sertleştirmesi

_2026-11-25_

- **Güvenlik:** Zorunlu parola değişimi sunucu tarafı kilit mekanizması, şifre değişikliğinde oturum iptali ve giriş sertleştirmesi eklendi (#572).

### 1.1.1 — Davet sayfası

_2026-11-24_

- **İyileştirme:** Davet bağlantısı sayfası (/davet/…) oturum açmadan açılabilir; belirteç sunucuda doğrulanır.

### 1.1.0 — Zaman sınırlı harici erişim doğrulaması

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR rolü için oturum, modül kapsamı ve süre sonu denetimi sunucu tarafında zorunlu hale getirildi ve her görünüm denetim kaydına yazıldı.

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

Daha eski 2 herkese açık sürüm notu.
