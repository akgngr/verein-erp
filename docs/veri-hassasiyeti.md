# Veri Hassasiyeti ve Modül / Yapay Zekâ Erişim Politikası

> **Durum:** Taslak politika (öneri). Kategori atamaları yönetimin onayına tabidir; onaylanınca bağlayıcıdır.
> **Kaynak:** Kurallar `src/shared/data-policy.ts` içinde koddur ve `tests/shared/data-policy.test.ts` ile CI'da denetlenir. Bu belge ile kod ayrışırsa kod esastır.
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

> Bu bölüm `src/shared/data-policy.ts` dosyasından üretilir; değişiklikler önce koda yapılır.
> Hassas alanlar: yapay zekâya hiçbir biçimde dönmeyen alanlar. `…ByLabel` alanları (personel adı) her tabloda hassastır.

### K0 — Hiçbir şekilde kullanılamaz

| Modül | Tablo | Gerekçe | Hassas alanlar | Doğrudan erişim (sahibi dışında) |
|---|---|---|---|---|
| accounting | `AccountingBookingFile` | Fiş/makbuz görüntüleri | — | — |
| ai | `AiConversation` | Kullanıcı sohbetleri | — | — |
| ai | `AiMessage` | Kullanıcı sohbetleri | — | — |
| ai | `AiProviderCredential` | API anahtarı (şifreli) | — | — |
| ai | `AiUserConsent` | Kullanıcı rızaları | — | — |
| audit | `AuditLog` | Değiştirilemez denetim izi | — | shared |
| auth | `UserProfile` | Banka ve iletişim verisi | `accountHolder`, `bic`, `city`, `houseNumber`, `ibanEnc`, `mobile`, `phone`, `postalCode`, `street`, `taxNumberEnc` | — |
| banking | `BankConnection` | Banka erişim tokenları | — | — |
| banking | `BankConnectionAccount` | Banka hesap verisi | `iban` | — |
| banking | `BankingSettings` | Banka sağlayıcı kimlik bilgileri | — | — |
| documents | `DocumentNote` | Evrak notları (serbest metin) | — | — |
| mail | `MailInboxAttachment` | Gelen e-posta ekleri | — | — |
| mail | `MailInboxMessage` | Gelen e-posta içerikleri (üçüncü kişi verisi) | — | — |
| mail | `MailInboxSettings` | IMAP parolası (şifreli) | — | — |
| mail | `MailSettings` | SMTP parolası (şifreli) | — | — |
| meetings | `MeetingFile` | Toplantı belgeleri | — | — |
| members | `MemberNote` | Serbest metin; özel nitelikli veri içerebilir (DSGVO Md. 9) | `body` | — |
| progress | `ProgressNote` | Çocuklara ilişkin değerlendirme notları | `goals`, `text` | — |
| system | `SystemSetting` | Yapılandırma ve erişim onayları (sır içerebilir) | — | — |
| users | `User` | Kimlik doğrulama sırları (parola hash, kilit) | `passwordHash`, `email` | auth |

### K1 — Modüller kullanabilir, yapay zekâ kullanamaz

| Modül | Tablo | Gerekçe | Hassas alanlar | Doğrudan erişim (sahibi dışında) |
|---|---|---|---|---|
| accounting | `AccountingBankImport` | Banka ekstresi dosyaları | — | — |
| accounting | `AccountingContact` | Müşteri/tedarikçi kişisel verisi | `address`, `contactPerson`, `email`, `notes`, `phone`, `vatId` | — |
| accounting | `AccountingDunning` | İhtarname (kişiye yönelik) | — | — |
| automation | `AutomationExecution` | Yürütme kaydı (yalnız kimlik) | — | shared |
| automation | `AutomationLog` | Yürütme logu | — | — |
| automation | `AutomationOutbox` | Olay kuyruğu (yalnız kimlik) | — | shared |
| automation | `AutomationStepRun` | Adım kaydı | — | — |
| courses | `CourseCharge` | Kişi bazlı ücretler | — | — |
| courses | `CoursePayment` | Kişi bazlı ödemeler | — | — |
| courses | `CourseTeacher` | Öğretmen kişisel ve ödeme verisi | `email`, `firstName`, `lastName`, `note`, `phone` | — |
| courses | `CourseTeacherLink` | Öğretmen-kurs ilişkisi | — | — |
| courses | `CourseTeacherPayout` | Öğretmen ödemeleri | — | — |
| donations | `Donor` | Bağışçı kişisel verisi | `firstName`, `lastName`, `organizationName`, `email`, `phone`, `street`, `postalCode`, `city` | — |
| donations | `ZuwendungConfirmation` | Bağış makbuzları (vergi) | — | — |
| donations | `ZuwendungConfirmationItem` | Bağış makbuz kalemleri | — | — |
| events | `EventAttendee` | Katılımcı adları | `email`, `firstName`, `lastName`, `phone` | — |
| exports | `GeneratedFile` | Oluşturulan dosyalar (kişisel veri içerebilir) | — | — |
| feedback | `FeedbackItem` | Hata/öneri metni ve ekran görüntüsü | `reporterLabel`, `screenshotPath` | — |
| mail | `MailLog` | Alıcı adresleri | `toAddress`, `toName` | — |
| mailings | `MailingCampaign` | Kampanya içeriği | — | — |
| mailings | `MailingSegment` | Alıcı filtreleri | — | — |
| meetings | `MeetingAttendee` | Katılımcı adları | `note` | — |
| members | `MemberDue` | Kişi bazlı aidatlar | — | — |
| members | `MemberPayment` | Kişi bazlı ödemeler | — | — |
| progress | `ProgressAssessment` | Öğrenci bazlı değerlendirmeler | — | — |
| students | `StudentGuardian` | Veli kişisel verisi | `bic`, `city`, `email`, `firstName`, `houseNumber`, `iban`, `lastName`, `phone`, `postalCode`, `street` | — |
| students | `StudentGuardianLink` | Öğrenci-veli ilişkisi | — | — |

### K3 — Yalnızca belirli modüller ve yapay zekâ, kurallı

| Modül | Tablo | Gerekçe | Hassas alanlar | Doğrudan erişim (sahibi dışında) |
|---|---|---|---|---|
| accounting | `AccountingBankTransaction` | Banka hareketleri; yapay zekâya yalnız durum bazlı sayım/toplam | `counterpartyName`, `counterpartyIban`, `purpose` | — |
| accounting | `AccountingBooking` | Muhasebe kayıtları; yapay zekâya toplamlar, metinler maskeli | `counterparty` | — |
| accounting | `AccountingCashClosing` | Kasa kapanışları | — | — |
| accounting | `AccountingInvoice` | Faturalar; yapay zekâya yalnız sayı/toplam | `recipientAddress`, `recipientEmail`, `recipientName` | — |
| accounting | `AccountingInvoiceLine` | Fatura kalemleri | — | — |
| accounting | `AccountingInvoicePayment` | Fatura ödemeleri | — | — |
| accounting | `AccountingJournal` | GoBD günlüğü; yalnız okuma | — | — |
| accounting | `AccountingPayable` | Borçlar; yapay zekâya yalnız özet | — | — |
| courses | `CourseEnrollment` | Kurs kayıtları; yapay zekâya yalnız sayım | `payerLabel`, `studentLabel` | — |
| documents | `Document` | Evrak; yapay zekâya konu ve karşı taraf maskeli | `assigneeId`, `assigneeLabel` | — |
| documents | `DocumentFile` | Evrak ekleri; yapay zekâ metni yalnız maskeli ve documents:read izniyle okur | `storagePath` | — |
| donations | `Donation` | Bağışlar; yapay zekâya yalnız toplam/adet/dağılım | `donorId`, `reference`, `purposeNote` | — |
| meetings | `ActionItem` | Toplantı görevleri; kişi alanları yok | `assigneeLabel` | — |
| meetings | `AgendaItem` | Gündem | — | — |
| meetings | `Meeting` | Toplantılar; kişi adları yok | `createdByLabel`, `approvedByLabel` | — |
| meetings | `MeetingDecision` | Kararlar | — | — |
| members | `Member` | Üye kişisel verisi; yapay zekâya yalnız sayım/dağılım | `firstName`, `lastName`, `email`, `phone`, `street`, `houseNumber`, `postalCode`, `city`, `birthDate`, `kimlikNo`, `notes` | — |
| progress | `ProgressAttendance` | Öğrenci bazlı yoklama; yapay zekâya yalnız oranlar | — | — |
| progress | `ProgressGrade` | Öğrenci notları; yapay zekâya yalnız ortalama | — | — |
| students | `Student` | Reşit olmayanlar; yapay zekâya yalnız sayım | `firstName`, `lastName`, `birthDate`, `email`, `phone` | — |
| tasks | `Task` | Görevler; başlık maskeli, kişi alanları yok | `memberName`, `memberId`, `createdByLabel`, `completedByLabel` | — |
| users | `CustomRole` | Rol tanımları | — | — |
| users | `RoleGrant` | Yetki tanımları | — | — |

### K2 — Hem modüller hem yapay zekâ serbest

| Modül | Tablo | Gerekçe | Hassas alanlar | Doğrudan erişim (sahibi dışında) |
|---|---|---|---|---|
| accounting | `AccountingAccount` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| accounting | `AccountingAsset` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| accounting | `AccountingBankRule` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| accounting | `AccountingBudgetLine` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| accounting | `AccountingCategory` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| accounting | `AccountingCounter` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| accounting | `AccountingFlatRate` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| accounting | `AccountingInvoiceCounter` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| accounting | `AccountingInvoiceSettings` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| accounting | `AccountingProject` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| accounting | `AccountingReserve` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| accounting | `AccountingSettings` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| accounting | `AccountingYear` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| ai | `AiReport` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| ai | `AiSettings` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| automation | `AutomationSchedule` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| automation | `AutomationWorkflow` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| automation | `AutomationWorkflowVersion` | Kişi içermeyen kurumsal/yapılandırma verisi | — | shared |
| courses | `Course` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| courses | `CoursesCounter` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| courses | `CourseSession` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| courses | `CoursesSettings` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| demo | `DemoRecord` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| documents | `DocumentCategory` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| documents | `DocumentCounter` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| donations | `DonationsCounter` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| donations | `DonationsSettings` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| events | `Event` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| inventory | `InventoryItem` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| meetings | `MeetingCounter` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| members | `MemberCounter` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| members | `MemberPaymentCounter` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| members | `MembershipTypeConfig` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| organization | `OrganizationProfile` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| students | `StudentsCounter` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| students | `StudentsSettings` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| system | `SystemDashboardLayout` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| system | `SystemModulePackage` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |
| system | `SystemModuleState` | Kişi içermeyen kurumsal/yapılandırma verisi | — | — |

### Yapay zekâ araçları ve okudukları tablolar

| Araç | Modül | Okuduğu tablolar |
|---|---|---|
| `get_accounting_summary` | accounting | `AccountingBooking`, `AccountingAccount`, `AccountingYear`, `AccountingCategory` |
| `get_vat_summary` | accounting | `AccountingBooking`, `AccountingSettings` |
| `get_open_items_summary` | accounting | `AccountingInvoice`, `AccountingInvoicePayment` |
| `get_bank_inbox_summary` | accounting | `AccountingBankTransaction` |
| `get_payables_summary` | accounting | `AccountingPayable` |
| `get_report_link` | accounting | — (yalnız onay kartı) |
| `list_courses` | courses | `Course`, `CourseEnrollment`, `CourseSession` |
| `get_course_statistics` | courses | `Course`, `CourseEnrollment`, `CourseSession` |
| `propose_course` | courses | — (yalnız onay kartı) |
| `propose_course_status` | courses | `Course` |
| `propose_delete_course` | courses | `Course` |
| `get_document_statistics` | documents | `Document`, `DocumentCategory` |
| `list_documents` | documents | `Document`, `DocumentCategory` |
| `get_document` | documents | `Document`, `DocumentCategory`, `DocumentFile` |
| `read_document_file` | documents | `DocumentFile` |
| `propose_document` | documents | — (yalnız onay kartı) |
| `propose_document_status` | documents | `Document` |
| `propose_delete_document` | documents | `Document` |
| `get_donation_statistics` | donations | `Donation` |
| `list_upcoming_events` | events | `Event` |
| `propose_event` | events | — (yalnız onay kartı) |
| `create_file` | exports | — (yalnız onay kartı) |
| `get_inventory_overview` | inventory | `InventoryItem` |
| `list_inventory_items` | inventory | `InventoryItem` |
| `propose_inventory_item` | inventory | — (yalnız onay kartı) |
| `propose_inventory_status` | inventory | `InventoryItem` |
| `propose_delete_inventory_item` | inventory | `InventoryItem` |
| `get_meeting_statistics` | meetings | `Meeting` |
| `list_meetings` | meetings | `Meeting` |
| `get_meeting` | meetings | `Meeting`, `AgendaItem`, `MeetingDecision` |
| `propose_meeting` | meetings | — (yalnız onay kartı) |
| `propose_meeting_status` | meetings | `Meeting` |
| `propose_delete_meeting` | meetings | `Meeting` |
| `get_member_statistics` | members | `Member`, `MembershipTypeConfig` |
| `get_organization_info` | organization | `OrganizationProfile` |
| `get_progress_statistics` | progress | `ProgressAttendance`, `ProgressGrade` |
| `get_student_statistics` | students | `Student` |
| `list_open_tasks` | tasks | `Task` |
| `propose_task` | tasks | — (yalnız onay kartı) |
| `propose_complete_task` | tasks | `Task` |
| `propose_delete_task` | tasks | `Task` |

## 4. Kuralların uygulanması (projedeki yeri)

| Kural | Uygulandığı yer |
|---|---|
| Modüller arası erişim yalnız public API ile | `scripts/validate-module.ts` (`pnpm module:check`) |
| Erişim beyanı ve onayı | `module.config.ts → access`, Modül Yönetimi onayı (`system/services/module-access-store.ts`) |
| AI izin matrisi (modül × işlem) | `ai/services/permissions.ts`, Ayarlar → Yapay zekâ |
| AI araçlarının veri sınırı | Her modülün `ai.ts` araçları (bu belgedeki K1/K3 kuralları) |
| Modele giden metinlerin maskelenmesi | `ai/services/privacy.ts` (`PseudonymVault`) |
| Otomasyon olay yüklerinde kişisel veri yok | `tests/automation/module-events.test.ts` |
| Her tablo sınıflandırılmış, sahibi doğru | `tests/shared/data-policy.test.ts` |
| Sahibi dışında doğrudan Prisma erişimi yalnız `directAccess` ile | `tests/shared/data-policy.test.ts` |
| AI araçları beyan edilmiş, yalnız K2/K3 okuyor, hassas alan kullanmıyor | `tests/shared/data-policy.test.ts` (`AI_TOOL_POLICY`) |
| AI araç çıktıları ve kullanıcı mesajları maskeleniyor | `tests/shared/data-policy.test.ts` |
| Otomasyon değişkenleri yalnız gönderim anında | `shared/automation/variables.ts` (`renderWorkflowVariables`) |
| Terminal loglarında maskeli e-posta | `shared/automation/trace.ts` (`maskEmail`) |
| Sırların şifrelenmesi | `mail/services/mail-crypto.ts`, `ai` sağlayıcı kimlik bilgileri, `banking` |
| Denetim izi | `audit` (kişisel alanlar yazılmaz) |

## 5. Yeni tablo / modül eklerken kontrol listesi

1. Tabloyu `src/shared/data-policy.ts` içinde bir kategoriye (K0–K3) ekleyin; sınıflandırılmamış tablo testi düşürür (bu sırada **K0** kabul edilir). Belgenin 3. bölümünü güncelleyin.
2. Başka modül verisine ihtiyaç varsa `module.config.ts → access` içinde beyan edin; doğrudan Prisma erişimi yapmayın.
3. `ai.ts` aracı yazıyorsanız aracı `AI_TOOL_POLICY` içinde okuduğu tablolarla beyan edin ve:
   - K0/K1 alanlarını **döndürmeyin**;
   - K3'te yalnız tabloda tarif edilen türetilmiş değeri döndürün;
   - serbest metinleri maskeleyin.
4. Otomasyon olayı yazıyorsanız yükte yalnız kimlik ve sınıflandırma kullanın; kişisel alanları `variables.load` ile sunun.
5. Loglara ve hata mesajlarına kişisel veri yazmayın (gerekirse `maskEmail`).

## 6. Açık konular (öneri)

- **Alan düzeyi kategori:** Şu an kategori tablo düzeyindedir; hassas alanlar ayrıca listelenir. Örneğin `Member.kimlikNo` için alan bazlı K0 ayrımı eklenebilir.
- **Statik analizin sınırı:** Test `ai.ts` içindeki `.alan` erişimlerini ve doğrudan Prisma çağrılarını denetler. `name` gibi her tabloda bulunan genel alan adları ve `server` fonksiyonlarının iç detayı statik olarak ayırt edilemez; bunlar araç tasarımı ve `PseudonymVault` ile korunur.
- **Saklama süreleri:** Tablo başına silme/anonimleştirme kuralları (ör. AI sohbetleri, e-posta logları, otomasyon çalıştırmaları).
