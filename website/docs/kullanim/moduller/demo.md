---
sidebar_position: 6
title: "Demo veri"
description: "Test için kurgusal örnek veri yükler; modül kapatılınca hepsini siler."
slug: /kullanim/moduller/demo
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Test için kurgusal örnek veri yükler; modül kapatılınca hepsini siler.

| | |
|---|---|
| Anahtar | `demo` |
| Tür | Resmî modül |
| Sürüm | 1.0.0 |
| Sayfalar | `/ayarlar/demo-veri` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Modül Yönetimi](./system) | okuma | Yalnızca etkin modüllere veri üretmek için modül durumlarını okur. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Demo veri | görüntüleme, oluşturma, silme | — | — | — | — | — | — |

## Sürüm notları

### 1.0.0 — Demo veri modülü

_2026-11-01_

- **Yeni:** Demo veri modülü: etkinken Ayarlar → Demo veri sayfasından tek tıkla kurgusal örnek kayıt yüklenir (üyeler, öğrenciler/veliler, cariler, bağışçılar, bağışlar, muhasebe kayıtları için 30'ar; 15 fatura/teklif/proforma; kurslar, etkinlikler, envanter, görevler, toplantılar, projeler için 10'ar). Modül kapatılınca demo kayıtlar otomatik silinir.
- **Güvenlik:** Demo veriler tamamen kurgusaldır (example.com e-postaları, örnek IBAN). GoBD silme koruması değiştirilmedi: demo muhasebe kayıtları ve bağışlar silinemez, test veritabanında kalır.
- **İyileştirme:** Modül geliştiricileri için demo.ts ve lifecycle.ts sözleşmeleri (kapatılırken temizlik kancası).
