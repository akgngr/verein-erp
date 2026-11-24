---
sidebar_position: 40
title: "Uyum kontrolü"
description: "Kamu yararı (Gemeinnützigkeit) için iç kontrol listesi: süreler ve sınırlar. Vergi danışmanlığı değildir."
slug: /kullanim/moduller/compliance
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Kamu yararı (Gemeinnützigkeit) için iç kontrol listesi: süreler ve sınırlar. Vergi danışmanlığı değildir.

| | |
|---|---|
| Anahtar | `compliance` |
| Tür | Eklenti |
| Sürüm | 0.2.0 |
| Sayfalar | `/compliance` |
| Önerir | [Muhasebe](./accounting) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Modül Yönetimi](./system) | okuma | Kural kaynağı olan modül açık mı, kontrol edilir. |
| [Görevler](./tasks) | yazma | Bir bulgudan, kullanıcı onayıyla görev taslağı oluşturulur. |
| [Dosyalarım](./exports) | yazma | Uyum raporu PDF/CSV olarak Dosyalarım alanına aktarılır. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Uyum kontrolü | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma | — | görüntüleme, oluşturma | görüntüleme | görüntüleme | — | — |

## Sürüm notları

### 0.2.0 — Uyum kokpiti arayüzü ve PDF/CSV dışa aktarım

_2026-11-23_

- **Yeni:** Yıl seçici, klavye erişimli trafik ışığı kartları, yasal kaynak bağlantıları, yönetici önizleme anahtarı (?preview=1) ve Dosyalarım üzerinden PDF/CSV dışa aktarım eklendi.

### 0.1.1 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR rolü için salt okunur görüntüleme izni tanımlandı.

### 0.1.0 — Kamu yararı uyum paneli

_2026-11-23_

- **Yeni:** Muafiyet belgesi süresi, makbuz geçerliliği, fon kullanımı (kaba hesap), eğitmen ödeneği ve ekonomik işletme sınırı için iç kontrol listesi. Kurallar veri olarak tutulur ve incelemeden önce yalnız önizlemede çalışır. Vergi danışmanlığı değildir.
