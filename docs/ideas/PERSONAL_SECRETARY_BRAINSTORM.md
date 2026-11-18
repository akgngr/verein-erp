# Kişisel Sekreter — Verein ERP için ürün ve mimari beyin fırtınası

**Tarih:** 2026-11-17  
**Durum:** Ürün önerileri / karar bekleyen fikirler; uygulama şartnamesi veya geliştirme başlangıcı değildir.  
**Başlama koşulu:** Merkezi UI Platform W0–W6 geçişi ve AI v2 güvenlik kabul kapıları tamamlandıktan sonra planlanmalı.  
**İlişkili belgeler:** `docs/specs/PERSONAL_SECRETARY.md`, `docs/TODO_AI_ASSISTANT_V2.md`, `docs/specs/AI_ASSISTANT_V2_IMPLEMENTATION_SPEC.md`, `docs/AUTOMATION_ENGINE.md`, `docs/ui/ERP_UI_PLATFORM.md`, `docs/ui/WORK_SPLIT.md`, `docs/reviews/AI_ASSISTANT_ARCHITECTURE_AUDIT.md`.

## 1. Ürün tezi

**“ERP içinde cevap veren sohbet botu” değil, “her sabah işi toparlayan ve güvenli bir sonraki adımı öneren kişisel çalışma masası.”**

Kullanıcıya önce **ne değişti**, ardından **neden önemli** ve son olarak **ne yapılabilir** gösterilir. Kişi bütün modülleri tek tek dolaşmadan, kendi yetkileri kapsamındaki işleri takip edebilir. Ancak asistan kendi başına e-posta göndermez, ödeme başlatmaz, randevu oluşturmaz, kayıt silmez veya müşteri/üye verisini dışarı çıkarmaz.

DACH ile başlayıp AB'ye açılan; dernek, küçük işletme ve serbest çalışanlara uygun **modüler**, **çok dilli** (ilk etap TR/DE, sonra EN), **privacy-first** bir ürün düşünülmeli. Mevcut AI modülünü yeniden yazmak yerine kontrollü bir **Secretary/Briefing** ürün yüzeyi oluşturulmalı.

### Önceliklendirilmiş üç kullanıcı arketipi

| Arketip | Sıkıntı | Sekreterin değeri |
| --- | --- | --- |
| Dernek yönetimi / sekreter | Üyelik, toplantı, aidat ve etkinlik bilgisi farklı modüllerde | Görev ve karar takibi; onaylı toplu iletişim önerileri |
| Freelancer | Tek kişi olarak mail, teklif, fatura ve takvim yetiştirme | Günlük öncelik, yanıtsız müşteri, vade ve tahsilat uyarıları |
| KOBİ operasyon sorumlusu | Dağıtık takip, gecikmeler, ekip koordinasyonu | Onay bekleyen işler, ekip sorumluları, kontrol listesi |

## 2. Ürün deneyimi — ilk ekranda ne olacak?

### Sekreter Paneli (tek sayfa, responsive)

1. **Bugün:** 3–5 öncelik kartı (yaklaşan randevu, geciken görev, yanıt bekleyen mesaj, işlem bekleyen belge).
2. **Öneriler:** Her birinde *dayanak / etki / önerilen eylem / Onayla / Düzenle / Reddet*.
3. **Gelen kutusundan fırsatlar:** “Bu e-postada randevu talebi olabilir” veya “Bu belgede son ödeme tarihi var”; doğrudan kayıt açılmaz.
4. **Takip listesi:** “Bu teklife 5 gündür yanıt gelmedi” gibi koşullu ve kullanıcıya atanmış takipler.
5. **Hızlı komut:** “Bu haftaki açık işlerimi özetle”; yanıt yalnız mevcut yetkilerle.
6. **Neden bunu görüyorum?** Kaynak modül, zaman, filtre ve önerinin geçerlilik süresi; yüksek riskli işte onay önizlemesi.

**UI ilkesi:** Yeni ekranlar `src/shared/ui-platform` tokenları, ortak `SurfaceCard`, `DataTable`, `Dialog`, `Sheet` ve `notify` API'lerini kullanır; modülde doğrudan HeroUI importu olmaz. Hafif hareket, reduced-motion, klavye odağı ve mobil kart düzeni şarttır.

### Sabah brifingi (örnek, kurgusal)

> “Bugün 2 toplantı, 3 öncelikli görev ve yarın vadesi dolacak 1 fatura var. Dün gelen 4 e-postadan 2'si yanıt gerektiriyor olabilir. Üç öneriyi incelemek ister misiniz?”

Brifing **AI olmadan da** kural tabanlı veriyle üretilebilmeli. Model yalnız yetkili ve izinli genel özet/natural-language düzenlemesi için kullanılmalı; temel ürün modeli/sağlayıcısı kapalıyken de işlevsel kalmalı.

## 3. Özellik havuzu ve somut öneriler

| Kod | Fikir | MVP? | Ürün faydası | Güvenlik / ön koşul |
| --- | --- | --- | --- | --- |
| PS-01 | Günlük ve haftalık brifing | **Evet** | Tek bakışta öncelikler | Kullanıcıya özgü, izin kontrollü aggregation |
| PS-02 | Onay kutusu / öneri merkezî akışı | **Evet** | Kontrol tek noktada | AiProposal, TTL, atomic claim, audit |
| PS-03 | Takvim ve görev çakışması | **Evet** | Zaman kaybını azaltma | Calendar permissions, timezone Europe/Berlin |
| PS-04 | Gelen e-postadan görev/yanıt taslağı | **MVP sonrası** | Gelen kutusu iş yükü | IMAP kapsamı, ayrı içerik rızası, gönderim onayı |
| PS-05 | Son tarih / gecikmiş cevap takibi | **MVP sonrası** | Kaybolan işleri yakalama | Automation outbox, tenant sınırı |
| PS-06 | Fatura ve tahsilat uyarıları | **Evet (salt okuma)** | Nakit akışını görünür kılma | Accounting OPOS permission, finans işlemi otomatik yok |
| PS-07 | Evrak OCR alan önerisi | **MVP sonrası** | Veri girişini hızlandırma | Local OCR, sensitive content fail-closed |
| PS-08 | Toplantı hazırlık özeti | **MVP sonrası** | Gündem ve açık kararlar | Meetings/task public adapter, kaynak bağlantısı |
| PS-09 | Yazışma taslağı (DE/TR/EN) | **MVP sonrası** | İletişim kalitesini artırma | İnsan incelemesi/gönderim onayı |
| PS-10 | Metin/sesli hızlı giriş | **İleri aşama** | Mobil kullanım | Ses kaydı varsayılan saklanmaz; tarayıcı/OS izni |
| PS-11 | Doğal dilde filtre ve dosya taslağı | **İleri aşama** | Veriden hızlı çıktı | AI v2 dataset/proposal, Export/Automation |
| PS-12 | Tekrarlayan rutinlerden öneri | **İleri aşama** | Proaktif asistan | Kullanıcı opt-in; öngörü kaydı ve kapatma kontrolü |
| PS-13 | Takım/vekil modu | **İleri aşama** | Kurumsal operasyon | Rol devri; kullanıcı adına otomatik onay yasak |
| PS-14 | WhatsApp/SMS/Telegram bildirim | **İleri aşama** | Kanal erişimi | Kanal modülü, açık opt-in, rate limit, ayrı onay |

### Bilinçli olarak kapsam dışı bırakılanlar

- Genel yetkili “agent bilgisayarı” gibi tarayıcıda sınırsız tıklayan otonom sistem.
- Kullanıcı onayı olmadan para, vergi, banka, ELSTER veya muhasebe kaydı oluşturma/gönderme.
- Üye/öğrenci/veli/sağlık veya diğer yüksek hassasiyetteki kişisel veriyi doğrudan harici modele aktarma.
- “Tüm e-postaları sürekli okuyup profil çıkarma” gibi amaç dışı sınırsız izleme.
- Mevcut Automation yerine ikinci bir scheduler/queue/worker yazma.
- Geliştirici onayı olmadan keyfî SQL veya LLM tarafından üretilen server-side kodu yürütme.

## 4. Önerilen mimari: ince orkestrasyon + mevcut modüller

```text
Secretary UI (Briefing / Inbox / Proposals / Preferences)
                 |
          Secretary Service
           /      |        \
   Rule Engine   AI v2     Approval Center
       |          |                |
   Read adapters  Safe projection  AiProposal confirm
       |          |                |
Calendar / Tasks / Mail / Documents / Accounting / Members
                 |
       Automation outbox + pg-boss worker
                 |
   Audit / Tenant Scope / Notification Policies
```

**Teknik karar önerisi:** Kişisel sekreter, AI sohbet paneline gömülü monolit yerine modül yaşam döngüsüyle açılıp kapanabilen **`secretary`** isimli isteğe bağlı ürün modülü olsun. İlk etapta modül oluşturmadan önce servis sözleşmesini ve UI prototipini doğrula. Core altyapı yalnız reusable shared primitive sağlar. Modül `public`, `server`, `ui`, `ai`, `automation` girişleri üzerinden bağımlı modüllerle etkileşir; hiçbir modülün private Prisma tablosunu doğrudan sorgulamaz.

### Temel servis sözleşmesi (taslak)

- `getBriefing(actor, date, scope)`: kaynaklar, son güncelleme, eksiksizlik, okunabilir özet; N+1 sorgu yok.
- `listActionableItems(actor, filters)`: yetkili modüllerin salt okunur eylem adayları, cursor, severity ve source link.
- `proposeAction(actor, kind, sourceRef, draft)`: AI v2 proposal mekanizmasına idempotent kayıt.
- `confirmProposal(actor, proposalId, expectedRevision)`: kullanıcı onayı, güncel izin, expiry, audit; hedef modül action'ına yönlendirme.
- `scheduleBriefing(actor, preferences)`: tek Automation worker ile idempotent günlük zamanlama, kapatma kontrolü.
- `dismissItem(actor, itemId)`: sessize alma sadece kullanıcıya özgü tercih; kaynak iş verisini silmez.

**Önemli ayrım:** “Bana gösterme” ≠ “Görevi tamamla”. Sekreterin kendi görünümü ile kaynak modüldeki işin gerçek durumu ayrıdır.

### Olay akışı (örnek)

1. `mail.message_received` veya mevcut modülün güvenilir olayı oluşur.
2. Tek worker task, tenant+actor+izin+feature flag kontrolleriyle işlenir.
3. Kural tabanlı ayrıştırma karar verebiliyorsa model çağrılmaz.
4. Model gerekiyorsa güvenli projection + rıza + sağlayıcı/bütçe politikası uygulanır. Serbest metin/PII için kapı açılamazsa **yerel-only veya manuel** fallback.
5. `AiProposal` kullanıcıya taslak olarak sunulur; son tarih ve kaynak revizyonu saklanır.
6. İnsan *önizle → düzenle → onayla* akışından geçer.
7. Hedef modül tekrar yetki ve ilişkili kayıt sürümünü doğrular; atomik işlem/audit/outbox.
8. Arka plan sonucu bildirim merkezinde durum olarak görünür; hassas veri loglarda tutulmaz.

## 5. Veri koruma, güvenlik ve hukuki sınırlar

- **GDPR/DSGVO:** Veri minimizasyonu, amaç sınırlaması, saklama süresi, silme ve veri erişim kapsamı ürün tasarımında varsayılan. Hukuki uyum yalnız teknik dokümanla garanti edilemez; DPO/hukuk değerlendirmesi gerekir.
- **Sıfır güven model kanalı:** AI v2 dataset/ref/token + `DATA_POLICY` + `AI_TOOL_POLICY` sözleşmesi kullanılmalı. `K0/K1` ve öğrenci/veli gibi hassas bilgiler model çıktısına açılmamalı; salt maskeleme yeterli kabul edilmemeli.
- **Çok katmanlı izin:** actor, tenant, module enabled, module AI matrix, tool policy, consent, scope, row-level permission her okuma/confirm/worker aşamasında güncel denetlenir.
- **Risk seviyeleri:** L0 bilgi ve brifing; L1 taslak; L2 kayıt güncelleme için açık onay; L3 dış dünyaya gönderim/finans/vergisel işlem için ayrı güçlü onay ve mümkünse iki aşamalı yetki. Bazı L3 türleri hiçbir AI-driven otomatik yol üzerinden yapılmaz.
- **Spam/tekrar önleme:** idempotency key, unique event key, cooldown, max daily notification, quiet hours, user opt-out, tenant-level quota.
- **Gizli kaynaklar:** Öğrenci, veli, sağlık, özel not ve finans detayları varsayılan kapalı; yalnız güvenli aggregate ya da ilgili modülde doğrudan kullanıcı erişimi.
- **Saklama:** Briefing cache kısa TTL; proposal TTL, purge worker, silme/consent revoke zinciri; geçmişi kullanıcı kontrol edebilmeli.
- **Bildirim metni:** Push/e-posta konu satırında hassas isim/tutar/sağlık/vergi ayrıntısı bulunmaz; güvenli UI deep link tercih edilir.
- **Denetlenebilirlik:** Her önerinin `sourceRef`, `policyRevision`, `actorId`, `tenantId`, `proposedAt`, `expiresAt`, `sourceRevision`, `executionId`, `resultCode`; asla ham hassas metin logları değil.

## 6. Ürün akışları — düşük maliyetle yüksek değer

### Akış A: Günlük özet

- 07:30 gibi kullanıcının saat diliminde isteğe bağlı worker.
- Takvim, görev, vadeler, onay bekleyenler salt-okuma aggregations.
- Gecikme/öncelik kurallarını deterministik hesapla; AI çağrısı opsiyonel.
- Kullanıcı UI'da “neden önemli” ve kaynak kayda tıklayabilsin.
- “Bugün hiçbir işlem yok” gibi empty state; kaynak modül kapalıysa o modülün bilgisi görünmesin.

### Akış B: Gelen e-posta → yanıt taslağı

- Sadece seçilen posta kutuları; kullanıcı rızası ve kapsam tanımı.
- Takvim talebi, belge isteği veya cevap bekleyen soru için **aday öneri**.
- Kullanıcı tek tuşla taslak açar; manuel düzeltme ve gönderim.
- E-posta gönderimi her seferinde açık onay ve mevcut Mail/Automation altyapısıyla.
- Yanlış pozitifler için “bunu bir daha önerme” geri bildirimi.

### Akış C: Fatura vadesi

- Accounting modülünden yalnız yetkili OPOS sayıları/durumları.
- Vadeye 3 gün kala uyarı (kullanıcı ayarı), önce ilgili kayıt açılır.
- Hatırlatma e-postası sadece taslak; doğrudan tahsilat/SEPA/ELSTER işlemi yok.
- Aynı fatura tekrar tekrar bildirilmeyecek.

## 7. Teknik optimizasyon

- **No extra queue:** mevcut pg-boss/outbox, merkezi Automation worker.
- **No second AI provider registry:** mevcut AI v2 provider ve budget/region/consent mantığı.
- **No direct SQL by LLM:** kaynak modülün allowlisted adapters/AI contracts.
- **Server-first:** briefings ve statik kartlar sunucu; etkileşimli proposal alanları client.
- **Incremental updates:** kısa süreli cache, event invalidation; kullanıcı başına sürekli poll yerine isteğe bağlı refresh.
- **Observability:** query sayısı, briefing latency, worker retry, dismissed proposals, send approvals, model spend, user opt-out; hassas verisiz telemetry.
- **Zero-cost preference:** deterministik öneri motoru önce, yerel model/ucuz opsiyonel model sonra; pahalı model sadece kullanıcı talebinde veya açıkça faydalıysa.
- **Feature flags:** `secretary.enabled`, `secretary.aiSummary`, `secretary.mailClassification`, `secretary.externalNotifications` birbirinden bağımsız.
- **Graceful degradation:** AI kapalı veya provider hata verirse deterministic dashboard çalışmayı sürdürür.

## 8. Aşamalar ve gerçek kabul kriterleri

| Faz | Çıktı | Bloklayan ön koşul | Kabul testi |
| --- | --- | --- | --- |
| P0 | UX akışları, kullanıcı görüşmeleri, veri/izin matrisi, risk modeli | UI Platform W0–W6, AI v2 pilot feature flag | Gösterilebilir statik prototip + DPO ön değerlendirmesi |
| P1 | Rule-only sabah brifingi, salt-okuma | Tasks/Calendar/Accounting adapters | Kullanıcı+tenant izolasyonu, no-model tests, mobil/a11y |
| P2 | Proposal Inbox + confirm/dismiss | AiProposal v2 ve idempotency | Double confirm, stale source, revoked permission, audit |
| P3 | Mail taslakları + hatırlatma kuralları | Mail/Automation, per-mailbox consent | Gönderim her zaman onaylı, sessiz saatler, tekrar yok |
| P4 | OCR, ses, akıllı doğal dil, çok kanallı | Privacy gates, provider region/retention, budget | Local-only fallback, false-positive evaluation, data leakage tests |

MVP önceliği: **P1 + P2**, ardından **P3**. P4’ü erken eklemek maliyet, veri koruma ve bakım yükünü gereksiz yükseltir.

## 9. Kalite ve test matrisi

- RBAC + tenant ve organization boundary; kullanıcı A'nın hiçbir brifing/önerisi kullanıcı B'ye görünmez.
- Disabled module, revoked consent, disabled provider, policy revision, expired reference/proposal, stale source.
- Worker double delivery, retry, race, idempotency, timeout, outbox crash/recovery.
- TypeScript/ESLint/module:sync/module-version checks, hydration, i18n TR/DE (sonra EN), light/dark/mobile/reduced-motion.
- App kapalı olsa da scheduled task yetki ve rızayı **yeniden** doğrular; eski snapshot yetki kanıtı değildir.
- Notification quiet-hours/timezone/DST (Avrupa yaz/kış saati) ve 7 günlük maksimum per-user günlük özet kontrolü.
- Model çıktısı güvenilmezdir; prompt injection/sahte link/harici içerik ve provider çıktısının araç yetkisini genişletememesi test edilir.
- Finans/vergisel dış işlemler (SEPA, ELSTER vb.) AI aracılığıyla otomatik gönderilmez.

## 10. Karar matrisi — ürün sahibine sunulan öneriler

| Soru | Önerim | Alternatif |
| --- | --- | --- |
| Ayrı modül mü? | **Evet**, opsiyonel `secretary` modülü | AI chat içine sıkı bağlı sekme |
| Başlangıç deneyimi? | **Dashboard + öneri kutusu** | Sadece chat |
| AI zorunlu mu? | **Hayır**, rule-first | Tüm içerik için ücretli LLM |
| Proaktif aksiyon? | **Taslak öner + onay al** | Otomatik gönderim (önerilmez) |
| İlk hedef? | **Freelancer + dernek sekreteri** | Tüm sektörlere aynı anda açılma |
| Mobil kanal? | **ERP içi bildirim** | Push/WhatsApp (sonraya bırak) |
| Veri modeli? | **Mevcut AiProposal / AI v2 projection** | İkinci proposal/LLM datastore (önerilmez) |
| MVP kapsamı? | **P1–P2** | Ses + OCR + mail + otomasyon hepsi birden |

## 11. Açık sorular ve prototipte ölçülecek metrikler

1. Sekreter ayrı menü öğesi mi, dashboard'da sabit alan mı, yoksa ikisi mi?
2. İlk hedef kullanıcı grubu: dernek mi, freelancer mı, KOBİ mi?
3. Kullanıcının kabul edeceği günlük brifing sıklığı/saati ve quiet hours.
4. İşlem onay modeli: “tek tıklama + önizleme” yeterli mi, yüksek riskte ek doğrulama mı?
5. Bulut AI için açık rıza yanında hangi AB veri bölgesi/sağlayıcı sözleşmeleri geçerli?
6. Teklif/ödemeler/faturalar gibi finans işlemlerinde **yalnız okuma** sınırının son kapsamı.
7. P1 için gözlemlenecek: günlük aktif kullanım, öneri kabul/red oranı, kapatılan bildirim, yanlış pozitif, görev tamamlanma oranı, ortalama briefing oluşturma süresi ve €/user/model çağrısı.

## 12. Uygulama için önerilen ilk iş listesi (UI geçişi **sonrası**)

- [ ] P0 onayı: arketip, brifing taslağı, menü konumu, risk seviyesi politikası.
- [ ] Kaynak modüller için read-only capabilities sözleşmesi / yetki matrisi.
- [ ] Sekreter için `defineModuleAi`/Automation contract uyum analizi.
- [ ] `AiProposal` kullanımını doğrula; yeni tablo gereksinimi için migration öncesi ADR yaz.
- [ ] Deterministik briefing aggregator + server-only UI.
- [ ] Approval Inbox + aç/kapat + provenance/TTL görünürlüğü.
- [ ] Worker event idempotency/quiet hours ve feature flags.
- [ ] TR/DE (opsiyonel EN) çeviri anahtarları ve erişilebilir mobil smoke.
- [ ] 10 örnek gerçekçi iş akışı ve false-positive/hassas veri negatif testleri.
- [ ] Pilot kullanıcı testi, feedback ve maliyet analizi; P3 için ürün sahibi kararı.

---

**Sonuç:** En yüksek değerli başlangıç ürününün “sabah öncelikleri + onaylı öneriler” olduğunu düşünüyorum. Mevcut AI v2, Automation, DataTable ve modüler izin sistemi tekrar kullanılmalı; yeni bir otonom agent framework'ü veya ağır motion paketi eklenmemeli. UI Platform tamamlanmadan sekreter için yeni ekran geliştirmeye başlanmamalı.
