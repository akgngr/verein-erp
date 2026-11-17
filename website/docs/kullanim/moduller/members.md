---
sidebar_position: 35
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
| Sürüm | 1.14.0 |
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

### 1.14.0 — Üye listesinde toplu seçim ve durum işlemleri

_2026-11-17_

- **Yeni:** Üye listesinde çoklu seçim, filtre sonucunun tamamını seçme ve güvenli toplu Aktif/Pasif durum işlemleri eklendi. Ayrılmış veya vefat etmiş üyeler toplu durum işleminde değiştirilmez.

### 1.13.2 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.13.1 — Asistan araçları yeni veri sözleşmesinde

_2026-11-15_

- **Güvenlik:** Asistan araçları v2 veri sözleşmesine taşındı: modele giden her alan açıkça listelenir ve veri sınıfı bildirilir. Toplam ve kurumsal veriler denetimli bulut modunda da kullanılabilir; serbest kişisel içerik yalnız yerel modelde kalır.

### 1.13.0 — Asistan: üye profili (takma adlı)

_2026-11-15_

- **Yeni:** Asistan ad parçasıyla ya da konuşmadaki takma adla üye bulabilir: durum, üyelik türü, giriş/çıkış yılı ve aidatlar. Buluta ad, iletişim, adres, doğum tarihi gitmez; kişi [[K3]] gibi görünür, size gerçek adıyla gösterilir. Bulutta yalnız "takma adlı kişi verisi" açıkken.

### 1.12.1 — Uzaktan form bağı bildirildi

_2026-11-15_

- **Güvenlik:** Üye sayfasındaki e-imza bağlantıları artık bildirilmiş erişimle çalışır. Yönetici erişimi bir kez yeniden onaylar.

### 1.12.0 — AI v2 araç geçişi

_2026-11-15_

- **Güvenlik:** Toplu istatistik araçları katı girdi, sunucu sonucu ve modele çıkacak alanların açık şemalarıyla v2 sözleşmesine taşındı; kişisel satırlar modele döndürülmez.
- **İyileştirme:** Aidat veri kümesi 500 kayıtlık keyset sayfaları ve ödeme toplamlarıyla okunur; CSV/XLSX doğrudan şifreli akışa yazılır. İptal, süre ve boyut sınırları yayından önce doğrulanır.
- **Yeni:** create_dataset/query_dataset/export_dataset araçları açık şema, TR/DE açıklamalar ve onay zorunluluğuyla sunulur; eski adlar uyum için korunur.

### 1.11.0 — Takma adlı aidat listesi (AI)

_2026-11-15_

- **Yeni:** AI aracı list_dues_by_person: kişi başına aidat durumu (takma ad, tam avro, vade ayı, üyelik türü, durum); ad ve üye numarası modele gitmez.

### 1.10.4 — AI veri sınıfı

_2026-11-15_

- **İyileştirme:** Aidat veri kümesi araçları AI veri sınıfı "internal" olarak işaretlendi.

### 1.10.3 — AI takma ad çözümlemesi

_2026-11-15_

- **İyileştirme:** AI asistanı için canlı üye adı sorgusu eklendi (yalnız AI modülünün sunucu tarafı kullanır).

Daha eski 19 sürüm: [releases.json](https://github.com/akgngr/verein-erp/blob/main/src/modules/members/releases.json)
