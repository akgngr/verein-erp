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
| Sürüm | 1.29.4 |
| Sayfalar | `/muhasebe`, `/muhasebe/panel`, `/muhasebe/faturalar`, `/muhasebe/gelen-faturalar`, `/muhasebe/cariler`, `/muhasebe/banka`, `/muhasebe/uyelik-aktarimi`, `/muhasebe/raporlar`, `/muhasebe/vergi`, `/muhasebe/hibeler`, `/muhasebe/sepa`, `/muhasebe/butce`, `/muhasebe/ekler`, `/muhasebe/gobd`, `/muhasebe/denetim`, `/muhasebe/yil-kapanisi`, `/muhasebe/ayarlar` |

## Diğer modüllere erişim

Yönetici, modülü açarken bu erişimleri onaylar (bkz. [Modül yönetimi](/yonetim/modul-yonetimi)).

| Modül | İşlem | Gerekçe |
|---|---|---|
| [Modül Yönetimi](./system) | okuma | Envanter ve ilgili modüllerin etkin olup olmadığını okur. |
| [Envanter ve Demirbaş](./inventory) | yazma | Demirbaşları envanter eşyalarıyla senkron tutar (ad, tarih, bedel, hurdaya çıkarma). |
| [Üyeler](./members) | okuma, yazma | Üye aidat ödemelerini muhasebeye aktarmak ve banka hareketleriyle açık aidatları eşleştirip kapatmak için üye aidatlarını okur ve öder. |
| [Kurslar](./courses) | okuma, yazma | Açık kurs ücretlerini banka hareketleriyle eşleştirip ödenmiş olarak işaretlemek için kurs ücretlerini okur ve günceller. |
| [Bağışlar](./donations) | okuma, yazma | Gelen banka hareketlerini tek tıkla bağış olarak kaydetmek ve mevcut bağışçıları önermek için bağış modülünü okur ve yazar. |
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

### 1.29.4 — Proje fiş ekleri dışa aktarım sözleşmesi

_2026-11-28_

- **Yeni:** Hibeler modülünün Verwendungsnachweis belge paketi (ZIP) oluşturabilmesi için listProjectBookingFiles sunucu sözleşmesi eklendi.
- **İyileştirme:** listProjectBookingFiles dosya boyutunu da döndürür; çağıran modül belleği dosyaları okumadan sınırlayabilir.

### 1.29.3 — Banka eşleştirmesinde alacak dekontu iadeleri

_2026-11-28_

- **Düzeltme:** Açık tedarikçi alacak dekontları artık gelen banka iadeleri için önerilir ve eşleştirilebilir.

### 1.29.2 — Gelen alacak dekontu işaretleri ve iade ödemesi

_2026-11-27_

- **Düzeltme:** Pozitif ve negatif vergi grupları içeren gelen alacak dekontlarında (UBL/CII) işaret artık belge başına bir kez belirlenir; gruplar toplamlarla tutarlı kalır (BR-CO-13) ve onay ekranı doğru tutarlarla dolar.
- **Düzeltme:** Tedarikçi alacak dekontları gelen fatura sayfasındaki ödeme penceresinden iade olarak kapatılabilir (tutar pozitif girilir).

### 1.29.1 — Gelen fatura ödeme dağılımı ve KoSIT yanıt sınırı düzeltmesi

_2026-11-27_

- **Düzeltme:** Pozitif ve negatif vergi grupları içeren gelen faturalarda (ör. indirim veya avans kesintisi satırı) ödeme artık grupların işaretlerini korur; negatif grup gidere dönüşmez ve ön vergi dağılımı belgeyle aynı kalır.
- **Düzeltme:** KoSIT doğrulayıcısı 2 MB sınırını aşan bir yanıt döndürdüğünde doğrulama artık takılmaz; 'doğrulanamadı' sonucu döner.

### 1.29.0 — Giden faturalarda yerel EPC-QR (GiroCode)

_2026-11-26_

- **Yeni:** IBAN tanımlı açık giden fatura PDF'lerine (ZUGFeRD dahil) dış sunucu olmadan yerel olarak üretilen SEPA EPC-QR (GiroCode) ödeme kodu eklendi (#618).

### 1.28.0 — Aidat, kurs ücreti ve tek tıkla bağış banka eşleştirmesi

_2026-11-26_

- **Yeni:** Banka hareketleri artık açık üye aidatları, açık kurs ücretleri ve bağışlarla (mevcut veya yeni bağışçı) öneri puanlarıyla tek adımda eşleştirilip kapatılabilir (#616).

### 1.27.6 — Yerel tarih alanları

_2026-11-26_

- **İyileştirme:** Ödeme, fatura tahsilatı ve ödeme çalıştırması tarihleri yerel biçimde (GG.AA.YYYY, 24 saat) takvimle seçilir; tarayıcıya bağlı aa/gg/yyyy biçimi kaldırıldı.

### 1.27.5 — GoBD, vergi, Kassenminus, banka ve PDF güvenlik düzeltmeleri

_2026-11-25_

- **Güvenlik:** Sayman raporu PDF oluşturucusunda çapraz modül dosya okuma engellendi ve KoSIT doğrulayıcıda DNS-sabitli SSRF koruması eklendi (#573).
- **Düzeltme:** Kassenminus, banka içe aktarma/ters kayıt, SOLL-Versteuerung UStVA, § 19 UStG, GoBD Z3 UTF-8/ek CSV'ler, yıllık kapanış, e-fatura KDV kategorisi E ve SEPA pain.001 transliterasyon hataları giderildi (#576, #577).
- **Düzeltme:** Kesilmiş faturanın tahsilatında faturadaki KDV oranları esas alınır; § 19 UStG ayarı sonradan açılsa da KDV'li fatura KDV'siz kaydedilmez.
- **Düzeltme:** İçe aktarılan tedarikçi alacak dekontları (negatif tutarlar) iade olarak kapatılabilir: elle veya gelen banka hareketiyle eşleştirilir, gider ve ön KDV azaltılır.

Daha eski 59 herkese açık sürüm notu.
