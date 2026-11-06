# Veri Hassasiyeti ve Modül / Yapay Zekâ Erişim Politikası

> **Durum:** Taslak politika (öneri). Kategori atamaları yönetimin onayına tabidir; onaylanınca bağlayıcıdır.
> **Kapsam:** PostgreSQL'deki tüm tablolar (Prisma modelleri), modüller arası erişim, yapay zekâ asistanı (`ai` modülü), otomasyon (`automation` modülü: olay yükleri, iş akışı değişkenleri, loglar).
> **Hukuki çerçeve:** DSGVO/GDPR (özellikle Md. 5, 9, 25, 32), KVKK, GoBD (muhasebe kayıtlarının değiştirilemezliği).

## 1. Temel ilkeler

1. **Varsayılan kapalı.** Bir tablo bu belgede açıkça izin verilmedikçe başka modüller ve yapay zekâ tarafından okunmaz.
2. **Sahip modül.** Her tablonun tek sahibi vardır: `src/modules/<modül>/schema.prisma`. Diğer modüller tabloya **doğrudan değil**, sahibin public API'si (`@/modules/<modül>/server`, `…/automation`) üzerinden erişir. `pnpm module:check` başka modülün iç dosyalarının içe aktarılmasını engeller.
3. **Beyan ve onay.** Bir modül başka bir modülün verisine ihtiyaç duyuyorsa `module.config.ts → access` içinde beyan eder (`{ module, operations }`). Beyan değişirse yönetici Modül Yönetimi'nden yeniden onaylamadan modül kullanılamaz.
4. **Yapay zekâ en az veriyle çalışır.**
   - Yapay zekâ veriye yalnızca modüllerin `ai.ts` araçları üzerinden erişir.
   - Araçlar ham kişisel veri **döndürmez**; yalnızca sayım, toplam ve kurumsal veri döndürür.
   - Modele giden her metin `PseudonymVault` ile maskelenir: e-posta, IBAN, telefon, vergi no, kayıtlı kişi adları ve üye numaraları.
   - Yönetici, AI izin matrisinde (Ayarlar → Yapay zekâ) her modül için okuma/oluşturma/güncelleme/silme izinlerini ayrı açar. Varsayılan: hepsi kapalı.
   - Yazma işlemleri her seferinde kullanıcı onayı ve kullanıcının kendi rol yetkisini gerektirir.
5. **Otomasyonda kimlik yeterlidir.** Olay yükleri (`defineEvent → payloadSchema`) yalnızca kimlik ve sınıflandırma taşır. Ad, e-posta gibi alanlar `variables.load` ile **yalnızca gönderim anında** okunur; kuyruğa, yürütme kaydına ya da loga yazılmaz (`tests/automation/module-events.test.ts` denetler).
6. **Sırlar hiçbir yere taşınmaz.** Parola, token ve API anahtarları yalnızca sahibi modülün sunucu kodunda, şifreli olarak bulunur; hiçbir API, log, AI aracı ya da dışa aktarma bunları döndürmez.

## 2. Kategoriler

| Kod | Kategori | Diğer modüller | Yapay zekâ | Otomasyon değişkeni |
|---|---|---|---|---|
| **K0** | Hiçbir şekilde kullanılamaz (sırlar, özel nitelikli/korunan veri) | ✖ (yalnız sahibi; sırlar yalnız sunucu kodu) | ✖ kesinlikle | ✖ |
| **K1** | Modüller kullanabilir, yapay zekâ kullanamaz | ✔ beyan + onay ile, public API üzerinden | ✖ (ham veri yok; toplam/sayım dahi yalnızca K3 kuralıyla) | ✔ yalnız `variables.load` (gönderim anı) |
| **K2** | Hem modüller hem yapay zekâ serbest | ✔ | ✔ (AI matrisinde modül izni açıksa) | ✔ |
| **K3** | Yalnızca belirli modüller ve yapay zekâ, kurallı | ✔ yalnız listelenen modüller | ✔ yalnız tabloda yazan biçimde (toplam, sayım, maskeli metin) | ✔ kurala göre |

> **Not (K1/K3):** K1 tablolardan yapay zekâya hiçbir değer gitmez. K3 tablolarda ise yalnızca tabloda tarif edilen **türetilmiş** veri (ör. "aktif üye sayısı", "bu yılki bağış toplamı") araçlardan döner; satır düzeyi kişisel alanlar dönmez.

## 3. Tablo sınıflandırması

### K0 — Hiçbir şekilde kullanılamaz

| Modül | Tablo | Neden | Erişebilen |
|---|---|---|---|
| users | `User` (`passwordHash`, kilit alanları) | Kimlik doğrulama sırları | yalnız `auth`/`users` sunucu kodu |
| auth | `UserProfile` (ödeme/IBAN, adres) | Banka ve iletişim verisi | yalnız kullanıcının kendisi ve yetkili yönetici |
| ai | `AiProviderCredential` | API anahtarı (şifreli) | yalnız `ai` sağlayıcı katmanı |
| mail | `MailSettings`, `MailInboxSettings` | SMTP/IMAP parolaları (şifreli) | yalnız `mail` gönderim/okuma servisi |
| banking | `BankConnection`, `BankConnectionAccount`, `BankingSettings` | Banka erişim tokenları, hesap verisi | yalnız `banking` |
| mail | `MailInboxMessage`, `MailInboxAttachment` | Gelen e-posta içerikleri (üçüncü kişi verisi) | yalnız `mail` (içe aktarma kullanıcı eylemiyle) |
| members | `MemberNote` | Serbest metin; özel nitelikli veri içerebilir (DSGVO Md. 9) | yalnız `members` |
| progress | `ProgressNote` | Çocuklara ilişkin değerlendirme notları | yalnız `progress` |
| documents | `DocumentFile`, `DocumentNote` | Evrak dosyası/notu içerikleri | yalnız `documents` |
| meetings | `MeetingFile` | Toplantı belgeleri | yalnız `meetings` |
| accounting | `AccountingBookingFile` | Fiş/makbuz görüntüleri | yalnız `accounting` |
| feedback | `FeedbackItem.screenshot*` | Ekran görüntüsü kişisel veri içerebilir | yalnız `feedback` yöneticisi |
| audit | `AuditLog` | Denetim izi; değiştirilemez | yalnız `audit` (okuma: yönetici) |
| ai | `AiConversation`, `AiMessage`, `AiUserConsent` | Kullanıcı sohbetleri ve rızalar | yalnız `ai` (kullanıcının kendi kaydı) |
| system | `SystemSetting` (sır içeren anahtarlar) | Yapılandırma sırları | yalnız `system` |

### K1 — Modüller kullanabilir, yapay zekâ kullanamaz

| Modül | Tablo | Kullanabilen modüller (beyan ile) | Not |
|---|---|---|---|
| members | `Member` (ad, adres, e-posta, telefon, `kimlikNo`, doğum tarihi) | `mailings` (alıcı kaynağı), `donations`, `tasks`, `meetings`, `automation` (değişken) | AI'ya yalnız K3 kuralındaki sayılar |
| members | `MemberPayment`, `MemberDue` | `accounting` | Kişi bazlı ödeme |
| donations | `Donor` | `accounting` (makbuz), `automation` (değişken: `donorName`) | |
| donations | `ZuwendungConfirmation`, `ZuwendungConfirmationItem` | `exports` | Bağış makbuzları (vergi) |
| students | `Student`, `StudentGuardian`, `StudentGuardianLink` | `courses`, `progress`, `mailings` | **Reşit olmayanlar**: ek dikkat |
| courses | `CourseTeacher`, `CourseTeacherPayout`, `CoursePayment`, `CourseCharge` | `accounting` | Ödeme/kişisel veri |
| progress | `ProgressAttendance`, `ProgressAssessment`, `ProgressGrade` (satır düzeyi) | `courses` | AI'ya yalnız ders bazlı ortalama (K3) |
| accounting | `AccountingContact`, `AccountingBankTransaction` (amaç metni), `AccountingBankImport`, `AccountingDunning` | `banking`, `donations` | Karşı taraf adı/IBAN içerir |
| mail | `MailLog` (alıcı adresleri) | `mailings`, `automation` (izleme) | |
| mailings | `MailingCampaign`, `MailingSegment` | `automation` | Kampanya içeriği; alıcı listesi saklanmaz |
| meetings | `MeetingAttendee` | `members` | Katılımcı adları |
| events | `EventAttendee` | `members` | Katılımcı adları |
| feedback | `FeedbackItem` (metin alanları) | `automation` (değişken: başlık) | |
| automation | `AutomationExecution`, `AutomationStepRun`, `AutomationLog`, `AutomationOutbox` | — (yalnız kimlik içerir) | Kişisel veri yazılmaz |
| exports | `GeneratedFile` | Oluşturan modül | Dosya içeriği kişisel veri içerebilir |

### K2 — Hem modüller hem yapay zekâ serbest

| Modül | Tablo | Not |
|---|---|---|
| organization | `OrganizationProfile` | Derneğin kamuya açık kurumsal bilgileri |
| accounting | `AccountingAccount`, `AccountingCategory`, `AccountingProject`, `AccountingYear`, `AccountingBudgetLine`, `AccountingSettings`, `AccountingFlatRate`, `AccountingReserve`, `AccountingAsset` | Hesap planı, bütçe ve demirbaş verisi (kişi içermez) |
| members | `MembershipTypeConfig` | Üyelik türleri ve aidat tutarları |
| documents | `DocumentCategory` | |
| events | `Event` | Etkinlik başlığı, tarih, yer |
| inventory | `InventoryItem` | Envanter |
| courses | `Course`, `CourseSession`, `CoursesSettings` | Kurs kataloğu ve takvimi |
| meetings | `Meeting`, `AgendaItem`, `MeetingDecision` | Kişi adı içermeyen alanlar; serbest metin maskelenir |
| system | `SystemModuleState`, `SystemModulePackage`, `SystemDashboardLayout` | |
| automation | `AutomationWorkflow`, `AutomationWorkflowVersion`, `AutomationSchedule` | Akış tanımları |
| tümü | `*Counter`, `*Settings` (sır içermeyenler) | Numaralandırma ve ayarlar |

### K3 — Yalnızca belirli modüller ve yapay zekâ, kurallı

| Modül | Tablo | Kullanabilen modüller | Yapay zekâya izin verilen biçim |
|---|---|---|---|
| members | `Member` | `mailings`, `donations`, `meetings`, `tasks` | Yalnız sayım ve dağılım: durum/tür/giriş yılına göre üye sayısı. Ad ve iletişim bilgisi **yok**. |
| donations | `Donation` | `accounting` | Toplam, adet, yöntem/aylık dağılım. Bağışçı adı yok. |
| accounting | `AccountingBooking`, `AccountingJournal`, `AccountingCashClosing` | `donations`, `members`, `courses` | Hesap/kategori/dönem toplamları. Karşı taraf adı ve açıklama metni maskelenir. GoBD: yalnız okuma. |
| accounting | `AccountingInvoice`, `AccountingInvoiceLine`, `AccountingInvoicePayment`, `AccountingPayable` | `courses`, `banking` | Açık/kapalı kalem sayıları ve toplamları. Müşteri adı yok. |
| documents | `Document` | `meetings`, `tasks`, `automation` | Kayıt numarası, yön, durum, tarih. Konu ve karşı taraf **maskeli** metin olarak. |
| tasks | `Task` | `meetings`, `members`, `automation` | Başlık ve son tarih **maskeli**; `memberName` döndürülmez. |
| courses | `CourseEnrollment` | `students`, `progress` | Kurs bazlı kayıt sayıları. |
| progress | `ProgressGrade`, `ProgressAttendance` | `courses` | Yalnız kurs/dönem ortalamaları; öğrenci bazlı değer yok. |
| students | `Student` | `courses`, `progress` | Yalnız sayımlar (yaş grubu/kurs). |
| users | `User` (ad, rol) | tümü (atama seçicileri) | Kullanıcı sayısı ve rol dağılımı; e-posta yok. |
| users | `CustomRole`, `RoleGrant` | `system` | Rol ve yetki tanımları (kişi içermez). |
| demo | `DemoRecord` | `demo` | Yalnız demo verisinin sayımı. |

## 4. Kuralların uygulanması (projedeki yeri)

| Kural | Uygulandığı yer |
|---|---|
| Modüller arası erişim yalnız public API ile | `scripts/validate-module.ts` (`pnpm module:check`) |
| Erişim beyanı ve onayı | `module.config.ts → access`, Modül Yönetimi onayı (`system/services/module-access-store.ts`) |
| AI izin matrisi (modül × işlem) | `ai/services/permissions.ts`, Ayarlar → Yapay zekâ |
| AI araçlarının veri sınırı | Her modülün `ai.ts` araçları (bu belgedeki K1/K3 kuralları) |
| Modele giden metinlerin maskelenmesi | `ai/services/privacy.ts` (`PseudonymVault`) |
| Otomasyon olay yüklerinde kişisel veri yok | `tests/automation/module-events.test.ts` |
| Otomasyon değişkenleri yalnız gönderim anında | `shared/automation/variables.ts` (`renderWorkflowVariables`) |
| Terminal loglarında maskeli e-posta | `shared/automation/trace.ts` (`maskEmail`) |
| Sırların şifrelenmesi | `mail/services/mail-crypto.ts`, `ai` sağlayıcı kimlik bilgileri, `banking` |
| Denetim izi | `audit` (kişisel alanlar yazılmaz) |

## 5. Yeni tablo / modül eklerken kontrol listesi

1. Tabloyu bu belgede bir kategoriye (K0–K3) ekleyin. Sınıflandırılmamış tablo **K0** kabul edilir.
2. Başka modül verisine ihtiyaç varsa `module.config.ts → access` içinde beyan edin; doğrudan Prisma erişimi yapmayın.
3. `ai.ts` aracı yazıyorsanız:
   - K0/K1 alanlarını **döndürmeyin**;
   - K3'te yalnız tabloda tarif edilen türetilmiş değeri döndürün;
   - serbest metinleri maskeleyin.
4. Otomasyon olayı yazıyorsanız yükte yalnız kimlik ve sınıflandırma kullanın; kişisel alanları `variables.load` ile sunun.
5. Loglara ve hata mesajlarına kişisel veri yazmayın (gerekirse `maskEmail`).

## 6. Açık konular (öneri)

- **Makinece okunabilir politika:** Bu tabloyu `src/shared/data-policy.ts` olarak kodlayıp bir testle şunları denetlemek:
  - her Prisma modeli sınıflandırılmış mı;
  - `ai.ts` dosyaları K0/K1 tablolarına `select` yapıyor mu;
  - `access` beyanları politikaya uyuyor mu.
- **Alan düzeyi sınıflandırma:** Ör. `Member.kimlikNo` → K0, `Member.status` → K3.
- **Saklama süreleri:** Tablo başına silme/anonimleştirme kuralları (ör. AI sohbetleri, e-posta logları, otomasyon çalıştırmaları).
