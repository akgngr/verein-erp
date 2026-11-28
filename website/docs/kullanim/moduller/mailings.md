---
sidebar_position: 40
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
| Sürüm | 2.7.3 |
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

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Kampanyalar | görüntüleme, oluşturma, onay | görüntüleme, oluşturma, onay | görüntüleme, oluşturma | — | görüntüleme | — | — | — |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_campaign_statistics` · `list_campaign_audiences` · `list_campaigns` · `propose_campaign_draft` · `propose_dues_reminder_draft`

## Sürüm notları

### 2.7.3 — Ortak adrese tek gönderim

_2026-11-28_

- **Düzeltme:** Kampanyada aynı kanal adresini (ör. ailenin ortak e-postası) paylaşan uygun alıcılar artık mesajı tek kez alır; tekilleştirme izin denetiminden sonra yapılır, böylece izni olmayan ilk kayıt izni olan ikinciyi engellemez.

### 2.7.2 — Yerel tarih alanları

_2026-11-26_

- **İyileştirme:** Zamanlanmış gönderim tarihi/saati yerel biçimde (GG.AA.YYYY, 24 saat) takvimle seçilir; tarayıcıya bağlı aa/gg/yyyy biçimi kaldırıldı.

### 2.7.1 — Kanonik APP_URL kampanya bağlantıları

_2026-11-25_

- **Güvenlik:** Kampanya abonelik iptali ve bağlantı üretiminde kanonik APP_URL kökü kullanıldı (#574).

### 2.7.0 — Tek tıkla çıkış ve güvenilir gönderim

_2026-11-25_

- **Yeni:** E-postalarda List-Unsubscribe / List-Unsubscribe-Post başlıkları ve kişiye özel tek tıkla çıkış adresi; çıkış kaynağın kaydında toplu e-posta itirazını işaretler. Metinde {unsubscribeLink} yer tutucusu kullanılabilir.
- **Düzeltme:** Gönderim sonuçları her 20 mesajda kaydedilir; ara hatadan sonra yeniden deneme gönderilmiş SMS/WhatsApp'ları tekrar göndermez.
- **Düzeltme:** Sonradan gelen 'başarısız' teslim bildirimleri kampanya sayaçlarına yansır; programatik toplu e-posta worker kuyruğundan gönderilir.

### 2.6.2 — nav.json kategori ve alt modül tanımı

_2026-11-24_

- **İyileştirme:** Kullanıcı bazlı sol menü gruplama ve alt modül hiyerarşisi için nav.json eklendi.

### 2.6.1 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 2.6.0 — Asistandan aidat hatırlatma taslağı

_2026-11-23_

- **Yeni:** Asistan, aidatı açık olan aktif üyeler için nazik bir hatırlatma kampanyasını taslak olarak önerebilir. Alıcıları ve tutarları görmez; taslağı siz onaylarsınız, gönderimi ayrıca Kampanyalar'dan başlatırsınız.

### 2.5.0 — Gizlilik dostu e-posta izleme

_2026-11-23_

- **Güvenlik:** Yeni kampanyalarda açılma/tıklama izleme artık varsayılan olarak kapalı; gerekirse kampanya sihirbazında açılabilir. Mevcut kampanyalar değişmedi.
- **Güvenlik:** Tarayıcısı Global Privacy Control (Sec-GPC) gönderen alıcıların açılma ve tıklamaları kaydedilmez; bağlantılar yine çalışır.

Daha eski 23 herkese açık sürüm notu.
