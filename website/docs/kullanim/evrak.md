---
title: Evrak ve evraktan doldurma
sidebar_position: 4
---

# Evrak kayıt ve evraktan doldurma

**Evrak Kayıt** modülü gelen/giden yazışmaları numaralandırır (kayıt numarası), dosyalarını saklar ve
durumunu izler.

## Evraktan doldur (OCR)

Yeni evrak formunda dosya yükledikten sonra **Evraktan doldur**:

1. PDF'in metin katmanı okunur; taranmış PDF ve görsellerde metin **OCR** (Almanca, Türkçe, İngilizce) ile çıkarılır.
2. Kurallarla öneriler bulunur: gönderen, belge tarihi, referans numarası, konu, son tarih, tutar, IBAN, belge türü.
3. Öneriler mevcut değerlerle yan yana gösterilir; **yalnız işaretlediğiniz** alanlar forma yazılır.

OCR ve kural tabanlı çıkarım tamamen sunucuda çalışır; dışarı veri gitmez.

## AI ile özetle

Asistan modülü açıksa pencerede **AI ile özetle** görünür: kısa özet, evrak türü, işlem gerekip gerekmediği ve
kategori önerisi. Yerel modelde metin doğrudan işlenir; bulutta yalnız **denetimli modda** ve kişisel parçalar
(ad, adres, IBAN…) yer tutucuyla değiştirilerek gönderilir. Özel nitelikli veri içeren evrak buluta gitmez.

## Muhasebeye aktar ve görev oluştur

- **Muhasebeye aktar** (gelen evrak dosyası): muhasebede gönderen, numara, tarih, vade ve IBAN'ı dolu bir
  **gelen fatura taslağı** açar. Düğme yalnız Muhasebe modülü açıksa ve muhasebe oluşturma yetkiniz varsa görünür;
  işlem sunucuda yetkiniz yeniden denetlenerek yapılır. Kategori ve KDV'yi muhasebede tamamlarsınız.
- **Termin için görev oluştur**: son tarihi olan evrakta Görevler modülünde dolu bir görev formu açar
  (Görevler açık ve yetkiniz varsa).
