# Kişisel Sekreter — uygulama planı, aşamalar ve iş bölümü

**Durum:** Onaylı yön (ürün sahibi, 2026-11-18). Uygulama başlıyor.
**Gerekçe ve fikir havuzu:** [`docs/ideas/PERSONAL_SECRETARY_BRAINSTORM.md`](../ideas/PERSONAL_SECRETARY_BRAINSTORM.md)
**Mimari bağlam:** [ADR 0001](../adr/0001-isolated-deployment-per-customer.md) (hibrit çoklu müşteri)

## 1. Kapsam ilkeleri (değişmez)

1. **Öner → onayla → hedef modülün kendi eylemi.** Sekreter kaynak kaydı kendisi yazmaz. E-posta, ödeme, beyan ve silme her zaman açık onay ister.
2. **Önce kurallar, sonra AI.** Özet ve uyarılar AI kapalıyken de çalışır. AI yalnız sınıflama, özet ve taslak için, mevcut AI v2 kapılarından geçerek kullanılır.
3. **Modül sınırı:** Sekreter başka modülü import etmez. Modüller sekretere kendi `secretary.ts` dosyalarıyla katkı verir. `pnpm module:sync` bu dosyalardan `src/secretary-registry.ts` dosyasını üretir (`calendar.ts` ve `ai.ts` ile aynı desen).
4. **Yetki:** Her katkı, kullanıcının o modüldeki görüntüleme yetkisiyle süzülür. Kapalı veya onaysız modülün katkısı görünmez.
5. **"Gösterme" ≠ "tamamla":** Sekreterde kapatılan veya ertelenen öğe kaynak kaydı değiştirmez.

## 2. Çekirdek / Pro ayrımı (lisans kararına bağlı)

Lisans modeli kesinleşene kadar kod, ayrılabilecek şekilde yazılır:

| Katman | İçerik | Öneri |
|---|---|---|
| **`secretary` (çekirdek)** | Sabah özeti, katkı kaydı, onay kutusu, tercihler, günlük özet e-postası | Açık çekirdek; dernekler ve küçük kullanıcılar için değer üretir |
| **`secretary-pro` (Enterprise, ayrı modül)** | Posta sınıflama ve cevap taslakları, OCR alan önerileri, haftalık kurul raporu, çok kanallı bildirim, ekip/vekil modu, takip devri | Kapalı kaynak; ayrı depoda, Enterprise imajında |

Çekirdek, Pro'nun bağlanabileceği iki uzantı noktası sunar: ek öğe katkı sağlayıcıları ve öneri türleri. Pro, çekirdeği import etmez; katkı kaydı üzerinden bağlanır.

## 3. Aşamalar

| Aşama | Çıktı | Kabul |
|---|---|---|
| **S0 — Temel** | ADR 0005 (`AiProposal` genelleştirmesi), `secretary` modül iskeleti (izinler, i18n, menü, özellik bayrakları), tablolar (`SecretaryPreference`, `SecretaryItemState`), `defineSecretary` sözleşmesi ve kayıt üretimi (`module:sync`), modül sınırı testleri | `module:validate`, tip, test ve lint yeşil; sözleşme testli |
| **S1 — Kural tabanlı sabah özeti (salt okuma)** | Katkı sağlayıcılar: accounting, tasks, calendar, meetings, documents, members. Toplayıcı servis (paralel, zaman aşımlı, hata izole). "Bugün" yüzey kartı (Panel + modül ekranları). Sekreter sayfası. Öğe kapatma/erteleme. | Kullanıcı izolasyonu, yetki süzmesi, kapalı modül, modelsiz testler; mobil, a11y, açık/koyu tema |
| **S2 — Onay kutusu** | Kural kaynaklı öneriler (`source: "rule"`). Onayla/düzenle/reddet/ertele. Hedef modül eylemine yönlendirme. Audit. | Çift onay, eski kaynak, geri alınmış yetki, süresi dolmuş öneri testleri |
| **S3 — Zamanlama ve tercihler** | Otomasyon ile günlük özet (kullanıcı saatinde), sessiz saatler, özet e-postası (kişisel veri yok, yalnız bağlantı), tercih ekranı | Yaz/kış saati, tekrar yok, sessiz saatler, kapatma |
| **S4 — Pro: posta ve takip** | `mail` gelen posta olayı (meta), yerel-öncelikli sınıflama, cevap ve görev taslağı, "benim yerime takip et" | Gönderim her zaman onaylı; özel nitelikli veri buluta gitmez |
| **S5 — Pro: rapor, OCR, kanallar, ekip** | Haftalık kurul raporu (PDF), evrak OCR alan önerileri, Telegram/WhatsApp/SMS bildirim, vekil modu | Kanal izni, oran sınırı, ayrı onay |

MVP: **S0–S2**. Ardından S3. S4 ve S5 lisans kararından sonra `secretary-pro` olarak.

## 4. İş bölümü (Claude ↔ UI Platform ajanı)

**Dosya sahipliği ilkesi:** Aynı dosyayı iki ajan aynı anda değiştirmez.
- Claude: arka uç, şema, sözleşme, servisler, eylemler, otomasyon, testler.
- UI Platform ajanı: `components/`, `views/`, kartlar, sayfalar ve UI metinleri.
- Paylaşılan iki dosya için kural:
  - `messages/tr.json` ve `de.json`: Claude `secretary.*` altında arka uç anahtarlarını, UI ajanı `secretary.ui.*` altında kendi anahtarlarını ekler. Çakışmada sonra merge eden yeniden uyarlar.
  - `module.config.ts` sürümü: sonra merge eden bir sonraki patch sürümüne geçer ve `releases.json`'a not ekler.

| Görev | Aşama | Sahip | Bağımlılık |
|---|---|---|---|
| T0.1 ADR 0005 — `AiProposal`'ın `source: model\|rule` ile genelleştirilmesi | S0 | **Claude** | — |
| T0.2 `secretary` modül iskeleti, izinler (`secretary.view`, `secretary.manage`), menü, bayraklar | S0 | **Claude** | — |
| T0.3 `defineSecretary` sözleşmesi + `secretary.ts` kayıt üretimi (`sync-registry`) + sınır testi | S0 | **Claude** | T0.2 |
| T0.4 Tablolar: `SecretaryPreference`, `SecretaryItemState` + migration | S0 | **Claude** | T0.2 |
| T1.1 Toplayıcı servis (`getBriefing`): paralel, zaman aşımı, sağlayıcı hatası izole, yetki süzmesi | S1 | **Claude** | T0.3 |
| T1.2 Sağlayıcılar: **accounting, documents, members** | S1 | **Claude** | T0.3 |
| T1.3 Sağlayıcılar: **tasks, calendar, meetings** | S1 | **UI Platform ajanı** | T0.3 |
| T1.4 "Bugün" yüzey kartı (`surfaces`) + sekreter sayfası (özet listesi, boş durum, kaynağa git) | S1 | **UI Platform ajanı** | T1.1 (API sözleşmesi) |
| T1.5 Kapat/ertele eylemleri + `SecretaryItemState` | S1 | **Claude** | T0.4 |
| T1.6 Kapat/ertele UI, mobil/a11y/tema smoke testleri | S1 | **UI Platform ajanı** | T1.5 |
| T2.1 Kural kaynaklı öneri üretimi + onay yolu (hedef modül eylemi) + audit | S2 | **Claude** | T0.1 |
| T2.2 Onay kutusu UI (önizleme, düzenle, onayla/reddet/ertele) | S2 | **UI Platform ajanı** | T2.1 |
| T3.1 Otomasyon: günlük özet işi, sessiz saatler, yaz/kış saati | S3 | **Claude** | T1.1 |
| T3.2 Tercih ekranı + özet e-posta şablonu | S3 | **UI Platform ajanı** | T3.1 |
| T4–T5 Pro özellikleri | S4–S5 | Lisans kararından sonra yeniden dağıtılır | Lisans ADR'si |

**Sözleşme önce:** T1.1'in TypeScript tipleri (`BriefingItem`, `BriefingSection`) T0.3 PR'ında yayımlanır. UI ajanı bu tiplere göre çalışabilir, arka ucun bitmesini beklemez.

### UI Platform ajanı için planlama komutu

> **GÖREV — Sekreter iş bölümünün onayı ve takvimi:** `docs/specs/PERSONAL_SECRETARY.md` (bu belge) ile `docs/ideas/PERSONAL_SECRETARY_BRAINSTORM.md` dosyasını oku. Sana atanan T1.3, T1.4, T1.6, T2.2 ve T3.2 görevleri için:
> 1. Sıra, tahmini PR sayısı ve bağımlılık takvimini çıkar.
> 2. Kendi W1/W2/W6 UI işlerinle çakışma riskini değerlendir. W6'dan önce sekreter UI'ı kit üzerinden yazılabilir.
> 3. Bu belgenin sonundaki "Değişiklik günlüğü"ne bir satır ekleyen kısa bir PR aç (yalnız doküman).
>
> İş bölümüne itirazın varsa gerekçesiyle aynı PR'da öner. Kod değişikliğine T0.3 sözleşmesi merge edildikten sonra başla.

## 5. Değişiklik günlüğü

| Tarih | Sahip | Değişiklik |
|---|---|---|
| 2026-11-18 | Claude | Plan, aşamalar S0–S5 ve iş bölümü yazıldı. |
