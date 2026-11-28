---
sidebar_position: 6
title: "CRM"
description: "Kişiler ve kurumlarla ilişki yönetimi: aşamalar, fırsatlar, zaman akışı ve takipler."
slug: /kullanim/moduller/crm
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Kişiler ve kurumlarla ilişki yönetimi: aşamalar, fırsatlar, zaman akışı ve takipler.

| | |
|---|---|
| Anahtar | `crm` |
| Tür | Resmî modül |
| Sürüm | 1.0.13 |
| Sayfalar | `/crm` |
| Önerir | [Üyeler](./members), [Muhasebe](./accounting) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Üyeler](./members) | okuma | CRM kişilerinin adını ve iletişim bilgisini üye kaydından okur (kopyalamaz). |
| [Muhasebe](./accounting) | okuma | Cari hesap adını ve iletişim bilgisini muhasebeden okur (kopyalamaz). |
| [Modül Yönetimi](./system) | okuma | Hangi kaynak modüllerin açık olduğunu kontrol eder. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| CRM | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma, düzenleme, silme | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | — | — | görüntüleme |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_crm_pipeline`

## Sürüm notları

### 1.0.13 — Birleşik görev merkezi takip sözleşmesi (#636)

_2026-11-28_

- **Yeni:** Görevler modülünün açık CRM takiplerini yetki ve sorumlu filtresiyle okuyabilmesi için listOpenFollowUpsForHub sunucu sözleşmesi eklendi.

### 1.0.12 — Yerel tarih alanları

_2026-11-26_

- **İyileştirme:** Beklenen kapanış tarihi ve görev son tarihi/saati yerel biçimde (GG.AA.YYYY, 24 saat) takvimle seçilir; tarayıcıya bağlı aa/gg/yyyy biçimi kaldırıldı.

### 1.0.11 — Kişi verisi kaynak modül iznine tabi

_2026-11-25_

- **Güvenlik:** Kişi adı ve iletişimi yalnız kaynak modülü (Üyeler, Muhasebe) görebilen rollere gösterilir; diğerleri 'Kısıtlı' görür ve aramada o kaynak listelenmez.
- **Düzeltme:** Fırsat tutarı en çok 20.000.000 € olabilir (önceden büyük tutarlar veritabanında taşıyordu).
- **İyileştirme:** Tüm CRM işlemleri denetim kaydı bırakır; olmayan kayıtta anlaşılır hata döner.

### 1.0.10 — nav.json kategori ve alt modül tanımı

_2026-11-24_

- **İyileştirme:** Kullanıcı bazlı sol menü gruplama ve alt modül hiyerarşisi için nav.json eklendi.

### 1.0.9 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.0.8 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

### 1.0.6 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.0.5 — Mobilde alttan açılan çekmece

_2026-11-16_

- **İyileştirme:** Form/ayrıntı çekmecesi mobilde alttan açılır (masaüstünde sağdan).

Daha eski 5 herkese açık sürüm notu.
