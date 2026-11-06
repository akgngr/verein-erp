# Kampanyalar modülü (Toplu e-posta → çok kanallı) — teknik şartname ve yapılacaklar

Durum: taslak (uygulanmadı) · Kaynak: mevcut `mailings` modülü · Hedef anahtar: `campaigns`

## 1. Amaç
Toplu e-posta modülü, kanal bağımsız bir **Kampanyalar** modülüne dönüşür. E-posta, WhatsApp, Telegram ve SMS
gönderim yöntemleri ayrı **kanal eklentileri** olarak gelir ve etkinleştirildiği anda kampanyalara otomatik
eklenir (takvim senkron eklentileriyle aynı desen). Her kampanya arka planda bir **iş akışıdır** ve ileride CRM'in
parçası olarak kullanılır.

## 2. İlkeler
1. **Kanal = eklenti.** `campaigns` modülü kanal bilmez; kanallar `channels.ts` konvansiyonuyla kaydolur
   (`src/campaign-channel-registry.ts`, `pnpm module:sync` üretir). Kapalı kanal görünmez.
2. **Kampanya = iş akışı.** Kampanya kaydedilince/yayımlanınca otomasyon motorunda sürümlü bir iş akışı
   oluşur veya güncellenir; çalıştırma, bekleme, onay, koşul ve log mevcut motorla yapılır. Ayrı bir gönderim motoru yazılmaz.
3. **Rıza ve yasal uyum (DSGVO/KVKK, UWG §7).** Kanal başına açık rıza (opt-in) zorunlu; her mesajda çıkış yolu;
   itiraz edenler gönderim anında atlanır. WhatsApp için Meta onaylı şablon kuralı uygulanır.
4. **Kendi API'n.** Kullanıcı/yönetici sağlayıcı anahtarlarını kendisi girer (şifreli, `secret-box`); ücretli servis zorunlu değildir.
5. **Veri politikası.** Telefon numaraları ve mesaj içerikleri K1; kanal kimlik bilgileri K0. AI yalnız toplu
   istatistik görür (K2/K3).

## 3. Mimari

### 3.1 Kanal sözleşmesi (`src/shared/campaigns/channel.ts`)
```ts
type CampaignChannel = {
  key: "email" | "whatsapp" | "telegram" | "sms" | string;
  address: "email" | "phone" | "telegramChatId";   // alıcıda hangi alan gerekli
  capabilities: { html: boolean; media: boolean; templatesRequired: boolean; maxLength?: number };
  configSchema: ZodSchema;                           // yönetici ayarları (sırlar ayrı, şifreli)
  validateContent(content): string[];              // ör. SMS uzunluğu, WA şablonu
  send(batch: OutboundMessage[], ctx): Promise<DeliveryResult[]>; // toplu, idempotent
  parseWebhook?(req): DeliveryStatusUpdate[];       // teslim/okundu/hata geri bildirimi
  rateLimit: { perSecond: number; perDay?: number };
};
```

### 3.2 Kanal eklentileri (ayrı modüller, `requires: campaigns`)
| Modül | Sağlayıcı seçenekleri | Not |
|---|---|---|
| `campaign-email` | mevcut `mail` modülü (SMTP) | Bugünkü toplu e-posta davranışı buraya taşınır |
| `campaign-whatsapp` | WhatsApp Cloud API (Meta) | Yalnız onaylı şablonlarla başlatılan mesaj; 24 saat penceresi |
| `campaign-telegram` | Telegram Bot API | Alıcı bota `/start` ile katılır → chatId eşlenir (rıza) |
| `campaign-sms` | Sağlayıcı adaptörleri: Twilio, Vonage, seven.io (DE) … | Alt sağlayıcı seçimi eklenti ayarında |

### 3.3 Alıcılar
- Mevcut `recipients.ts` konvansiyonu genişler: `Recipient` → `{ id, name, email?, phone?, telegramChatId?, consents: Record<channel, boolean>, vars }`.
- Üyeler, öğrenciler/veliler, muhasebe kişileri ve ileride CRM kaynak sunar.
- Rıza kaydı kaynak modülde tutulur (ör. üyelerde `consentSms`, `consentWhatsapp`); kampanya modülü kopyalamaz.

### 3.4 Veri modeli (`campaigns`)
| Model | Alanlar | Sınıf |
|---|---|---|
| `Campaign` | id, name, goal, status (DRAFT/SCHEDULED/RUNNING/PAUSED/DONE/CANCELLED), workflowId, audience (kaynak + filtreler), channels[] (öncelik/yedek sırası), scheduledAt, createdById | K2 |
| `CampaignContent` | campaignId, channel, subject?, body (değişkenli), templateRef?, mediaFileId? | K1 |
| `CampaignMessage` | campaignId, recipientRef (kaynak+id), channel, status (QUEUED/SENT/DELIVERED/READ/FAILED/SKIPPED), providerMessageId, error code, timestamps | K1 |
| `CampaignChannelConfig` | channel, settings Json, secretsEnc | K0 |
| `CampaignOptOut` | channel, addressHash, reason, at | K1 |

`mailings` tabloları migration ile `campaigns` tablolarına taşınır; eski gönderim geçmişi korunur.

### 3.5 İş akışı entegrasyonu
- Yeni otomasyon görevleri: `campaigns.send_batch` (kanal + mesaj grubu), `campaigns.wait_until`, ileride `campaigns.ab_split`.
- Kampanya sihirbazı arka planda bir iş akışı grafiği üretir. Basit: tetik → gönder. Gelişmiş: gönder → 2 gün bekle → açılmayanlara SMS hatırlatması → onay → teşekkür.
- "İş akışında aç" ile kampanya, iş akışı editöründe ileri düzey düzenlenebilir. Editörde değişiklik yapılırsa kampanya "özel akış" olarak işaretlenir.
- Olaylar: `campaigns.message_delivered`, `campaigns.message_failed`, `campaigns.opted_out` (PII yok; kimlikler).
- Diğer modüllerin olayları kampanyayı tetikleyebilir (ör. `members.created` → hoş geldin dizisi).

### 3.6 Diğer modüllerle entegrasyon
| Modül | Entegrasyon |
|---|---|
| Takvim | Planlı gönderimler `campaigns/calendar.ts` kaynağıyla takvimde görünür; etkinliğe bağlı hatırlatma kampanyası |
| Etkinlikler / Toplantılar | "Katılımcılara duyur / hatırlat" kısayolu → hazır kampanya şablonu |
| AI | `ai.ts`: kampanya istatistikleri (K2). Metin taslağı ve kanal uzunluğuna kısaltma önerisi (yalnız kullanıcının yazdığı metin, kişi verisi yok); onaysız gönderim yok |
| CRM (gelecek) | Gönderimler kişi zaman akışına `CrmActivity` olarak düşer; segmentler CRM aşamasından seçilir |
| Dosyalar | Medya ekleri `files` modülünden |
| Mail | E-posta kanalı SMTP ayarlarını mail modülünden kullanır |

## 4. Arayüz (modern görünüm)
- **Kampanya panosu:** kart/kanban görünümü (Taslak · Planlı · Çalışıyor · Bitti), kanal rozetleri, mini başarı halkası.
- **Sihirbaz (sağ çekmece, 4 adım):** 1) Hedef kitle (kaynak + filtre, canlı alıcı sayısı, kanal bazında ulaşılabilir sayı) 2) Kanallar (sürükle-bırak öncelik, yedek kanal) 3) İçerik (kanal sekmeli editör, canlı telefon/e-posta önizlemesi, karakter/segment sayacı, değişken yardımcısı) 4) Zamanlama ve onay (hemen / tarih / akış).
- **Sonuç ekranı:** kanal bazlı huni (gönderildi → teslim → okundu → tıklandı), hata nedenleri, tekrar gönder.
- HeroUI + mevcut tasarım sistemi; hydration güvenli (`useHydrated`, `ClientSelect`).

## 5. Güvenlik
- Webhook uçları imza doğrulamalı (Meta `X-Hub-Signature-256`, Twilio imzası, Telegram secret token); auth proxy dışında yalnız bu yollar.
- Gönderim hız sınırı ve günlük üst sınır kanal başına; büyük kampanyalar onay (approve) ister.
- Telefon numarası doğrulama (E.164); gönderim öncesi deneme gönderimi zorunlu seçeneği.

## 6. Yapılacaklar
- [ ] `src/shared/campaigns/channel.ts` sözleşmesi + `channels.ts` konvansiyonu + üretilen registry + eslint izni
- [ ] `mailings` → `campaigns` yeniden adlandırma ve veri taşıma migration'ı (geçmiş korunur, eski rotalar yönlendirilir)
- [ ] `Recipient` genişletme (telefon, Telegram, kanal rızaları) + üyeler/öğrenciler/muhasebe kaynaklarını güncelle
- [ ] `campaign-email` eklentisi (mevcut davranışın taşınması, regresyon testleri)
- [ ] Otomasyon görevleri (`send_batch`, olaylar) + kampanya → iş akışı derleyici
- [ ] Yeni arayüz: pano, 4 adımlı sihirbaz, önizlemeler, sonuç hunisi
- [ ] `campaign-telegram` (en kolay: bot token, webhook, chatId eşleme)
- [ ] `campaign-sms` (sağlayıcı adaptörleri, segment hesaplama)
- [ ] `campaign-whatsapp` (Cloud API, şablon senkronu, 24 saat penceresi)
- [ ] Opt-out/rıza akışları + webhook imza doğrulamaları
- [ ] Takvim kaynağı, etkinlik/toplantı kısayolları, AI araçları
- [ ] Veri politikası sınıflandırması, testler (sözleşme, rıza atlama, hız sınırı, webhook imzası), sürüm notları, tarayıcı kontrolü
