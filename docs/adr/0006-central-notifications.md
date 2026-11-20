# ADR 0006 — Merkezi bildirim sistemi

- **Durum:** kabul (ürün sahibi, 2026-11-20)
- **Kapsam:** yeni CORE modül `notifications`; tüm modüllerin bildirimleri
- **İlgili:** epic #365, görevler #353–#364; ADR 0005 (sekreter önerileri)

## Bağlam
Bildirimler bugün dağınık: sekreter günlük özeti (e-posta + rızalı Telegram/WhatsApp/SMS), kampanya kanalları (üyelere toplu gönderim), anlık toast'lar. Kullanıcının tüm uyarıları tek yerde görmesi, kanal başına tercih yapması ve sağ üstteki zilden açılan bir çekmecede okuması isteniyor.

## Karar
1. **Modül sözleşmesi.** Her modül `src/modules/<m>/notifications.ts` → `defineNotificationTypes(...)` ile türlerini tanımlar (önem, varsayılan kanallar, zorunlu mu, yetki, i18n anahtarları, güvenli iç bağlantı). `pnpm module:sync` → `src/notification-registry.ts`. `notifications` modülü iş modüllerini import etmez.
2. **Tek giriş noktası** `notify({ type, recipients, ref, params })`: alıcı başına yetki ve modül durumu yeniden denetlenir; `(userId, typeKey, refKey)` benzersiz (idempotent).
3. **Depolama ve gizlilik.** Parametreler şifreli (`secret-box`); metin okunurken alıcının dilinde üretilir. Dış kanallara yalnız genel metin + uygulama bağlantısı gider; ad, tutar, içerik gitmez. Saklama **90 gün**. Kullanıcı silinince tüm kayıtları silinir.
4. **Kanallar:** uygulama içi (her zaman), e-posta, web push, Telegram, WhatsApp, SMS. Dağıtım mevcut outbox + pg-boss; kanal başına claim, sınırlı yeniden deneme, sessiz saat, günlük özet.
5. **Sağlayıcı sırları veritabanında, şifreli** (`NotificationChannelConfig.secretsEnc`), Ayarlar → Bildirimler → Kanallar ekranından yönetilir; arayüze geri gösterilmez, denetime yazılır. Ortam değişkeni gerekmez (yalnız mevcut şifreleme anahtarı ortamda kalır). **VAPID** anahtar çifti ilk açılışta otomatik üretilir.
6. **Sağlayıcı yoksa kanal kapalı** (fail-closed); hiçbir şey gönderilmez.
7. **Sekreter kanalları taşınır** (N6): sekreter rızaları ve günlük özeti bu sistemin bir türü olur; tek kanal yönetimi.

## Kanal önerileri
- **WhatsApp:** kısa vadede ertelenir (Telegram + web push + e-posta ücretsiz ve yeterli). Uzun vadede **Meta WhatsApp Cloud API** doğrudan (aracı yok, yalnız onaylı "utility" şablonu, açık rıza; Meta işletme doğrulaması ürün sahibi adımı). Twilio yalnız SMS + WhatsApp tek sağlayıcıda istenirse.
- **SMS:** düşük öncelik, varsayılan kapalı; mevcut `campaign-sms` sağlayıcı ayarı üzerinden (ek iş yükü düşük).
- **Telegram:** bot token ayarlardan; kullanıcı tek tıkla bağlar (`t.me/<bot>?start=<tek kullanımlık token>`).

## Sonuçlar
- Yeni modüller bildirim eklemek için yalnız `notifications.ts` yazar.
- Kampanya kanalları (üyelere toplu gönderim) ayrı kalır; bildirim sistemi kullanıcılar (personel) içindir.
