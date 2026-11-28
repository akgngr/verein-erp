---
sidebar_position: 3
title: "Bağışlar"
description: "Bağış kayıtları, bağış makbuzu (Zuwendungsbestätigung) ve bağışçı takibi."
slug: /kullanim/moduller/donations
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Bağış kayıtları, bağış makbuzu (Zuwendungsbestätigung) ve bağışçı takibi.

| | |
|---|---|
| Anahtar | `donations` |
| Tür | Resmî modül |
| Sürüm | 1.2.0 |
| Sayfalar | `/bagislar`, `/bagislar/bagiscilar`, `/bagislar/bildirimler`, `/bagislar/bildirimler/olustur`, `/bagislar/ayarlar` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Muhasebe](./accounting) | okuma, yazma | Bağışları gelir fişi olarak yazar ve iptal eder. |
| [Üyeler](./members) | okuma | Bağış makbuzu için üye adresini ve aidat ödemelerini okur. |
| [Dernek Bilgileri](./organization) | okuma | Bağış makbuzunda dernek bilgilerini kullanır. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Bağış ve Makbuzlar | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme | — | görüntüleme, oluşturma, düzenleme, silme, onay | — | — | — | — |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_donation_statistics`

## Sürüm notları

### 1.2.0 — Ayni bağış (Sachzuwendung), 300 € basitleştirilmiş kanıt ve EPC-QR (GiroCode)

_2026-11-26_

- **Yeni:** Ayni bağışlar (Sachzuwendung) için BMF Anlage 4 alanları (eşya açıklaması, kaynak türü, değerleme belgesi) ve tekil BMF bağış bildirimi şablonu eklendi; ayni bağışlar nakit/banka fişi açmaz ve toplu bildirimlere dahil edilmez (#618).
- **Yeni:** 300 € ve altı nakdi bağışlar için § 50 Abs. 4 Nr. 2 EStDV basitleştirilmiş bağış kanıtı PDF'i (isteğe bağlı yerel GiroCode EPC-QR ile) eklendi (#618).

### 1.1.15 — Banka eşleştirme tek tıkla bağış sözleşmesi (#616)

_2026-11-26_

- **Yeni:** Muhasebe banka ekstre satırından mevcut veya yeni bağışçı ile atomik bağış ve fiş oluşturma sunucu sözleşmesi eklendi.

### 1.1.14 — Bağışçı düzenleme, BMF PDF, 10 yıl saklama ve toplu PDF birleştirme

_2026-11-25_

- **Düzeltme:** Bağışçı güncelleme/mükerrer kontrolü, bağış düzenleme fiş sürümlemesi, BMF PDF numaralandırma ve satır bölme, 10 yıllık saklama koruması ve SHA-256 doğrulamalı pdf-lib toplu birleştirme düzeltildi (#575, #577).

### 1.1.13 — nav.json kategori ve alt modül tanımı

_2026-11-24_

- **İyileştirme:** Kullanıcı bazlı sol menü gruplama ve alt modül hiyerarşisi için nav.json eklendi.

### 1.1.12 — Üye portalı bağış makbuzu PDF sözleşmesi

_2026-11-24_

- **Yeni:** Üyenin kendi bağış bildirimlerini portal üzerinden doğrulayıp PDF olarak indirebilmesi için sunucu sözleşmesi eklendi.

### 1.1.11 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.1.9 — Kod bakımı

_2026-11-19_

- **İyileştirme:** Kullanılmayan kod temizlendi; formlar alan değişikliklerini React Compiler ile uyumlu şekilde izliyor. Görünüm ve davranış değişmedi.

### 1.1.8 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

Daha eski 8 herkese açık sürüm notu.
