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
| Sürüm | 1.8.1 |
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

### 1.8.1 — Evrak rozetleri ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Tekrarlanan HeroUI durum/tür rozetleri ortak StatusChip pattern'ine taşındı; modül görsel sözleşmesi framework implementasyonundan ayrıştırıldı.

### 1.8.0 — Evrak listesinde toplu seçim ve durum işlemleri

_2026-11-17_

- **Yeni:** Evrak listesinde çoklu seçim, filtre sonucunun tamamını seçme ve Açık/İşlemde/Tamamlandı/Arşivlendi durumlarına toplu geçiş eklendi.

### 1.7.1 — Daha iyi OCR: küçük resimler ve WebP

_2026-11-16_

- **İyileştirme:** Resimler OCR'dan önce büyütülüp PNG'ye çevrilir: küçük ekran görüntüleri ve WebP dosyaları artık okunur.

### 1.7.0 — Asistandan kayıtta dosya eki; daha güçlü OCR

_2026-11-16_

- **Yeni:** Asistanın önerdiği evrak kaydı onaylanınca sohbete eklenen dosya kayda eklenir (normal yükleme kurallarıyla doğrulanır). Taranmış PDF'lerde sayfa görüntüsü de OCR ile okunur.

### 1.6.4 — Asistan önerileri bulutta

_2026-11-16_

- **İyileştirme:** Asistanın öneri araçları (onay kartlı) bulut sağlayıcıda denetimli modda da kullanılabilir.

### 1.6.3 — OCR ortak altyapıya taşındı

_2026-11-16_

- **İyileştirme:** Evrak OCR'ı ortak dosya altyapısına taşındı (asistan ekleri de kullanır); davranış değişmedi.

### 1.6.2 — HeroUI v3 arayüz geçişi

_2026-11-16_

- **İyileştirme:** Modül arayüzü yerel HeroUI v3 bileşenlerine ve ortak açık/koyu tema renklerine geçirildi. Mevcut iş akışları, izinler ve çeviriler korunur.

### 1.6.1 — Asistan araçları yeni veri sözleşmesinde

_2026-11-15_

- **Güvenlik:** Asistan araçları v2 veri sözleşmesine taşındı: modele giden her alan açıkça listelenir ve veri sınıfı bildirilir. Toplam ve kurumsal veriler denetimli bulut modunda da kullanılabilir; serbest kişisel içerik yalnız yerel modelde kalır.

Daha eski 11 sürüm: [releases.json](https://github.com/akgngr/verein-erp/blob/main/src/modules/documents/releases.json)
