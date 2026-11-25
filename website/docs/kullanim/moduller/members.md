---
sidebar_position: 42
title: "Üyeler"
description: "Üye kayıtları, üyelik tipleri, aidat tahakkuk ve ödeme takibi."
slug: /kullanim/moduller/members
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Üye kayıtları, üyelik tipleri, aidat tahakkuk ve ödeme takibi.

| | |
|---|---|
| Anahtar | `members` |
| Tür | Resmî modül |
| Sürüm | 1.15.8 |
| Sayfalar | `/uyeler`, `/uyeler/aidat`, `/uyeler/turler`, `/toplu-eposta?kaynak=members:members`, `/uyeler/ice-aktar` |
| Önerir | [e-Sign](./online-forms) |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Dernek Bilgileri](./organization) | okuma | Makbuz ve belgelerde dernek antetini kullanır. |
| [e-Sign](./online-forms) | okuma, yazma | Üye sayfasından e-imza/uzaktan form bağlantısı göndermek, imzalı belgeleri göstermek ve üye silindiğinde bekleyen davetleri iptal etmek için. |
| [Üye Portalı](./member-portal) | okuma, yazma | Üye silindiğinde o üyeye ait aktif üye portalı oturumlarını iptal eder. |

## Varsayılan yetkiler

Roller ve izinler **Ayarlar → Roller** ekranından değiştirilebilir; tablo kurulumdaki varsayılandır.

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Kimlik numaraları | görüntüleme | görüntüleme | görüntüleme | — | — | — | — | — |
| Aidat ve Ödemeler | görüntüleme, oluşturma, düzenleme, silme | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | — | — | — |
| Üyelik Tipleri | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | görüntüleme | — | — | görüntüleme |
| Üye Kayıtları | görüntüleme, oluşturma, düzenleme, silme | görüntüleme, oluşturma, düzenleme | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | — | — | görüntüleme |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`create_dataset` · `create_dues_dataset` · `get_member_profile` · `get_member_statistics` · `list_dues_by_person` · `query_dataset`

## Sürüm notları

### 1.15.8 — Aidat korumaları, DSGVO dışa aktarım, silme temizliği ve düzeltme talebi paneli

_2026-11-25_

- **Düzeltme:** Aidat fazla ödeme/işlem içi koruma, makbuz PDF tutarı ve denetim kaydı, mükerrer üye uyarısı, tam DSGVO dışa aktarımı, toplu içe aktarma tekilleştirme, silmede SEPA/portal temizliği ve üye düzeltme talebi onay paneli eklendi (#578, #577).

### 1.15.7 — nav.json kategori ve alt modül tanımı

_2026-11-24_

- **İyileştirme:** Kullanıcı bazlı sol menü gruplama ve alt modül hiyerarşisi için nav.json eklendi.

### 1.15.6 — Üye portalı düzeltme kuyruğu ve self-servis sözleşmeleri

_2026-11-24_

- **Yeni:** MemberCorrectionProposal onay kuyruğu, portal rıza/düzeltme sözleşmeleri ve aidat makbuzu PDF sözleşmesi eklendi.

### 1.15.5 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR sistem rolü için varsayılan kapalı (erişimsiz) izin kaydı eklendi.

### 1.15.4 — GoBD silme koruması

_2026-11-23_

- **Güvenlik:** Aidat tahakkuk ilişkisi (MemberDue.member) onDelete: Restrict olarak güncellendi.

### 1.15.3 — Kod bakımı

_2026-11-19_

- **İyileştirme:** Kullanılmayan kod temizlendi; formlar alan değişikliklerini React Compiler ile uyumlu şekilde izliyor. Görünüm ve davranış değişmedi.

### 1.15.2 — Arka plan işleri için üye eşleştirme

_2026-11-19_

- **Düzeltme:** E-postaya göre üye eşleştirmesi arka plan işlerinden de güvenle kullanılabilir.

### 1.15.1 — Arayüz altyapısı

_2026-11-18_

- **İyileştirme:** Düğme ve bağlantılar ortak arayüz kitine taşındı. Görünüm ve davranış değişmedi.

Daha eski 33 herkese açık sürüm notu.
