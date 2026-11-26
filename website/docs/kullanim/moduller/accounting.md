---
sidebar_position: 27
title: "Muhasebe"
description: "Dernekler ve küçük işletmeler için EÜR odaklı gelir-gider, fiş, fatura ve bütçe yönetimi."
slug: /kullanim/moduller/accounting
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Dernekler ve küçük işletmeler için EÜR odaklı gelir-gider, fiş, fatura ve bütçe yönetimi.

| | |
|---|---|
| Anahtar | `accounting` |
| Tür | Resmî modül |
| Sürüm | 1.27.5 |
| Sayfalar | `/muhasebe`, `/muhasebe/panel`, `/muhasebe/faturalar`, `/muhasebe/gelen-faturalar`, `/muhasebe/cariler`, `/muhasebe/banka`, `/muhasebe/uyelik-aktarimi`, `/muhasebe/raporlar`, `/muhasebe/vergi`, `/muhasebe/hibeler`, `/muhasebe/sepa`, `/muhasebe/butce`, `/muhasebe/ekler`, `/muhasebe/gobd`, `/muhasebe/denetim`, `/muhasebe/yil-kapanisi`, `/muhasebe/ayarlar` |

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

| İzin | Yönetici | Yönetim Kurulu | Sekreter | Sayman | Denetçi | TAX_ADVISOR | Öğretmen | Salt okunur |
|---|---|---|---|---|---|---|---|---|
| Yevmiye & Defterler | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme | — | görüntüleme, oluşturma, düzenleme, silme, onay | görüntüleme | görüntüleme | — | — |
| Hesap Planı & Bütçe | görüntüleme, oluşturma, düzenleme | görüntüleme | — | görüntüleme, oluşturma, düzenleme | görüntüleme | görüntüleme | — | — |

## Asistan araçları

Asistanın bu modülde kullanabildiği araçlar (bkz. [Yapay zekâ asistanı](/kullanim/asistan)):

`get_accounting_summary` · `get_bank_inbox_summary` · `get_open_items_summary` · `get_payables_summary` · `get_report_link` · `get_vat_summary`

## Sürüm notları

### 1.27.5 — GoBD, vergi, Kassenminus, banka ve PDF güvenlik düzeltmeleri

_2026-11-25_

- **Güvenlik:** Sayman raporu PDF oluşturucusunda çapraz modül dosya okuma engellendi ve KoSIT doğrulayıcıda DNS-sabitli SSRF koruması eklendi (#573).
- **Düzeltme:** Kassenminus, banka içe aktarma/ters kayıt, SOLL-Versteuerung UStVA, § 19 UStG, GoBD Z3 UTF-8/ek CSV'ler, yıllık kapanış, e-fatura KDV kategorisi E ve SEPA pain.001 transliterasyon hataları giderildi (#576, #577).
- **Düzeltme:** Kesilmiş faturanın tahsilatında faturadaki KDV oranları esas alınır; § 19 UStG ayarı sonradan açılsa da KDV'li fatura KDV'siz kaydedilmez.
- **Düzeltme:** İçe aktarılan tedarikçi alacak dekontları (negatif tutarlar) iade olarak kapatılabilir: elle veya gelen banka hareketiyle eşleştirilir, gider ve ön KDV azaltılır.

### 1.27.4 — Arayüz düzeltmeleri (#586)

_2026-11-25_

- **Düzeltme:** Varlık, götürü gider ve kasa kapanışı formlarında tarih alanları yerel biçimde (GG.AA.YYYY) ve takvimle seçilir.

### 1.27.3 — nav.json kategori ve alt modül tanımı

_2026-11-24_

- **İyileştirme:** Kullanıcı bazlı sol menü gruplama ve alt modül hiyerarşisi için nav.json eklendi.

### 1.27.2 — TAX_ADVISOR rolü izin tanımı

_2026-11-23_

- **Güvenlik:** TAX_ADVISOR rolü için salt okunur görüntüleme izni tanımlandı.

### 1.27.0 — Kassenprüfer süreli denetim odası (B001 Q1)

_2026-11-23_

- **Yeni:** Son kullanma tarihli salt-okunur denetçi erişimi (/muhasebe/denetim), tüm görüntülemelerin denetim kaydına yazılması, 5 alanlı rehberli kontrol listesi ve Genel Kurul Denetim Raporu PDF'ine aktarılan bulgu kayıtları eklendi.

### 1.26.1 — GoBD silme koruması

_2026-11-23_

- **Güvenlik:** Banka ekstresi hareketleri ilişkisi (AccountingBankTransaction.import) onDelete: Restrict olarak güncellendi.

### 1.26.0 — Genel Kurul Kassenbericht ve sunum görünümü

_2026-11-22_

- **Yeni:** Genel Kurul için tek tıkla faaliyet alanları (§ 5), projeler, rezervler ve önceki yıl karşılaştırmalı Kassenbericht PDF raporu ve slayt görünümü eklendi (Q3, Refs #407).

### 1.25.0 — Sekreterden ihtar önerisi

_2026-11-19_

- **Yeni:** Vadesi geçmiş ve ihtar zamanı gelmiş faturalar için sekreter, onay kutusunda "ihtar kaydı oluştur" önerisi sunar. Onaylanınca her faturaya sıradaki ihtar kademesi kaydedilir; e-posta veya PDF gönderilmez. Yalnız muhasebe düzenleme yetkisi olanlar görür; bu arada ödenen veya ihtarlanan fatura varsa öneri geçersiz olur.

Daha eski 52 herkese açık sürüm notu.
