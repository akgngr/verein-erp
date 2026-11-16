# Gelir-gider raporlarında geçmiş kategoriler

Muhasebe > Raporlar bölümündeki gelir-gider raporu, seçilen yılda fişi bulunan kategorileri gösterir. Bir kategori sonradan **pasif** hale getirilse bile, geçmişte o kategoriye kaydedilmiş gelir veya gider fişleri raporda görünmeye devam eder.

## Örnek

2025 yılında "Etkinlik gelirleri" kategorisine fişler kaydedilmiş ve kategori 2026'da pasifleştirilmiş olsun. 2025 gelir-gider raporu açıldığında bu fişlerin tutarları yine "Etkinlik gelirleri" satırında gösterilir. Seçilen yılda hiç fişi olmayan kategoriler boş satır olarak eklenmez.

## Hesaplama ve sınırlar

- Rapor yalnız seçilen yıla ait, iptal edilmemiş ve virman olmayan fişleri esas alır.
- Tutarlar kuruş hassasiyetinde hesaplanır.
- Bu değişiklik fişleri, kategorileri veya muhasebe kayıtlarını değiştirmez; yalnız geçmiş raporda görünürlük sorununu düzeltir.
- Gelir-gider raporu ile banka hesap bakiyesi farklı kavramlardır.
- Vergi ayarlarındaki Ist/Soll seçimi bu değişiklikle değiştirilmez.

## İlgili teknik not

`src/modules/accounting/services/report-builders.ts` dosyasındaki `buildIncomeExpenseReport(year)` artık pasif kategorileri de kategori aramasına dahil eder; yalnız fişi bulunan kategoriler rapor satırı üretir. Otomatik üretilen `website/docs/kullanim/moduller/accounting.md` dosyası elle değiştirilmez.
