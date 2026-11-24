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
| Sürüm | 1.0.11 |
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

### 1.0.6 — Hibe durum rozeti ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Rozet/çip görünümleri ortak StatusChip pattern'ine taşındı; modül düzeyindeki doğrudan HeroUI Chip bağımlılığı azaltıldı.

### 1.0.5 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.0.4 — Asistan araçları yeni veri sözleşmesinde

_2026-11-15_

- **Güvenlik:** Asistan araçları v2 veri sözleşmesine taşındı: modele giden her alan açıkça listelenir ve veri sınıfı bildirilir. Toplam ve kurumsal veriler denetimli bulut modunda da kullanılabilir; serbest kişisel içerik yalnız yerel modelde kalır.

### 1.0.3 — Sürümlü AI istatistik sözleşmesi

_2026-11-15_

- **Güvenlik:** Toplu istatistik araçları katı girdi, sunucu sonucu ve modele çıkacak alanların açık şemalarıyla v2 sözleşmesine taşındı; kişisel satırlar modele döndürülmez.

Daha eski 3 herkese açık sürüm notu.
