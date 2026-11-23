---
sidebar_position: 43
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
| Sürüm | 1.15.8 |
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

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Yapay zekâ asistanı | görüntüleme, düzenleme | görüntüleme | görüntüleme | görüntüleme | — | — | — |

## Sürüm notları

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

### 1.15.4 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

### 1.15.2 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.15.1 — Rıza eylemleri ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Eylem butonları ve kullanıcı bildirimleri ortak ActionButton/notify adapter katmanına taşındı; bu kullanımda doğrudan HeroUI bağımlılığı kaldırıldı.

### 1.15.0 — AI durum analizi kartı

_2026-11-17_

- **Yeni:** Muhasebe genel bakışının sağ üst köşesinde AI durum analizi: yalnız izinli toplam muhasebe araçlarıyla son durumu, riskleri ve önerilen adımları özetler. Sonuç oturum boyunca saklanır, "Yenile" ile yeniden üretilir; hiçbir işlem yapmaz.

Daha eski 29 herkese açık sürüm notu.
