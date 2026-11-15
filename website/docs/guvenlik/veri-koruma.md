---
title: Veri koruma ve güvenlik
sidebar_position: 1
---

# Veri koruma ve güvenlik

## Veri sınıfları (K0–K3)

`src/shared/data-policy.ts` her tablonun sınıfını ve hassas alanlarını tanımlar:

| Sınıf | Anlam | Örnek | Asistan |
|---|---|---|---|
| K0 | Sır / serbest kişisel içerik | Parola hash'i, API anahtarları, üye notları, e-posta içerikleri | Asla |
| K1 | Kişisel veri | Bağışçılar, veliler, katılımcılar, kişi bazlı aidatlar | Yalnız takma adlı ya da toplu araçlarla |
| K2 | Kişi içermeyen kurumsal/yapılandırma | Hesap planı, kategoriler | Evet |
| K3 | Karma; yalnız toplam/maskeli | Muhasebe kayıtları, faturalar | Toplamlar |

Testler, asistanın yalnız izinli tabloları okuduğunu ve hassas alanları döndürmediğini zorunlu kılar.
Ayrıntı: [Veri hassasiyeti](/teknik/veri-hassasiyeti).

## Erişim katmanları

1. **Rol yetkisi** — her istekte veritabanından.
2. **Modül erişim onayı** — modüller arası her bağ bildirilir ve yönetici onaylar.
3. **Asistan izin matrisi + bulut veri politikası** — asistan için ayrıca.

## Şifreleme ve saklama

- Sırlar (sağlayıcı anahtarları, e-imza görselleri ve kanıtları, SEPA dosyaları, sohbet geçmişi) AES-256-GCM ile
  şifreli; anahtar `AUTH_SECRET`'tan türetilir.
- IBAN arayüzde maskelenir; kimlik numaraları yalnız yetkili rollerde görünür.
- Asistan sohbetleri 180 gün sonra silinir; üretilen dosyalar sürelidir.

## Rıza ve haklar

- Kampanyalar yalnız açık rızası olan kanallara gider (UWG §7, DSGVO Art. 6/7).
- Üyeler için DSGVO veri dökümü; kullanıcı silinince modüllerin `lifecycle.ts` kancaları kişisel bağlantıları temizler.
- Denetim kaydı kişi adı yerine numara kullanır; PDF/XML indirmeleri kaydedilir.

## Güvenlik denetimleri

CodeQL, gitleaks, bağımlılık denetimi ve uygulama içi **Security Monitor** (güvenlik testleri) CI ve üretimde çalışır.
