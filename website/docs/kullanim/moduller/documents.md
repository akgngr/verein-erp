---
sidebar_position: 14
title: "Evrak Kayıt"
description: "Gelen ve giden resmi evrakların numaralandırılması, takibi ve arşivlenmesi."
slug: /kullanim/moduller/documents
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Gelen ve giden resmi evrakların numaralandırılması, takibi ve arşivlenmesi.

| | |
|---|---|
| Anahtar | `documents` |
| Tür | Resmî modül |
| Sürüm | 1.6.3 |
| Sayfalar | `/evrak`, `/evrak/kategoriler` |
| Önerir | [Muhasebe](./accounting), [Görevler](./tasks), [Yapay zekâ asistanı](./ai) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Muhasebe](./accounting) | okuma, yazma | "Muhasebeye aktar": gelen evrak dosyasını muhasebede gelen fatura taslağı olarak açar (yalnız taslak; kesinleştirme muhasebede). Muhasebe yetkisi kullanıcıya göre ayrıca denetlenir. |
| [Görevler](./tasks) | okuma | Yalnız kullanıcının görev oluşturma yetkisini okur; "Termin için görev oluştur" düğmesini göstermek için. |
| [Yapay zekâ asistanı](./ai) | okuma | "AI ile özetle": evrak metnini asistanın özet servisine gönderir; asistan veri politikası (yerel model ya da maskelenmiş bulut) ve kullanıcının asistan yetkisi sunucuda uygulanır. |
| [Modül Yönetimi](./system) | okuma | Muhasebe, görevler ve asistan modüllerinin etkin olup olmadığını okur (düğmeler yalnız etkinse gösterilir). |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Salt okunur | Sayman | Denetçi | Öğretmen |
|---|---|---|---|---|---|---|---|
| Evrak Kategorileri | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | görüntüleme | görüntüleme | — |
| Gelen / Giden Evraklar | görüntüleme, oluşturma, düzenleme, silme | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | görüntüleme | — |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_document` · `get_document_statistics` · `list_documents` · `propose_delete_document` · `propose_document` · `propose_document_status` · `read_document_file`

## Sürüm notları

### 1.6.3 — OCR ortak altyapıya taşındı

_2026-11-16_

- **İyileştirme:** Evrak OCR'ı ortak dosya altyapısına taşındı (asistan ekleri de kullanır); davranış değişmedi.

### 1.6.2 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.6.1 — Asistan araçları yeni veri sözleşmesinde

_2026-11-15_

- **Güvenlik:** Asistan araçları v2 veri sözleşmesine taşındı: modele giden her alan açıkça listelenir ve veri sınıfı bildirilir. Toplam ve kurumsal veriler denetimli bulut modunda da kullanılabilir; serbest kişisel içerik yalnız yerel modelde kalır.

### 1.6.0 — Modüller arası bağ bildirildi

_2026-11-15_

- **Güvenlik:** Muhasebe, görevler ve asistan bağlantıları artık bildirilmiş erişimle çalışır: "Muhasebeye aktar" sunucuda, muhasebe yetkiniz denetlenerek yapılır; düğmeler yalnız ilgili modül açık ve yetkiniz varsa görünür. Yönetici erişimleri bir kez yeniden onaylar.

### 1.5.1 — Sürümlü AI öneri ve sonuç sınırları

_2026-11-15_

- **Güvenlik:** Öneri araçları katı Zod girdisi ve sabit model sonucu kullanır; salt öneri sorguları gereksiz kişi detaylarını okumaz. Kalan eski okuma araçlarının dönüşümü ayrı sürer.

### 1.5.0 — Evraktan iş oluşturma

_2026-11-15_

- **Yeni:** Gelen evrak dosyalarında "Muhasebeye aktar": dosya analiz edilip muhasebede tedarikçi, numara, tarih, vade ve IBAN'ı dolu gelen fatura taslağı olarak açılır. Son işlem tarihi olan evrakta "Termin için görev oluştur".

### 1.4.0 — Evraktan doldur: AI özeti

_2026-11-15_

- **Yeni:** "Evraktan doldur" penceresinde "AI ile özetle": kısa özet, evrak türü, işlem gerekip gerekmediği ve kategori önerisi; seçilen alanlar forma yazılır.
- **Düzeltme:** OCR hata kaydı teşhis bilgisi (hata türü/kodu, evrak metni olmadan) içeriyor; dil dosyaları için ek arama yolu ve OCR_LANG_DIR; üretim paketine OCR worker bağımlılıkları eklendi.

### 1.3.0 — Evraktan doldur (OCR)

_2026-11-15_

- **Yeni:** Yeni evrak formunda seçilen dosya için "Evraktan doldur": metin katmanı veya OCR (taranmış PDF, fotoğraf; Almanca/Türkçe/İngilizce) ile tarih, gönderen, karşı tarafın sayısı, konu, son işlem tarihi ve özet önerilir; seçilen alanlar forma yazılır. Düzenleme formunda da kullanılabilir.
- **Güvenlik:** Analiz edilen dosya saklanmaz; OCR tamamen sunucuda yerel çalışır, metin dışarı gönderilmez ve loglanmaz.

Daha eski 6 sürüm: [releases.json](https://github.com/akgngr/verein-erp/blob/main/src/modules/documents/releases.json)
