---
sidebar_position: 30
title: "Sekreter"
description: "Kişisel sekreter: sabah özeti ve onaylı öneriler."
slug: /kullanim/moduller/secretary
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Kişisel sekreter: sabah özeti ve onaylı öneriler.

| | |
|---|---|
| Anahtar | `secretary` |
| Tür | Eklenti |
| Sürüm | 0.11.2 |
| Sayfalar | `/sekreter` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Modül Yönetimi](./system) | okuma | Hangi modüllerin açık ve onaylı olduğunu okur; özet yalnız bunların katkılarını gösterir. |
| [Kullanıcılar](./users) | okuma | Günlük özeti yalnız etkin ve sekreter yetkisi olan kullanıcılar için hazırlamak üzere kullanıcının durumunu ve rolünü okur. |
| [E-posta Altyapısı](./mail) | yazma | Günlük özet e-postasını göndermek için mevcut e-posta altyapısını kullanır (yalnız tercihinde e-posta seçen kullanıcıya, yalnız toplam sayılar). |
| [Dosyalarım](./exports) | yazma | Haftalık kurul raporunu (yalnız sayılar) Dosyalarım üretim hattında PDF olarak oluşturur; doğrudan indirme bağlantısı yoktur. |
| [Dernek Bilgileri](./organization) | okuma | Rapor antedi için dernek adını, adresini ve logosunu okur. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Sekreter | görüntüleme, düzenleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | — |

## Sürüm notları

### 0.11.2 — Çalışma zamanı modernizasyonu

_2026-11-20_

- **İyileştirme:** Sabah özeti öğelerinin önem ve vade sırasına göre dizilmesinde (sortItems) toSorted metodu uygulandı.

### 0.11.1 — Sekreter çalışma masasında geçerli kayıt sınırı

_2026-11-20_

- **Düzeltme:** Geçersiz veya yetkisiz gösterim kayıtları ilk 100 öğeyi doldurup sonraki geçerli kayıtları gizleyemez; görünüm en fazla 100 doğrulanmış öğe gösterir.

### 0.11.0 — Dış bildirim kanalları (rızalı)

_2026-11-19_

- **Yeni:** Günlük özet, rıza verip adresini doğrulayan kullanıcıya Telegram, WhatsApp veya SMS ile de gönderilebilir. Mesaj yalnız sayıları içerir; ad, başlık veya tutar gitmez.
- **Güvenlik:** Sağlayıcı yapılandırılmadıkça kanallar kapalıdır ve hiçbir şey gönderilmez. Rıza geri alınınca adres silinir ve gönderim hemen durur; kanal başına günde tek özet, sınırlı yeniden deneme, sessiz saatlere uyulur.

### 0.10.0 — Vekil / ekip modu

_2026-11-19_

- **Yeni:** Sekreter özetinizi süreli bir vekâletle bir ekip arkadaşınıza salt okunur gösterebilirsiniz (en fazla 90 gün, en fazla 5 kişi). Siz veya vekil vekâleti her an geri alabilir.
- **Güvenlik:** Vekil yalnız kendi yetkisinin izin verdiğini görür; hiçbir öneriyi sizin yerinize onaylayamaz. Her görüntüleme denetim kaydına yazılır.

### 0.8.0 — Haftalık kurul raporu

_2026-11-19_

- **Yeni:** Haftalık kurul raporu PDF olarak üretilebilir: yalnız alan bazında toplam, dikkat ve acil sayıları içerir; kişi adı, başlık veya tutar ayrıntısı yoktur. Rapor yalnız sizin görebildiğiniz verilerden oluşur.
- **Güvenlik:** PDF, Dosyalarım'ın üretim kuyruğunda oluşturulur, şifreli saklanır ve 30 gün sonra silinir; doğrudan indirme bağlantısı yoktur. Yetki üretim sırasında yeniden denetlenir.

### 0.7.0 — Benim yerime takip et

_2026-11-19_

- **Yeni:** Bir kayıt için takip oluşturabilirsiniz: son tarih, en fazla hatırlatma sayısı ve kaynağın sayfası. Süresi gelince sekreter özetinde günde en çok bir kez hatırlatılır.
- **Yeni:** Takip duraklatılabilir, devam ettirilebilir, iptal edilebilir veya tamamlandı olarak işaretlenebilir. Kaynak kayıt değiştirilmez, kimseye mesaj gönderilmez.
- **Güvenlik:** Takip başlığı şifreli saklanır ve yalnız sahibine görünür; yetkisi kalkan veya pasif kullanıcının takipleri otomatik duraklatılır.

### 0.6.10 — Gelişmiş Sekreter çalışma masası UI sözleşmesi

_2026-11-19_

- **İyileştirme:** S4–S5 posta, takip, rapor, OCR, kanal izni ve vekil işlemleri için yetki süzülmüş veriyle kullanılacak, güvenli bağlantılı, iki dilli ve salt okunur çalışma masası bileşeni hazırlandı. Gerçek işlem yetenekleri #313–#317 kapsamında bağlanacaktır.

### 0.6.9 — Günlük özet e-postası yeni şablonla

_2026-11-19_

- **İyileştirme:** Günlük özet e-postası artık yeni şablonla (HTML ve düz metin) gönderilir: yalnız toplam sayılar ve uygulamaya güvenli bağlantı, kişisel veri yok.

Daha eski 14 herkese açık sürüm notu.
