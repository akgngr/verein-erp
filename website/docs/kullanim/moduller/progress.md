---
sidebar_position: 30
title: "Öğrenci takibi"
description: "Kurs öğrencilerinin yoklaması, sınav ve notları, gelişim notları ve veli raporu."
slug: /kullanim/moduller/progress
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Kurs öğrencilerinin yoklaması, sınav ve notları, gelişim notları ve veli raporu.

| | |
|---|---|
| Anahtar | `progress` |
| Tür | Resmî modül |
| Sürüm | 1.1.9 |
| Sayfalar | `/ogrenci-takibi` |
| Gerektirir | [Kurslar](./courses) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Kurslar](./courses) | okuma | Yoklama ve notlar için kursları, dersleri ve kayıtlı öğrencileri okur. |
| [Dernek Bilgileri](./organization) | okuma | Veli raporunda dernek antetini kullanır. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Tüm gelişim notları | silme | — | — | — | — | — | — | — |
| Öğrenci takibi | görüntüleme, oluşturma, düzenleme, silme | görüntüleme | görüntüleme, oluşturma, düzenleme | — | — | — | görüntüleme, oluşturma, düzenleme, silme | — |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_progress_statistics`

## Sürüm notları

### 1.1.9 — Yerel tarih alanları

_2026-11-26_

- **İyileştirme:** Not ve değerlendirme tarihleri yerel biçimde (GG.AA.YYYY, 24 saat) takvimle seçilir; tarayıcıya bağlı aa/gg/yyyy biçimi kaldırıldı.

### 1.1.8 — Veli raporu PDF denetim kaydı ve yoklama doğrulaması

_2026-11-25_

- **Güvenlik:** Öğrenci gelişim raporu PDF dışa aktarımına kişisel veri içermeyen denetim kaydı eklendi (#579).
- **Düzeltme:** İptal edilen derslere ve kurstan ayrılmış öğrencilere yoklama kaydedilmesi engellendi (#579).

### 1.1.7 — nav.json kategori ve alt modül tanımı

_2026-11-24_

- **İyileştirme:** Kullanıcı bazlı sol menü gruplama ve alt modül hiyerarşisi için nav.json eklendi.

### 1.1.6 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.1.5 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

### 1.1.3 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.1.2 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.1.1 — AI veri sözleşmesi ve liste güvenilirliği

_2026-11-15_

- **İyileştirme:** AI çıktısı açık şema veya sayfalama metadatasıyla sınırlandırılır; kişi alanları eklenmez.

Daha eski 3 herkese açık sürüm notu.
