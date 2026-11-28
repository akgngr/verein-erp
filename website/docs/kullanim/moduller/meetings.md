---
sidebar_position: 40
title: "Toplantılar"
description: "Yönetim kurulu ve genel kurul toplantı takvimi, tutanaklar ve kararlar."
slug: /kullanim/moduller/meetings
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Yönetim kurulu ve genel kurul toplantı takvimi, tutanaklar ve kararlar.

| | |
|---|---|
| Anahtar | `meetings` |
| Tür | Resmî modül |
| Sürüm | 1.5.0 |
| Sayfalar | `/toplantilar`, `/toplantilar/gorevler` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Bildirimler](./notifications) | yazma | Toplantıya katılımcı eklendiğinde ilgili kullanıcıya bildirim gönderir. |
| [Üyeler](./members) | okuma | Toplantıya katılımcı eklemek için üye listesini okur. Duyuru kampanyalarında üye katılımcıların iletişim bilgilerini ve izinlerini okur. |
| [Dernek Bilgileri](./organization) | okuma | Tutanak PDF'inde dernek antetini kullanır. |
| [Toplu e-posta](./mailings) | okuma | Katılımcılara duyuru için Kampanyalar sihirbazını hazır kaynakla açar. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Salt okunur | Sayman | Denetçi | TAX_ADVISOR | Öğretmen |
|---|---|---|---|---|---|---|---|---|
| Toplantı ve Kararlar | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme, oluşturma, düzenleme, onay | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | görüntüleme | — | — |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_meeting` · `get_meeting_statistics` · `list_meetings` · `propose_delete_meeting` · `propose_meeting` · `propose_meeting_status`

## Sürüm notları

### 1.5.0 — Davet süresi hatırlatıcısı ve Davetiye & Gündem PDF'i (#636)

_2026-11-27_

- **Yeni:** Toplantı ayrıntısında davetin kaç gün önce gönderildiği, toplantı türüne göre öneri değerle (Genel Kurul 14, Yönetim Kurulu 7, Komite 3 gün) karşılaştırılarak gösterilir; bağlayıcı süre derneğin tüzüğündedir. Gün sayımı Berlin takvimine göredir.
- **Yeni:** Antetli, çift dilli (TR/DE) Davetiye & Gündem PDF çıktısı eklendi. Üyelere giden belgede iç süre değerlendirmesi yer almaz.

### 1.4.4 — Yerel tarih alanları

_2026-11-26_

- **İyileştirme:** Görev son tarihi yerel biçimde (GG.AA.YYYY, 24 saat) takvimle seçilir; tarayıcıya bağlı aa/gg/yyyy biçimi kaldırıldı.

### 1.4.3 — Gizli oylama kapanış yarış düzeltmesi ve tutanak korumaları

_2026-11-25_

- **Düzeltme:** Gizli oylama kapatma atomik işlem içine alındı, açık oylama varken onay engellendi, düzenlenebilirlik denetimi eklendi, gömülü metinler/window.confirm kaldırıldı ve PDF fontları ortaklaştırıldı (#579, #577).

### 1.4.2 — nav.json kategori ve alt modül tanımı

_2026-11-24_

- **İyileştirme:** Kullanıcı bazlı sol menü gruplama ve alt modül hiyerarşisi için nav.json eklendi.

### 1.4.1 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.4.0 — Yüz yüze gizli oylama

_2026-11-23_

- **Yeni:** Toplantıda gizli oylama: giriş masasında katılan üyelere tek kullanımlık oy kodu verilir, oy /oy kabininde adsız atılır. Evet/Hayır/Çekimser veya aday listesi; evet/hayır oylamasında karar otomatik kaydedilir.
- **Güvenlik:** Oy kaydında ad, zaman, sıra veya cihaz bilgisi yok; kapanışta kodlar silinir ve oy listesi karıştırılır. Seçimi göstermeyen makbuz kodu, oy listesi özeti ve en az oy sayısı koruması (varsayılan 5). Uygunluk kaydı ve oylar en geç 12 ay sonra silinir.

### 1.3.16 — Merkezi bildirimler

_2026-11-20_

- **Yeni:** Toplantıya eklenen kullanıcılar bildirim alır.

### 1.3.15 — Toplantılar sekreter özeti

_2026-11-18_

- **Yeni:** Yaklaşan toplantılar ve gündemi eksik toplantılar sekreter sabah özetinde görünür.

Daha eski 17 herkese açık sürüm notu.
