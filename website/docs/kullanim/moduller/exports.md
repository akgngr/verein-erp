---
sidebar_position: 11
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
| Sürüm | 2.2.7 |
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

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Dosyalarım | görüntüleme, oluşturma, silme | görüntüleme, oluşturma, silme | görüntüleme, oluşturma, silme | görüntüleme, oluşturma, silme | görüntüleme, oluşturma, silme | görüntüleme, silme | görüntüleme, oluşturma, silme | görüntüleme, oluşturma, silme |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`create_file` · `export_dataset` · `propose_dataset_export`

## Sürüm notları

### 2.2.7 — Dışa aktarım alt süreç ortam izolasyonu

_2026-11-25_

- **Güvenlik:** Alt süreç oluşturma ortamında hassas ortam değişkenlerinin sızmasını önleyen beyaz liste uygulandı (#573).

### 2.2.6 — Art. 15 anahtarı

_2026-11-25_

- **Güvenlik:** Art. 15 dışa aktarım şifrelemesinde sabit yedek anahtar kaldırıldı (anahtar yoksa fail closed).

### 2.2.5 — Vergi danışmanı rapor indirmesi

_2026-11-25_

- **Düzeltme:** Vergi danışmanı (TAX_ADVISOR) oluşturduğu uyum raporunu artık indirebilir (önceden HTTP 403).
- **Güvenlik:** CSV formül enjeksiyonu koruması ortak yardımcıya taşındı; envanter dışa aktarımı da kullanır.

### 2.2.4 — nav.json kategori ve alt modül tanımı

_2026-11-24_

- **İyileştirme:** Kullanıcı bazlı sol menü gruplama ve alt modül hiyerarşisi için nav.json eklendi.

### 2.2.3 — Üye portalı DSGVO Md. 15 şifreli dışa aktarım sözleşmesi

_2026-11-24_

- **Yeni:** 7 gün geçerli AES-256-GCM şifreli Md. 15 dışa aktarım oluşturma ve indirme sözleşmesi eklendi.

### 2.2.2 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 2.2.1 — Çalışma zamanı modernizasyonu

_2026-11-20_

- **İyileştirme:** Kayıtlı format eklentilerinin sıralanmasında (allFormats) toSorted kullanımı benimsendi.

### 2.2.0 — Üretim hattında PDF

_2026-11-19_

- **Yeni:** Merkezi dosya üretim hattı artık PDF belgeleri de üretir (çıktı doğrulaması, şifreli saklama, yayından önce yetki denetimi). İlk kullanan: sekreterin haftalık kurul raporu.

Daha eski 16 herkese açık sürüm notu.
