# Muhasebe genel bakış paneli (ACC-10)

Muhasebe menüsündeki **Genel bakış** öğesi `/muhasebe/panel` ekranını açar. Fiş listesi artık ayrı bir öğedir: **Fişler** (`/muhasebe`). Ekranın amacı, bir bakışta üç soruyu cevaplamaktır:

1. **Şu an neredeyiz?** Likidite, gelir, gider ve fark.
2. **Önümüzde ne var?** Vadesi gelen tahsilatlar, ödemeler ve vergi tarihleri.
3. **Neye bakmalıyım?** Dikkat gerektiren işler ve AI durum analizi.

Ekran salt okunurdur. Kendiliğinden banka işlemi, hatırlatma, ödeme veya vergi beyannamesi oluşturmaz.

## Dönem seçimi

Ekranın üst kısmından yıl (içinde bulunulan ve bir önceki yıl), tüm yıl, çeyrek (Ç1–Ç4) veya ay seçebilirsiniz. Tutarlar EUR cinsindendir. Hesaplama, fişin kayıt tarihine ve Europe/Berlin takvimine göre yapılır.

## Bölümler

| Bölüm | Ne gösterir | Kaynak |
| --- | --- | --- |
| **Toplam likidite** | Aktif tüm hesapların bugünkü bakiyesi ve hesap başına dağılım | Hesap bakiyesi (açılış bakiyesi + fişler) |
| **30 gün sonra beklenen bakiye** | Bakiye + beklenen tahsilat − beklenen ödeme | Vadesi gelmiş veya 30 gün içinde gelecek açık faturalar ve gelen faturalar |
| **Gelir / gider / fark kartları** | Seçilen dönemin brüt toplamları, önceki yılın aynı dönemine göre değişim (%) ve 12 aylık mini trend | Fiş toplamları; listeyle ve raporlarla aynı hesap |
| **Aylık nakit akışı** | Ay ay gelir ve gider sütunları, yıl başından birikimli fark çizgisi; içinde bulunulan ay vurgulanır | Aynı fiş toplamları; altında açılabilir tablo bulunur |
| **Yaklaşanlar** | Önümüzdeki 30 günde vadesi gelen tahsilat/ödemeler ve 60 gün içindeki vergi tarihleri, tarih sırasıyla | Faturalar, gelen faturalar, vergi takvimi |
| **Gider dağılımı** | Seçilen dönemin en büyük beş gider kategorisi ve "Diğer" | Gider fişleri |

**Önemli:** Beklenen bakiye bir tahmindir, garanti değildir. Vadesi geçmiş açık kalemler de tahmine dahil edilir, çünkü hâlâ ödenebilirler. Gelir/gider kartları bilanço kârı ya da KDV beyannamesi değildir.

## Sağ sütun

### AI durum analizi

Yapay zekâ modülü etkinse ve onayınız varsa, sağ üst köşede varsayılan olarak **AI durum analizi** kartı yer alır. Kart, son durumu tek cümleyle özetler ve üç durumdan birini gösterir: *iyi durumda*, *dikkat* veya *risk*. Ardından 2–4 bulgu ve en fazla 3 önerilen adım sıralar.

- Yalnızca toplam muhasebe verileri kullanılır: kategori toplamları, hesap bakiyeleri, alacak yaşlandırma, gelen fatura ve banka durumu. Kişi adı, karşı taraf, IBAN veya fiş açıklaması kullanılmaz.
- Veriler sohbet asistanıyla aynı izin kapılarından geçer: modül onayı, AI izin matrisi (Muhasebe → okuma), kullanıcı rolü ve bulut veri politikası. Bulut sağlayıcıda bu kart yalnız **"Denetimli serbest metin"** modunda çalışır. Yerel model her modda kullanılabilir.
- Sonuç oturum boyunca saklanır. **Yenile** düğmesi analizi yeniden üretir.
- Öneriler bilgi amaçlıdır. Kart hiçbir ödeme, ihtar veya beyan işlemi yapmaz.

### Dikkat gerektirenler

Bu listede şunlar gösterilir:

- vadesi geçmiş faturalar,
- vadesi geçmiş gelen faturalar,
- eşleştirilmemiş banka hareketleri,
- onay bekleyen gelen faturalar,
- belgesi olmayan fişler,
- yaklaşan vergi tarihi.

Her satır, işlemin yapılacağı ekrana götürür.

## Animasyon ve erişilebilirlik

Grafikler sunucuda SVG olarak çizilir; ek grafik kütüphanesi yüklenmez. Sütunlar ve çizgiler, ERP Motion System kurallarına göre yalnızca ilk görünümde kısa bir giriş animasyonu oynatır. "Hareketi azalt" ayarı açıksa bu animasyon da kapanır. Her grafiğin rakamları ayrıca metin veya tablo olarak verilir; anlam yalnızca renge dayanmaz.

## Kullanıcı ve veri güvenliği

Muhasebeyi görüntüleme izni olmayan kullanıcılar bu ekranı açamaz. AI kartı, AI modülünün kendi kartıdır. Muhasebe modülü AI modülüne erişim istemez; kart, sistem modülünün **yüzey kartları** mekanizmasıyla, modül onayı ve yetki denetlenerek gösterilir.

## Teknik kaynaklar

- `src/modules/accounting/views/dashboard-view.tsx`
- `src/modules/accounting/queries/get-dashboard-overview.ts`
- `src/modules/accounting/services/dashboard-outlook.ts` (saf hesaplar, testli)
- `src/modules/accounting/components/dashboard/`
- `src/modules/ai/cards/index.tsx`, `src/modules/ai/services/finance-insight.ts`
- `src/modules/system/views/surface-cards.tsx`

Modül kataloğu `pnpm docs:modules` ile üretilir; `website/docs/kullanim/moduller/accounting.md` elle düzenlenmez.
