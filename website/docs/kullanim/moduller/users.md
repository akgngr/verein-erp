---
sidebar_position: 24
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
| Sürüm | 1.6.1 |
| Sayfalar | `/ayarlar/kullanicilar` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Modül Yönetimi](./system) | okuma, yazma | Modül rollerinin (örn. Öğretmen) kullanılabilir olup olmadığını görmek için kurulu ve etkin modülleri okur. Kullanıcı silinirken modüllerin kişisel veri temizliğini başlatır (KVKK/DSGVO silinme hakkı). |
| [E-posta Altyapısı](./mail) | okuma, yazma | Davet e-postası göndermek için (yalnız tek kullanımlık bağlantı). |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Salt okunur | Sayman | Denetçi | TAX_ADVISOR | Öğretmen |
|---|---|---|---|---|---|---|---|---|
| Kullanıcı Hesapları | görüntüleme, oluşturma, düzenleme, silme | — | — | — | — | — | — | — |

## Sürüm notları

### 1.6.1 — Ayar merkezi grubu

_2026-11-26_

- **İyileştirme:** Ayar sayfaları ayar merkezinde kendi grubunda ve sırasında gösterilir.

### 1.6.0 — İki adımlı doğrulamayı sıfırlama

_2026-11-26_

- **Yeni:** Kullanıcılar tablosunda "İki adımlı doğrulamayı sıfırla" (kayıp telefon ve kurtarma kodları): doğrulama kaldırılır, tüm oturumlar sonlanır, işlem denetim kaydına yazılır.

### 1.5.0 — Şifre sıfırlama ve oturum yönetimi

_2026-11-26_

- **Yeni:** Kendi kendine şifre sıfırlama: tek kullanımlık, 30 dakika geçerli e-posta bağlantısı; adresin kayıtlı olup olmadığı yanıt veya süreden anlaşılmaz; IP ve adres başına sınır.
- **Yeni:** Yönetici, kullanıcı listesinden bir kullanıcının tüm oturumlarını sonlandırabilir (kayıp cihaz).
- **Güvenlik:** Davet ve sıfırlama bağlantıları amaç bazlıdır, birbirinin yerine kullanılamaz; şifre belirlenince bekleyen tüm bağlantılar geçersiz olur ve kilit kalkar.

### 1.4.4 — Yerel tarih alanları

_2026-11-26_

- **İyileştirme:** Harici erişim başlangıç ve bitiş zamanı (bitiş, başlangıçtan önce seçilemez) yerel biçimde (GG.AA.YYYY, 24 saat) takvimle seçilir; tarayıcıya bağlı aa/gg/yyyy biçimi kaldırıldı.

### 1.4.3 — ADMIN yetki denetimleri, davet hız sınırı ve harici erişim sertleştirmesi

_2026-11-25_

- **Güvenlik:** Yönetici yetki korumaları, davet hız sınırı ve atomik işlem, harici erişim hibesi doğrulaması ve kanonik APP_URL bağlantıları eklendi (#574).

### 1.4.2 — Arka plan için izin politikası yükleyicisi

_2026-11-25_

- **Güvenlik:** Rol ve izin politikası arka plan çalışanı tarafından da yüklenebilir (özel roller ve geçersiz kılmalar görevlerde geçerli).

### 1.4.1 — Menü grubu ikon alanı kalıcılığı

_2026-11-25_

- **Düzeltme:** groupSchema içine icon alanı eklenerek özel grup ikonlarının veritabanında saklanması sağlandı.

### 1.4.0 — Davet bağlantısı

_2026-11-24_

- **Yeni:** Kullanıcılar (ör. kasa denetçisi veya vergi danışmanı) e-postayla tek kullanımlık, 72 saat geçerli bir davet bağlantısı alır ve şifresini kendisi belirler. E-postada şifre veya mali veri yoktur.

Daha eski 16 herkese açık sürüm notu.
