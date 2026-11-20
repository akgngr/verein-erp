---
sidebar_position: 39
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
| Sürüm | 1.15.5 |
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

### 1.14.1 — Daha iyi OCR: küçük resimler ve WebP

_2026-11-16_

- **İyileştirme:** Resimler OCR'dan önce büyütülüp PNG'ye çevrilir: küçük ekran görüntüleri ve WebP dosyaları artık okunur.

### 1.14.0 — Ekli dosya evrak kaydına eklenir; daha güçlü OCR

_2026-11-16_

- **Yeni:** Sohbete eklenen dosya kısa süre şifreli tutulur; asistanın önerdiği evrak kaydını onaylayınca dosya kayda otomatik eklenir. PDF'de gömülü resim okunamazsa sayfa görüntüye çevrilip OCR ile okunur.

### 1.13.1 — Asistan önerileri bulutta

_2026-11-16_

- **İyileştirme:** Bulut sağlayıcıda öneri araçları (evrak kaydı, görev, etkinlik vb. onay kartları) artık denetimli modda kullanılabilir; ekteki maskeli değerler öneride gerçek değere çevrilir. Az metinli PDF eklerinde gömülü resimler de OCR ile okunur.

Daha eski 26 herkese açık sürüm notu.
