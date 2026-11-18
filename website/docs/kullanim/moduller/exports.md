---
sidebar_position: 9
title: "Dosyalarım"
description: "Oluşturulan PDF, Excel, Word, Markdown ve CSV dosyaları; şifreli saklanır."
slug: /kullanim/moduller/exports
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Oluşturulan PDF, Excel, Word, Markdown ve CSV dosyaları; şifreli saklanır.

| | |
|---|---|
| Anahtar | `exports` |
| Tür | Çekirdek (her zaman açık) |
| Sürüm | 2.1.9 |
| Sayfalar | `/dosyalar` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Otomasyon](./automation) | okuma, yazma | Dosya taleplerini mevcut otomasyon kuyruğuna atomik kaydeder; iş durumu ve worker kilidini doğrular. |
| [Üyeler](./members) | okuma | Yetkili dosya üretimi ve çalışma anında izin kontrolü. |
| [Dernek Bilgileri](./organization) | okuma | PDF dosyalarında dernek antetini (ad, adres, logo) kullanır. |
| [Modül Yönetimi](./system) | okuma | Başka modüllerin dosya formatı eklentilerinin yalnızca modül etkinken kullanılması için modül durumlarını okur. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Dosyalarım | görüntüleme, oluşturma, silme | görüntüleme, oluşturma, silme | görüntüleme, oluşturma, silme | görüntüleme, oluşturma, silme | görüntüleme, oluşturma, silme | görüntüleme, oluşturma, silme | görüntüleme, oluşturma, silme |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`create_file` · `export_dataset` · `propose_dataset_export`

## Sürüm notları

### 2.1.9 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 2.1.8 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 2.1.7 — Dosyalarda gerçek adlar

_2026-11-15_

- **Düzeltme:** Dosya oluşturma: takma adlar dosyada gerçek ada çevrilir.

### 2.1.6 — Asistan araçları yeni veri sözleşmesinde

_2026-11-15_

- **Güvenlik:** Asistan araçları v2 veri sözleşmesine taşındı: modele giden her alan açıkça listelenir ve veri sınıfı bildirilir. Toplam ve kurumsal veriler denetimli bulut modunda da kullanılabilir; serbest kişisel içerik yalnız yerel modelde kalır.

### 2.1.5 — Sınırlı ve şifreli dosya akışı

_2026-11-15_

- **İyileştirme:** Aidat veri kümesi 500 kayıtlık keyset sayfaları ve ödeme toplamlarıyla okunur; CSV/XLSX doğrudan şifreli akışa yazılır. İptal, süre ve boyut sınırları yayından önce doğrulanır.

### 2.1.4 — Merkezi dosya talebi ve güvenli publication

_2026-11-15_

- **Güvenlik:** FileGeneration facade mevcut outbox ile atomiktir; yalnız geçerli worker lease dosyayı yayımlar, pending dosyalar liste/indirmeden gizlenir.

### 2.1.3 — Sürümlü veri kümesi araçları

_2026-11-15_

- **Yeni:** create_dataset/query_dataset/export_dataset araçları açık şema, TR/DE açıklamalar ve onay zorunluluğuyla sunulur; eski adlar uyum için korunur.

### 2.1.2 — Worker toparlanması ve dosya hata durumu

_2026-11-15_

- **Düzeltme:** Geçici export hataları sınırlı yeniden denenir; terminal/iptal durumları kuyrukta görünmez, başarısız geçici dosyalar temizlenir.

Daha eski 7 herkese açık sürüm notu.
