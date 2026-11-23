---
sidebar_position: 34
title: "SEPA otomatik ödeme"
description: "Aidat ve kurs ücretleri için SEPA-Lastschrift (pain.008) tahsilatı."
slug: /kullanim/moduller/sepa
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Aidat ve kurs ücretleri için SEPA-Lastschrift (pain.008) tahsilatı.

| | |
|---|---|
| Anahtar | `sepa` |
| Tür | Resmî modül |
| Sürüm | 1.1.0 |
| Gerektirir | [Muhasebe](./accounting) |
| Önerir | [Üyeler](./members), [Kurslar](./courses) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Muhasebe](./accounting) | okuma | Derneğin IBAN'ını ve Gläubiger-ID'yi okur. |
| [Üyeler](./members) | okuma, yazma | Açık aidatları ve üyelerin SEPA yetkisini okur; tahsil edilen aidatları ödeme olarak kaydeder, geri dönenleri iptal eder. |
| [Kurslar](./courses) | okuma, yazma | Vadesi gelmiş kurs ücretlerini okur; tahsil edilenleri ödeme olarak kaydeder (muhasebe fişiyle), geri dönenleri ters çevirir. |
| [Öğrenciler](./students) | okuma | Kurs ücretinin ödeyicisi olan velinin SEPA yetkisini okur. |
| [Dernek Bilgileri](./organization) | okuma | Dosyada derneğin adını kullanır. |
| [Modül Yönetimi](./system) | okuma | Kaynak modüllerin açık olup olmadığını kontrol eder. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| SEPA otomatik ödeme | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma, düzenleme | — | görüntüleme, oluşturma, düzenleme, silme | görüntüleme | — | — |

## Sürüm notları

### 1.1.0 — Mandat sağlığı ve iade koçu

_2026-11-23_

- **Yeni:** Tahsilattan önce mandat sağlığı denetimi: eksik referans veya imza tarihi, yerel IBAN sağlama toplamı, 36 ay kullanılmayan yetkiler ve tekrarlayan iadeler. IBAN'lar maskeli gösterilir.
- **Yeni:** İade koçu: iade kodları (AM04, MD06 …) Türkçe/Almanca açıklanır, sonraki adım önerilir ve iki dilli nazik bir hatırlatma taslağı kopyalanabilir; gönderim yapılmaz.
- **İyileştirme:** İade kaydında iade kodu ve banka ücreti seçilir; 12 ayda belirlenen sayıda iadeden sonra veya 36 ay kullanılmayan yetkilerde tahsilat otomatik duraklatılır.

### 1.0.6 — GoBD silme koruması

_2026-11-23_

- **Güvenlik:** SEPA tahsilat kalemi ilişkisi (SepaDebitItem.run) onDelete: Restrict olarak güncellendi.

### 1.0.5 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

### 1.0.3 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.0.2 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.0.1 — Muhasebe altına taşındı (/muhasebe/sepa)

_2026-11-07_

- **İyileştirme:** Muhasebe altına taşındı (/muhasebe/sepa)

### 1.0.0 — İlk sürüm

_2026-11-07_

- **Yeni:** SEPA-Lastschrift: açık aidatlar ve kurs ücretleri için önizlemeli tahsilat, pain.008.001.08 dosyası (CORE/RCUR), tahsil edildi kaydı (makbuz/fiş) ve geri dönen ödemeler.
