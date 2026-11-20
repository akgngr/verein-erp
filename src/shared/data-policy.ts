/**
 * Veri hassasiyeti politikası — makinece okunabilir kaynak.
 *
 * Belge: docs/veri-hassasiyeti.md. Test: tests/shared/data-policy.test.ts denetler:
 *  - her Prisma modeli burada sınıflandırılmıştır ve sahibi doğrudur;
 *  - tablolara sahibi dışındaki kodun doğrudan Prisma erişimi yalnız `directAccess` ile mümkündür;
 *  - yapay zekâ araçları (`ai.ts`) yalnız beyan ettikleri K2/K3 tabloları okur, K0/K1 tablolarına
 *    ve hassas alanlara dokunmaz; araç çıktıları maskeleme katmanından geçer.
 *
 * Yeni tablo eklerken buraya ekleyin; sınıflandırılmamış tablo testi düşürür.
 */

/**
 * K0: hiçbir şekilde kullanılamaz (yalnız sahibi; sırlar yalnız sunucu kodu).
 * K1: modüller kullanabilir (public API + access beyanı), yapay zekâ kullanamaz.
 * K2: modüller ve yapay zekâ serbest.
 * K3: belirli modüller ve yapay zekâ, kurallı (yalnız türetilmiş/maskeli veri).
 */
export type DataCategory = "K0" | "K1" | "K2" | "K3";

export type TablePolicy = {
  /** Tabloyu tanımlayan modül (src/modules/<owner>/schema.prisma). */
  owner: string;
  category: DataCategory;
  reason: string;
  /**
   * Yapay zekâya hiçbir biçimde dönmemesi gereken alanlar. Test bunları `ai.ts` içinde
   * `.alan` erişimi olarak arar; bu yüzden `name` gibi her tabloda bulunan genel adlar
   * listelenmez (statik analiz hangi tabloya ait olduğunu ayırt edemez). Bu tür alanlar
   * araç tasarımı ve maskeleme katmanıyla korunur.
   */
  sensitiveFields: readonly string[];
  /** Sahibi dışında doğrudan Prisma erişimine izinli modüller ("shared" = src/shared altyapısı). */
  directAccess?: readonly string[];
  /**
   * Satırlar tek bir kullanıcıya aitse o alan (ör. "userId", "ownerId"). Kullanıcı silinince sahibi modülün
   * `lifecycle.ts → onUserDeleted` kancası bu satırları siler (KVKK md. 7 / DSGVO Art. 17). Test zorunlu tutar.
   */
  personalOwnerField?: string;
};

/** Personel/kullanıcı adı taşıyan denetim alanları her tabloda hassastır (…ByLabel). */
export const GLOBAL_SENSITIVE_FIELD = /ByLabel$/;

export const DATA_POLICY = {
  // ── K0 ──
  AccountingBookingFile: { owner: "accounting", category: "K0", reason: "Fiş/makbuz görüntüleri", sensitiveFields: [] },
  AiConversation: { owner: "ai", category: "K0", reason: "Kullanıcı sohbetleri", sensitiveFields: [], personalOwnerField: "userId" },
  AiMessage: { owner: "ai", category: "K0", reason: "Kullanıcı sohbetleri", sensitiveFields: [] },
  AiProviderCredential: { owner: "ai", category: "K0", reason: "API anahtarı (şifreli)", sensitiveFields: [] },
  AiUserConsent: { owner: "ai", category: "K0", reason: "Kullanıcı rızaları", sensitiveFields: [], personalOwnerField: "userId" },
  AuditLog: { owner: "audit", category: "K0", reason: "Değiştirilemez denetim izi", sensitiveFields: [], directAccess: ["shared"] },
  BankConnection: { owner: "banking", category: "K0", reason: "Banka erişim tokenları", sensitiveFields: [] },
  BankConnectionAccount: { owner: "banking", category: "K0", reason: "Banka hesap verisi", sensitiveFields: ["iban"] },
  BankingSettings: { owner: "banking", category: "K0", reason: "Banka sağlayıcı kimlik bilgileri", sensitiveFields: [] },
  DocumentNote: { owner: "documents", category: "K0", reason: "Evrak notları (serbest metin)", sensitiveFields: [] },
  MailInboxAttachment: { owner: "mail", category: "K0", reason: "Gelen e-posta ekleri", sensitiveFields: [] },
  MailInboxMessage: { owner: "mail", category: "K0", reason: "Gelen e-posta içerikleri (üçüncü kişi verisi)", sensitiveFields: [] },
  MailInboxSettings: { owner: "mail", category: "K0", reason: "IMAP parolası (şifreli)", sensitiveFields: [] },
  MailSettings: { owner: "mail", category: "K0", reason: "SMTP parolası (şifreli)", sensitiveFields: [] },
  MeetingFile: { owner: "meetings", category: "K0", reason: "Toplantı belgeleri", sensitiveFields: [] },
  MemberNote: { owner: "members", category: "K0", reason: "Serbest metin; özel nitelikli veri içerebilir (DSGVO Md. 9)", sensitiveFields: ["body"] },
  ProgressNote: { owner: "progress", category: "K0", reason: "Çocuklara ilişkin değerlendirme notları", sensitiveFields: ["goals", "text"] },
  SystemSetting: { owner: "system", category: "K0", reason: "Yapılandırma ve erişim onayları (sır içerebilir)", sensitiveFields: [] },
  User: { owner: "users", category: "K0", reason: "Kimlik doğrulama sırları (parola hash, kilit)", sensitiveFields: ["passwordHash", "email"], directAccess: ["auth"] },
  UserProfile: { owner: "auth", category: "K0", reason: "Banka ve iletişim verisi", sensitiveFields: ["accountHolder", "bic", "city", "houseNumber", "ibanEnc", "mobile", "phone", "postalCode", "street", "taxNumberEnc"], personalOwnerField: "userId" },
  // ── K1 ──
  AccountingBankImport: { owner: "accounting", category: "K1", reason: "Banka ekstresi dosyaları", sensitiveFields: [] },
  AccountingContact: { owner: "accounting", category: "K1", reason: "Müşteri/tedarikçi kişisel verisi", sensitiveFields: ["address", "contactPerson", "email", "notes", "phone", "vatId"] },
  AccountingDunning: { owner: "accounting", category: "K1", reason: "İhtarname (kişiye yönelik)", sensitiveFields: [] },
  AutomationExecution: { owner: "automation", category: "K1", reason: "Yürütme kaydı (yalnız kimlik)", sensitiveFields: [], directAccess: ["shared"] },
  AutomationLog: { owner: "automation", category: "K1", reason: "Yürütme logu", sensitiveFields: [] },
  AutomationOutbox: { owner: "automation", category: "K1", reason: "Olay kuyruğu (yalnız kimlik)", sensitiveFields: [], directAccess: ["shared"] },
  AutomationStepRun: { owner: "automation", category: "K1", reason: "Adım kaydı", sensitiveFields: [] },
  CourseCharge: { owner: "courses", category: "K1", reason: "Kişi bazlı ücretler", sensitiveFields: [] },
  CoursePayment: { owner: "courses", category: "K1", reason: "Kişi bazlı ödemeler", sensitiveFields: [] },
  CourseTeacher: { owner: "courses", category: "K1", reason: "Öğretmen kişisel ve ödeme verisi", sensitiveFields: ["email", "firstName", "lastName", "note", "phone"] },
  CourseTeacherLink: { owner: "courses", category: "K1", reason: "Öğretmen-kurs ilişkisi", sensitiveFields: [] },
  CourseTeacherPayout: { owner: "courses", category: "K1", reason: "Öğretmen ödemeleri", sensitiveFields: [] },
  Donor: { owner: "donations", category: "K1", reason: "Bağışçı kişisel verisi", sensitiveFields: ["firstName", "lastName", "organizationName", "email", "phone", "street", "postalCode", "city"] },
  EventAttendee: { owner: "events", category: "K1", reason: "Katılımcı adları", sensitiveFields: ["email", "firstName", "lastName", "phone"] },
  FeedbackItem: { owner: "feedback", category: "K1", reason: "Hata/öneri metni ve ekran görüntüsü", sensitiveFields: ["reporterLabel", "screenshotPath"] },
  FileGeneration: {owner:"exports",category:"K1",reason:"File request owner, purpose and execution metadata",sensitiveFields:[],personalOwnerField:"ownerId"},
  GeneratedFile: { owner: "exports", category: "K1", reason: "Oluşturulan dosyalar (kişisel veri içerebilir)", sensitiveFields: [], personalOwnerField: "ownerId" },
  MailLog: { owner: "mail", category: "K1", reason: "Alıcı adresleri", sensitiveFields: ["toAddress", "toName"] },
  MailTriageOptIn: { owner: "mail", category: "K1", reason: "Kullanıcının gelen posta sınıflaması rızası (yalnız kullanıcı kimliği)", sensitiveFields: [], personalOwnerField: "userId" },
  MailReplyDraft: { owner: "mail", category: "K1", reason: "Yanıt taslağı; gövde şifreli, gönderilince silinir", sensitiveFields: ["bodyEnc"], personalOwnerField: "userId" },
  MailTriageTask: { owner: "mail", category: "K1", reason: "Gelen e-posta ile onaylı öneriden açılan görev bağlantısı", sensitiveFields: [], personalOwnerField: "userId" },
  MailingChannelConfig: { owner: "mailings", category: "K0", reason: "Kanal sağlayıcı anahtarları (şifreli)", sensitiveFields: ["secretsEnc"] },
  MailingDelivery: { owner: "mailings", category: "K1", reason: "Alıcı başına gönderim/teslim/açılma/tıklama kaydı (adres ve zamanlar)", sensitiveFields: ["address", "token"] },
  CampaignTelegramLink: { owner: "campaign-telegram", category: "K1", reason: "Telegram aboneliği: sohbet kimliği ve davet belirteci", sensitiveFields: ["chatId", "token", "recipientKey"] },
  MailingCampaign: { owner: "mailings", category: "K3", reason: "Kampanya özeti AI'ya yalnız ad, konu, kanal, durum ve sayılar olarak verilir; gövde, filtre ve oluşturan adı verilmez", sensitiveFields: ["body", "bodyHtml", "design", "filter", "createdByLabel"] },
  MailingSegment: { owner: "mailings", category: "K1", reason: "Alıcı filtreleri", sensitiveFields: [] },
  CrmParty: { owner: "crm", category: "K1", reason: "Kişiye bağlı ilişki kaydı (aşama, etiket); ad/iletişim kaynakta", sensitiveFields: ["tags", "sourceId"] },
  CrmActivity: { owner: "crm", category: "K1", reason: "Görüşme/arama notları", sensitiveFields: ["summary", "createdByLabel"] },
  CrmFollowUp: { owner: "crm", category: "K1", reason: "Kişiye bağlı takip notları", sensitiveFields: ["note"] },
  OnlineFormDocument: { owner: "online-forms", category: "K2", reason: "Kurumsal form belgeleri (kişi verisi yok)", sensitiveFields: ["updatedById"] },
  OnlineFormRequest: { owner: "online-forms", category: "K1", reason: "Form bağlantısı kanıtı: maskeli alıcı, imzalayan adı, imza (şifreli), onaylar", sensitiveFields: ["sentTo", "signerName", "signatureEnc", "evidenceEnc", "documentEnc", "documentKey", "tokenHash", "evidenceHash", "textVersion"] },
  SepaDebitRun: { owner: "sepa", category: "K1", reason: "Tahsilat dosyası (IBAN içeren XML şifreli)", sensitiveFields: ["xmlEnc", "createdByLabel"] },
  SepaDebitItem: { owner: "sepa", category: "K1", reason: "Kişi bazlı tahsilat kalemi (ad, maskeli IBAN, yetki ref.)", sensitiveFields: ["debtorName", "ibanMasked", "mandateReference", "remittance", "sourceKey", "returnReason"] },
  MeetingAttendee: { owner: "meetings", category: "K1", reason: "Katılımcı adları", sensitiveFields: [ "note"] },
  MemberDue: { owner: "members", category: "K1", reason: "Kişi bazlı aidatlar", sensitiveFields: [] },
  MemberPayment: { owner: "members", category: "K1", reason: "Kişi bazlı ödemeler", sensitiveFields: [] },
  ProgressAssessment: { owner: "progress", category: "K1", reason: "Öğrenci bazlı değerlendirmeler", sensitiveFields: [] },
  StudentGuardian: { owner: "students", category: "K1", reason: "Veli kişisel verisi", sensitiveFields: ["bic", "city", "email", "firstName", "houseNumber", "iban", "lastName", "phone", "postalCode", "state", "street"] },
  StudentGuardianLink: { owner: "students", category: "K1", reason: "Öğrenci-veli ilişkisi", sensitiveFields: [] },
  ZuwendungConfirmation: { owner: "donations", category: "K1", reason: "Bağış makbuzları (vergi)", sensitiveFields: [] },
  ZuwendungConfirmationItem: { owner: "donations", category: "K1", reason: "Bağış makbuz kalemleri", sensitiveFields: [] },
  // ── K3 ──
  Grant: { owner: "grants", category: "K3", reason: "Hibeler; yapay zekâya yalnız durum sayıları ve toplam tutar", sensitiveFields: ["reportText", "purpose", "fileNumber"] },
  GrantBudgetLine: { owner: "grants", category: "K2", reason: "Finansman planı kalemleri (kişi verisi yok)", sensitiveFields: [] },
  GrantPayout: { owner: "grants", category: "K2", reason: "Hibe ödemeleri (kişi verisi yok)", sensitiveFields: [] },
  CrmDeal: { owner: "crm", category: "K3", reason: "Fırsatlar; yapay zekâya yalnız aşama bazlı sayı/toplam", sensitiveFields: ["title"] },
  AccountingBankTransaction: { owner: "accounting", category: "K3", reason: "Banka hareketleri; yapay zekâya yalnız durum bazlı sayım/toplam", sensitiveFields: ["counterpartyName", "counterpartyIban", "purpose"] },
  AccountingBooking: { owner: "accounting", category: "K3", reason: "Muhasebe kayıtları; yapay zekâya toplamlar, metinler maskeli", sensitiveFields: ["counterparty"] },
  AccountingCashClosing: { owner: "accounting", category: "K3", reason: "Kasa kapanışları", sensitiveFields: [] },
  AccountingInvoice: { owner: "accounting", category: "K3", reason: "Faturalar; yapay zekâya yalnız sayı/toplam", sensitiveFields: ["recipientAddress", "recipientEmail", "recipientName"] },
  AccountingInvoiceLine: { owner: "accounting", category: "K3", reason: "Fatura kalemleri", sensitiveFields: [] },
  AccountingInvoicePayment: { owner: "accounting", category: "K3", reason: "Fatura ödemeleri", sensitiveFields: [] },
  AccountingJournal: { owner: "accounting", category: "K3", reason: "GoBD günlüğü; yalnız okuma", sensitiveFields: [] },
  AccountingPayable: { owner: "accounting", category: "K3", reason: "Borçlar; yapay zekâya yalnız özet", sensitiveFields: [] },
  ActionItem: { owner: "meetings", category: "K3", reason: "Toplantı görevleri; kişi alanları yok", sensitiveFields: ["assigneeLabel"] },
  AgendaItem: { owner: "meetings", category: "K3", reason: "Gündem", sensitiveFields: [] },
  CourseEnrollment: { owner: "courses", category: "K3", reason: "Kurs kayıtları; yapay zekâya yalnız sayım", sensitiveFields: ["payerLabel", "studentLabel"] },
  CustomRole: { owner: "users", category: "K3", reason: "Rol tanımları", sensitiveFields: [] },
  Document: { owner: "documents", category: "K3", reason: "Evrak; yapay zekâya konu ve karşı taraf maskeli", sensitiveFields: ["assigneeId", "assigneeLabel"] },
  DocumentFile: { owner: "documents", category: "K3", reason: "Evrak ekleri; yapay zekâ metni yalnız maskeli ve documents:read izniyle okur", sensitiveFields: ["storagePath"] },
  Donation: { owner: "donations", category: "K3", reason: "Bağışlar; yapay zekâya yalnız toplam/adet/dağılım", sensitiveFields: ["donorId", "reference", "purposeNote"] },
  Calendar: { owner: "calendar", category: "K2", reason: "Takvim adları ve renkleri; kişisel takvim sahibine bağlı", sensitiveFields: ["ownerId"], personalOwnerField: "ownerId" },
  CalendarEntry: { owner: "calendar", category: "K3", reason: "Ortak takvim kayıtları AI'ya yalnız başlık ve zaman olarak verilir (araç SHARED filtresi); kişisel takvim kayıtları AI'ya hiç verilmez", sensitiveFields: ["description", "location", "createdByLabel"] },
  CalendarSyncApp: { owner: "calendar", category: "K0", reason: "Sağlayıcı OAuth uygulaması; client secret şifreli", sensitiveFields: ["clientSecretEnc"] },
  CalendarSyncAccount: { owner: "calendar", category: "K0", reason: "Kullanıcının dış takvim erişim bilgileri (şifreli token/parola)", sensitiveFields: ["credentialsEnc", "stateHash", "accountLabel"], personalOwnerField: "userId" },
  CalendarSyncCalendar: { owner: "calendar", category: "K1", reason: "Kullanıcının dış takvim adları", sensitiveFields: ["name"] },
  CalendarSyncEvent: { owner: "calendar", category: "K1", reason: "Dış takvimden alınan kişisel randevular; yalnız sahibi görür", sensitiveFields: ["title", "description", "location"] },
  SecretaryPreference: { owner: "secretary", category: "K1", reason: "Kullanıcının özet saati, sessiz saatler ve kanal tercihleri", sensitiveFields: [], personalOwnerField: "userId" },
  SecretaryItemState: { owner: "secretary", category: "K1", reason: "Kullanıcının özet öğelerini kapatma/erteleme durumu (yalnız öğe kimliği)", sensitiveFields: [], personalOwnerField: "userId" },
  SecretaryProposal: { owner: "secretary", category: "K1", reason: "Sekreter önerisi; içerik ve önizleme şifreli", sensitiveFields: ["payloadEnc", "previewEnc", "preconditionsEnc"], personalOwnerField: "userId" },
  SecretaryFollowUp: { owner: "secretary", category: "K1", reason: "Kullanıcının takip kayıtları; başlık şifreli, kaynak yalnız uygulama içi yol", sensitiveFields: ["titleEnc"], personalOwnerField: "userId" },
  Notification: { owner: "notifications", category: "K1", reason: "Kullanıcı bildirimi; parametreler şifreli, metin okunurken üretilir; 90 gün saklanır", sensitiveFields: ["paramsEnc"], personalOwnerField: "userId" },
  NotificationPreference: { owner: "notifications", category: "K1", reason: "Bildirim türü × kanal tercihi", sensitiveFields: [], personalOwnerField: "userId" },
  NotificationSettings: { owner: "notifications", category: "K1", reason: "Sessiz saat ve özet modu", sensitiveFields: [], personalOwnerField: "userId" },
  NotificationChannelConfig: { owner: "notifications", category: "K0", reason: "Kanal sağlayıcı sırları (bot token, API anahtarı, VAPID özel anahtarı; şifreli)", sensitiveFields: ["secretsEnc"] },
  NotificationDelivery: { owner: "notifications", category: "K1", reason: "Dış kanal teslim kaydı (içerik/adres yok)", sensitiveFields: [], personalOwnerField: "userId" },
  NotificationChannelLink: { owner: "notifications", category: "K1", reason: "Kullanıcının dış kanal bağı (ör. Telegram sohbeti); adres şifreli, belirteç yalnız hash", sensitiveFields: ["addressEnc", "addressHash", "linkTokenHash"], personalOwnerField: "userId" },
  NotificationPushSubscription: { owner: "notifications", category: "K1", reason: "Tarayıcı push aboneliği; uç nokta ve anahtarlar şifreli", sensitiveFields: ["endpointEnc", "keysEnc", "endpointHash"], personalOwnerField: "userId" },
  SecretaryDelegation: { owner: "secretary", category: "K1", reason: "Vekil yetkisi: sahibi, vekil, kapsam, süre sonu (içerik yok)", sensitiveFields: [], personalOwnerField: "grantorId" },
  SecretaryChannelConsent: { owner: "secretary", category: "K1", reason: "Kullanıcının dış kanal rızası; adres şifreli, doğrulama kodu yalnız hash", sensitiveFields: ["addressEnc", "codeHash"], personalOwnerField: "userId" },
  SecretaryChannelDelivery: { owner: "secretary", category: "K1", reason: "Dış kanal teslim kaydı (içerik/adres yok; yalnız gün, durum, sağlayıcı kimliği)", sensitiveFields: [], personalOwnerField: "userId" },
  CalendarFeedToken: { owner: "calendar", category: "K0", reason: "ICS abonelik sırrı (yalnız hash)", sensitiveFields: ["tokenHash"], personalOwnerField: "userId" },
  Meeting: { owner: "meetings", category: "K3", reason: "Toplantılar; kişi adları yok", sensitiveFields: ["createdByLabel", "approvedByLabel"] },
  MeetingDecision: { owner: "meetings", category: "K3", reason: "Kararlar", sensitiveFields: [] },
  Member: { owner: "members", category: "K3", reason: "Üye kişisel verisi; yapay zekâya yalnız sayım/dağılım", sensitiveFields: ["firstName", "lastName", "email", "phone", "street", "houseNumber", "postalCode", "city", "birthDate", "kimlikNo", "notes", "sepaIban", "sepaBic", "sepaAccountHolder", "sepaMandateReference"] },
  ProgressAttendance: { owner: "progress", category: "K3", reason: "Öğrenci bazlı yoklama; yapay zekâya yalnız oranlar", sensitiveFields: [] },
  ProgressGrade: { owner: "progress", category: "K3", reason: "Öğrenci notları; yapay zekâya yalnız ortalama", sensitiveFields: [] },
  RoleGrant: { owner: "users", category: "K3", reason: "Yetki tanımları", sensitiveFields: [] },
  Student: { owner: "students", category: "K3", reason: "Reşit olmayanlar; yapay zekâya yalnız sayım", sensitiveFields: ["firstName", "lastName", "birthDate", "email", "phone"] },
  Task: { owner: "tasks", category: "K3", reason: "Görevler; başlık maskeli, kişi alanları yok", sensitiveFields: ["memberName", "memberId", "createdByLabel", "completedByLabel"] },
  // ── K2 ──
  AccountingAccount: { owner: "accounting", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  AccountingAsset: { owner: "accounting", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  AccountingBankRule: { owner: "accounting", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  AccountingBudgetLine: { owner: "accounting", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  AccountingCategory: { owner: "accounting", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  AccountingCounter: { owner: "accounting", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  AccountingFlatRate: { owner: "accounting", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  AccountingInvoiceCounter: { owner: "accounting", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  AccountingInvoiceSettings: { owner: "accounting", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  AccountingProject: { owner: "accounting", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  AccountingReserve: { owner: "accounting", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  AccountingSettings: { owner: "accounting", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  AccountingYear: { owner: "accounting", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  AiExportRequest:{owner:"ai",category:"K1",reason:"Server-only export job",sensitiveFields:[],personalOwnerField:"userId"},
  AiReferenceScope: {owner:"ai",category:"K0",reason:"Server-only reference scope",sensitiveFields:[],personalOwnerField:"userId"},
  AiEntityReference: {owner:"ai",category:"K0",reason:"Server-only identity mapping; cascades with scope",sensitiveFields:[]},
  AiDataset: {owner:"ai",category:"K1",reason:"Encrypted server-side selection; never model-visible",sensitiveFields:[]},
  AiProposal: {owner:"ai",category:"K0",reason:"Encrypted server-owned confirmation payload",sensitiveFields:[],personalOwnerField:"userId"},
  AiTurnClaim: {owner:"ai",category:"K0",reason:"Server-side request claims",sensitiveFields:[],personalOwnerField:"userId"},
  AiUsageBucket: {owner:"ai",category:"K1",reason:"Rate usage counters; no content",sensitiveFields:[]},
  AiReport: { owner: "ai", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [], personalOwnerField: "userId" },
  AiSettings: { owner: "ai", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  AutomationSchedule: { owner: "automation", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  AutomationWorkflow: { owner: "automation", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  AutomationWorkflowVersion: { owner: "automation", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [], directAccess: ["shared"] },
  Course: { owner: "courses", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  CourseSession: { owner: "courses", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  CoursesCounter: { owner: "courses", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  CoursesSettings: { owner: "courses", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  DemoRecord: { owner: "demo", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  DocumentCategory: { owner: "documents", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  DocumentCounter: { owner: "documents", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  DonationsCounter: { owner: "donations", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  DonationsSettings: { owner: "donations", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  Event: { owner: "events", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  InventoryItem: { owner: "inventory", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  MeetingCounter: { owner: "meetings", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  MemberCounter: { owner: "members", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  MemberPaymentCounter: { owner: "members", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  MembershipTypeConfig: { owner: "members", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  OrganizationProfile: { owner: "organization", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  StudentsCounter: { owner: "students", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  StudentsSettings: { owner: "students", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  SystemDashboardLayout: { owner: "system", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [], personalOwnerField: "userId" },
  SystemModulePackage: { owner: "system", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
  SystemModuleState: { owner: "system", category: "K2", reason: "Kişi içermeyen kurumsal/yapılandırma verisi", sensitiveFields: [] },
} as const satisfies Record<string, TablePolicy>;

export type PolicyTable = keyof typeof DATA_POLICY;

export type AiToolPolicy = {
  module: string;
  /** Aracın okuduğu tablolar (yalnız K2/K3). Yazma araçları yalnız onay kartı önerir. */
  reads: readonly PolicyTable[];
  /** Owner-service processing only; these columns never become model results. */
  serverReads?:readonly PolicyTable[];
  modelFields?:readonly string[];
};

/** Her yapay zekâ aracı okuduğu tabloları beyan eder; beyansız araç testi düşürür. */
/**
 * `userId`/`ownerId` taşıyan ama kullanıcı silinince SİLİNMEYEN tablolar ve gerekçesi. Yeni bir tablo bu
 * alanlardan birini taşıyorsa ya `personalOwnerField` (silinir) ya da buraya kayıt (kalır) gerekir.
 */
export const USER_LINK_RETAINED: Record<string, string> = {
  AuditLog: "Denetim izi; yasal ispat yükümlülüğü (GoBD, KVKK md. 12). Ad/e-posta silme anında kaydedilir.",
  CourseTeacher: "Öğretmen kaydı kurumsal; kullanıcı bağlantısı yalnız giriş eşleştirmesi, ödeme geçmişi saklanır.",
  CrmParty: "Sorumlu (ownerId) yumuşak referans; ilişki kaydı derneğe aittir, kullanıcı silinince sorumlu boşaltılır.",
  CrmDeal: "Sorumlu (ownerId) yumuşak referans; fırsat derneğe aittir, kullanıcı silinince sorumlu boşaltılır.",
  MeetingAttendee: "Toplantı tutanağının parçası; katılımcı adı tutanakta korunur.",
};

export const AI_TOOL_POLICY = {
  create_dataset:{module:"members",reads:[],serverReads:["Member","MemberDue","MemberPayment"],modelFields:["datasetRef","count"]},
  export_dataset:{module:"exports",reads:[],serverReads:[],modelFields:["status","note"]},
  query_dataset:{module:"members",reads:[],serverReads:["Member","MemberDue","MemberPayment"],modelFields:["datasetRef","count"]},
  create_dues_dataset:{module:"members",reads:[],serverReads:["Member","MemberDue","MemberPayment"],modelFields:["datasetRef","count"]},
  // Takma adlı kişi düzeyi (docs/architecture/ai-cloud-pseudonym-relay.md): ad/numara yok, yalnız [[Kn]] + kaba alanlar.
  list_dues_by_person:{module:"members",reads:[],serverReads:["Member","MemberDue","MemberPayment"],modelFields:["year","total","page","hasMore","rows","rows.person","rows.remainingEur","rows.membershipType","rows.dueMonth","rows.status"]},
  get_member_profile:{module:"members",reads:[],serverReads:["Member","MemberDue","MemberPayment"],modelFields:["matches", "truncated", "people", "people.person", "people.status", "people.membershipType", "people.memberSinceYear", "people.exitYear", "people.dues", "people.dues.year", "people.dues.status", "people.dues.remainingEur", "people.dues.overdue", "people.overdueEur"]},
  propose_dataset_export:{module:"exports",reads:[],serverReads:[],modelFields:["status","note"]},
  // accounting
  get_accounting_summary: { module: "accounting", reads: ["AccountingBooking", "AccountingAccount", "AccountingYear", "AccountingCategory"], serverReads: ["AccountingBooking", "AccountingAccount", "AccountingYear", "AccountingCategory"], modelFields: ["year", "categories", "categories.category", "categories.sphere", "categories.direction", "categories.actualEur", "categories.planEur", "categories.previousYearEur", "economicOperationNotice", "grossTotals", "grossTotals.incomeEur", "grossTotals.expenseEur", "grossTotals.netEur", "uncategorized", "uncategorized.incomeEur", "uncategorized.expenseEur", "accounts", "accounts.account", "accounts.type", "accounts.balanceEur"] },
  get_vat_summary: { module: "accounting", reads: ["AccountingBooking", "AccountingSettings"], serverReads: ["AccountingBooking", "AccountingSettings"], modelFields: ["year", "chartOfAccounts", "smallBusiness", "taxMethod", "periods", "periods.period", "periods.kz81BaseEur", "periods.kz86BaseEur", "periods.kz66Eur", "periods.kz83Eur", "euer", "euer.incomeNetEur", "euer.outputTaxEur", "euer.expenseNetEur", "euer.inputTaxEur", "euer.resultEur", "page"] },
  get_open_items_summary: { module: "accounting", reads: ["AccountingInvoice", "AccountingInvoicePayment"], serverReads: ["AccountingInvoice", "AccountingInvoicePayment"], modelFields: ["buckets", "buckets.bucket", "buckets.count", "buckets.openEur", "totalOpenEur", "page"] },
  get_bank_inbox_summary: { module: "accounting", reads: ["AccountingBankTransaction"], serverReads: ["AccountingBankTransaction"], modelFields: ["statuses", "statuses.status", "statuses.count", "statuses.sumEur", "page"] },
  get_payables_summary: { module: "accounting", reads: ["AccountingPayable"], serverReads: ["AccountingPayable"], modelFields: ["statuses", "statuses.status", "statuses.count", "statuses.grossEur", "openEur", "overdueCount", "page"] },
  get_report_link: { module: "accounting", reads: [], serverReads: [], modelFields: ["url", "note"] },
  // grants
  get_grant_overview: {"module":"grants","reads":[],"serverReads":["Grant"],"modelFields":["byStatus.PLANNED","byStatus.APPLIED","byStatus.APPROVED","byStatus.ACTIVE","byStatus.REPORTED","byStatus.CLOSED","byStatus.REJECTED","approvedTotal","reportsOverdue","reportsDueIn30Days"]},
  // crm
  get_crm_pipeline: {"module":"crm","reads":[],"serverReads":["CrmDeal"],"modelFields":["deals.OPEN.count","deals.OPEN.amount","deals.PROPOSAL.count","deals.PROPOSAL.amount","deals.WON.count","deals.WON.amount","deals.LOST.count","deals.LOST.amount"]},
  // courses
  list_courses: { module: "courses", reads: ["Course", "CourseEnrollment", "CourseSession"], serverReads: ["Course", "CourseEnrollment", "CourseSession"], modelFields: ["page", "pageSize", "total", "hasMore", "nextCursor", "completeness", "items", "items.id", "items.course", "items.status"] },
  get_course_statistics: { module: "courses", reads: ["Course", "CourseEnrollment", "CourseSession"], serverReads: ["Course", "CourseEnrollment", "CourseSession"], modelFields: ["courses", "courses.planned", "courses.active", "courses.completed", "courses.cancelled", "courseList", "courseList.id", "courseList.code", "courseList.title", "courseList.kind", "courseList.status", "courseList.startDate", "courseList.enrollments", "courseList.teachers", "courseListPageInfo", "courseListPageInfo.page", "courseListPageInfo.pageSize", "courseListPageInfo.total", "courseListPageInfo.hasMore", "courseListPageInfo.nextCursor", "courseListPageInfo.completeness", "activeEnrollments", "upcomingSessions", "charges", "charges.openEur", "charges.paidEur", "charges.openCount"] },
  propose_course: {"module": "courses", "reads": [], "serverReads": [], "modelFields": ["status", "note"]},
  propose_course_status: {"module": "courses", "reads": [], "serverReads": ["Course"], "modelFields": ["status", "note"]},
  propose_delete_course: {"module": "courses", "reads": [], "serverReads": ["Course"], "modelFields": ["status", "note"]},
  // documents
  get_document_statistics: { module: "documents", reads: ["Document", "DocumentCategory"], serverReads: ["Document", "DocumentCategory"], modelFields: ["open", "inProgress", "overdue", "incomingThisMonth", "outgoingThisMonth"] },
  list_documents: { module: "documents", reads: ["Document", "DocumentCategory"], serverReads: ["Document", "DocumentCategory"], modelFields: ["page", "pageSize", "total", "hasMore", "nextCursor", "completeness", "documents", "documents.id", "documents.registryNumber", "documents.direction", "documents.documentDate", "documents.counterparty", "documents.subject", "documents.status", "documents.dueDate", "documents.overdue", "documents.category", "documents.fileCount"] },
  get_document: { module: "documents", reads: ["Document", "DocumentCategory", "DocumentFile"], serverReads: ["Document", "DocumentCategory", "DocumentFile"], modelFields: ["status", "id", "registryNumber", "direction", "documentDate", "counterparty", "referenceNumber", "subject", "summary", "dueDate", "category", "replyTo", "replyTo.registryNumber", "replyTo.subject", "files", "files.id", "files.name", "files.mimeType"] },
  read_document_file: { module: "documents", reads: ["DocumentFile"], serverReads: ["DocumentFile"], modelFields: ["status", "name", "mimeType", "text", "truncated", "unavailableReason"] },
  propose_document: {"module": "documents", "reads": [], "serverReads": [], "modelFields": ["status", "note"]},
  propose_document_status: {"module": "documents", "reads": [], "serverReads": ["Document"], "modelFields": ["status", "note"]},
  propose_delete_document: {"module": "documents", "reads": [], "serverReads": ["Document"], "modelFields": ["status", "note"]},
  // donations
  get_donation_statistics: {"module": "donations", "reads": [], "serverReads": ["Donation"], "modelFields": ["year", "totalEur", "count", "unconfirmedOver300", "confirmationsIssued", "confirmationWarnings"]},
  // events
  list_upcoming_events: { module: "events", reads: ["Event"], serverReads: ["Event"], modelFields: ["page", "pageSize", "total", "hasMore", "nextCursor", "completeness", "items", "items.title", "items.type", "items.status", "items.start", "items.end", "items.location", "items.registered", "items.capacity"] },
  propose_event: {"module": "events", "reads": [], "serverReads": [], "modelFields": ["status", "note"]},
  // exports
  create_file: { module: "exports", reads: [], serverReads: [], modelFields: ["status", "format", "note"] },
  // inventory
  get_inventory_overview: { module: "inventory", reads: ["InventoryItem"], serverReads: ["InventoryItem"], modelFields: ["totals", "totals.itemCount", "totals.totalQuantity", "totals.inUseQuantity", "totals.brokenQuantity", "byCategory", "byCategory.category", "byCategory.itemCount", "byCategory.totalQuantity"] },
  list_inventory_items: { module: "inventory", reads: ["InventoryItem"], serverReads: ["InventoryItem"], modelFields: ["page", "pageSize", "total", "hasMore", "nextCursor", "completeness", "items", "items.id", "items.name", "items.category", "items.status", "items.quantity", "items.location", "items.purchaseDate", "items.purchasePriceEur"] },
  propose_inventory_item: {"module": "inventory", "reads": [], "serverReads": [], "modelFields": ["status", "note"]},
  propose_inventory_status: {"module": "inventory", "reads": [], "serverReads": [], "modelFields": ["status", "note"]},
  propose_delete_inventory_item: {"module": "inventory", "reads": [], "serverReads": [], "modelFields": ["status", "note"]},
  // meetings
  get_meeting_statistics: { module: "meetings", reads: ["Meeting"], serverReads: ["Meeting"], modelFields: ["plannedCount", "draftMinutesCount", "openActionItems", "overdueActionItems", "nextMeeting", "nextMeeting.number", "nextMeeting.title", "nextMeeting.date"] },
  list_meetings: { module: "meetings", reads: ["Meeting"], serverReads: ["Meeting"], modelFields: ["page", "pageSize", "total", "hasMore", "nextCursor", "completeness", "items", "items.id", "items.number", "items.type", "items.title", "items.date", "items.startTime", "items.location", "items.status", "items.decisions", "items.openActionItems"] },
  list_shared_calendars: { module: "calendar", reads: ["Calendar"], serverReads: ["Calendar"], modelFields: ["page", "pageSize", "total", "hasMore", "nextCursor", "completeness", "items", "items.id", "items.name"] },
  list_shared_calendar_entries: { module: "calendar", reads: ["Calendar", "CalendarEntry"], serverReads: ["Calendar", "CalendarEntry"], modelFields: ["page", "pageSize", "total", "hasMore", "nextCursor", "completeness", "status", "items", "items.calendar", "items.title", "items.start", "items.end", "items.allDay"] },
  propose_calendar_entry: {"module": "calendar", "reads": [], "serverReads": ["Calendar"], "modelFields": ["status", "note"]},
  get_campaign_statistics: { module: "mailings", reads: ["MailingCampaign"], serverReads: ["MailingCampaign"], modelFields: ["perStatus", "perStatus.DRAFT", "perStatus.SCHEDULED", "perStatus.SENDING", "perStatus.DONE", "perStatus.FAILED", "perStatus.CANCELLED", "last30Days", "last30Days.campaigns", "last30Days.sent", "last30Days.failed"] },
  list_campaigns: { module: "mailings", reads: ["MailingCampaign"], serverReads: ["MailingCampaign"], modelFields: ["page", "pageSize", "total", "hasMore", "nextCursor", "completeness", "items", "items.id", "items.name", "items.subject", "items.channel", "items.status", "items.recipientCount", "items.sentCount", "items.failedCount", "items.createdAt", "items.scheduledAt"] },
  list_campaign_audiences: { module: "mailings", reads: [], serverReads: [], modelFields: ["audiences", "audiences.id", "audiences.placeholders", "channels"] },
  propose_campaign_draft: {"module": "mailings", "reads": [], "serverReads": [], "modelFields": ["status", "note"]},
  get_meeting: { module: "meetings", reads: ["Meeting", "AgendaItem", "MeetingDecision"], serverReads: ["Meeting", "AgendaItem", "MeetingDecision"], modelFields: ["status", "number", "type", "title", "date", "attendeeCount", "agenda", "agenda.position", "agenda.title", "agenda.description", "agenda.discussion", "decisions", "decisions.number", "decisions.text", "decisions.result", "decisions.agendaItem", "decisions.votesFor", "decisions.votesAgainst", "decisions.votesAbstain"] },
  propose_meeting: {"module": "meetings", "reads": [], "serverReads": [], "modelFields": ["status", "note"]},
  propose_meeting_status: {"module": "meetings", "reads": [], "serverReads": ["Meeting"], "modelFields": ["status", "note"]},
  propose_delete_meeting: {"module": "meetings", "reads": [], "serverReads": ["Meeting"], "modelFields": ["status", "note"]},
  // members
  get_member_statistics: {"module":"members","reads":[],"serverReads":["Member","MemberDue","MemberPayment"],"modelFields":["members.active","members.passive","members.resigned","members.newThisMonth","members.byType.type","members.byType.count","dues.year","dues.expectedEur","dues.collectedEur","dues.remainingEur","dues.collectionRatePercent","dues.openCount","dues.partialCount","dues.paidCount","dues.overdueCount"]},
  // organization
  get_organization_info: { module: "organization", reads: ["OrganizationProfile"], serverReads: ["OrganizationProfile"], modelFields: ["name", "address", "email", "phone", "website", "registerCourt", "registerNumber", "charitablePurposes", "membershipFeesDeductible"] },
  // progress
  get_progress_statistics: {"module": "progress", "reads": [], "serverReads": ["ProgressAttendance", "ProgressAssessment"], "modelFields": ["days", "attendance.present", "attendance.late", "attendance.absent", "attendance.excused", "attendance.ratePercent", "assessments"]},
  // students
  get_student_statistics: {"module": "students", "reads": [], "serverReads": ["Student", "StudentGuardian"], "modelFields": ["active", "inactive", "guardians", "withSepaMandate"]},
  // tasks
  list_open_tasks: { module: "tasks", reads: ["Task"], serverReads: ["Task"], modelFields: ["page", "pageSize", "total", "hasMore", "nextCursor", "completeness", "scope", "assignmentIdentity", "items", "items.id", "items.title", "items.status", "items.priority", "items.dueDate", "items.overdue"] },
  propose_task: {"module": "tasks", "reads": [], "serverReads": [], "modelFields": ["status", "note"]},
  propose_complete_task: {"module": "tasks", "reads": [], "serverReads": ["Task"], "modelFields": ["status", "note"]},
  propose_delete_task: {"module": "tasks", "reads": [], "serverReads": ["Task"], "modelFields": ["status", "note"]},
} as const satisfies Record<string, AiToolPolicy>;
