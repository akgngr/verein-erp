# Muhasebe genel bakış paneli (ACC-9)

Muhasebe modülünde **Genel bakış** menüsünden `/muhasebe/panel` ekranını açabilirsiniz. Ekran salt okunurdur: herhangi bir banka işlemi, hatırlatma, ödeme veya vergi beyannamesi kendiliğinden oluşturulmaz.

## Dönem seçimi

Panelde mevcut yıl, önceki yıl, tüm yıl, çeyrek veya ay seçebilirsiniz. Tutarlar Euro (EUR) cinsindendir. Muhasebe fişlerinin kayıt tarihine ve seçilen takvim dönemine dayanır. Yıl takvimi Europe/Berlin esas alınarak seçilir.

## Kartların anlamı

| Gösterge | Kaynak ve anlam |
| --- | --- |
| Gelir fişleri | Seçilen dönemde iptal edilmemiş, virman olmayan gelir fişlerinin brüt toplamı |
| Gider fişleri | Aynı koşuldaki gider fişlerinin brüt toplamı |
| Gelir − gider farkı | Gelir fişleri eksi gider fişleri |
| Çeyreklik grafik | Seçilen yılın dört çeyreğinin aynı fiş hesaplama yöntemiyle karşılaştırılması |

**Önemli:** Bu değerler bankadaki kullanılabilir bakiye, gerçekleşen tahsilat, bilanço kârı veya hesaplanan KDV beyannamesi değildir. İst/Soll vergi yöntemi ayarı ayrıca bilgi olarak gösterilir; bu panel tutarları fiş tarihine göre hesaplar. Dönemde hiç fiş yoksa uydurma bir sonuç yerine boş durum mesajı gösterilir.

Grafiğin altında aynı rakamları gösteren erişilebilir tablo bulunur; grafik için harici kütüphane yüklenmez.

## Kontrol önerileri

- **Belgesi olmayan fişler:** Seçili yılın aktarımdan gelmeyen, virman olmayan ve aktif ek dosyası bulunmayan fişleri gösterir. İlgili fişleri inceleyebilirsiniz.
- **Vadesi geçmiş faturalar:** Durumu `ISSUED` olan, vadesi bugünden önce kalan faturaların açık brüt tutarlarını bildirir. Yönetici faturaları gözden geçirir.

Bu öneriler bilgi amaçlıdır. Tutarlar ve kayıtlar incelenmeden muhasebe işlemi, ihtar veya ödeme yapılmaz. Uyarılar sabit bir tabloya kaydedilmez; sayfa açıldığında mevcut kayıtlardan hesaplanır.

## Kullanıcı ve veri güvenliği

Muhasebeyi görüntüleme izni olmayan kullanıcılar genel bakış ekranını açamaz. Muhasebe modülü kapatıldığında mevcut modül erişim kontrolü uygulanır. Sistem tek kurumlu EUR modelindedir; tenant veya organizasyon seçici henüz bu kapsamda değildir.

## Teknik kaynaklar

- `src/modules/accounting/views/dashboard-view.tsx`
- `src/modules/accounting/queries/get-booking-totals.ts`
- `src/modules/accounting/queries/get-accounting-stats.ts`
- `src/modules/accounting/services/report-builders.ts`

Modül kataloğu `pnpm docs:modules` ile üretilir; `website/docs/kullanim/moduller/accounting.md` elle düzenlenmez.
