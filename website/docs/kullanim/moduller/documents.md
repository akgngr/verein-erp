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
| Sürüm | 1.10.0 |
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

### 1.10.0 — OCR önerilerinde kaynak ve güven

_2026-11-19_

- **İyileştirme:** Belge analizinde her alan önerisi kaynağını (metin katmanı veya OCR), güven değerini ve bulunduğu satırı taşır; OCR güveni düşükse öneriler ayrıca doğrulanacak şekilde işaretlenir. Öneriler yine yalnız öneridir, otomatik kaydedilmez ve hiçbir veri dışarı gönderilmez.

### 1.9.1 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

### 1.9.0 — Sekreter özetine katkı

_2026-11-18_

- **Yeni:** Kişisel sekreterin sabah özetinde süresi geçmiş ve 3 gün içinde dolacak evrak sayısı görünür.

### 1.8.3 — Ortak UI bileşenleri (iç değişiklik)

_2026-11-17_

- **İyileştirme:** Form alanları, pencereler, sekmeler, rozetler ve yükleme göstergeleri ortak UI kitine taşındı; görünüm ve davranış değişmez.

### 1.8.2 — Muhasebeye aktar eylemi ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Eylem butonları ve bildirimler ortak ActionButton/notify adapter katmanına taşındı; ilgili ekran artık bu kullanımda HeroUI Button/Toast implementasyonuna doğrudan bağlı değil.

### 1.8.1 — Evrak rozetleri ortak UI katmanında

_2026-11-17_

- **İyileştirme:** Tekrarlanan HeroUI durum/tür rozetleri ortak StatusChip pattern'ine taşındı; modül görsel sözleşmesi framework implementasyonundan ayrıştırıldı.

### 1.8.0 — Evrak listesinde toplu seçim ve durum işlemleri

_2026-11-17_

- **Yeni:** Evrak listesinde çoklu seçim, filtre sonucunun tamamını seçme ve Açık/İşlemde/Tamamlandı/Arşivlendi durumlarına toplu geçiş eklendi.

### 1.7.1 — Daha iyi OCR: küçük resimler ve WebP

_2026-11-16_

- **İyileştirme:** Resimler OCR'dan önce büyütülüp PNG'ye çevrilir: küçük ekran görüntüleri ve WebP dosyaları artık okunur.

Daha eski 16 herkese açık sürüm notu.
