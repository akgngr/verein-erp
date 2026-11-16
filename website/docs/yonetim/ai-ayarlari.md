---
title: Yapay zekâ ayarları
sidebar_position: 5
---

# Yapay zekâ ayarları

**Ayarlar → AI asistanı** ekranı yalnız yöneticiye açıktır.

## Sağlayıcı

Sağlayıcı yalnız izinli listeden seçilir:

| Sağlayıcı | Nerede çalışır | Not |
|---|---|---|
| Yerel model (kendi sunucunuz, OpenAI uyumlu uç) | Sizin altyapınız | Veri dışarı çıkmaz; tüm araçlar, evrak metni dahil |
| Mistral | AB | Bulut veri politikasına tabi |
| Anthropic (Claude), OpenAI | Bulut | Bulut veri politikasına tabi |

API anahtarları veritabanında şifreli saklanır, arayüzde bir daha gösterilmez.

## İzin matrisi

Her modül ve işlem (okuma, içerik okuma, oluşturma, düzenleme, silme) için asistanın erişimini açar/kapatırsınız.
*İçerik okuma* (ör. evrak dosya metni) ayrı bir izindir.

## Bulut veri politikası

Bulut sağlayıcıya **ne gönderilebileceğini** belirler; yerel model bu ayardan etkilenmez.

| Mod | Ne olur |
|---|---|
| **Kapalı** | Buluta hiçbir şey gönderilmez; asistan yalnız yerel modelle çalışır. |
| **Hazır sorular** | Yalnız tanımlı sorular (üye sayısı, bağış özeti, aidat dosyası) buluta gider; serbest metin gönderilmez. |
| **Denetimli serbest metin** | Her mesaj gönderilmeden önce sunucuda taranır; kayıtlı kişiler takma adla değiştirilir, bilinmeyen kişisel veri içeren mesaj gönderilmez. Toplam ve kurumsal veri araçları kullanılabilir. |

**Takma adlı kişi verisi** (yalnız denetimli modda açılabilir): kişi düzeyindeki araç sonuçları (üye profili,
kişi bazlı aidat listesi) buluta yalnız `[[K7]]` gibi takma adla ve kabalaştırılmış alanlarla gider; adlar yalnız
sunucuda, görüntüleyenin yetkisiyle gösterilir.

:::warning Hukuki sorumluluk
Takma adlı veri DSGVO'ya göre hâlâ kişisel veridir. Bulutu açmadan önce sağlayıcıyla veri işleme sözleşmesi
(AVV/DPA), hukuki dayanak ve üyelere bilgilendirme kurumunuzun sorumluluğundadır. Sağlık, din gibi özel nitelikli
veriler ve çocuk verileri hiçbir modda buluta gönderilmez.
:::

Politika değişince kullanıcılar bilgilendirmeyi yeniden onaylar.

## Hangi araç hangi modda?

| Araç sınıfı | Kapalı | Hazır sorular | Denetimli | Denetimli + takma adlı |
|---|---|---|---|---|
| Toplam (aggregate) | — | yalnız tanımlı sorular | ✓ | ✓ |
| Kurumsal (internal) | — | — | ✓ | ✓ |
| Takma adlı (pseudonymous) | — | — | — | ✓ |
| Yalnız yerel (local_only) | — | — | — | — |

Yerel modelde tüm sınıflar kullanılabilir (izin matrisi ve rol yetkisi yine geçerlidir).
