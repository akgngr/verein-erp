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
| Sürüm | 1.5.0 |

## Sürüm notları

### 1.5.0 — Güvenli harici hesap bağlama

_2026-11-26_

- **Güvenlik:** Kısa süreli tek kullanımlık OAuth bağlama niyeti ve yeniden parola doğrulaması.

### 1.4.0 — Dış giriş sağlayıcıları için platform

_2026-11-26_

- **Yeni:** Modüller giriş sağlayıcısı (OAuth/OIDC) ekleyebilir; sağlayıcılar istek anında yüklenir ve modül kapalıysa görünmez. Parola girişi değişmedi.
- **Güvenlik:** Dış sağlayıcıyla giriş yalnızca açıkça bağlanmış hesapla mümkündür; e-posta ile eşleme ve otomatik hesap oluşturma yoktur. İki adımlı doğrulaması açık hesaplar parola ile girer; yönlendirmeler yalnız aynı adrese yapılır.

### 1.3.0 — İki adımlı doğrulama (TOTP)

_2026-11-26_

- **Yeni:** Profilde isteğe bağlı iki adımlı doğrulama: doğrulama uygulamasıyla kurulum (anahtar veya bağlantı), onay kodu ve bir kez gösterilen 10 kurtarma kodu. Açıksa girişte parolanın ardından kod sorulur.
- **Güvenlik:** RFC 6238 (±30 sn tolerans); her kod bir kez geçer (tekrar oynatma koruması). Sır şifreli, kurtarma kodları yalnızca özet olarak saklanır; hatalı kodlar hesap kilidine sayılır. Kurulum/kapatma mevcut parolayı, kapatma ayrıca güncel kodu ister.
- **Düzeltme:** "Diğer tüm cihazlardan çıkış yap" sonrasında bu cihaz yanlışlıkla giriş sayfasına ("oturumunuz sonlandırıldı") yönlendirilmiyor; sayfa yeni oturum çereziyle yeniden yüklenir.

### 1.2.0 — Şifre sıfırlama ve oturum yönetimi

_2026-11-26_

- **Yeni:** Giriş sayfasında "Şifremi unuttum" bağlantısı; profilde "Diğer tüm cihazlardan çıkış yap" (mevcut şifreyle onay; bu cihaz açık kalır).
- **Güvenlik:** Oturum sürümü kullanıcı başına bir sayaç içerir; sayaç artınca diğer tüm oturumlar anında düşer. Mevcut oturumlar güncellemeyle düşmez.

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

Daha eski 6 herkese açık sürüm notu.
