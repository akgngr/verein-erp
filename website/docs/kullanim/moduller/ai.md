---
sidebar_position: 47
title: "Yapay zekâ asistanı"
description: "Sağ panelde sohbet eden, yalnızca izin verilen modüllerin toplu verisini okuyan asistan."
slug: /kullanim/moduller/ai
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Sağ panelde sohbet eden, yalnızca izin verilen modüllerin toplu verisini okuyan asistan.

| | |
|---|---|
| Anahtar | `ai` |
| Tür | Eklenti |
| Sürüm | 1.15.13 |
| Sayfalar | `/ayarlar/yapay-zeka` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Kullanıcılar](./users) | okuma | Yetkili dosya üretimi ve çalışma anında izin kontrolü. |
| [Dosyalarım](./exports) | okuma, yazma | Yetkili dosya üretimi ve çalışma anında izin kontrolü. |
| [Otomasyon](./automation) | okuma, yazma | Yetkili dosya üretimi ve çalışma anında izin kontrolü. |
| [Kimlik Doğrulama](./auth) | okuma | Yalnızca maskeleme için kullanıcı adlarını sunucuda okur ve oturumu doğrular; adlar yapay zekâya gönderilmez. |
| [Üyeler](./members) | okuma | Yalnızca üye sayılarını ve aidat tahsilat istatistiğini okur; hiçbir üyenin adı veya bilgisi okunmaz. Kayıtlı adlar yalnızca maskeleme için sunucuda kullanılır. |
| [Dernek Bilgileri](./organization) | okuma | Derneğin kamuya açık ana verilerini okur; vergi numarası ve vergi dairesi bilgileri hariç. |
| [Öğrenciler](./students) | okuma | Yalnızca öğrenci ve veli sayılarını okur. |
| [Modül Yönetimi](./system) | okuma | Hangi modüllerin etkin ve asistana izinli olduğunu okur (asistan yalnızca bunlara erişir). |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Yapay zekâ asistanı | görüntüleme, düzenleme | görüntüleme | görüntüleme | görüntüleme | — | — | — | — |

## Sürüm notları

### 1.15.13 — Ayar merkezi grubu

_2026-11-26_

- **İyileştirme:** Ayar sayfaları ayar merkezinde kendi grubunda ve sırasında gösterilir.

### 1.15.12 — Arayüz düzeltmeleri (#586)

_2026-11-25_

- **İyileştirme:** Yüzen asistan çubuğu mobilde ve sağlayıcı yapılandırılmamışken küçük bir düğmeye dönüşür; açık diyalog veya çekmece varken gizlenir.

### 1.15.11 — Gizlilik ön ayarı sağlayıcı politikası

_2026-11-25_

- **Güvenlik:** Uygulanan gizlilik ön ayarının izin vermediği sağlayıcı seçilemez ve kullanılmaz (örn. 'Yalnız yerel' ön ayarında bulut sağlayıcı kapalıdır).

### 1.15.10 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.15.8 — Asistan araçları yalnız v2 sözleşmesiyle

_2026-11-23_

- **Güvenlik:** Eski (v1) araç sözleşmesi kaldırıldı; asistan yalnız veri politikası kayıtlı v2 araçlarını yükler. Öğrenci ve veli verisi yapay zekâya yalnız sayı olarak gider.

### 1.15.7 — Vergi ve hukuk danışmanlığı sınırı

_2026-11-22_

- **İyileştirme:** Asistan genel kuralları ve rakamları açıklar ama kişiye özel vergi veya hukuk tavsiyesi vermez; bu durumlarda vergi danışmanına ya da avukata yönlendirir ve uyarı notu ekler.

### 1.15.6 — Lisans durumu

_2026-11-20_

- **İyileştirme:** AI yetki matrisi, lisans gerektiren modüller için "lisans gerekli" durumunu gösterir.

### 1.15.5 — IME ve klavye güvenliği

_2026-11-19_

- **Düzeltme:** AI sohbet kutusunda Enter tuşuyla gönderim yapılırken IME kompozisyonu (Japonca, Çince, Korece vb.) denetimi eklendi; metin dönüşümü sırasındaki erken gönderimler engellendi.

Daha eski 33 herkese açık sürüm notu.
