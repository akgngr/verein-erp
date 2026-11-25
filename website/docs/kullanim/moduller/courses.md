---
sidebar_position: 25
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
| Sürüm | 1.4.16 |
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

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Kurs ücretleri | görüntüleme, oluşturma, düzenleme, silme | görüntüleme | görüntüleme, oluşturma | görüntüleme, oluşturma, düzenleme, silme | görüntüleme | — | — | — |
| Tüm öğretmenlerin hakedişleri (kapsam) | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | — | — | — |
| Öğretmen hakedişleri | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme | görüntüleme | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme | — | görüntüleme | — |
| Dersler | görüntüleme, oluşturma, düzenleme, silme | görüntüleme, oluşturma, düzenleme, silme | görüntüleme, oluşturma, düzenleme, silme | görüntüleme | görüntüleme | — | görüntüleme, oluşturma, düzenleme, silme | — |
| Öğretmenler | görüntüleme, oluşturma, düzenleme, silme | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | — | — | — |
| Tüm kurslar | görüntüleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | — | — | görüntüleme |
| Kurslar | görüntüleme, oluşturma, düzenleme, silme | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | — | görüntüleme | — |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_course_statistics` · `list_courses` · `propose_course` · `propose_course_status` · `propose_delete_course`

## Sürüm notları

### 1.4.16 — Ücret TOCTOU düzeltmesi, hakediş sertleştirmesi ve PDF denetim kaydı

_2026-11-25_

- **Düzeltme:** Ücret tahsilatı/ters kayıt/feragat işlemlerinde atomik durum kilidi, işlem içi kontenjan denetimi, hakediş P2002 yinelemesi, toplu sorgu ve onaylı hakedişteki dersin silinme koruması eklendi (#579, #578).
- **Güvenlik:** Öğretmen hakediş PDF dışa aktarımına kişisel veri içermeyen denetim kaydı ve kanonik APP_URL davet bağlantısı eklendi (#579, #574).

### 1.4.15 — nav.json kategori ve alt modül tanımı

_2026-11-24_

- **İyileştirme:** Kullanıcı bazlı sol menü gruplama ve alt modül hiyerarşisi için nav.json eklendi.

### 1.4.14 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.4.12 — GoBD silme koruması

_2026-11-23_

- **Güvenlik:** Kurs kayıt, ücret ve ödeme ilişkileri onDelete: Restrict olarak güncellendi.

### 1.4.11 — Çalışma zamanı modernizasyonu

_2026-11-20_

- **İyileştirme:** Öğretmen hakedişi hesaplamasında (calculatePayout) oturum sıralaması toSorted ile yenilendi.

### 1.4.10 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

### 1.4.8 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.4.7 — Asistan önerileri bulutta

_2026-11-16_

- **İyileştirme:** Asistanın öneri araçları (onay kartlı) bulut sağlayıcıda denetimli modda da kullanılabilir.

Daha eski 11 herkese açık sürüm notu.
