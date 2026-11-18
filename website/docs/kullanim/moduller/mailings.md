---
sidebar_position: 34
title: "Toplu e-posta"
description: "Üyelere, velilere ve diğer modüllerin alıcı listelerine kişiye özel toplu e-posta."
slug: /kullanim/moduller/mailings
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Üyelere, velilere ve diğer modüllerin alıcı listelerine kişiye özel toplu e-posta.

| | |
|---|---|
| Anahtar | `mailings` |
| Tür | Resmî modül |
| Sürüm | 2.4.7 |
| Sayfalar | `/toplu-eposta`, `/toplu-eposta/ayarlar` |
| Gerektirir | [E-posta Altyapısı](./mail), [Otomasyon](./automation) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [E-posta Altyapısı](./mail) | okuma, yazma | E-postaları göndermek ve e-posta ayarlarının hazır olup olmadığını okumak için. |
| [Modül Yönetimi](./system) | okuma | Yalnızca etkin modüllerin alıcı listelerini göstermek için modül durumlarını okur. |
| [Otomasyon](./automation) | yazma | Kampanyaları iş akışı olarak oluşturmak, yayımlamak ve arka plan kuyruğunda çalıştırmak için. |
| [Kullanıcılar](./users) | okuma | Gönderimi başlatan kullanıcının hesabını ve güncel rolünü worker çalışırken yeniden doğrulamak için. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Kampanyalar | görüntüleme, oluşturma, onay | görüntüleme, oluşturma, onay | görüntüleme, oluşturma | — | görüntüleme | — | — |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_campaign_statistics` · `list_campaign_audiences` · `list_campaigns` · `propose_campaign_draft`

## Sürüm notları

### 2.4.7 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 2.4.6 — Asistan önerileri bulutta

_2026-11-16_

- **İyileştirme:** Asistanın öneri araçları (onay kartlı) bulut sağlayıcıda denetimli modda da kullanılabilir.

### 2.4.5 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 2.4.4 — Asistan araçları yeni veri sözleşmesinde

_2026-11-15_

- **Güvenlik:** Asistan araçları v2 veri sözleşmesine taşındı: modele giden her alan açıkça listelenir ve veri sınıfı bildirilir. Toplam ve kurumsal veriler denetimli bulut modunda da kullanılabilir; serbest kişisel içerik yalnız yerel modelde kalır.

### 2.4.3 — Sürümlü AI öneri ve sonuç sınırları

_2026-11-15_

- **Güvenlik:** Öneri araçları katı Zod girdisi ve sabit model sonucu kullanır; salt öneri sorguları gereksiz kişi detaylarını okumaz. Kalan eski okuma araçlarının dönüşümü ayrı sürer.

### 2.4.2 — AI listelerinde eksiksizlik ve sınır kontrolü

_2026-11-15_

- **Düzeltme:** AI listeleri sayfalama ve eksiksizlik bilgisi taşır; aşırı büyük takvim aralıkları kontrollü reddedilir.

### 2.4.1 — Kanal açıklaması düzeltmesi

_2026-11-07_

- **Düzeltme:** Telegram kanal açıklamasındaki {telegramLink} yer tutucusu konsol hatası veriyordu; artık düz metin olarak gösteriliyor.

### 2.4.0 — Tek kişiye işlem mesajı gönderimi (ör. form bağlantısı)

_2026-11-07_

- **Yeni:** Tek kişiye işlem mesajı gönderimi (ör. form bağlantısı)

Daha eski 14 herkese açık sürüm notu.
