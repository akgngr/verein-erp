# Kasa defteri: tarih aralığı ve yürüyen bakiye

Muhasebe > Raporlar bölümündeki kasa/hesap defterinde başlangıç ve bitiş tarihlerini seçebilirsiniz.

- **Bitiş tarihi dahildir:** Örneğin 1–31 Ekim aralığı, 31 Ekim günü kaydedilen işlemleri de içerir.
- **Yürüyen bakiye kronolojiktir:** İptal edilmiş fişler listede işaretlenebilir ancak bakiyeyi değiştirmez. İptal satırı araya girdiğinde sonraki satırların bakiyesi doğru sırayla gösterilir.
- **Yıl sonu bakiyesi:** 31 Aralık gününün sonuna kadar olan işlemleri kapsar.
- **Açılış bakiyesi:** Seçilen aralığın başlangıcından önceki hesap hareketlerini temel alır.

Bu rapor muhasebe hesabı hareketlerini gösterir; banka ekstresindeki mutabakat bakiyesiyle aynı olduğu varsayılmamalıdır. Tüm tutarlar EUR cinsindedir. Bu değişiklik mevcut muhasebe fişlerini değiştirmez.

Teknik uygulama: `src/modules/accounting/services/report-builders.ts`. Otomatik üretilen `website/docs/kullanim/moduller/accounting.md` dosyası elle düzenlenmez.
