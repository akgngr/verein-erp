---
sidebar_position: 37
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
| Sürüm | 1.13.1 |
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

### 1.13.1 — Asistan önerileri bulutta

_2026-11-16_

- **İyileştirme:** Bulut sağlayıcıda öneri araçları (evrak kaydı, görev, etkinlik vb. onay kartları) artık denetimli modda kullanılabilir; ekteki maskeli değerler öneride gerçek değere çevrilir. Az metinli PDF eklerinde gömülü resimler de OCR ile okunur.

### 1.13.0 — Asistan: dosya ekleme, yeni geçmiş, hareketli mesaj kutusu

_2026-11-16_

- **Yeni:** Sohbete dosya eklenebilir (PDF, resim, Word, Excel, Markdown, CSV): metin sunucuda çıkarılır (resim ve taranmış belgede OCR), dosya saklanmaz. Bulutta yalnız denetimli modda ve kişisel parçalar maskelenerek gönderilir. Sohbet geçmişi tarihe göre gruplandı; panel yazıları küçültüldü; mesaj kutusuna tıklayınca dosya düğmesi alt satıra kayar.

### 1.12.0 — Yeni sohbet tasarımı

_2026-11-16_

- **İyileştirme:** Asistan paneli yenilendi: başlıkta sohbet adı ve geçmiş menüsü, yeni sohbet, tam ekran ve kapat düğmeleri; boş sohbette karşılama ve öneri kartları; yuvarlak, yazdıkça büyüyen mesaj kutusu.

### 1.11.2 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.11.1 — Dosyalarda gerçek adlar

_2026-11-15_

- **Düzeltme:** Asistanın oluşturduğu dosyalarda takma adlı kişiler ([[K3]]) artık gerçek adla yazılır (yetkiniz varsa); buluta yine ad gitmez.

### 1.11.0 — Asistan: kişi sorularında takma adlı araç

_2026-11-15_

- **İyileştirme:** Kişi soruldığında asistan reddetmek yerine takma adlı üye profili aracını kullanır; araçlar takma adı sunucuda kayda çevirebilir.

### 1.10.0 — AI v2 araç geçişi

_2026-11-15_

- **İyileştirme:** Aidat veri kümesi 500 kayıtlık keyset sayfaları ve ödeme toplamlarıyla okunur; CSV/XLSX doğrudan şifreli akışa yazılır. İptal, süre ve boyut sınırları yayından önce doğrulanır.
- **Güvenlik:** FileGeneration facade mevcut outbox ile atomiktir; yalnız geçerli worker lease dosyayı yayımlar, pending dosyalar liste/indirmeden gizlenir.
- **Yeni:** create_dataset/query_dataset/export_dataset araçları açık şema, TR/DE açıklamalar ve onay zorunluluğuyla sunulur; eski adlar uyum için korunur.
- **Düzeltme:** Geçici export hataları sınırlı yeniden denenir; terminal/iptal durumları kuyrukta görünmez, başarısız geçici dosyalar temizlenir.

### 1.9.1 — Test yalıtımı

_2026-11-16_

- **Düzeltme:** Evrak özeti testi ortak AI ayarlarını değiştirmiyor; paralel çalışan dışa aktarma testinin rastgele "erişim kaldırıldı" hatası giderildi.

Daha eski 19 sürüm: [releases.json](https://github.com/akgngr/verein-erp/blob/main/src/modules/ai/releases.json)
