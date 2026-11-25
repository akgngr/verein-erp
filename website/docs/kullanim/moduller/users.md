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
| Sürüm | 1.4.2 |
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

### 1.4.2 — ADMIN yetki denetimleri, davet hız sınırı ve harici erişim sertleştirmesi

_2026-11-25_

- **Güvenlik:** Yönetici yetki korumaları, davet hız sınırı ve atomik işlem, harici erişim hibesi doğrulaması ve kanonik APP_URL bağlantıları eklendi (#574).

### 1.4.1 — Menü grubu ikon alanı kalıcılığı

_2026-11-25_

- **Düzeltme:** groupSchema içine icon alanı eklenerek özel grup ikonlarının veritabanında saklanması sağlandı.

### 1.4.0 — Davet bağlantısı

_2026-11-24_

- **Yeni:** Kullanıcılar (ör. kasa denetçisi veya vergi danışmanı) e-postayla tek kullanımlık, 72 saat geçerli bir davet bağlantısı alır ve şifresini kendisi belirler. E-postada şifre veya mali veri yoktur.

### 1.3.0 — Kullanıcı bazlı sol menü özelleştirme tercihi

_2026-11-24_

- **Yeni:** UserNavPreference modeli, /api/users/nav-preferences uç noktası ve DSGVO silme kancası eklendi.

### 1.2.0 — Vergi danışmanı (TAX_ADVISOR) rolü ve zaman sınırlı erişim

_2026-11-23_

- **Yeni:** Muhasebe ve finans raporları için salt okunur TAX_ADVISOR rolü ile varsayılan 14 / en fazla 90 günlük erişim penceresi yönetimi eklendi.

### 1.1.11 — Silinen kullanıcı için daha az kişisel veri

_2026-11-23_

- **Güvenlik:** Bir kullanıcı silindiğinde denetim kaydına artık adı ve e-posta adresi yazılmıyor; yalnız kimlik numarası ve rol tutuluyor.

### 1.1.10 — Kullanıcı dizini

_2026-11-20_

- **İyileştirme:** Yönetici ekranları için ad/e-posta ile aranabilen, sayfalı kullanıcı dizini (ör. bildirim aboneleri).

### 1.1.9 — Bildirim kitlesi

_2026-11-20_

- **İyileştirme:** Bildirim sistemi, duyurular için etkin kullanıcıları (isteğe bağlı role göre) listeleyebilir.

Daha eski 11 herkese açık sürüm notu.
