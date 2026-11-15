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
| Sürüm | 2.4.4 |
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

### 2.3.0 — Teslim, açılma ve tıklama izleme

_2026-11-07_

- **Yeni:** Alıcı başına gönderim kaydı: gönderildi, teslim edildi, açıldı/okundu, tıkladı; panoda kampanya hunisi.
- **Yeni:** E-postada açılma pikseli ve imzalı tıklama bağlantıları (kampanya başına açılıp kapatılabilir); SMS/WhatsApp sağlayıcı bildirimleri işlenir.

### 2.2.0 — E-posta şablon editörü, yeni hedef kitleler

_2026-11-07_

- **Yeni:** Yeni blok tabanlı e-posta editörü: solda bileşenler (başlık, metin, buton, görsel, ayırıcı, boşluk, 2/3 sütun, alt bilgi), ortada tuval, sağda seçili bloğun ayarları ve modülün yer tutucuları; masaüstü/mobil önizleme. Çıktı e-posta istemcileriyle uyumlu tablo düzenli HTML.
- **Yeni:** Etkinlik ve toplantı katılımcıları hedef kitle olarak; diğer modüllerden sihirbaz ön seçimle açılabilir.
- **Düzeltme:** Kampanya kartlarında iç içe düğme (hydration) hatası giderildi; taslaklar "Düzenle" ile açılır.

### 2.1.0 — Kanal eklentileri

_2026-11-07_

- **Yeni:** SMS, Telegram ve WhatsApp eklentileri kampanyalara otomatik eklenir; Kampanyalar → Ayarlar'da sağlayıcı bilgileri (şifreli).
- **Yeni:** E-posta dışı kanallarda gönderim kaydı ile yeniden denemede çift gönderim önlenir; {telegramLink} yer tutucusuyla e-postadan Telegram'a davet.

Daha eski 11 sürüm: [releases.json](https://github.com/akgngr/verein-erp/blob/main/src/modules/mailings/releases.json)
