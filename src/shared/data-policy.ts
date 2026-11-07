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
  GeneratedFile: { owner: "exports", category: "K1", reason: "Oluşturulan dosyalar (kişisel veri içerebilir)", sensitiveFields: [], personalOwnerField: "ownerId" },
  MailLog: { owner: "mail", category: "K1", reason: "Alıcı adresleri", sensitiveFields: ["toAddress", "toName"] },
  MailingChannelConfig: { owner: "mailings", category: "K0", reason: "Kanal sağlayıcı anahtarları (şifreli)", sensitiveFields: ["secretsEnc"] },
  MailingDelivery: { owner: "mailings", category: "K1", reason: "Gönderim kaydı: telefon / sohbet kimliği", sensitiveFields: ["address"] },
  CampaignTelegramLink: { owner: "campaign-telegram", category: "K1", reason: "Telegram aboneliği: sohbet kimliği ve davet belirteci", sensitiveFields: ["chatId", "token", "recipientKey"] },
  MailingCampaign: { owner: "mailings", category: "K3", reason: "Kampanya özeti AI'ya yalnız ad, konu, kanal, durum ve sayılar olarak verilir; gövde, filtre ve oluşturan adı verilmez", sensitiveFields: ["body", "bodyHtml", "filter", "createdByLabel"] },
  MailingSegment: { owner: "mailings", category: "K1", reason: "Alıcı filtreleri", sensitiveFields: [] },
  MeetingAttendee: { owner: "meetings", category: "K1", reason: "Katılımcı adları", sensitiveFields: [ "note"] },
  MemberDue: { owner: "members", category: "K1", reason: "Kişi bazlı aidatlar", sensitiveFields: [] },
  MemberPayment: { owner: "members", category: "K1", reason: "Kişi bazlı ödemeler", sensitiveFields: [] },
  ProgressAssessment: { owner: "progress", category: "K1", reason: "Öğrenci bazlı değerlendirmeler", sensitiveFields: [] },
  StudentGuardian: { owner: "students", category: "K1", reason: "Veli kişisel verisi", sensitiveFields: ["bic", "city", "email", "firstName", "houseNumber", "iban", "lastName", "phone", "postalCode", "street"] },
  StudentGuardianLink: { owner: "students", category: "K1", reason: "Öğrenci-veli ilişkisi", sensitiveFields: [] },
  ZuwendungConfirmation: { owner: "donations", category: "K1", reason: "Bağış makbuzları (vergi)", sensitiveFields: [] },
  ZuwendungConfirmationItem: { owner: "donations", category: "K1", reason: "Bağış makbuz kalemleri", sensitiveFields: [] },
  // ── K3 ──
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
  CalendarFeedToken: { owner: "calendar", category: "K0", reason: "ICS abonelik sırrı (yalnız hash)", sensitiveFields: ["tokenHash"], personalOwnerField: "userId" },
  Meeting: { owner: "meetings", category: "K3", reason: "Toplantılar; kişi adları yok", sensitiveFields: ["createdByLabel", "approvedByLabel"] },
  MeetingDecision: { owner: "meetings", category: "K3", reason: "Kararlar", sensitiveFields: [] },
  Member: { owner: "members", category: "K3", reason: "Üye kişisel verisi; yapay zekâya yalnız sayım/dağılım", sensitiveFields: ["firstName", "lastName", "email", "phone", "street", "houseNumber", "postalCode", "city", "birthDate", "kimlikNo", "notes"] },
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
};

/** Her yapay zekâ aracı okuduğu tabloları beyan eder; beyansız araç testi düşürür. */
/**
 * `userId`/`ownerId` taşıyan ama kullanıcı silinince SİLİNMEYEN tablolar ve gerekçesi. Yeni bir tablo bu
 * alanlardan birini taşıyorsa ya `personalOwnerField` (silinir) ya da buraya kayıt (kalır) gerekir.
 */
export const USER_LINK_RETAINED: Record<string, string> = {
  AuditLog: "Denetim izi; yasal ispat yükümlülüğü (GoBD, KVKK md. 12). Ad/e-posta silme anında kaydedilir.",
  CourseTeacher: "Öğretmen kaydı kurumsal; kullanıcı bağlantısı yalnız giriş eşleştirmesi, ödeme geçmişi saklanır.",
  MeetingAttendee: "Toplantı tutanağının parçası; katılımcı adı tutanakta korunur.",
};

export const AI_TOOL_POLICY = {
  // accounting
  get_accounting_summary: { module: "accounting", reads: ["AccountingBooking", "AccountingAccount", "AccountingYear", "AccountingCategory"] },
  get_vat_summary: { module: "accounting", reads: ["AccountingBooking", "AccountingSettings"] },
  get_open_items_summary: { module: "accounting", reads: ["AccountingInvoice", "AccountingInvoicePayment"] },
  get_bank_inbox_summary: { module: "accounting", reads: ["AccountingBankTransaction"] },
  get_payables_summary: { module: "accounting", reads: ["AccountingPayable"] },
  get_report_link: { module: "accounting", reads: [] },
  // courses
  list_courses: { module: "courses", reads: ["Course", "CourseEnrollment", "CourseSession"] },
  get_course_statistics: { module: "courses", reads: ["Course", "CourseEnrollment", "CourseSession"] },
  propose_course: { module: "courses", reads: [] },
  propose_course_status: { module: "courses", reads: ["Course"] },
  propose_delete_course: { module: "courses", reads: ["Course"] },
  // documents
  get_document_statistics: { module: "documents", reads: ["Document", "DocumentCategory"] },
  list_documents: { module: "documents", reads: ["Document", "DocumentCategory"] },
  get_document: { module: "documents", reads: ["Document", "DocumentCategory", "DocumentFile"] },
  read_document_file: { module: "documents", reads: ["DocumentFile"] },
  propose_document: { module: "documents", reads: [] },
  propose_document_status: { module: "documents", reads: ["Document"] },
  propose_delete_document: { module: "documents", reads: ["Document"] },
  // donations
  get_donation_statistics: { module: "donations", reads: ["Donation"] },
  // events
  list_upcoming_events: { module: "events", reads: ["Event"] },
  propose_event: { module: "events", reads: [] },
  // exports
  create_file: { module: "exports", reads: [] },
  // inventory
  get_inventory_overview: { module: "inventory", reads: ["InventoryItem"] },
  list_inventory_items: { module: "inventory", reads: ["InventoryItem"] },
  propose_inventory_item: { module: "inventory", reads: [] },
  propose_inventory_status: { module: "inventory", reads: ["InventoryItem"] },
  propose_delete_inventory_item: { module: "inventory", reads: ["InventoryItem"] },
  // meetings
  get_meeting_statistics: { module: "meetings", reads: ["Meeting"] },
  list_meetings: { module: "meetings", reads: ["Meeting"] },
  list_shared_calendars: { module: "calendar", reads: ["Calendar"] },
  list_shared_calendar_entries: { module: "calendar", reads: ["Calendar", "CalendarEntry"] },
  propose_calendar_entry: { module: "calendar", reads: ["Calendar"] },
  get_campaign_statistics: { module: "mailings", reads: ["MailingCampaign"] },
  list_campaigns: { module: "mailings", reads: ["MailingCampaign"] },
  list_campaign_audiences: { module: "mailings", reads: [] },
  propose_campaign_draft: { module: "mailings", reads: [] },
  get_meeting: { module: "meetings", reads: ["Meeting", "AgendaItem", "MeetingDecision"] },
  propose_meeting: { module: "meetings", reads: [] },
  propose_meeting_status: { module: "meetings", reads: ["Meeting"] },
  propose_delete_meeting: { module: "meetings", reads: ["Meeting"] },
  // members
  get_member_statistics: { module: "members", reads: ["Member", "MembershipTypeConfig"] },
  // organization
  get_organization_info: { module: "organization", reads: ["OrganizationProfile"] },
  // progress
  get_progress_statistics: { module: "progress", reads: ["ProgressAttendance", "ProgressGrade"] },
  // students
  get_student_statistics: { module: "students", reads: ["Student"] },
  // tasks
  list_open_tasks: { module: "tasks", reads: ["Task"] },
  propose_task: { module: "tasks", reads: [] },
  propose_complete_task: { module: "tasks", reads: ["Task"] },
  propose_delete_task: { module: "tasks", reads: ["Task"] },
} as const satisfies Record<string, AiToolPolicy>;
