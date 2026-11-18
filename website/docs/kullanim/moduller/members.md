---
sidebar_position: 36
title: "Üyeler"
description: "Üye kayıtları, üyelik tipleri, aidat tahakkuk ve ödeme takibi."
slug: /kullanim/moduller/members
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Üye kayıtları, üyelik tipleri, aidat tahakkuk ve ödeme takibi.

| | |
|---|---|
| Anahtar | `members` |
| Tür | Resmî modül |
| Sürüm | 1.15.1 |
| Sayfalar | `/uyeler`, `/uyeler/aidat`, `/uyeler/turler`, `/toplu-eposta?kaynak=members:members`, `/uyeler/ice-aktar` |
| Önerir | [e-Sign](./online-forms) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Dernek Bilgileri](./organization) | okuma | Makbuz ve belgelerde dernek antetini kullanır. |
| [e-Sign](./online-forms) | okuma | Üye sayfasından e-imza/uzaktan form bağlantısı göndermek ve imzalı belgeleri göstermek için. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Kimlik numaraları | görüntüleme | görüntüleme | görüntüleme | — | — | — | — |
| Aidat ve Ödemeler | görüntüleme, oluşturma, düzenleme, silme | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | — | — |
| Üyelik Tipleri | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | görüntüleme | — | görüntüleme |
| Üye Kayıtları | görüntüleme, oluşturma, düzenleme, silme | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | — | görüntüleme |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`create_dataset` · `create_dues_dataset` · `get_member_profile` · `get_member_statistics` · `list_dues_by_person` · `query_dataset`

## Sürüm notları

### 1.15.1 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

### 1.15.0 — Sekreter özetine katkı

_2026-11-18_

- **Yeni:** Kişisel sekreterin sabah özetinde vadesi geçmiş aidat sayısı görünür (yalnız aidat yetkisi olanlara, üye adı olmadan).

### 1.14.4 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.14.3 — Aidat yıl seçimi ortak SelectField katmanında

_2026-11-17_

- **İyileştirme:** Aidat raporundaki yıl seçimi ortak SelectField adapterına taşındı; doğrudan HeroUI Select/ListBox/Label bağımlılığı kaldırıldı.

### 1.14.2 — Aidat rozetleri ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Rozet görünümü ortak StatusChip pattern'ine taşındı; modül artık bu kullanımda HeroUI Chip implementasyonuna doğrudan bağlı değil.

### 1.14.1 — Durum rozetleri ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Tekrarlanan HeroUI durum/tür rozetleri ortak StatusChip pattern'ine taşındı; modül görsel sözleşmesi framework implementasyonundan ayrıştırıldı.

### 1.14.0 — Üye listesinde toplu seçim ve durum işlemleri

_2026-11-17_

- **Yeni:** Üye listesinde çoklu seçim, filtre sonucunun tamamını seçme ve güvenli toplu Aktif/Pasif durum işlemleri eklendi. Ayrılmış veya vefat etmiş üyeler toplu durum işleminde değiştirilmez.

### 1.13.2 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

Daha eski 26 herkese açık sürüm notu.
