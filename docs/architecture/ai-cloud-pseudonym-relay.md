# Bulut AI için takma adlı veri akışı (pseudonym relay) — karar belgesi

Durum: kabul edildi ve uygulandı (15.11.2026; PS1–PS5: PR #153–#156 ve takma adlı aidat aracı). Temel: ai-contract-v2-proposal.md, AI v2 runtime (PR #145–#147).
İlgili TODO: TODO_AI_ASSISTANT_V2.md → F06 (PS1–PS5).

## Amaç

Bulut modeli kişi düzeyinde veriyle **anlamlı** çalışabilsin, ama kimseyi tanıyamasın:

1. Sunucu, kişi kaydını konuşmaya özel bir **takma ad anahtarıyla** (ör. `[[K7]]`) ilişkilendirir.
2. Buluta yalnız takma ad + izinli, kaba taneli öznitelikler gider (ör. gecikmiş tutar, üyelik türü, giriş yılı).
3. Model bu veriyle akıl yürütür, rapor/tablo/öneri üretir; çıktıda yine yalnız takma adlar bulunur.
4. Kullanıcıya gösterirken sunucu takma adı **o anki yetkiyle** gerçek kayda çözer (ad, bağlantı).
   Dosya/rapor üretiminde de eşleme yalnız sunucuda yapılır.

Mevcut `PseudonymVault` aynı fikrin tek istek ömürlü hâlidir; `AiEntityReference` ise kalıcı, kapsamlı
referans deposudur. Bu karar ikisini birleştirir: **konuşma boyunca tutarlı, kısa, sunucuda çözülen takma ad.**

## Hukuki çerçeve (abartmadan)

Takma adlı veri DSGVO Art. 4 Nr. 5 anlamında **kişisel veri olmaya devam eder**; anonim değildir.
Bu yüzden:

- Kişi düzeyinde takma adlı aktarım ayrı bir yönetici ayarıdır ve **varsayılan kapalıdır**.
- Açmadan önce sağlayıcıyla AVV/DPA, hukuki dayanak ve bilgilendirme kurumun sorumluluğundadır;
  uygulama bunu hatırlatır, karar vermez.
- Özel nitelikli veri (sağlık, din, engellilik vb.) ve çocuk verisi takma adla da buluta gitmez.
- Dolaylı tanımlayıcılar (nadir tutar, tam doğum tarihi, küçük gruplar) kabalaştırılır: yaş aralığı,
  yıl, yuvarlanmış tutar; 5'ten küçük grup sayımları bastırılır.

## Bulut modları (AiSettings)

| Ayar | Değerler | Varsayılan |
| --- | --- | --- |
| `cloudTextMode` | `OFF` (yalnız yerel) · `INTENTS` (hazır sorular) · `SCREENED` (denetimli serbest metin) | `INTENTS` |
| `cloudPseudonymousRecords` | takma adlı kişi düzeyi araç çıktıları | `false` |

İkisi de `providerRevision` içine girer: değişince kullanıcı rızası yenilenir.
`cloudPseudonymousRecords` yalnız `SCREENED` modunda anlamlıdır.

## Akış

```
kullanıcı metni ──► gönderim öncesi tarama (sunucu)
   bilinen kişi adı/numarası  → konuşmanın takma adı [[K7]] (yoksa oluşturulur)
   bilinmeyen PII / özel nitelik → gönderilmez; ret kartı (yerel model · kişiyi seç · düzenle)
        │
        ▼
bulut modeli ──► araç çağrısı (v2, veri sınıfı izinli)
        │          araç çıktısı: { kisi: "[[K7]]", gecikmis: 120, tur: "ASIL", girisYili: 2019 }
        ▼
model yanıtı (yalnız takma adlar) ──► saklama: şifreli, takma adlı hâliyle
        │
        ▼
gösterim/rapor: sunucu [[K7]] → kayıt (CANLI yetki kontrolü) → "Ayşe Yılmaz" bağlantısı
                yetki yoksa / kayıt silindiyse → "Gizli kişi"
```

## Takma ad kuralları

- Biçim: `[[K` + konuşma içi sıra numarası + `]]` (kısa, token tasarrufu, modelin kopyalaması kolay).
  Sıra numarası kişiden türetilmez; aynı kişi başka konuşmada başka numara alır.
- Eşleme `AiEntityReference` üzerinde konuşma kapsamlıdır (alias sütunu, scope başına benzersiz);
  scope ömrü konuşmanın saklama süresine bağlanır, rıza iptali/kullanıcı silme ile iptal edilir.
- Takma ad **yetki değildir**: her çözümlemede kaynak kaydın canlı okuma yetkisi denetlenir.
- Model yeni takma ad uyduramaz; tanınmayan `[[K…]]` gösterimde olduğu gibi kalmaz, "bilinmeyen referans" olur.
- Gerçek ad hiçbir zaman sağlayıcı isteğine, model-görünür araç çıktısına veya loglara girmez
  (sahte fetch casusu ile test edilir).

## Araç sözleşmesi

v2 araçlarının `dataPolicy.modelDataClass` alanı karar verir:

| modelDataClass | INTENTS | SCREENED | SCREENED + takma adlı kayıtlar |
| --- | --- | --- | --- |
| aggregate | yalnız tanımlı niyet | ✓ | ✓ |
| internal | – | ✓ | ✓ |
| personal (takma adlı projection) | – | – | ✓ |
| special_category / local_only | – | – | – |

v1 (projection'ı olmayan) araçlar bulutta kapalı kalır; araç taşındıkça bulut yeteneği büyür.
Belge/e-posta/görev **içeriği** (read_content) bulutta hiçbir modda açılmaz.

## Uygulama sırası

| PR | İçerik | Davranış değişir mi? |
| --- | --- | --- |
| PS1 | Bu belge + iki ayar + yönetici kartı + providerRevision bağı | Hayır |
| PS2 | `cloud-preflight.ts` saf tarama + TR/DE test kümesi | Hayır |
| PS3 | Kalıcı takma ad katmanı + sohbet/rapor çözümleme | Yalnız yerel/takma ad kullanan yerlerde |
| PS4 | SCREENED modu: tarama, ret kartı, hızlı düğmeler, veri sınıfı kapısı | Yalnız mod seçilirse |
| PS5 | İlk takma adlı araç: üye aidat listesi → model raporu → isimli gösterim | Yalnız ayar açıksa |

## Kabul ölçütleri

- Bilinmeyen ad/adres/telefon/sağlık metni sağlayıcı isteğine ulaşmaz (fetch casusu).
- Kayıtlı kişi adı yazıldığında model yalnız `[[Kn]]` görür; yanıt kullanıcıya gerçek adla döner.
- Yetkisi olmayan kullanıcı aynı konuşma kaydını görse bile ad çözülmez.
- Aynı kişi iki konuşmada farklı takma ad alır; takma ad başka konuşmada çözülmez.
- Mod/ayar değişince rıza yeniden istenir; varsayılanlarla mevcut davranış birebir korunur.

## Uygulama notları (PS5 sonrası)

- İlk takma adlı araç: `list_dues_by_person` (members). Çıktı: `[[Kn]]`, tam avro kalan tutar, vade ayı,
  üyelik türü, durum. Ad, üye numarası, kesin tarih ve kuruş modele gitmez.
- Takma adlar sohbet yanıtında ve geçmişte çözülür. Dosya/rapor üretiminde (`create_file`) takma ad
  çözümlemesi henüz yoktur; kişisel dosyalar mevcut dataset/export akışıyla üretilir.
- Önerilerde (onay kartları) takma ad kullanan yazma işlemleri için `resolveAliasRecord` hazırdır;
  ilk yazma aracı (ör. aidat hatırlatma) eklenirken bağlanacaktır.
