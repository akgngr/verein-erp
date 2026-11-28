---
sidebar_position: 22
title: "Hibeler"
description: "Hibe ve proje fonları: finansman planı, ödemeler ve Verwendungsnachweis (kullanım raporu)."
slug: /kullanim/moduller/grants
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Hibe ve proje fonları: finansman planı, ödemeler ve Verwendungsnachweis (kullanım raporu).

| | |
|---|---|
| Anahtar | `grants` |
| Tür | Resmî modül |
| Sürüm | 1.1.1 |
| Gerektirir | [Muhasebe](./accounting) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Muhasebe](./accounting) | okuma | Bağlı projenin fişlerini (tarih, kategori, tutar, açıklama, belge var mı) ve proje/kategori listesini okur. |
| [Dernek Bilgileri](./organization) | okuma | Rapor PDF'inde dernek antetini kullanır. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Hibeler | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma, düzenleme, silme | görüntüleme | görüntüleme, oluşturma, düzenleme, silme | görüntüleme | — | — | — |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_grant_overview`

## Sürüm notları

### 1.1.1 — İade fazlasında negatif destek ihtiyacı

_2026-11-28_

- **Düzeltme:** Dönemde tedarikçi iadeleri giderleri aşarsa oransal ve sabit tutarlı finansmanda destek ihtiyacı sıfırın altına düşmez; raporda hayali fazla ödeme görünmez.

### 1.1.0 — Anteilfinanzierung / Festbetragsfinanzierung ve belge paketi ZIP

_2026-11-28_

- **Yeni:** Hibeler için finansman türü (Fehlbedarfs-, Anteil-, Festbetragsfinanzierung) ve Verwendungsnachweis belge paketi (ZIP) indirme eklendi.
- **Güvenlik:** Verwendungsnachweis belge listesinde (belegliste.csv) açıklama, karşı taraf ve kalem adı gibi serbest metinler formül enjeksiyonuna karşı etkisizleştirilir.
- **Düzeltme:** Oransal finansmanda (ANTEIL) destek oranı zorunludur; eksik oran artık sessizce %100 sayılmaz. Belge paketi 200 MB'ı aşarsa dosyalar okunmadan anlaşılır bir hata verilir.
- **Düzeltme:** Dönemde 5.000'den fazla belge dosyası varsa paket eksik oluşturulmaz; anlaşılır bir hata gösterilir.

### 1.0.13 — Yerel tarih alanları

_2026-11-26_

- **İyileştirme:** Hibe dönemi, rapor ve ödeme tarihleri yerel biçimde (GG.AA.YYYY, 24 saat) takvimle seçilir; tarayıcıya bağlı aa/gg/yyyy biçimi kaldırıldı.

### 1.0.12 — Muhasebe verisi yetkisi ve ödeme denetimi

_2026-11-25_

- **Güvenlik:** Fiş/defter ayrıntıları ve rapor PDF'i yalnız muhasebeyi görebilen rollere gösterilir (ör. SECRETARY özet görür).
- **Güvenlik:** Ödeme 'alındı' işareti yalnız aynı fona ait ödemede değiştirilebilir; alınmış ödeme geri alınamaz (GoBD).
- **Düzeltme:** Yeni fon kaydı 'oluşturma', düzenleme 'güncelleme' izni ister; bütçe ve ödeme işlemleri denetim kaydı bırakır.

### 1.0.11 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.0.10 — GoBD silme koruması ve şema tutarlılığı

_2026-11-23_

- **Güvenlik:** Yalnızca planlanan (PLANNED) ve tahsil edilmiş ödemesi olmayan hibeler silinebilir; tahsil edilmiş ödeme kayıtlarının silinmesi engellendi ve finansal ilişkiler onDelete: Restrict olarak güncellendi.

### 1.0.9 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

### 1.0.7 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

Daha eski 7 herkese açık sürüm notu.
