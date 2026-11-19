---
sidebar_position: 29
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
| Sürüm | 0.8.0 |
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

### 0.6.8 — Sekreter tercih ekranı

_2026-11-19_

- **Yeni:** Kullanıcılar kendi özet saatini, sessiz saatlerini ve aktif kanalları değiştirebilir. TR/DE günlük özet e-posta şablonu eklendi.

### 0.6.7 — Sekreter onay kutusu

_2026-11-19_

- **Yeni:** Yetkili önerileri listeleyen onay kutusu eklendi: onayla, reddet, ertele ve izinli kaynakta düzenle bağlantısı; dışa etkili eylemlerde ikinci onay zorunludur.

### 0.6.6 — Panelde "Bugün" kartı

_2026-11-19_

- **Yeni:** Sabah özeti, Panel'in sağ üst köşesinde "Bugün" kartı olarak görünür (yalnız sekreter yetkisi olanlara ve modül açıkken). Karttan ilgili sayfaya gidilir.
- **Düzeltme:** Sekreter sayfası, modül açıkken "Bugün" kartını gösterirken çöküyordu; düzeltildi.

### 0.6.5 — Önerileri ertele ve düzenle

_2026-11-19_

- **Yeni:** Bir öneri en fazla 90 gün ve geçerlilik süresi içinde ertelenebilir; ertelenen öneri onay kutusunda gizlenir. Modül izin veriyorsa öneri, kaynağın kendi düzenleme sayfasına güvenli bağlantı sunar. Onay kutusu öneri durumunu içerik göstermeden bildirir.

Daha eski 10 herkese açık sürüm notu.
