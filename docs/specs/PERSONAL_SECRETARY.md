# Kişisel Sekreter — uygulama planı, aşamalar ve iş bölümü

**Durum:** S0–S3 uygulanmış; S4–S5 lisans kararı beklenmeden uygulamaya açıldı (ürün sahibi, 2026-11-19).
**Gerekçe ve fikir havuzu:** [`docs/ideas/PERSONAL_SECRETARY_BRAINSTORM.md`](../ideas/PERSONAL_SECRETARY_BRAINSTORM.md)
**Mimari bağlam:** [ADR 0001](../adr/0001-isolated-deployment-per-customer.md) (hibrit çoklu müşteri)

## 1. Kapsam ilkeleri (değişmez)

1. **Öner → onayla → hedef modülün kendi eylemi.** Sekreter kaynak kaydı kendisi yazmaz. E-posta, ödeme, beyan ve silme her zaman açık onay ister.
2. **Önce kurallar, sonra AI.** Özet ve uyarılar AI kapalıyken de çalışır. AI yalnız sınıflama, özet ve taslak için, mevcut AI v2 kapılarından geçerek kullanılır.
3. **Modül sınırı:** Sekreter başka modülü import etmez. Modüller sekretere kendi `secretary.ts` dosyalarıyla katkı verir. `pnpm module:sync` bu dosyalardan `src/secretary-registry.ts` dosyasını üretir (`calendar.ts` ve `ai.ts` ile aynı desen).
4. **Yetki:** Her katkı, kullanıcının o modüldeki görüntüleme yetkisiyle süzülür. Kapalı veya onaysız modülün katkısı görünmez.
5. **"Gösterme" ≠ "tamamla":** Sekreterde kapatılan veya ertelenen öğe kaynak kaydı değiştirmez.

## 2. Modülerlik ve ilerideki lisans ayrımı (karar ertelenmiştir)

**2026-11-19 karar güncellemesi:** S4–S5'i geliştirmek için lisans, ücret veya ayrı Enterprise deposu beklenmeyecektir. Aşağıdaki sınıflandırma yalnız ileride değerlendirilecek paketleme ihtimalidir; erişim kapısı ya da lisans seçimi değildir. Şimdilik özellikler aynı depodaki modüler ve test edilebilir kodla hazırlanır:

| Katman | İçerik | Öneri |
|---|---|---|
| **`secretary` (çekirdek)** | Sabah özeti, katkı kaydı, onay kutusu, tercihler, günlük özet e-postası | Açık çekirdek; dernekler ve küçük kullanıcılar için değer üretir |
| **İleri Sekreter yetenekleri (S4–S5)** | Posta sınıflama ve cevap taslakları, OCR alan önerileri, haftalık kurul raporu, çok kanallı bildirim, ekip/vekil modu, takip devri | **Şimdi geliştirilecek**; olası ayrı modül/lisans/fiyatlandırma kararı gelecekte ayrı ADR ile |

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

MVP: **S0–S2**; S3 tamamlandı. **S4 ve S5 lisans kararı beklemeden** geliştirilecektir. Epic #263; alt görevler #313, #314, #315, #316, #317. Ücretlendirme/paywall/kapalı kaynak ayrımı bu görevlerin kapsamında değildir.

## 3.1 Ortak sözleşme (T0.3'te koda dökülür; ChatGPT bu tiplere göre çalışır)

```ts
// src/shared/secretary/define.ts
export type BriefingSeverity = "info" | "warning" | "danger";

export type BriefingItem = {
  /** Stabil kimlik: "<modül>:<tür>[:<kaynakId>]" — kapat/ertele durumu bu kimliğe bağlanır. */
  id: string;
  module: string;
  kind: string;
  severity: BriefingSeverity;
  /** Çevrilmiş kısa başlık (sağlayıcı kendi i18n ad alanından üretir). */
  title: string;
  detail?: string;
  /** ISO tarih veya tarih-saat; sıralama ve "bugün/yaklaşan" ayrımı için. */
  dueAt?: string;
  count?: number;
  amountCents?: number;
  /** Kaynağa giden uygulama içi bağlantı (yalnız bu modülün sayfaları). */
  href: string;
};

export type SecretaryContext = {
  user: { id: string; role: Role };
  now: Date; // Europe/Berlin "bugün" hesabı için
  t: (key: string, values?: Record<string, string | number>) => string; // modül ad alanında
};

export type SecretaryProvider = {
  key: string;
  permission: PermissionRequirement; // görüntüleme yetkisi yoksa sağlayıcı çağrılmaz
  collect: (context: SecretaryContext) => Promise<BriefingItem[]>;
};

export type ModuleSecretary = { module: string; providers: SecretaryProvider[] };
export const defineModuleSecretary = (definition: ModuleSecretary): ModuleSecretary => definition;

// Toplayıcı (T1.1) çıktısı
export type Briefing = {
  generatedAt: string;
  sections: { module: string; items: BriefingItem[] }[]; // kapatılmış/ertelenmiş öğeler süzülmüş
  failures: string[]; // hata veren sağlayıcı anahtarları (içerik yok)
};
```

Kurallar: Sağlayıcı yalnız kendi modülünün verisini okur ve sayfalarına bağlantı verir. Kişisel veriyi `title`/`detail` içinde yalnız kullanıcının zaten görebildiği ölçüde kullanır. Sağlayıcı başına 3 sn zaman aşımı; en fazla 20 öğe.

## 4. İş bölümü (Claude ↔ ChatGPT)

Koordinasyon protokolü: [`docs/ai-coordination/README.md`](../ai-coordination/README.md). Her görev bir GitHub Issue'dur (`agent:claude` / `agent:chatgpt`); güncel görev panosu [`docs/ai-coordination/secretary/TASKS.md`](../ai-coordination/secretary/TASKS.md).

**Dosya sahipliği ilkesi:** Aynı dosyayı iki ajan aynı anda değiştirmez.
- Claude: arka uç, şema, sözleşme, servisler, eylemler, otomasyon, testler.
- ChatGPT: `components/`, `views/`, kartlar, sayfalar ve UI metinleri.
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
| T1.3 Sağlayıcılar: **tasks, calendar, meetings** | S1 | **ChatGPT** | T0.3 |
| T1.4 "Bugün" yüzey kartı (`surfaces`) + sekreter sayfası (özet listesi, boş durum, kaynağa git) | S1 | **ChatGPT** | T1.1 (API sözleşmesi) |
| T1.5 Kapat/ertele eylemleri + `SecretaryItemState` | S1 | **Claude** | T0.4 |
| T1.6 Kapat/ertele UI, mobil/a11y/tema smoke testleri | S1 | **ChatGPT** | T1.5 |
| T2.1 Kural kaynaklı öneri üretimi + onay yolu (hedef modül eylemi) + audit | S2 | **Claude** | T0.1 |
| T2.2 Onay kutusu UI (önizleme, düzenle, onayla/reddet/ertele) | S2 | **ChatGPT** | T2.1 |
| T3.1 Otomasyon: günlük özet işi, sessiz saatler, yaz/kış saati | S3 | **Claude** | T1.1 |
| T3.2 Tercih ekranı + özet e-posta şablonu | S3 | **ChatGPT** | T3.1 |
| T4–T5 ileri özellikleri | S4–S5 | **Claude backend (#313–#316), ChatGPT UI (#317)** | S0–S3 ve mevcut izin/onay sözleşmeleri |

**Sözleşme önce:** T1.1'in TypeScript tipleri (`BriefingItem`, `BriefingSection`) T0.3 PR'ında yayımlanır. UI ajanı bu tiplere göre çalışabilir, arka ucun bitmesini beklemez.

### ChatGPT için planlama komutu (Issue C0)

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
| 2026-11-19 | ChatGPT | Görev bazında PR ve bağımlılık planı kesinleştirildi; Panel/surfaces #291 ve gizlilik regresyonu #292 Claude'a devredildi. |
| 2026-11-19 | ChatGPT | Ürün sahibi S4–S5'in lisans kararından bağımsız uygulanmasını onayladı; epic #263 açıldı, Claude backend #313–#316 ve ChatGPT UI #317. |

## 6. S4–S5 etkin uygulama kararı (2026-11-19)

- **Uygula, fakat ticari erişim kısıtı getirme.** Mevcut `secretary` modülü ve `secretary.ts` / AI v2 / automation / Files sözleşmelerini kullan. Lisans, paket ve fiyatlama ayrı karardır.
- **İşlem güvenliği:** Kullanıcıya öneri/taslak göster; e-posta veya dış kanala gönderim ve kaynak modülde yazma yalnız açık onay + çalışma anında tekrar yetki denetimi ile. Tanımsız ve yeterince doğrulanmamış kanallar güvenli kapalı durumda kalır.
- **Posta:** Meta olaylar, yerel-öncelikli sınıflama, consent, sınırlı veri erişimi, AI sağlayıcıya özel/sensitif içerik iletmeme. Ayrı gönderim onayı. Epic #263 → #313.
- **Takip:** Kullanıcı tarafından kurulan, durdurulabilir ve geri alınabilir takip işleri; tek pg-boss iş motoru, idempotency, audit. Epic #263 → #314.
- **Kurul raporu / OCR:** Yalnız izinli ve minimum sayısal verilerle rapor, Files/Automation dosya üretimi; OCR sadece doğrulanabilir alan önerisi ve insan onayı. Epic #263 → #315.
- **Kanallar / vekil:** Kanal başına opt-in, sessiz saat, rate limit, secret yönetimi, vekil haklarında kapsam/süre/iptal/audit ve hiçbir koşulda başkasının onayını atlama yok. Epic #263 → #316.
- **UI:** Ortak kit, mobil/klavye/reduced-motion, TR/DE, hata/boş/izin durumları; backend public API tamamlanmadan canlı eylem simülasyonu yok. Epic #263 → #317.
- **Kabul:** Her alt görev ayrı `alpha` PR, modül sürüm/release kayıtları ve üretilmiş belgeler senkron; CI, Docs, Security ve bağımsız veri izolasyonu testleri yeşil. Ortamda canlı üçüncü taraf credential yoksa gerçek gönderim doğrulanmış sayılmaz.
