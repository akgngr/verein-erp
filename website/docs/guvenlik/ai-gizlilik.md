---
title: Yapay zekâ gizliliği
sidebar_position: 2
---

# Yapay zekâ gizliliği

Asistanın tasarım hedefi: **kişisel ve dernek verisi izinsiz hiçbir yere gitmez.**

## Katmanlar

```text
Kullanıcı mesajı
  └─▶ Ön tarama (sunucu): kayıtlı kişi → [[Kn]], e-posta/IBAN/telefon → maske,
        bilinmeyen kişisel veri / özel nitelikli veri → GÖNDERİLMEZ
        └─▶ Araç kapısı: izin matrisi · modül açık · kullanıcı yetkisi · bulut modu × veri sınıfı
              └─▶ Araç çıktısı: yalnız modelFields listesi; bilinen tanımlayıcılar yeniden maskelenir
                    └─▶ Model yanıtı ─▶ Gösterim: [[Kn]] → izleyicinin CANLI yetkisiyle gerçek ad
```

## Garanti edilenler

- Modele giden her alan araç başına **açıkça listelidir**; liste dışı alan çalışma anında reddedilir.
- Takma adlar konuşma ve kullanıcı kapsamlıdır; başka kullanıcı ya da konuşmada çözülmez, süresi dolar.
- Gerçek ad yalnız sunucuda ve gösterim anında, izleyicinin o anki yetkisiyle çözülür (yetki geri alınırsa eski
  sohbetlerde de gizlenir).
- Evrak metni, notlar, tartışmalar (`local_only`) bulut sağlayıcıya hiçbir modda gitmez.
- Asistan veri değiştirmez; öneriler kullanıcı onayıyla, kullanıcının yetkisiyle uygulanır.
- Denetim kaydına yalnız meta veri yazılır: kullanılan araçlar, token sayısı, maskelenen değer sayısı.

## Sınırlar

Kural tabanlı tarama her kişisel veriyi tanıyamaz (ör. kayıtlı olmayan tek bir ad). Bu yüzden:

- Bulut modu varsayılan olarak kapalıdır; açmak yöneticinin bilinçli kararıdır.
- Kişi düzeyi veri ayrı bir anahtarla (takma adlı kişi verisi) açılır.
- En güçlü koruma **yerel modeldir**: veri altyapınızdan çıkmaz.

Mimari belge: [Bulut takma ad aktarımı](/teknik/architecture/ai-cloud-pseudonym-relay).
