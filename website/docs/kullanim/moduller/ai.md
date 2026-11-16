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
| Sürüm | 1.12.0 |
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

### 1.9.0 — Evrak özeti (AI)

_2026-11-15_

- **Yeni:** Evrak metni için AI özeti, tür ve kategori önerisi (POST /api/ai/document-summary). Yerel modelde doğrudan; bulutta yalnız "Denetimli serbest metin" modunda, adlar/adres/IBAN/e-posta maskelenerek. Kişiyle birlikte özel nitelikli veri varsa yalnız yerel model. AI matrisinde Evrak Kayıt → içerik okuma gerekir.

### 1.8.0 — Takma adlı kişi verisi (bulut)

_2026-11-15_

- **Yeni:** Denetimli modda "Takma adlı kişi verisi" açılabilir: kişi düzeyindeki araç sonuçları buluta yalnız [[K7]] gibi takma adlarla ve kabalaştırılmış alanlarla gider; model bunlarla rapor üretir, sonuç kullanıcıya gerçek adlarla (canlı yetkiyle) gösterilir.

Daha eski 17 sürüm: [releases.json](https://github.com/akgngr/verein-erp/blob/main/src/modules/ai/releases.json)
