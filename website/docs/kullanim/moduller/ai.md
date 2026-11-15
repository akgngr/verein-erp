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
| Sürüm | 1.11.1 |
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

### 1.7.0 — Denetimli serbest metin (bulut)

_2026-11-15_

- **Yeni:** Bulut veri politikasında "Denetimli serbest metin" seçilebilir: her mesaj buluta gitmeden sunucuda taranır, kayıtlı kişiler konuşmanın takma adına ([[K7]]) çevrilir, kişisel veri içeren mesaj gönderilmez ve sebebi gösterilir. Önceki riskli mesajlar bağlama alınmaz. Buluttaki araçlar artık sabit liste yerine v2 veri sınıfına göre açılır.

### 1.6.0 — Konuşma kapsamlı takma ad katmanı

_2026-11-15_

- **Yeni:** Kişi kayıtları konuşmaya özel kısa takma adlarla ([[K7]]) eşlenebilir. Sohbet geçmişi takma adlı saklanır; kullanıcıya gösterilirken ad, izleyicinin o anki yetkisiyle sunucuda çözülür (yetki yoksa "gizli kişi"). Henüz bulut sohbetine bağlı değildir.

Daha eski 15 sürüm: [releases.json](https://github.com/akgngr/verein-erp/blob/main/src/modules/ai/releases.json)
