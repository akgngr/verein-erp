---
sidebar_position: 21
title: "Kullanıcılar"
description: "Yönetici ve üye kullanıcı hesapları, roller ve erişim izinleri."
slug: /kullanim/moduller/users
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Yönetici ve üye kullanıcı hesapları, roller ve erişim izinleri.

| | |
|---|---|
| Anahtar | `users` |
| Tür | Çekirdek (her zaman açık) |
| Sürüm | 1.1.7 |
| Sayfalar | `/ayarlar/kullanicilar` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Modül Yönetimi](./system) | okuma, yazma | Modül rollerinin (örn. Öğretmen) kullanılabilir olup olmadığını görmek için kurulu ve etkin modülleri okur. Kullanıcı silinirken modüllerin kişisel veri temizliğini başlatır (KVKK/DSGVO silinme hakkı). |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Salt okunur | Sayman | Denetçi | Öğretmen |
|---|---|---|---|---|---|---|---|
| Kullanıcı Hesapları | görüntüleme, oluşturma, düzenleme, silme | — | — | — | — | — | — |

## Sürüm notları

### 1.1.7 — Kod bakımı

_2026-11-19_

- **İyileştirme:** Kullanılmayan kod temizlendi; formlar alan değişikliklerini React Compiler ile uyumlu şekilde izliyor. Görünüm ve davranış değişmedi.

### 1.1.6 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

### 1.1.4 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.1.3 — Şifre sıfırlama formu merkezi dialog katmanında

_2026-11-17_

- **İyileştirme:** Şifre sıfırlama penceresi merkezi FormModal, ActionButton ve notify bileşenlerine taşındı; modüldeki doğrudan HeroUI kullanımı azaltıldı.

### 1.1.2 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.1.1 — AI v2 güvenilirlik ve veri koruma

_2026-11-14_

- **Güvenlik:** Sunucu tarafından doğrulanan AI işlemleri, kapsamlı veri erişimi ve güvenilir yaşam döngüsü kontrolleri güncellendi.

### 1.1.0 — Silinme hakkı

_2026-11-07_

- **Güvenlik:** Kullanıcı silinirken tüm modüllerin kişisel verileri de silinir (KVKK md. 7 / DSGVO Art. 17); kurumsal kayıtlar yasal saklama gereği kalır. Temizlenemeyen modüller denetim kaydına yazılır.

### 1.0.2 — Worker için dar public API

_2026-11-03_

- **Düzeltme:** Worker kullanıcı sorgusu ve izin politikası, geniş sunucu barrel'ı yerine framework bağımsız automation giriş noktasından sunuldu.

Daha eski 2 herkese açık sürüm notu.
