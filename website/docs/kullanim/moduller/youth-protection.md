---
sidebar_position: 7
title: "Çocuk Koruma"
description: "Eğitmen ve gönüllülerin genişletilmiş adli sicil belgesi (§ 72a SGB VIII) ibraz takibi ve harç muafiyet yazısı şablonu. Orijinal belge fiziki olarak incelenir, asla sisteme yüklenmez ve dijitalleştirilmez."
slug: /kullanim/moduller/youth-protection
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Eğitmen ve gönüllülerin genişletilmiş adli sicil belgesi (§ 72a SGB VIII) ibraz takibi ve harç muafiyet yazısı şablonu. Orijinal belge fiziki olarak incelenir, asla sisteme yüklenmez ve dijitalleştirilmez.

| | |
|---|---|
| Anahtar | `youth-protection` |
| Tür | Eklenti |
| Sürüm | 0.1.2 |
| Sayfalar | `/youth-protection` |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Çocuk Koruma | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma, düzenleme, silme | görüntüleme, oluşturma, düzenleme | — | görüntüleme | — | — | — |

## Sürüm notları

### 0.1.2 — nav.json kategori ve alt modül tanımı

_2026-11-24_

- **İyileştirme:** Kullanıcı bazlı sol menü gruplama ve alt modül hiyerarşisi için nav.json eklendi.

### 0.1.1 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 0.1.0 — Çocuk Koruma İnceleme Takibi (§ 72a SGB VIII)

_2026-11-21_

- **Yeni:** Eğitmen ve gönüllülerin genişletilmiş sabıka kaydı (erweitertes Führungszeugnis) ibraz ve ibraz yenileme takibi (DSGVO Md. 10 uyumlu, dosya yüklemesiz, K0 veri sınıfı).
- **Yeni:** Meldebehörde / Bürgeramt için harç muafiyet yazısı şablonu (§ 12 JVKostG).
- **Yeni:** Sekreter sabah özeti entegrasyonu: süresi dolan veya 3 ay içinde dolacak ibrazlar için kişi adı içermeyen sayısal uyarı.
- **Güvenlik:** Yasal silme ve yaşam döngüsü (§ 72a (5) SGB VIII / DSGVO Md. 17): Serbest metin not kaldırıldı; sabit durum enum'ı eklendi. Görev bittikten 3 ay sonra otomatik hard-delete ve kullanıcı silinince verilerin silinmesi sağlandı.
