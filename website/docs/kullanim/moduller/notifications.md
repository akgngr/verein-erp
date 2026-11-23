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
| Sürüm | 0.14.0 |
| Sayfalar | `/ayarlar/bildirimler`, `/ayarlar/bildirimler/duyurular`, `/ayarlar/bildirimler/aboneler` |

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

### 0.14.0 — Yönetici abone görünümü ekranı

_2026-11-23_

- **Yeni:** Ayarlar → Bildirimler → Aboneler ekranı eklendi: kanal başına özet kartları, kullanıcı tablosu (e-posta/Telegram/Web Push durum rozetleri), arama, kanal filtresi ve onaylı bağlantı kaldırma.

### 0.13.0 — Anlık bildirim akışı (SSE) ve erişilebilirlik

_2026-11-23_

- **Yeni:** Yoklama yerine Server-Sent Events (SSE) ile anlık okunmamış sayısı ve güncelleme akışı (/api/notifications/stream); bağlantı koptuğunda zarif biçimde yoklamaya geri düşme ve sekme gizliyken duraklatma.
- **İyileştirme:** Bildirim çekmecesi için aria-live, aria-haspopup, genişletilmiş durum yönetimi ve ekran okuyuculara yönelik bağlamsal buton etiketleri ile tam erişilebilirlik sağlandı.
- **Güvenlik:** SSE akışı kullanıcı bazında katı şekilde yalıtılmıştır; akış üzerinden kişisel veri (PII) iletilmez, yalnızca hafif sinyal ve sayılar taşınır.

### 0.12.0 — Yönetici duyuru gönderme ekranı

_2026-11-22_

- **Yeni:** Yöneticiler duyuruyu herkese veya seçilen rollere onay penceresinden gönderebilir ve gerçek alıcı sayısını görebilir.

### 0.11.0 — Bildirim zili ve tercih ekranı

_2026-11-22_

- **Yeni:** Sağ üstte bildirim zili ve okunmamış rozeti; sağ çekmecede bildirimler (okundu, tümünü okundu, ertele). Zil Widget Platformu üzerinden eklenir.
- **Yeni:** Ayarlar → Bildirimler: tür × kanal tercihleri, sessiz saatler, günlük özet, Telegram bağlama ve tarayıcı (push) bildirimleri.

### 0.10.0 — Web Push istemci ve PWA manifest

_2026-11-21_

- **Yeni:** Web Push istemci bileşenleri (PushToggle, PushCard), tarayıcı izin akışı ve PWA manifest desteği eklendi.
- **Yeni:** public/sw.js ile anlık bildirim gösterimi, güvenli aynı kökenli bağlantı yönlendirmesi ve pushsubscriptionchange desteği sağlandı.
- **İyileştirme:** iOS cihazlarda PWA ana ekrana ekleme rehberi ve desteklenmeyen tarayıcılarda zarif geri çekilme sağlandı.

### 0.9.0 — SMS kanalı ve iş akışında bildirim

_2026-11-20_

- **Yeni:** Yönetici isterse SMS kanalını (seven.io veya Twilio) açabilir; kullanıcı numarasını kodla doğrular. Varsayılan kapalıdır.
- **Yeni:** Otomasyonlarda yeni adım: 'Bildirim gönder' — herkese veya seçilen rollere kurum içi bildirim.
- **Güvenlik:** SMS anahtarı veritabanında şifreli, numara şifreli; doğrulama kodu yalnız hash, 15 dakika, sınırlı deneme. SMS'e yalnız genel metin ve bağlantı gider.

### 0.8.0 — Tür özel dış kanal metni

_2026-11-20_

- **İyileştirme:** Bildirim türü, dış kanallar için yalnız sayı/tarih içeren kısa bir metin verebilir (ör. günlük özet: '12 kayıt, 2 acil'); yoksa genel metin kullanılır. Sekreter tercihlerinin taşınması için içe alma işlevleri eklendi.

### 0.7.0 — Abone görünümü (yönetici)

_2026-11-20_

- **Yeni:** Yönetici, hangi kullanıcının hangi bildirim kanalını kullandığını görebilir (e-posta tercihi, Telegram bağı, tarayıcı bildirimi cihaz sayısı) ve gerekirse bir kullanıcının Telegram bağını veya tarayıcı aboneliklerini kaldırabilir.
- **Güvenlik:** Görünümde adres, sohbet kimliği veya cihaz adresi yoktur; her görüntüleme ve kaldırma denetim kaydına yazılır.

Daha eski 6 herkese açık sürüm notu.
