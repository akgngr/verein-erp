---
sidebar_position: 23
title: "Muhasebe"
description: "Alman dernek mevzuatına uygun çift taraflı defter tutma, fiş ve bütçe yönetimi."
slug: /kullanim/moduller/accounting
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Alman dernek mevzuatına uygun çift taraflı defter tutma, fiş ve bütçe yönetimi.

| | |
|---|---|
| Anahtar | `accounting` |
| Tür | Resmî modül |
| Sürüm | 1.22.1 |
| Sayfalar | `/muhasebe`, `/muhasebe/faturalar`, `/muhasebe/gelen-faturalar`, `/muhasebe/cariler`, `/muhasebe/banka`, `/muhasebe/uyelik-aktarimi`, `/muhasebe/raporlar`, `/muhasebe/vergi`, `/muhasebe/hibeler`, `/muhasebe/sepa`, `/muhasebe/butce`, `/muhasebe/ekler`, `/muhasebe/gobd`, `/muhasebe/yil-kapanisi`, `/muhasebe/ayarlar` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Modül Yönetimi](./system) | okuma | Envanter modülünün etkin olup olmadığını okur. |
| [Envanter ve Demirbaş](./inventory) | yazma | Demirbaşları envanter eşyalarıyla senkron tutar (ad, tarih, bedel, hurdaya çıkarma). |
| [Üyeler](./members) | okuma | Üye aidat ödemelerini muhasebeye aktarmak için ödemeleri okur. |
| [Dernek Bilgileri](./organization) | okuma | PDF raporlarında dernek antetini kullanır. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|
| Yevmiye & Defterler | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme | — | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme | — | — |
| Hesap Planı & Bütçe | görüntüleme, oluşturma, düzenleme | görüntüleme | — | görüntüleme, oluşturma, düzenleme | görüntüleme | — | — |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_accounting_summary` · `get_bank_inbox_summary` · `get_open_items_summary` · `get_payables_summary` · `get_report_link` · `get_vat_summary`

## Sürüm notları

### 1.22.1 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.22.0 — Asistan: gelir-gider özetleri bulutta da

_2026-11-15_

- **Yeni:** Asistanın muhasebe araçları (gelir-gider, KDV, açık kalemler, banka, gelen faturalar, rapor bağlantısı) yeni veri sözleşmesine taşındı: yalnız toplamlar, kişi/karşı taraf yok. Denetimli bulut modunda da çalışırlar.

### 1.21.1 — Evrak aktarımı için sunucu API'si

_2026-11-15_

- **Güvenlik:** Gelen fatura taslağı içe aktarımı ve izin tanımı diğer modüllerin onaylı erişimine açıldı.

### 1.21.0 — Gelen fatura ön doldurma

_2026-11-15_

- **Yeni:** Gelen fatura yüklemesi isteğe bağlı ön doldurma alanlarını (tedarikçi, numara, tarihler, IBAN, not) kabul eder; e-fatura verisi her zaman önceliklidir.

### 1.20.1 — E-fatura görünümü düzeltmesi

_2026-11-08_

- **Düzeltme:** Gelen e-fatura görünümünde kaynak satırı çeviri hatası (FORMATTING_ERROR) giderildi.

### 1.20.0 — E-fatura zorunluluğu ve alıcı türü

_2026-11-08_

- **Yeni:** Cari kartında e-fatura alıcı türü (işletme, özel kişi, kamu) ve kamu için Leitweg-ID.
- **Yeni:** Muhasebe ayarlarında e-fatura zorunluluğu (2027/2028 kuralı, önceki yıl cirosu) ve satıcı bilgileri hazırlık listesi.
- **Yeni:** Fatura ekranında e-fatura gerekliliği uyarısı; B2C ve ≤ 250 € faturalar uyarı üretmez. Kamu alıcısına Leitweg-ID olmadan fatura kesilemez.

### 1.19.0 — Gelen e-fatura okunabilir görünüm ve PDF

_2026-11-07_

- **Yeni:** Gelen XRechnung/ZUGFeRD faturalarının detayında satıcı, alıcı, kalemler, KDV dökümü, ödeme bilgileri ve notlarla okunabilir görünüm. Görünüm her zaman saklanan orijinal XML'den üretilir.
- **Yeni:** Aynı içerikten saklama ve denetim için PDF indirilebilir.

### 1.18.0 — E-fatura doğrulama

_2026-11-07_

- **Yeni:** E-fatura doğrulama: EN 16931 ve XRechnung (BR-DE) kuralları; hatalı faturada XRechnung/ZUGFeRD üretilmez, fatura ekranında kontrol paneli, gelen e-faturada içe alırken kontrol, isteğe bağlı KoSIT doğrulayıcısı.

Daha eski 20 sürüm: [releases.json](https://github.com/akgngr/verein-erp/blob/main/src/modules/accounting/releases.json)
