# ACC-9 — Hesaplama tanımları ve kontrol kuralları

Muhasebe genel bakış ekranındaki gösterimler, fişleri temel alan **EÜR odaklı** özetlerdir. Tam çift taraflı HGB bilançosu, E-Bilanz veya doğrulanmış GoBD sertifikası sunduğu anlamına gelmez.

## Dönemler ve tutarlar

Muhasebe ekranı seçilen takvim yılındaki gelir ve gider fişlerini, varsa ay veya çeyrek dönem filtresiyle gösterir.

- İlk gün dahildir; seçilen dönemden sonraki ilk gün dahil değildir.
- Yıl, uygulamanın Europe/Berlin takvimine göre belirlenir. Tarih alanları veri tabanında gün hassasiyetinde saklanır.
- `INCOME` ve `EXPENSE` türündeki, iptal edilmemiş fişler hesaba katılır. `TRANSFER` (virman) dahil edilmez.
- Tutarlar brüttür (EUR). Gelir − gider farkı otomatik olarak banka bakiyesi, tahakkuk kârı veya vergisel net sonuç değildir.
- Vergi ayarındaki `IST` / `SOLL` seçimi gösterilir; bu ekranın tutarları fiş tarihini temel alır.

## Vadesi geçmiş faturalar

Yalnızca `INVOICE` türündeki, `ISSUED` durumunda olan ve vadesi geçmiş faturalar incelenir. Her fatura için açık tutar ayrı hesaplanır:

```text
açık tutar = max(0, brüt tutar - ödenen - Skonto)
```

Bir faturanın fazla ödenmiş olması başka bir faturanın açık borcunu azaltmaz. Tam ödenmiş faturalar uyarı sayısına dahil edilmez. Bu bir **kontrol önerisidir**; ödeme veya otomatik ihtar başlatılmaz.

## Boş dönemler ve belgeler

Seçilen dönemde fiş yoksa kartlarda yapay bir sıfır raporu yerine kayıt bulunmadığı bilgisi gösterilir. Eksik belge uyarısı mevcut sistemin fiş ekleri kuralına göre hesaplanır ve **seçilen yılın tamamını** kapsar; seçilen ay/çeyrek ile sınırlandırılmaz.

Grafiğin yanında aynı verileri içeren bir tablo bulunur. Muhasebe kartlarının ve panelin değerlerini denetlemek için fiş ekranına gidip aynı takvim yılına bakabilirsiniz.

## Teknik denetim

- `src/modules/accounting/queries/get-booking-totals.ts`: aynı fiş toplamı sorgusu
- `src/modules/accounting/services/dashboard-period.ts`: yarı açık tarih aralıkları
- `src/modules/accounting/services/dashboard-overdue.ts`: fatura başına açık tutar
- `tests/accounting/dashboard-kpi.test.ts`: ay/çeyrek sınırları, yanlış dönem, kısmi ödeme/fazla ödeme regresyon testleri

Tek kurumlu EUR uygulamasında farklı organizasyon veya para birimi seçimi bulunmaz. 

## Dashboard, rapor ve AI toplamlarının mutabakatı

Dashboard gelir/gider kartları ve `getAccountingStats` tüm iptal edilmemiş, virman olmayan fişlerin **brüt** toplamını gösterir. Gelir-gider raporundaki kategori satırları ise yalnız kategori atanmış fişleri dağıtabilir. Kategorisi olmayan bir fişin küresi uydurulmaz.

Bu nedenle rapor nesnesi artık iki ek mutabakat alanı taşır:

- `bookingTotals`: dashboard ile aynı brüt gelir, gider ve fark toplamı.
- `uncategorized`: kategori atanmadığı için kategori satırlarına dağıtılamayan gelir/gider tutarı.

AI muhasebe özeti de aynı brüt toplamları ve kategorisiz tutarı açıkça döndürür. Böylece kategori satırlarının toplamı genel toplamdan farklıysa bunun nedeni gizlenmez. KDV/EÜR ekranındaki net/vergi hesapları ayrı bir vergi raporu tanımıdır ve brüt dashboard rakamlarıyla doğrudan eşit olmak zorunda değildir.
