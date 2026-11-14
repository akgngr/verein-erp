# Modül AI sözleşmesi v2 — onay taslağı

Durum: Kullanıcı onayıyla PR #143 içinde incelemeye sunulmuştur; uygulamaya bağlanmamıştır.
Temel: main / 4bc9fdc16f9d9a01ff6d631cc2946319b746c26e.

## Amaç ve kapsam

Mevcut modüler araç mimarisi korunur. GraphQL bağımlılığı eklenmez. Asistanın filtreleme,
ilişkilendirme ve iş akışı yetenekleri genişletilirken erişim denetimi ve verinin modele
aktarılması birbirinden ayrılır. Bu belge bir sözleşme ve uygulama planıdır; aşağıdaki
TypeScript tanımları tek başına güvenlik kontrollerini gerçekleştirmez.

Mevcut sistem tek dernek kurulumu gibi davranmaktadır. Bu taslak çok kiracılı SaaS izolasyonu
sağladığını iddia etmez. Çok kiracılı kullanım için veri modelleri, tüm sorgular, depolama,
önbellekler ve worker işleri ayrıca tenant kapsamına alınmalıdır. İstemciden veya modelden
gelen organizationId hiçbir zaman erişim kapsamının kaynağı olamaz.

## Mevcut sözleşme — değiştirilmemiş kaynak

Kaynak: src/shared/ai/define.ts. Yardımcılar dahil tam kopyadır.

```typescript
import type { Role } from "@/shared/roles";
import { z } from "zod";

/**
 * MODÜL AI STANDARDI — her modül, asistanın kendisiyle neler yapabileceğini KENDİ klasöründeki
 * `ai.ts` dosyasında `defineModuleAi` ile bildirir. `pnpm module:sync` bu dosyaları bulup
 * `src/ai-registry.ts`'i üretir; AI modülü araçları ve önerileri yalnızca oradan toplar.
 *
 * Güvenlik kapıları (AI modülü uygular, modül yazarı ayrıca bir şey yapmaz):
 *  1. Yöneticinin izin matrisi: modül + işlem (read/create/update/delete) açık olmalı.
 *  2. Modül kurulu/etkin olmalı.
 *  3. `allowed(user)` — kullanıcının kendi rol yetkisi.
 *  4. Yazma işlemleri ASLA doğrudan yapılmaz: araç `propose` ile bir onay kartı üretir;
 *     kullanıcı onaylayınca `actions[action].execute` çalışır (matris yeniden denetlenir,
 *     payload şemayla yeniden doğrulanır, modül eylemi kullanıcının yetkisini yine denetler).
 *
 * KVKK/DSGVO: araçlar kişi adı, iletişim, adres, banka veya kimlik verisi DÖNDÜRMEZ.
 */
export const AI_OPERATIONS = ["read", "create", "update", "delete"] as const;
export type AiOperation = (typeof AI_OPERATIONS)[number];

export type AiUser = { id: string; name: string; email: string; role: Role };
export type JsonSchema = Record<string, unknown>;

/** Onay kartı: `details` kartta gösterilen kısa satırlardır (kişisel veri içermemeli). */
export type ModuleAiProposalInput = { action: string; title: string; details?: string[]; payload: unknown };

export type ModuleAiContext = {
  user: AiUser;
  /** Bir onay kartı önerir; hiçbir veri değişmez. */
  propose: (proposal: ModuleAiProposalInput) => void;
  /** Model girdisindeki maskeleri ([PERSON_1] …) gerçek değerlere çevirir (yalnızca sunucuda kullanın). */
  restore: (text: string) => string;
  /** Oluşturulan dosyayı yanıtın altında indirme düğmesi olarak gösterir (bağlantı modele verilmez). */
  attachFile: (file: { title: string; url: string; format: string }) => void;
};

export type ModuleAiTool<S extends z.ZodType = z.ZodType> = {
  /** Modele görünen ad; tüm modüllerde benzersiz olmalı (snake_case). */
  name: string;
  operation: AiOperation;
  /** Modele yönelik açıklama (İngilizce). */
  description: string;
  schema: S;
  inputSchema: JsonSchema;
  allowed: (user: AiUser) => boolean;
  run: (input: z.infer<S>, context: ModuleAiContext) => Promise<unknown>;
};

export type ModuleAiActionResult = { ok: boolean; error?: string };

export type ModuleAiAction<S extends z.ZodType = z.ZodType> = {
  operation: AiOperation;
  /** Onay sonrası payload bu şemayla yeniden doğrulanır. */
  schema: S;
  execute: (payload: z.infer<S>) => Promise<ModuleAiActionResult>;
};

export type ModuleAi = {
  module: string;
  tools: ModuleAiTool[];
  actions: Record<string, ModuleAiAction>;
};

/** Tip çıkarımı için yardımcılar. */
export const aiTool = <S extends z.ZodType>(tool: ModuleAiTool<S>) => tool as unknown as ModuleAiTool;
export const aiAction = <S extends z.ZodType>(action: ModuleAiAction<S>) => action as unknown as ModuleAiAction;
export const defineModuleAi = (definition: ModuleAi): ModuleAi => definition;

/** Yaygın not: öneri yapıldıktan sonra modele dönen sonuç. */
export const PROPOSED = { status: "proposed", note: "A confirmation card was shown to the user; nothing changes until they confirm." } as const; // i18n-ignore (model-facing tool text)

/** Ortak girdi şemaları ve yardımcılar (modül ai.ts dosyaları için). */
export const NO_INPUT: JsonSchema = { type: "object", properties: {}, required: [], additionalProperties: false };
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const isoDay = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : null);
export const euros = (cents: number) => Math.round(cents) / 100;
export const YEAR_INPUT: JsonSchema = {
  type: "object",
  properties: { year: { type: "integer", description: "Fiscal year, e.g. 2026" } }, // i18n-ignore (model-facing tool text)
  required: ["year"],
  additionalProperties: false,
};
export const yearSchema = z.object({ year: z.number().int().min(2000).max(2100) });
```

## Mevcut davranış ile yeni sözleşme arasındaki farklar

| Alan | Mevcut | Önerilen v2 |
| --- | --- | --- |
| Araç kaydı | Modül ai.ts + üretilen registry | Korunur; contractVersion: 2 eklenir |
| Yetki | Araç seçilirken allowed(user) | Her çağrıda güncel rol, modül ve AI matrisi + kayıt kapsamı |
| Şema | Zod + elle yazılmış JSON Schema | Tek kaynak Zod; sağlayıcı şeması bundan türetilir |
| Çıktı | unknown | Ayrı sunucu çıktı şeması ve modele aktarılabilir çıktı şeması |
| Veri aktarımı | Genel metin maskeleme | Veri sınıfı ve işleme amacı + sunucuda açık alan seçimi |
| Sorgu | Araç başına sabit parametreler | Modülün izin verdiği filtre, cursor, sıralama ve gruplamalar |
| Hedef kitle | Üye aracı yalnızca istatistik | Kişi listesini modele vermeden sunucuda hedefleme |
| Yazma | İstemci kartındaki payload yeniden doğrulanır | Sunucuda kullanıcıya bağlı, süreli ve tek kullanımlık öneri |
| Dosya | create_file doğrudan dosya üretir | Açık artifact türü; kota ve süreli indirme |
| Bütçe | 6 araç turu + süreç içi istek limiti | Tur, toplam çağrı, sonuç boyutu, süre, token ve maliyet bütçesi |
| Sohbet silme | Liste açılırken 180 günlük kontrol | Worker ile periyodik ve izlenebilir silme |

## Önerilen TypeScript sözleşmesi

Hedef uygulama dosyası: src/shared/ai/define.ts. Aşağıdaki kod bir sonraki uygulama PR’ının
sözleşme temelidir; şimdilik yalnızca bu belgede tutulur. Mevcut ortak tarih/tutar yardımcıları
korunur. Yeni ve eski araçlar açık sürüm ayrımıyla geçiş döneminde birlikte yüklenebilir.

```typescript
import type { z } from "zod";
import type { PermissionCheck } from "@/shared/permissions/define";

export type AiOperation = "read" | "create" | "update" | "delete";
export type DataClass = "aggregate" | "internal" | "personal" | "special_category";
export type ExecutionMode = "query" | "proposal" | "artifact";

// Model parametresi değildir. Kimlik ve kapsam sunucuda oluşturulur.
export type AiExecutionContext = {
  actorId: string;
  requestId: string;
  conversationId: string;
  signal: AbortSignal;
  // Kapsam mevcut dağıtımın sunucu yapılandırması ve güncel yetkiden türetilir.
  scope: { deploymentId: string; policyRevision: string };
  // Servisler bunu kendi kaynak/kayıt politikalarıyla doğrulamak zorundadır.
  authorizeRecord: (resource: string, recordId: string, operation: AiOperation) => Promise<void>;
};

export type AiDataPolicy = {
  purpose: string; // kayıtlı ve açıklanmış işleme amacı
  dataClass: DataClass; // sunucuda işlenen ham verinin sınıfı
  modelDataClass: DataClass; // projection sonrası, en kötü durumdaki sınıf
  processing: "local_only" | "approved_provider";
  contentTrust: "structured" | "untrusted_content";
};

export type AiToolLimits = {
  timeoutMs: number;
  maxCallsPerTurn: number;
  maxOutputBytes: number;
};

export type QueryPage<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number; // yalnızca aynı filtre ve kapsam üzerinden hesaplanır
};

export type ProposalReference = {
  proposalId: string; // rastgele, tahmin edilemeyen opaque referans
  expiresAt: string;
  state: "pending";
};

export type ArtifactReference = {
  artifactId: string;
  state: "queued" | "ready";
  // İndirme URL’si yalnızca yetkili UI yan kanalına gider.
};

export type ModuleAiToolV2<I extends z.ZodType, R extends z.ZodType, M extends z.ZodType> = {
  name: string;
  description: string;
  operation: AiOperation;
  mode: ExecutionMode;
  permission: PermissionCheck;
  input: I;
  result: R; // ham sunucu çıktısı
  modelOutput: M; // yalnızca modele gönderilebilecek projection
  dataPolicy: AiDataPolicy;
  limits: AiToolLimits;
  run: (input: z.output<I>, ctx: AiExecutionContext) => Promise<z.input<R>>;
  // Ham çıktı otomatik olarak modele serialize EDİLMEZ.
  projectForModel: (result: z.output<R>, ctx: AiExecutionContext) => Promise<z.input<M>>;
};

export type ActionPreview = {
  title: string;
  changes: { label: string; before?: string; after?: string }[];
  affectedCount: number;
};

export type ActionOutcome = {
  status: "applied" | "queued";
  executionId: string;
};

export type ModuleAiActionV2<P extends z.ZodType> = {
  operation: Exclude<AiOperation, "read">;
  permission: PermissionCheck;
  payload: P;
  proposalTtlSeconds: number;
  // Önizleme güvenilir sunucu verisinden üretilir; model başlığına güvenilmez.
  preview: (payload: z.output<P>, ctx: AiExecutionContext) => Promise<ActionPreview>;
  // Hedef ve iş kuralı durumunun değişip değişmediğini kontrol eder.
  validateCurrentState: (payload: z.output<P>, ctx: AiExecutionContext) => Promise<void>;
  execute: (
    payload: z.output<P>,
    ctx: AiExecutionContext & { idempotencyKey: string },
  ) => Promise<ActionOutcome>;
};

// Factory, registry’ye alınırken tipleri kaybetmeden doğrulama/yürütme closure’ları üretir.
// any/unknown cast ile şema ve handler uyumsuzluğunu gizlememelidir.
export declare function aiToolV2<I extends z.ZodType, R extends z.ZodType, M extends z.ZodType>(
  definition: ModuleAiToolV2<I, R, M>,
): RegisteredAiToolV2;

export declare function aiActionV2<P extends z.ZodType>(
  definition: ModuleAiActionV2<P>,
): RegisteredAiActionV2;

// Bu tipler modül geliştiricilerinin doğrudan çağıracağı servisler değildir.
// Orchestrator bunları aşağıdaki zorunlu kapılardan geçtikten sonra çağırır.
export type RegisteredAiToolV2 = {
  name: string;
  operation: AiOperation;
  mode: ExecutionMode;
  permission: PermissionCheck;
  dataPolicy: AiDataPolicy;
  limits: AiToolLimits;
  inputJsonSchema: Record<string, unknown>;
  invoke: (rawInput: unknown, ctx: AiExecutionContext) => Promise<unknown>;
};

export type RegisteredAiActionV2 = {
  operation: Exclude<AiOperation, "read">;
  permission: PermissionCheck;
  proposalTtlSeconds: number;
  prepare: (rawPayload: unknown, ctx: AiExecutionContext) => Promise<ProposalReference>;
  // İstemci action adı veya payload göndermez; sunucudaki kayıttan yüklenir.
  confirm: (proposalId: string, ctx: AiExecutionContext) => Promise<ActionOutcome>;
};

export type ModuleAiV2 = {
  contractVersion: 2;
  module: string;
  tools: RegisteredAiToolV2[];
  actions: Record<string, RegisteredAiActionV2>;
};

export declare function defineModuleAiV2(definition: ModuleAiV2): ModuleAiV2;
```

`declare` imzaları uygulanacak factory’leri belirtir; çalışır factory implementasyonu değildir.
`invoke`, girdiyi input.parse ile; run sonucunu result.parse ile; projection sonucunu
modelOutput.parse ile doğrular. Sonuca bütçe, alan politikası ve maskeleme kontrolü uygulanır.
Zod 4’ün JSON Schema dönüşümü kullanılır; model input şemalarında dönüştürülemeyen
transform/refinement kullanımına izin verilmez. İş kuralı doğrulaması ayrıca sunucuda yapılır.

## Çalıştırma kuralları — zorunlu uygulama davranışı

1. Her araç çağrısında kullanıcı DB’den yenilenir; rol, AI rızası, seçili sağlayıcı,
   modül kullanılabilirliği, AI matrisi ve veri aktarım politikası yeniden denetlenir.
   Başlangıçta oluşturulan araç listesi yalnızca keşif içindir, güvenlik kontrolünün yerine geçmez.
2. permission kontrolü kaynak seviyesindedir. ID ile erişilen her kayıt, dosya ve ilişkili
   kayıtta sunucu servisleri ayrıca kayıt kapsamını denetler. authorizeRecord çağrısı
   unutulabilir bir tavsiye olarak bırakılmaz; kaynak servislerinin giriş noktalarında uygulanır.
3. role/policy bağlamı istek kapsamında taşınır. Gelecekte tenant bağlamı eklenecekse
   süreç genelindeki activePolicy üzerinden tenant ayrımı yapılmaz.
4. Model yalnızca projectForModel çıktısını alır. Kişisel ham kayıt, indirme URL’si,
   gizli anahtar veya dahili payload hiçbir durumda otomatik serileştirilmez.
5. Belge içeriği ayrı bir read_content kabiliyetiyle yönetilir; mevcut modül/read izni
   tek başına belge metnini sağlayıcıya göndermeye yetmez. Bu ek kapı mevcut CRUD matrisini
   değiştirmeden ayrı veri erişim politikası tablosunda tutulabilir.
6. Regex maskeleme ikinci savunmadır; anonimlik garantisi değildir. Kayıtlı olmayan adlar,
   adresler, sağlık bilgileri ve yeniden tanımlamaya yol açan birleşimler için güvenli
   projection uygulanamıyorsa buluta aktarım reddedilir. special_category varsayılan
   olarak kapalıdır; ayrı değerlendirme ve açık yönetici politikası olmadan açılmaz.
7. Veri sınıfı model tarafından düşürülemez. approved_provider, yalnızca sunucudaki
   sağlayıcı profili bu amaç/veri sınıfı için onaylıysa çalışır. Profil; DPA/AVV,
   saklama, eğitim kullanımı, alt işleyenler ve aktarım değerlendirmesine referans tutar.
   Bu kayıtlar hukuki incelemenin yerine geçmez. Kullanıcı onayı, veri sahiplerinin
   bilgilerinin işlenmesi için tek başına genel hukuki dayanak kabul edilmez.
8. Belge/e-posta/görev metni güvenilmeyen içeriktir. Talimat olarak kullanılmaz ve araç
   yetkisini genişletemez. Dış içeriğin ardından başlatılan işlemler aynı sunucu kapılarından
   geçer. Prompt metni tek başına koruma sayılmaz.
9. Sorgu filtreleri modül bazında enum/şema ile sınırlandırılır. Serbest SQL, Prisma where,
   alan yolu veya expression modele açılmaz. Cursor; filtre, sıralama ve erişim kapsamına
   bağlanır. Filtre DB’de sayfalamadan önce uygulanır. Eksik sonuçlar hasMore ile belirtilir.
10. İlişkilendirmeler sunucu servislerinde tanımlanır. Rastgele tablo birleştirmesi yoktur.
    Toplamlar küçük gruplarda kişiyi açığa çıkarabiliyorsa bastırma/eşik politikası uygulanır;
    aggregate etiketi tek başına anonimlik anlamına gelmez.
11. Toplam araç çağrısı, model turu, süre, çıktı boyutu, token ve maliyet ayrı ayrı sınırlandırılır.
    Başlangıç varsayılanları: 6 araç turu, 20 toplam çağrı, 50 kayıt/sayfa, 100 azami sayfa boyutu,
    araç başına 64 KiB model çıktısı. Değerler iş yüküyle doğrulanır. AbortSignal DB sorgusunu
    kendiliğinden durdurmaz; DB statement timeout ve worker iptali ayrıca uygulanır.
12. Her dosya URL’si kimlik ve sahiplik kontrolüyle üretilir. artifact modu sınırsız yan etki
    izni değildir; kullanıcı kotası, format sınırı, süreli saklama ve indirme yetkisi gerektirir.

## Sunucuda tutulan öneri ve onay protokolü

Yeni AiProposal kaydı aşağıdaki alanları tutar:

- id, userId, conversationId, deploymentId, moduleKey, actionKey, contractVersion.
- Şifreli payload ve önizleme; payloadHash, hedef kayıt sürümleri veya eşdeğer precondition.
- createdAt, expiresAt, status: pending/executing/applied/failed/expired/cancelled.
- Tekil idempotencyKey, executionId, confirmedAt, completedAt.

Öneri oluşturma, payload doğrulama ve sunucu önizlemesinden sonra yapılır. UI önizlemeyi
ayrı yetkili kanaldan alır; model yalnızca opaque proposalId ve pending durumunu görür.
İstemci onayda yalnızca proposalId gönderir. Sahiplik, güncel rıza, modül, matris, rol,
veri politikası ve kayıt kapsamı yeniden denetlenir. Süresi dolmuş öneri çalışmaz.

Hedef küme ve veri sürümü değiştiyse önizleme yenilenir ve yeniden onay gerekir. Onaylanan
payload ile çalıştırılan payload aynıdır. Çift tıklama atomik pending→executing geçişiyle
tek işe dönüşür. Kuyruğa aktarımda transactional outbox veya eşdeğer güvenilir teslim
kullanılır; dış yan etkilerde idempotent handler gerekir. Hata ve yeniden deneme davranışı
belirlenmeden uçtan uca “exactly once” garantisi verilmez. Worker çalıştırma anında da
kullanıcının ve kapsamın hâlâ geçerli olduğunu denetler.

## Örnek senaryo: aidat hatırlatma

1. search_member_dues: yıl, gecikme, üyelik durumu ve izinli tutar aralığına göre sorgular.
2. create_dues_audience: kişileri sunucuda seçer; kullanıcıya bağlı, süreli audienceId oluşturur.
   Model yalnızca hedef sayısını ve toplam gecikmiş tutarı alır. Üye ID, isim ve e-posta almaz.
3. prepare_dues_reminder: audienceId + mesaj şablonu ile öneri oluşturur. İsim alanlarını
   model doldurmaz; sunucu gönderim sırasında güvenilir şablon değişkenleriyle birleştirir.
4. UI hedef kitlesini ve mesajı yetkili kullanıcıya gösterir; kullanıcı onaylar.
5. Yetkiler ve hedef küme yeniden doğrulanır; automation işi oluşturulur. Gönderim izni ve
   ilgili iletişim tercihleri mevcut mailing iş kurallarınca ayrıca kontrol edilir.

Bu araçlar henüz mevcut değildir; v2 geçişindeki örnek uygulama hedefidir.

## Saklama ve izlenebilirlik

- Sohbet süresi yapılandırılabilir; mevcut 180 günün uygunluğu kullanım amacıyla gerekçelendirilir.
- Worker düzenli siler; sadece liste açılmasına bağlı silme kaldırılır. getConversation da
  süresi dolmuş içeriği okumayı reddeder. Aktif sohbeti güncellemek eski mesajların saklama
  süresini sınırsız uzatmamalı; süre mesaj createdAt üzerinden ayrıca uygulanır.
- Öneri, audience, artifact ve chat için ayrı saklama süreleri tanımlanır. Rıza geri alma,
  kullanıcı silme, bekleyen işler ve yedeklerin yaşam döngüsü birlikte ele alınır.
- Audit: kullanıcı, araç, amaç/politika sürümü, sonuç durumu, süre, maliyet ve kayıt sayısı.
  Ham mesaj, dosya içeriği, payload ve kişisel alanlar audit/error loglarına yazılmaz.
- Sağlayıcı tarafındaki silme/saklama davranışı ayrıca doğrulanır; yerel silme dış sağlayıcı
  kayıtlarının da silindiği anlamına gelmez.

## Geriye uyumluluk ve uygulama sırası

1. v2 factory’leri ve sürümlü registry desteği. v1 araçlar açıkça legacy işaretlenir;
   otomatik olarak güvenli v2 kabul edilmez. Mevcut tarih/tutar yardımcıları korunur.
2. Güncel yetki kapıları, veri politikası ve çıktı şemaları. Belge içeriği varsayılan kapalı.
3. Sunucu öneri deposu, önizleme, onay ve idempotency; Prisma migration gerekir.
4. Üyeler/aidatlar araçlarıyla ilk tam senaryo; görevlerde DB ön filtresi ve cursor.
5. Sohbet/öneri/hedef kitle silme işleri ve dağıtık bütçe kontrolü.
6. Diğer modüllerin aşamalı v2 geçişi. Son v1 modül taşındıktan sonra legacy destek kaldırılır.

Yeni paket varsayılan olarak eklenmez; Zod 4, mevcut PostgreSQL ve automation worker kullanılır.
Uygulama PR’larında değişen her modülün module.config.ts ve releases.json sürümleri
birlikte artırılır; registry module:sync ile üretilir. Bu belge PR’ı çalışma zamanı
modüllerini değiştirmediğinden tek başına modül sürümü artırmaz.

## Kabul ve doğrulama koşulları

- Girdi, ham çıktı ve model projection şemaları; şema-handler tip uyumsuzlukları reddedilir.
- Yanlış kullanıcı/kapsam, kapalı modül, iptal edilmiş izin/rıza, uygunsuz sağlayıcı reddedilir.
- Serbest belge metnindeki bilinmeyen kişi/sağlık verisi bulut moduna sızmaz.
- Öneri payload değiştirme, süre aşımı, çift onay, kuyruk yeniden denemesi ve hedef veri
  değişimi test edilir; önizlemede onaylanan kayıt kümesi korunur.
- 50 kayıttan fazla veri ve DONE görevlerin ilk sayfayı doldurması durumlarında açık görevler
  kaybolmaz. Toplam ve sayfalar aynı filtreyi kullanır.
- Saklama testi kullanıcı UI’yi açmadan süresi dolan kayıtların worker ile silindiğini doğrular.
- Prompt injection örnekleri yetkisiz araç ve kayıt erişimine yol açmaz.
- Uygulama tamamlandığında ilgili testler, typecheck, module:sync ve modül sürüm kontrolleri çalışır.

## Geçici kişi referansları ve sunucuda dosya üretimi

### Tasarım kararı

User, Member, StudentGuardian ve Student kayıtlarının mevcut id alanları sunucuda
kullanılır. İsim/doğum tarihi şifrelenerek yeni kimlik üretilmez. Mevcut kişi tablolarına
zorunlu bir aiKey/personRef sütunu eklenmez; mevcut kayıtlara backfill gerekmez.
Kayıt ID'leri modele doğrudan verilmez. Bu karar veri alanlarını şifreli saklama
konusundan ayrıdır; kişisel alanların DB'de şifrelenmesi ayrıca değerlendirilebilir.

Model bir kişiyi takip etmek zorundaysa kullanıcı/konuşma/iş kapsamında CSPRNG ile
üretilmiş en az 128 bit rastgele opaque token görür. Yalnızca rapor gerekiyorsa kişi
tokenları dahi verilmez; tek datasetRef üzerinden sunucuda dosya oluşturulur.

Aynı kişi user/member/guardian gibi birden fazla kayıtta bulunabilir. İsim veya doğum
tarihinden otomatik kişi birleştirmesi yapılmaz. Mevcut açık ilişkiler veya kullanıcı
tarafından doğrulanmış eşleştirmeler kullanılır. Global Person tablosu bu işin önkoşulu
değildir; böyle bir normalizasyon ayrı proje ve migration olarak ele alınır.

### Yeni yardımcı veri modelleri

| Önerilen model | Amaç | Temel alanlar |
| --- | --- | --- |
| AiReferenceScope | Referansların sahibi ve yaşam döngüsü | id, userId, conversationId/jobId, deploymentId, purpose, expiresAt, revokedAt |
| AiEntityReference | Geçici tokenı kaynak kayda bağlamak | tokenDigest (unique), scopeId, resource enum, recordId, expiresAt |
| AiDataset | Sunucuda sorgu/sonuç kümesini tutmak | tokenDigest (unique), scopeId, definitionEnc, selectionEnc veya sürümlü seçim, allowedColumns, expiresAt |
| AiProposal | Onaylanacak işlemi sunucuda tutmak | Önceki öneri protokolündeki alanlar |

Bunlar örnek mantıksal model adlarıdır; fiziksel şema uygulama PR'ında mevcut
konvansiyonlara göre netleştirilir. DB migration gerekir. AiProposal zaten v2
planının parçasıdır. GeneratedFile ve automation altyapısı mümkün olduğunca yeniden
kullanılır; dosya/iş bağlantısının ihtiyaç duyduğu ek alanlar o aşamada belirlenir.

Ham token yalnızca yetkili çağrı bağlamında kullanılır, loglara yazılmaz; DB'de
SHA-256 özeti aranır. Bu özet düşük entropili isimden değil rastgele tokendan
üretilir. Eşleştirme tablosu modele/istemci liste API'lerine açılmaz. recordId
şifrelenmek zorunda değildir; eşleştirme deposunun erişimi kısıtlanır. Hassas seçim
ve sorgu içerikleri şifrelenir. Mevcut AUTH_SECRET'e bağımlı secret-box kullanılırsa
anahtar değişiminde çözülememe davranışı hesaba katılır; key version ve rotation
stratejisi ayrıca tanımlanır. Token üretimi şifreleme anahtarına bağımlı olmaz.

### Araç ve çıktı sözleşmesi

- create_dataset: modülün izinli sorgu şemasını kullanır; ham SQL/Prisma where kabul etmez.
  Modele yalnızca datasetRef, izinli şema bilgisi ve gerekliyse güvenli toplamlar döner.
- query_dataset: sadece model erişimine izinli projection/aggregate alanlarını döndürür.
  Yetkili export alanları ile modele gönderilebilir alanlar ayrı listelerdir.
- export_dataset: datasetRef, format, izinli sütun enumları, sıralama ve sınırlı düzen
  tanımı alır. Kişisel sütunların verileri sunucuda çözülür ve dosyaya eklenir.
- Kişi odaklı işlem gerekiyorsa geçici entityRef kullanılır; bu referans kendi başına
  yetki değildir. Her kullanımda scope, sahiplik, süre ve kayıt/alan erişimi denetlenir.
- Araç çıktısı yalnızca dosya/iş referansı ve durum içerir. Dosya URL'si yetkili UI
  kanalına gider. Gerçek kişi bilgileriyle hazırlanmış içerik modele geri gönderilmez.

Örnek model girdisi:

```json
{
  "datasetRef": "opaque_random_token",
  "format": "xlsx",
  "columns": ["member.fullName", "dues.overdueAmount"],
  "sort": "dues.overdueAmount_desc"
}
```

member.fullName izinli bir dışa aktarma alanı olabilirken model çıktısında yasak
olabilir. Bu ayrım sunucuda doğrulanır. LLM tarafından oluşturulan serbest sorgu,
kod veya template ifadesi çalıştırılmaz. Rapor düzeni şemayla sınırlandırılır;
CSV/Excel hücrelerinde formül enjeksiyonu önlenir. Dosya üretimi büyük veri için
automation worker üzerinden, sınırlı bellek ve boyut bütçesiyle yapılır.

### İsimli kullanıcı girdisi ve güven sınırı

Kullanıcı bir kişinin adını yazarsa bulut modele gitmeden sunucuda çözümleme yapılır.
Bilinen isimler için mevcut maskeleme kullanılabilir; fakat bilinmeyen isim ve serbest
metin için regex garantisi verilmez. Güvenli aktarım sağlanamıyorsa kişi seçimi yetkili
UI üzerinden istenir veya politika izin veriyorsa yerel işleme kullanılır. Birden
fazla eşleşme model tahminiyle seçilmez. Belirsiz girdiler doğrudan buluta gönderilmez.

Export worker hedef kayıtları ve alanları çalıştırma anında yeniden yetkilendirir.
Silinmiş/erişimi kaldırılmış kayıtlar gizlice yeniden görünür olmaz. Kullanıcının
onayladığı seçim değişirse önceki öneri protokolü uyarınca yeni onay gerekir.
Önizleme, dosya, extractor, OCR, hata çıktısı ve sonraki sohbet araçları üzerinden
kişisel verinin modele geri sızması ayrıca engellenir.

Tokenlar ve datasetler kullanıcıya, konuşmaya veya işe bağlıdır; başka konuşmada,
başka kullanıcıyla veya başka deployment kapsamında kullanılamaz. Kuyruk için ayrı
sunucu yetki bağlamı taşınır; model tokenı sınırsız servis yetkisine dönüştürülmez.
Süre aşımı ve rıza geri alma yeni okumaları/işleri engeller; worker düzenli temizler.

### Ek kabul koşulları

- Aynı kişi ayrı konuşmalarda farklı token alır; token gerçek isimden türetilmez.
- Token sahipliği, resource türü, süre, revoke ve dataset/alan yetkisi negatif testleri.
- Kişi ID ve adları provider request, model-visible tool output ve hata loglarında bulunmaz.
- Dosyada yetkili kullanıcının istediği gerçek adlar bulunur; model sadece durum alır.
- Yetkili bir export alanı query_dataset ile modele okunamaz.
- Dosyanın sonraki araçlarla tekrar okunması aktarım politikasını aşamaz.
- Aynı isimli iki kişi otomatik birleşmez; user/member/guardian bağları doğrulanır.
- Token süre aşımı, worker yeniden denemesi, anahtar rotasyonu ve kayıt silme testleri.

Bu yapı pseudonymisation sağlar; anonimlik veya tek başına GDPR uyumluluğu
iddiası taşımaz. Tutar/yaş/kurs/aile ilişkisi gibi dolaylı tanımlayıcılar ve küçük
gruplar için yeniden tanımlama riski ayrıca değerlendirilir.

## Bu taslağın onay kapsamı

Bu dosya kullanıcı onayıyla PR #143 içinde gönderilmiştir. Bu onay, çalışma zamanı
kodlarının değiştirilmesi veya PR’ın birleştirilmesi anlamına gelmez. Runtime geçişi yukarıdaki
sırayla ayrı uygulama PR’larında yapılır.
