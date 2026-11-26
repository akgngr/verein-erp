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
| Sürüm | 0.16.0 |
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

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Bildirimler | görüntüleme, düzenleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | — | görüntüleme | görüntüleme |

## Sürüm notları

### 0.16.0 — Kanal ayarları ve numara doğrulama

_2026-11-26_

- **Yeni:** Bildirim ayarlarında yöneticiler için SMS (seven.io/Twilio) ve WhatsApp (Meta Cloud API) bölümleri; anahtarlar yalnız yazılır, hiçbir zaman gösterilmez.
- **Yeni:** Kullanıcılar SMS ve WhatsApp numaralarını 6 haneli kodla doğrular (numara yalnız son haneleriyle gösterilir). WhatsApp kodu onaylı bir kimlik doğrulama şablonuyla gönderilir.
- **İyileştirme:** Tercih tablosunda yalnız gerçekten çalışan kanallar gösterilir; yapılandırılmamış kanal sütunu gizlenir.
- **Güvenlik:** SMS ve WhatsApp numara doğrulaması yalnız kodun gönderildiği numarayı doğrular; eşzamanlı yeni bir istek başka bir numarayı doğrulanmış yapamaz.

### 0.15.3 — Arayüz düzeltmeleri (#586)

_2026-11-25_

- **Düzeltme:** Bildirim tercihlerinde türler okunur adla, duyuru alıcılarında roller çevrilmiş adla gösterilir; zil rozeti mobil başlıkta kesilmez.

### 0.15.2 — Etkin kanal listesi

_2026-11-25_

- **İyileştirme:** Sağlık kokpiti etkin bildirim kanallarını public API ile okur (sır ve ayar döndürülmez).

### 0.15.1 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 0.15.0 — WhatsApp kanalı (hazır, kapalı)

_2026-11-23_

- **Yeni:** Meta WhatsApp Cloud API bağlantısı eklendi. Meta işletme doğrulaması ve şablon onayı teyit edilene kadar kanal kapalı kalır; mesaj yalnız sayı ve uygulama bağlantısı içerir.

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

Daha eski 11 herkese açık sürüm notu.
