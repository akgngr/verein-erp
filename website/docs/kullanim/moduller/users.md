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
| Sürüm | 1.1.11 |
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

### 1.1.11 — Silinen kullanıcı için daha az kişisel veri

_2026-11-23_

- **Güvenlik:** Bir kullanıcı silindiğinde denetim kaydına artık adı ve e-posta adresi yazılmıyor; yalnız kimlik numarası ve rol tutuluyor.

### 1.1.10 — Kullanıcı dizini

_2026-11-20_

- **İyileştirme:** Yönetici ekranları için ad/e-posta ile aranabilen, sayfalı kullanıcı dizini (ör. bildirim aboneleri).

### 1.1.9 — Bildirim kitlesi

_2026-11-20_

- **İyileştirme:** Bildirim sistemi, duyurular için etkin kullanıcıları (isteğe bağlı role göre) listeleyebilir.

### 1.1.8 — Bildirim alıcısı eşleme

_2026-11-20_

- **İyileştirme:** Diğer modüller, bildirim alıcısını e-posta adresine göre etkin kullanıcılar arasından bulabilir.

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

Daha eski 6 herkese açık sürüm notu.
