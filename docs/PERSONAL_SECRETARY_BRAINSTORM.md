# Kişisel Sekreter — Beyin fırtınası ve öneriler

**Durum:** Fikir / öneri. Uygulanmadı; ürün sahibi kararı bekliyor. · **Tarih:** 2026-11-17
**Dayanak:** mevcut modüller — `ai` (v2 araç sözleşmesi, takma ad katmanı, öneri/onay akışı), `automation` (pg-boss, zamanlanmış iş akışları), `mail` (SMTP + IMAP içe alma), `documents` (evrak + OCR), `tasks`, `calendar`, `meetings`, `accounting` (vergi takvimi, vadeler), kampanya kanalları (e-posta / SMS / Telegram / WhatsApp), `exports`.

## 1. Ne olmalı?

Kişisel sekreter, her yönetici veya görevli için **kendi yetkileri içinde** çalışan, işleri **önceden fark eden** ve **taslak hazırlayan**, ama **onaysız hiçbir şey yapmayan** bir yardımcıdır.

Sohbet asistanından farkı: soru beklemez. Takvime, gelen kutusuna ve vadelere bakar, "bugün neyle ilgilenmelisin"i söyler, hazırladığı işi onaya sunar.

Üç temel söz:
1. **Hatırlatır:** hiçbir son tarih, cevaplanmamış yazı veya toplantı hazırlığı unutulmaz.
2. **Hazırlar:** cevap taslağı, tutanak taslağı, görev, takvim kaydı, evrak kaydı.
3. **Sorar, sonra yapar:** her eylem görünür bir öneri kartıdır. Onay → yürütme → denetim kaydı.

## 2. Kullanım senaryoları (dernek / KOBİ gerçeğinden)

| # | Senaryo | Sekreterin yaptığı | Kullanılan modüller |
|---|---|---|---|
| S1 | **Sabah özeti** | "Bugün 2 toplantı, 3 vadesi geçmiş fatura, 1 vergi tarihi (10 gün), 4 cevapsız e-posta, 2 onay bekleyen gelen fatura." Her satır ilgili ekrana gider. | calendar, accounting, mail, documents, tasks |
| S2 | **Gelen kutusu ayıklama** | IMAP'tan gelen postaları sınıflar (fatura / resmî yazı / üye talebi / bilgi). Faturayı gelen fatura taslağına, resmî yazıyı evrak kaydına çevirmeyi önerir, cevap taslağı yazar. | mail, documents (OCR, özet), accounting (payables) |
| S3 | **Evrak takibi** | "Finanzamt yazısında 14 gün cevap süresi var." Görev ve takvim hatırlatması önerir; cevap yazısı taslağı ekler. | documents, tasks, calendar |
| S4 | **Toplantı asistanı** | Toplantıdan 3 gün önce gündem taslağı ve katılımcılara davet; toplantı sonrası notlardan tutanak ve karar listesi, kararlardan görev önerisi. | meetings, tasks, mail |
| S5 | **Finans nöbeti** | Vadesi yaklaşan ödemeler, ödeme çalıştırma önerisi, ihtar taslakları, UStVA hatırlatması ve hazırlık özeti. | accounting (dunning, payment run, tax calendar) |
| S6 | **Üye hizmetleri** | Aidat hatırlatmaları, adres değişikliği taleplerinin kayda dönüşmesi, doğum günü / üyelik yıldönümü tebrik taslakları (izinli kanaldan). | members, mailings, kampanya kanalları |
| S7 | **Haftalık rapor** | Kurul için tek sayfa: nakit durumu, yeni üyeler, açık işler, riskler. PDF olarak "Dosyalarım"a. | accounting, members, tasks, exports |
| S8 | **"Benim yerime takip et"** | Kullanıcı bir işi devreder ("Belediyeden cevap gelmezse 1 hafta sonra hatırlat"); sekreter izler, zamanı gelince taslakla döner. | tasks, automation, mail |

## 3. Etkileşim modeli

- **Sekreter paneli:** Panel'de ve sağ AI panelinde bir "Bugün" kartı ve bir **öneri kuyruğu**. Her öneride neden, kaynak, taslak ve `Onayla / Düzenle / Reddet / Ertele` düğmeleri.
- **Kanallar:** uygulama içi bildirim (varsayılan), günlük e-posta özeti, isteğe bağlı Telegram/WhatsApp kısa bildirim. Kanallarda **kişisel veri değil**, yalnız "3 öneriniz var" türü bağlantı.
- **Doğal dil:** "Gelecek salı yönetim kurulu toplantısı ayarla, gündemi geçen toplantıdan devral" → takvim, davet ve gündem taslağından oluşan **tek bir öneri paketi**.
- **Sessiz saatler ve yoğunluk ayarı:** kullanıcı başına bildirim sıklığı, hafta sonu kapalı, "yalnız acil".

## 4. Mimari öneri (mevcut altyapı üzerine)

```text
Tetikleyiciler                 Sekreter çekirdeği                         Çıktı
──────────────                 ──────────────────                         ─────
pg-boss zamanlayıcı ─┐         1. Toplayıcılar (modül ai.ts araçları,    Öneri kuyruğu (DB)
mail IMAP içe alma ──┼──────►     yalnız izinli, toplam/takma adlı veri)  ├─ Bugün kartı
evrak/fatura olayı ──┤         2. Kural motoru (deterministik:            ├─ Bildirimler
kullanıcı isteği ────┘            vade, süre, eşik)                       └─ Onay → mevcut modül
                               3. LLM katmanı (yalnız sınıflama,              aksiyonu (proposal
                                  özet, taslak; araçsız tek tur)               → execute → audit)
```

- **Yeni modül:** `secretary`, EXTENSION kategorisinde, varsayılan kapalı.
  - Kendi tabloları: `SecretarySuggestion`, `SecretaryRule`, `SecretaryPreference`, `SecretaryDelegation`.
  - Başka modüllere erişimi yalnız `ai.ts` araçları ve mevcut **proposal/action** sözleşmesi üzerinden olur. Doğrudan import yok; §8e modül sınırı korunur.
- **Önce deterministik, sonra AI:** vade, süre ve eşik gibi kurallar kodla çalışır, LLM gerekmez. LLM yalnız sınıflama (posta/evrak türü), özet ve taslak metin için kullanılır. Böylece maliyet ve "uydurma" riski düşer.
- **Otomasyon motoru:** zamanlanmış toplayıcılar ve "takip et" devirleri `automation` iş akışı olarak çalışır. Yeniden deneme, kilit ve denetim kaydı hazır gelir.
- **Kart yüzeyi:** "Bugün" kartı mevcut `defineCards` + `surfaces` mekanizmasıyla Panel'e ve modül ekranlarına yerleşir.

## 5. Gizlilik, güvenlik, hukuk (pazarlıksız kurallar)

1. **İzin sınırı:** Sekreter, kullanıcının rolünün göremediği hiçbir veriyi okumaz. Her çalıştırmada AI erişimi yeniden denetlenir (`requireCurrentAiAccess` modeli).
2. **Veri sınıfı:** Kişi verisi buluta yalnız mevcut kurallarla gider: Denetimli mod, `[[Kn]]` takma adlar, özel nitelikli veride yalnız yerel model. Varsayılan öneri: **yerel model + bulut kapalı**.
3. **Onaysız dış eylem yok:** E-posta, SMS, ödeme, beyan ve silme işlemleri her zaman açık onay ister. "Otomatik onay" yalnız iç ve geri alınabilir işler için olur (görev oluşturma, takvim notu) ve kullanıcı başına açılır.
4. **Denetim izi:** Her öneri ve onay meta veriyle `audit`'e yazılır: kim, ne zaman, hangi kural/model. İçerik loglanmaz.
5. **DSGVO:** Amaç sınırlaması, saklama süresi (öneriler örn. 90 gün), Art. 22 (otomatik karar yok; insan onayı), kayıt erişim/silme taleplerinde sekreter verisi de dahil. İşleme kayıtları (VVT) için hazır metin.
6. **Hesap verebilirlik:** Öneri kartı "neden" alanında kaynağı gösterir (hangi fatura, hangi e-posta). Kaynaksız öneri gösterilmez.

## 6. Yol haritası (öneri)

| Faz | Kapsam | Değer | Risk |
|---|---|---|---|
| **P0 — Altyapı** | `secretary` modülü, öneri kuyruğu, onay → mevcut aksiyon köprüsü, tercihler, audit | Temel | Düşük |
| **P1 — Sabah özeti (S1) + finans nöbeti (S5)** | Yalnız deterministik kurallar; LLM yok | Hemen yüksek | Düşük |
| **P2 — Evrak ve posta ayıklama (S2, S3)** | OCR + sınıflama + taslak; yerel model öncelikli | Yüksek | Orta (doğruluk) |
| **P3 — Toplantı asistanı (S4) + haftalık rapor (S7)** | Gündem/tutanak taslakları, PDF | Orta–yüksek | Orta |
| **P4 — Devir ve takip (S8) + üye hizmetleri (S6)** | Doğal dil devir, kanal bildirimleri | Orta | Orta (bildirim yorgunluğu) |
| **P5 — Ses / mobil** | Sesli komut, push bildirimleri (PWA) | İsteğe bağlı | Yüksek |

## 7. Ölçütler

- Kaçırılan son tarih sayısı (hedef: 0).
- Öneri kabul oranı (≥ %60 hedef; düşükse kural ve eşikler gözden geçirilir).
- Ortalama "gelen yazı → kayıt" süresi.
- Haftalık kullanıcı başına bildirim sayısı (yorgunluk sınırı).
- Model maliyeti / kullanıcı / ay, yerel ve bulut payı.

## 8. Açık sorular (ürün sahibine)

1. Sekreter **kişisel** mi (her kullanıcıya ayrı), **kurumsal** mı (paylaşılan kuyruk + atanan kişi), yoksa ikisi birden mi?
2. Varsayılan model: yalnız yerel mi, yoksa Denetimli modda bulut serbest mi?
3. "Otomatik onay" hangi iç işlerde açılabilsin?
4. Hangi bildirim kanalları ilk sürümde olsun (e-posta özeti, Telegram, WhatsApp)?
5. İlk pilot: hangi rol? Öneri: sayman (finans nöbeti) ve sekreter/yazman (evrak + posta).

## 9. Önerim

**P0 + P1 ile başlayalım:** öneri kuyruğu, sabah özeti ve finans nöbeti. Bunlar LLM'siz çalışır, gizlilik riski en düşüktür ve değeri hemen görünür. Pilot kullanıcı geri bildirimiyle P2'ye (evrak ve posta ayıklama, yerel model) geçilir.
