---
title: Yapay zekâ asistanı
sidebar_position: 3
---

# Yapay zekâ asistanı

Asistan, modüllerin **araçlarını** kullanarak sorularınızı yanıtlar: "Bu yılın gelir-gider özetini çıkar",
"Gecikmiş aidatları listele", "Önümüzdeki toplantılar neler?". Veri **değiştirmez**; bir değişiklik önerdiğinde
(ör. görev oluşturma) bir onay kartı gösterir ve işlem ancak siz onaylarsanız, sizin yetkinizle yapılır.

## Önce onay

İlk kullanımda veri koruma bilgilendirmesini onaylarsınız. Onayınızı **Ayarlar → Yapay zekâ asistanı**'ndan geri
alabilirsiniz. Sohbetler yalnız size özel, AES-256-GCM ile şifreli saklanır ve 180 gün sonra silinir.

## Asistan neyi görür?

Asistan yalnız şu üç kapıdan geçen araçları kullanır:

1. Yönetici, aracın modülünü ve işlemini **AI izin matrisinde** açmıştır.
2. Modül **açık**tır.
3. **Sizin** rolünüz o veriyi görmeye yetkilidir.

Her aracın modele gönderebileceği alanlar tek tek listelidir; listede olmayan alan gönderilemez.
Araçlar dört sınıftadır:

| Sınıf | Örnek | Ne gider |
|---|---|---|
| Toplam (aggregate) | Gelir-gider özeti, üye istatistikleri | Yalnız sayılar ve toplamlar |
| Kurumsal (internal) | Etkinlik, toplantı, görev listeleri | Başlık, tarih, durum; kişi alanı yok |
| Takma adlı (pseudonymous) | Üye profili, kişi bazlı aidat listesi | Kişi yalnız `[[K3]]` gibi takma adla |
| Yalnız yerel (local_only) | Evrak metni, toplantı tartışma notları | Bulut sağlayıcıya hiç gitmez |

## Takma adlar: `[[K3]]`

Bulut sağlayıcı kullanılırken kişiler modele **takma adla** gider. Yanıtı gördüğünüzde takma ad, **o anki
yetkinizle** gerçek ada (ve kayda bağlantıya) çevrilir. Yetkiniz yoksa ad gizli kalır. Asistanın oluşturduğu
dosyalarda (PDF, Excel, Word) da adlar aynı kuralla yazılır.

Örnek: "Ahmet adlı üyenin bilgilerini getir" → asistan `get_member_profile` aracıyla arar; modele "[[K3]]:
aktif, asıl üye, 2019'dan beri, 2026 aidatı 60 € gecikmiş" gider, siz yanıtı gerçek adla görürsünüz.

## Mesajınız da taranır

Bulut modunda mesajınız gönderilmeden önce taranır:

- Kayıtlı kişilerin adları ve üye/öğrenci numaraları otomatik takma ada çevrilir.
- E-posta, IBAN, telefon, vergi numarası maskelenir.
- Kayıtlı olmayan tam ad, adres, doğum tarihi gibi kişisel veri bulunursa mesaj **gönderilmez** ve nedeni
  gösterilir. Sağlık, din gibi özel nitelikli veri bir kişiyle birlikte geçerse yine gönderilmez.

## "Bu özellik etkin değil" görürseniz

Asistan bir aracın neden kullanılamadığını söyler:

| Sebep | Ne yapılır |
|---|---|
| Modül kapalı | Yönetici modülü açar |
| AI izin matrisinde kapalı | Yönetici **Ayarlar → AI asistanı → İzinler** |
| Rol yetkisi yok | Yönetici rolünüze izin verir |
| Bulut işleme sınırı | Yönetici bulut veri politikasını değiştirir ya da yerel model seçer ([AI ayarları](/yonetim/ai-ayarlari)) |

## Dosya oluşturma

"Bunu Excel olarak ver" dediğinizde asistan PDF, Excel, Word, Markdown veya CSV dosyası üretir; yanıtın
altında indirme düğmesi çıkar. Dosyalar **Dosyalarım**'da, size özel ve şifreli saklanır.
