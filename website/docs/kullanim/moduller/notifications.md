---
sidebar_position: 5
title: "Bildirimler"
description: "Tüm modüllerin bildirimleri tek yerde; kanal tercihleri ve rızalar."
slug: /kullanim/moduller/notifications
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Tüm modüllerin bildirimleri tek yerde; kanal tercihleri ve rızalar.

| | |
|---|---|
| Anahtar | `notifications` |
| Tür | Çekirdek (her zaman açık) |
| Sürüm | 0.6.0 |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Kullanıcılar](./users) | okuma | Bildirimin alıcısı etkin mi ve rolü bu bildirimi görmeye yetiyor mu, gönderim ve okuma anında denetlenir. |
| [Modül Yönetimi](./system) | okuma | Bildirimi üreten modülün açık ve onaylı olup olmadığını okur. |
| [E-posta Altyapısı](./mail) | yazma | Bildirim e-postalarını mevcut e-posta altyapısıyla gönderir (yalnız genel metin ve uygulama bağlantısı). |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Bildirimler | görüntüleme, düzenleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme |

## Sürüm notları

### 0.6.0 — Herkese ve role göre bildirim, kurum duyurusu

_2026-11-20_

- **Yeni:** Bildirimler ilgili kişiye, herkesi ilgilendiriyorsa herkese gider: modüller 'herkes' veya 'şu roller' diye kitle seçebilir. Yönetici kurum duyurusu yayımlayabilir (herkese veya seçilen rollere).
- **Güvenlik:** Kitle içinde de herkesin yetkisi ayrı ayrı denetlenir; duyuru içeriği şifreli saklanır ve dış kanallara gitmez (yalnız genel metin ve bağlantı).

### 0.5.0 — Tarayıcı bildirimleri (Web Push)

_2026-11-20_

- **Yeni:** Yönetici açtığında kullanıcılar bildirimleri tarayıcı/telefon bildirimi olarak da alabilir. Gerekli anahtarlar ilk açılışta otomatik üretilir.
- **Güvenlik:** Anahtarlar ve abonelik bilgileri şifreli saklanır; yalnız bilinen push servislerine gönderilir; bildirimde yalnız genel metin ve bağlantı vardır. Geçersiz abonelikler otomatik silinir.

### 0.4.0 — Telegram bildirimleri

_2026-11-20_

- **Yeni:** Yönetici bir Telegram botu tanımlayabilir; kullanıcılar tek tıkla açılan bağlantıyla hesaplarını bağlar ve bildirimleri Telegram'dan da alır. /stop ile bağ kaldırılır.
- **Güvenlik:** Bot token veritabanında şifreli saklanır ve geri gösterilmez; bağlama bağlantısı tek kullanımlık ve 15 dakika geçerlidir; Telegram'a yalnız genel metin ve uygulama bağlantısı gider.

### 0.3.0 — Bildirim tercihleri ve e-posta

_2026-11-20_

- **Yeni:** Her bildirim türü için hangi kanaldan haber almak istediğinizi seçebilirsiniz; sessiz saat ve 'anında' ya da 'günlük özet' seçeneği eklendi. E-posta kanalı çalışıyor.
- **Güvenlik:** E-postada yalnız genel metin ve uygulama bağlantısı bulunur; ad, başlık veya tutar gitmez. Aynı bildirim ikinci kez e-postalanmaz; okunan bildirim e-postalanmaz.

### 0.2.0 — Bildirim kutusu servisi

_2026-11-20_

- **Yeni:** Modüller bildirim gönderebilir; her alıcının yetkisi gönderimde ve okumada yeniden denetlenir, aynı olay için ikinci bildirim oluşmaz. Okundu, tümünü okundu, ertele ve kapat işlemleri eklendi.
- **Güvenlik:** Bildirimler 90 gün sonra otomatik silinir.

### 0.1.0 — Merkezi bildirim altyapısı

_2026-11-20_

- **Yeni:** Modüllerin bildirim türlerini tanımladığı ortak sözleşme ve bildirim tabloları eklendi. Görünür değişiklik sonraki sürümlerde gelir.
- **Güvenlik:** Bildirim içerikleri şifreli saklanır; sağlayıcı sırları veritabanında şifreli tutulur ve geri gösterilmez; kullanıcı silinince bildirimleri de silinir.
