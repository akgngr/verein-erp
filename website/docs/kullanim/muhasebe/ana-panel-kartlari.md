# Muhasebe kartlarını ana panele ekleme (ACC-9)

Muhasebe modülünün dört özet kartı uygulamanın **ana panelindeki kart düzenleme** alanından seçilebilir. Kartlar mevcut muhasebe fişi istatistiklerini kullanır; ayrıca bir kayıt veya ikinci muhasebe hesaplama sistemi oluşturmaz.

## Kartlar

| Kart | Hesaplama | Açılan ekran |
| --- | --- | --- |
| Muhasebe gelirleri | İçinde bulunulan Berlin takvim yılındaki iptal edilmemiş, virman olmayan gelir fişlerinin brüt toplamı | /muhasebe |
| Muhasebe giderleri | Aynı koşullardaki gider fişlerinin brüt toplamı | /muhasebe |
| Gelir − gider farkı | Yukarıdaki gelir toplamı eksi gider toplamı | /muhasebe |
| Belgesi eksik fişler | Virman ve başka modülden üretilen kaynak fişleri hariç, aktif dosyası olmayan fiş sayısı | /muhasebe |

## Nasıl kullanılır?

1. Kullanıcı hesabınızda muhasebe görüntüleme izninin bulunduğundan emin olun.
2. Ana panelde kart düzenleme modunu açın.
3. **Muhasebe gelirleri**, **Muhasebe giderleri**, **Gelir − gider farkı** veya **Belgesi eksik fişler** kartlarını seçip düzeni kaydedin.
4. Kart başlığına tıklayarak muhasebe fiş ekranını açabilirsiniz.

Kartların varsayılan görünürlüğü kapalıdır: seçmediğiniz kartlar ana panele kendiliğinden eklenmez. Panel düzeni kullanıcınıza özeldir ve mevcut panel sistemi tarafından saklanır. Muhasebe modülü kapatıldığında veya görüntüleme yetkisi kaldırıldığında kartlar erişime kapatılır.

## Dikkat edilmesi gerekenler

- Gelir, gider ve fark **bu yılın fiş bazlı brüt tutarlarıdır**; KDV ayıklanmış kâr, tahsilat tarihi bazlı sonuç veya banka bakiyesi değildir.
- Hiç gelir/gider fişi bulunmayan yılda bu özet kartları gösterilmez; eksik belge sayısı sıfırsa uyarı kartı gizlenir.
- Tutarlar EUR cinsindedir. Kartlar Europe/Berlin takvim yılını esas alır ve fiş listesiyle aynı `getAccountingStats(year)` servisini kullanır.
- Kartlar yalnızca bilgi gösterir; fatura, ödeme, ihtar veya vergi bildirimi oluşturmaz.
- Daha ayrıntılı aylık/çeyreklik finansal grafikler ve öneriler ayrı ACC-9 aşamalarında geliştirilecektir.

## Teknik kaynaklar

- `src/modules/accounting/cards/index.tsx`
- `src/modules/accounting/queries/get-accounting-stats.ts`
- `src/shared/types/dashboard.ts`
- `src/modules/system/actions/dashboard-layout.ts`

Üretilen `website/docs/kullanim/moduller/accounting.md` sayfası elle değiştirilmeyip `pnpm docs:modules` çıktısıyla güncel tutulur.
