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
| Sürüm | 0.17.0 |
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

### 0.17.0 — PostgreSQL LISTEN/NOTIFY ile süreçler arası canlı SSE bildirimleri (#633)

_2026-11-27_

- **Yeni:** Bildirim SSE veriyolu PostgreSQL LISTEN/NOTIFY kanalıyla güçlendirildi; otomasyon worker'ının oluşturduğu bildirimler ve okundu/erteleme işlemleri tüm sekmelere anında ulaşır.

### 0.16.1 — Ayar merkezi grubu

_2026-11-26_

- **İyileştirme:** Ayar sayfaları ayar merkezinde kendi grubunda ve sırasında gösterilir.

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

Daha eski 13 herkese açık sürüm notu.
