---
sidebar_position: 21
title: "Kurslar"
description: "Gönüllü kurslar ve Nachhilfe: öğretmenler, dersler, kayıtlar, ücretler ve muhasebe aktarımı."
slug: /kullanim/moduller/courses
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Gönüllü kurslar ve Nachhilfe: öğretmenler, dersler, kayıtlar, ücretler ve muhasebe aktarımı.

| | |
|---|---|
| Anahtar | `courses` |
| Tür | Resmî modül |
| Sürüm | 1.4.8 |
| Sayfalar | `/kurslar`, `/ogrenciler`, `/ogrenci-takibi`, `/kurslar/ogretmenler`, `/kurslar/odemeler`, `/kurslar/hakedisler`, `/kurslar/ayarlar` |
| Gerektirir | [Öğrenciler](./students) |
| Önerir | [Öğrenci takibi](./progress) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Muhasebe](./accounting) | okuma, yazma | Kurs ücreti tahsilatlarını gelir fişi olarak yazar ve geri alır; kasa/banka hesaplarını ve gelir kategorilerini okur. Ödenen öğretmen hakedişlerini gider fişi olarak yazar. |
| [E-posta Altyapısı](./mail) | okuma, yazma | Öğretmen davet e-postası gönderir. |
| [Dernek Bilgileri](./organization) | okuma | Öğretmen hakediş PDF'inin antetinde dernek bilgilerini ve logosunu okur. |
| [Öğrenciler](./students) | okuma | Kursa kaydedilecek öğrencileri ve ödeme sorumlularını okur. |
| [Kullanıcılar](./users) | okuma, yazma | Davet edilen öğretmen için Öğretmen rolünde kullanıcı hesabı açar; hesabı olan öğretmenin ad ve e-postasını kullanıcı kaydından okur. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Kurs ücretleri | görüntüleme, oluşturma, düzenleme, silme | görüntüleme | görüntüleme, oluşturma | görüntüleme, oluşturma, düzenleme, silme | görüntüleme | — | — |
| Tüm öğretmenlerin hakedişleri (kapsam) | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | — | — |
| Öğretmen hakedişleri | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme | görüntüleme | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme | görüntüleme | — |
| Dersler | görüntüleme, oluşturma, düzenleme, silme | görüntüleme, oluşturma, düzenleme, silme | görüntüleme, oluşturma, düzenleme, silme | görüntüleme | görüntüleme | görüntüleme, oluşturma, düzenleme, silme | — |
| Öğretmenler | görüntüleme, oluşturma, düzenleme, silme | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | — | — |
| Tüm kurslar | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | — | görüntüleme |
| Kurslar | görüntüleme, oluşturma, düzenleme, silme | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | görüntüleme | — |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_course_statistics` · `list_courses` · `propose_course` · `propose_course_status` · `propose_delete_course`

## Sürüm notları

### 1.4.8 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.4.7 — Asistan önerileri bulutta

_2026-11-16_

- **İyileştirme:** Asistanın öneri araçları (onay kartlı) bulut sağlayıcıda denetimli modda da kullanılabilir.

### 1.4.6 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.4.5 — Asistan araçları yeni veri sözleşmesinde

_2026-11-15_

- **Güvenlik:** Asistan araçları v2 veri sözleşmesine taşındı: modele giden her alan açıkça listelenir ve veri sınıfı bildirilir. Toplam ve kurumsal veriler denetimli bulut modunda da kullanılabilir; serbest kişisel içerik yalnız yerel modelde kalır.

### 1.4.4 — Sürümlü AI öneri ve sonuç sınırları

_2026-11-15_

- **Güvenlik:** Öneri araçları katı Zod girdisi ve sabit model sonucu kullanır; salt öneri sorguları gereksiz kişi detaylarını okumaz. Kalan eski okuma araçlarının dönüşümü ayrı sürer.

### 1.4.3 — AI listelerinde eksiksizlik ve sınır kontrolü

_2026-11-15_

- **Düzeltme:** AI listeleri sayfalama ve eksiksizlik bilgisi taşır; aşırı büyük takvim aralıkları kontrollü reddedilir.

### 1.4.2 — AI v2 güvenilirlik ve veri koruma

_2026-11-14_

- **Güvenlik:** Sunucu tarafından doğrulanan AI işlemleri, kapsamlı veri erişimi ve güvenilir yaşam döngüsü kontrolleri güncellendi.

### 1.4.1 — SEPA tahsilatlarını kaydetme ve geri dönenleri ters çevirme (SEPA modülü için)

_2026-11-07_

- **İyileştirme:** SEPA tahsilatlarını kaydetme ve geri dönenleri ters çevirme (SEPA modülü için)

Daha eski 5 sürüm: [releases.json](https://github.com/akgngr/verein-erp/blob/main/src/modules/courses/releases.json)
