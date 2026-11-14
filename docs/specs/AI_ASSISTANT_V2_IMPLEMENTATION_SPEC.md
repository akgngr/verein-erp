# AI asistanı v2 — uygulama teknik şartnamesi

Durum: uygulamaya hazır plan; runtime geliştirmesi yapılmadı.
Temel kod: 4bc9fdc16f9d9a01ff6d631cc2946319b746c26e.
İlişkili tasarım: ../architecture/ai-contract-v2-proposal.md (PR #143).
Gerekçe: ../reviews/AI_ASSISTANT_ARCHITECTURE_AUDIT.md (AI-01…AI-17).
Bu belge tasarım sözleşmesini tamamlar; mevcut kodun uygulandığı iddiası değildir.

## 1. Hedef ve kapsam

AI kişisel kimliği görmeden filtre, özet, iş planı ve rapor düzeni üretebilmeli.
Sunucu yetkili kaydı seçmeli; gerçek ad/doğum tarihi/iletişim alanını sadece yetkili
UI/dosya/gönderim aşamasında kullanmalı. GraphQL, serbest SQL ve yeni global Person
normalizasyonu bu kapsamda değildir. Kişisel sağlık/not verileri açılmaz.

İlk uçtan uca senaryo: gecikmiş aidat kümesi → güvenli özet → isim/tutar sütunlu XLSX
ve CSV → sahiplik kontrollü indirme. Mail gönderimi sonraki aşamadır, export onayı
ile mesaj gönderme onayı aynı işlem değildir. Önce AI-01…AI-07 giderilir.

## 2. Sorumluluklar ve dosya sınırları

| Alan | Sorumluluk | Önerilen yer |
| --- | --- | --- |
| Ortak sözleşme | v1/v2 factory, şema adaptasyonu | src/shared/ai/define.ts |
| Politika | K0–K3, projection, export alanı ve amaç kapıları | src/shared/data-policy.ts + ilgili pure yardımcılar |
| AI koordinasyonu | güncel actor, scoped token, dataset ve proposal | src/modules/ai/services/ |
| Üye kaynağı | filtre, kayıt kapsamı, kaynak sürümü, alan seçimi | src/modules/members/services/ + server.ts |
| Dosya talebi | durum, metadata, storage, indirme | mevcut src/modules/exports/ |
| İş yürütme | outbox, retry, lease, timeout | mevcut automation public API |
| Worker güvenliği | request-context gerektirmeyen dar servisler | modülün automation.ts public girişi |

Başka modül tablosuna doğrudan Prisma erişimi yoktur. AI, users/member/student tablolarını
referans çözmek için public servislerden okur. Module access bildirimleri ve yönetici onayı
güncellenir. Worker, server.ts üzerinden UI/next-intl/Server Action içe aktarmamalı.
Merkezi Files şartnamesiyle tek pipeline korunur; başlangıçta exports facade kullanılır,
yeni paralel storage veya queue kurulmaz. Automation P0 önkoşulları CI ile doğrulanır.

## 3. Politika ve sözleşme uyumu

PR #143 DataClass alanları ek açıklamadır; K0–K3 esas sınıflandırmasını değiştirmez.
K0 sırlar, korunan notlar ve ham authentication kayıtları modele hiç açıklanmaz.
K1 kaynak sahibinin yetkili sunucu servisiyle dataset/export içinde işlenebilir; bu durum
AI'ın K1 alanını okuyabileceği anlamına gelmez. AI_TOOL_POLICY'ye serverReads ile
modelProjection ayrımı eklenir veya eşdeğer tek kaynaklı metadata üretilir.
Mevcut 'yalnız K2/K3 okur' testi bu ayrımı kanıtlayan testlerle değiştirilir; K1/K0'ı
K2'ye yeniden etiketleyerek test geçirilmez. User'dan sadece izinli profil projection'ı
okunur, passwordHash/lockout vb. hiçbir export adapter'ına verilmez.

v2 araç: tek Zod input, server result şeması, modelOutput şeması, permission, purpose,
data policy, limits, run ve projectForModel. Registry factory typed closure ile input→run→
result→projection→modelOutput doğrulamasını kapsüller. Zod 4 JSON Schema dönüşümü kullanılır;
model input şemalarında transform ve çevrilemeyen refinement yasaktır. Veri boyutu serialize
öncesi/sonrası ölçülür; her modülde araç adları benzersiz ve uzunluğu/provider biçimi uyumlu olur.

v1 geçişi: önce ortak çağrı kapıları ve riskli içerik araçlarının kapatılması, sonra kademeli
araç taşıma. v1 için otomatik 'güvenli çıktı' varsayılmaz. Flag ile kişisel export varsayılan
kapalıdır; v1'e rollback bu kapıyı açmaz. UI kimlikli çıktıları modele taşımayan kanalda sunar.

## 4. Ortak yetki değerlendirmesi

Her tool çağrısı, proposal prepare/confirm, worker claim ve download için kontrol listesi:

1. Güncel aktif kullanıcı ve sunucudan deployment kapsamı.
2. AI ve hedef modülün kullanılabilirliği/onayı; modüller arası access bildirimi.
3. Kullanıcının kaynak/action izni + AI matrisi; veri içeriği için ayrı izin.
4. Konuşma, token, dataset, proposal, dosya sahipliği ve scope eşleşmesi.
5. expiresAt/revokedAt, geçerli provider policy ve AI rızası (AI işlemlerinde).
6. Kayıt seviyesinde erişim ve model-visible/exportable alan ayrımı.
7. Bütçe/konuşma claim'i ve işlem precondition'ları.

Saf yetki servisi Next request olmadan actorId ile DB'den context kurabilmeli. Oturum/UI
wrapper'ları bu servisi çağırır. Süreç genelindeki policy singleton tenant context yerine
kullanılmaz. Her kaynak için kayıt politikası tanımlanır; mevcut tek-dernek geneli view
izninin otomatik olarak sadece sahibi görür kuralı olduğu varsayılmaz.

Rıza/provider değişimi sırasında snapshot providerId + policyRevision sabitlenir ve
her dış çağrıdan hemen önce doğrulanır. İptal önceki gönderilmiş veriyi geri alamaz;
yeni çağrı ve yan etkileri durdurur. Yerel modellere de aynı veri/araç yetkileri uygulanır.

## 5. Veri modeli ve migration

Kişi tabloları değişmez. Yeni şema AI modülünde; modül dışı foreign key zorlaması yoktur.
Aşağıdaki alanlar uygulama gereksinimidir; tam Prisma syntax ayrı uygulama PR'ında yazılır.

| Model | Zorunlu alanlar / indeks |
| --- | --- |
| AiReferenceScope | id, userId, conversationId?, jobId?, deploymentId, purpose, policyRevision, createdAt, expiresAt, revokedAt?; userId/expiresAt indeksi |
| AiEntityReference | id, scopeId, tokenDigest unique, resource enum, recordId, createdAt, expiresAt; scopeId/resource/recordId indeksi |
| AiDataset | id, scopeId, tokenDigest unique, queryVersion, definitionEnc, selectionEnc?, selectionHash, sourceRevision?, allowedColumns, createdAt, expiresAt; scopeId indeksi |
| AiProposal | id, userId, scopeId, moduleKey, actionKey, contractVersion, payloadEnc, previewEnc, payloadHash, preconditionsEnc, status, expiresAt, idempotencyKey unique, executionId?, confirmedAt?, completedAt? |
| AiTurnClaim | id, userId, conversationId, requestKey, expectedRevision, status, leaseExpiresAt, replyRef?; userId/conversationId/requestKey unique; aktif claim atomik korunur |
| AiUsageBucket | scopeKey, windowStart, reservation/usage sayımları; scopeKey/windowStart unique; güncelleme atomik |

AiConversation'a revision eklenebilir; bu değişiklik kişi tablolarına dokunmaz. Existing
GeneratedFile'a sourceResource/policyRevision/execution ilişkisinin ihtiyaç duyduğu alanlar
merkezi pipeline modeliyle uyumlu eklenir. Tüm modeller DATA_POLICY ve lifecycle kapsamına alınır.

Token: randomBytes(32) base64url; DB'de SHA-256 digest. Kişisel alanlardan türetme yok.
Token auth değildir. Eşleştirme salt model output üzerinden bulunamaz. Şifreli dataset/query
alanlarında keyId/version bulunur. 1:N çok büyük seçimlerde şifreli snapshot parçaları veya
sahip modülün sürümlü seçim servisi kullanılır; dev JSON DB sütununa sınırsız yüklenmez.

Başlangıç saklama varsayılanları: entity/dataset 30 dakika; proposal 15 dakika; AI dosyası
mevcut 30 gün; sohbet mevcut 180 gün (ama mesaj createdAt üzerinden). Bekleyen iş, dataset
TTL'sini gizlice uzatmaz: doğrulanmış job'a bağlı sınırlı retention veya kontrollü yeniden
onay gerekir. Bu değerler yönetilebilir, politika sürümüne bağlı ve ürün sahibi tarafından
onaylanabilir teknik varsayılanlardır; hukuken otomatik uygunluk iddiası değildir.

Migration additive yapılır; canlı kişileri yeniden şifreleme/backfill yok. Uygulama flag kapalı
iken migrate deploy uygulanır; Prisma client ve module:sync çıktıları aynı PR'da doğrulanır.
Rollback flag kapatır, işleri durdurur; veri içeren tablolar otomatik DROP edilmez.

## 6. Dataset API ve veri seçim doğruluğu

create_dataset({ source, queryVersion, filters, orderBy }): sunucu izinli şemaya göre
kaynak servisini çağırır. Model datasetRef, genel alan açıklamaları, hasMore ve politika
izin verirse güvenli toplam alır. query_dataset yalnız modelProjection alanlarına erişir.
export_dataset({ datasetRef, format, columns, sort, layout }): sadece enum alanlar ve
önceden tanımlı düzen. İsteğe bağlı entityRef sadece gereken kişi odaklı işlerde kullanılır.

Görev filtresi ve tüm aralıklar DB'de sayfalamadan önce uygulanır. Cursor sorgu, sıralama,
actor/scope ve source sürümüne bağlanır; sabit tie-breaker id eklenir. Total aynı filtreyi
kullanır. Tarihler Berlin takvimi/date-only kurallarına, tutarlar Decimal/kuruş hesabına uyar.
Küçük grup/toplam farkı üzerinden çıkarım için purpose bazlı suppression uygulanır.

İsim çözümleme sunucudadır. Eşleşme belirsizse UI kişi seçtirir; model tahmin etmez.
İsim veya doğum tarihine göre user/member/guardian tablolarını otomatik birleştirme yok.
Bilinmeyen kişisel serbest metin güvenli preflight olmadan dış modele gönderilmez.

## 7. Onay ve eşzamanlılık protokolü

prepare: güncel yetki → payload doğrulama → yetkili kaynak snapshot/precondition → sunucu
preview → şifreli AiProposal. UI preview'ı yetkili kanaldan alır; model opaque id ve durum alır.
confirm sadece proposalId gönderir. user/scope/TTL/role/AI/content/policy tekrar denetlenir.
Hedef küme veya veri değişmişse STALE_PREVIEW ve yeniden onay döner. Payload istemciden alınmaz.

Atomik pending→executing claim ve idempotency anahtarı tek iş sağlar. Transactional outbox
mevcut automation altyapısına güvenilir teslim yapar. Kuyruk tekrarları aynı generation
kimliğini kullanır. Artifact oluşturma/sonlandırma iki kez dosya yan etkisi üretmez.
Uçtan uca exactly-once iddiası yoktur; dış yan etkiler idempotent tasarlanır.
Aynı konuşmada paralel turn'ler expectedRevision/lease ile yönetilir; tekrar requestKey
aynı sonucu döndürür veya kontrollü in-progress durumuna gider. AI turunun yarıda kalması
oluşturulmuş dosyanın/önerinin duplicate oluşmasına yol açmamalıdır.

## 8. Dosya, worker ve indirme

AI sadece schema-bound plan gönderir. Kaynak veriyi sahip modülün worker-safe servisi
alır, sütun yetkisini denetler ve renderer'a typed satırlar verir. Markdown modeli sadece
kişisel olmayan serbest raporlar için korunur. Kimlikli veri tekrar model Markdown'una
çevrilmez. Dosya adları/başlıkları da model kanalında kişisel veri içermez.

Task payload yalnız generationId, actorId ve iç referans taşır; ham token, isim, adres,
Markdown ve alıcı listesi kuyruğa yazılmaz. AutomationStepRun.result da kişisel satır içermez.
Worker claim aşamasında rol/aktiflik/rıza/policy/kapsam ve kaynak precondition denetlenir.
Deadline, AbortSignal, DB statement timeout, kayıt/byte limiti ve streaming uygulanır.

Sahiplik + süre kontrolü korunur. Kimlikli dataset dosyasının download'ında source modül
ve alan politikası yeniden değerlendirilir; yetki kaldırılınca hazır dosya üzerinden
eski erişim sürmemelidir. Kaynak dosyaların korunma amacı AI rızasından bağımsız olabilir;
bu karar kaynak provenance ile açıkça tutulur. Preview/OCR/read araçları dosyayı modele
aktarmak için aynı model policy kontrolünden geçer; export yetkisi read-to-model yetkisi değildir.

CSV: metin hücrelerinde formül başlatıcıları, leading whitespace/control karakterleri güvenli
hale getirilir; gerçek sayılar numeric kalır. XLSX sadece typed string/number/date hücreleri;
model formülü/harici link çalıştırılmaz. PDF/DOCX aktif içerik, dış URL ve font/yol kontrolleri
mevcut renderer güvenliğine uygun tutulur.

Silme: deletion_pending kaydı → byte silme → DB finalize. Hatalı disk silme retry edilir;
periyodik orphan reconciliation vardır. Metadata kaybının ardından byte'ı unutma yoktur.

## 9. Sağlayıcı ve çalışma bütçesi

Yerel endpoint gerçek IP parse veya yönetici allowlist ile doğrulanır. Yalnız http(s),
userinfo yok; metadata/link-local varsayılan yasak. DNS sonuçları ve redirect yeniden
kontrol edilir; kontrollü proxy/egress kullanılır. Ağın özel olması modelin dışarı veri
iletmediğinin garantisi değildir; local hizmetin kendi dış bağlantısı dağıtımda sınırlandırılır.

Provider policy profile: id/model/endpoint/revision/amaç/veri sınıfı/bölge/saklama ve
DPA/alt işleyen değerlendirmesine referans. Default fallback yalnız aynı onay kapsamındaki
modeller için açıkça etkinleştirilir. Güncel ticari API özellikleri implementasyon öncesi
resmî sağlayıcı belgeleriyle doğrulanır; bu belgede sağlayıcı hesabı doğrulandığı iddiası yoktur.

Başlangıç bütçesi: 15 request/dk/kullanıcı (ortak PostgreSQL bucket), tek aktif chat turn,
6 tool round + 20 toplam çağrı, araç başına en fazla 50 satır (üst sınır 100), 64 KiB
model output/araç, toplam 120 saniye request deadline. Render ayrı worker job'ıdır.
Token ve günlük maliyet için yönetici limiti zorunlu; parasal değer deployment ayarıdır.
SDK retry'ları bu deadline/bütçeyi aşamaz. Bütçe exhaustion kontrollü sonuç üretir, boş yanıt değil.

## 10. Saklama, anahtar ve operasyon

Cleanup automation task'ı periyodik çalışır, batch/checkpoint ile devam eder; kullanıcı UI'yi
açmasa da siler. Read servisi expiry'yi anında reddeder. Message bazlı süre active sohbetten
bağımsızdır. Rıza iptali pending proposal/ref/dataset ve AI işleri revoke eder. AiReport ve
GeneratedFile için koruma/silme kuralı provenance/purpose'a göre UI metniyle tutarlı olur.
Yedekler ve sağlayıcı saklaması ayrı operasyon prosedürüyle yönetilir.

Encryption keyring: write-current/read-old; ciphertext keyId/version içerir. Eski format
geçişi desteklenir. AUTH_SECRET rotasyonu veri anahtarını beklenmedik değiştirmemeli.
Decrypt hatası boş metin gibi gösterilmez. Secrets loglanmaz; key rotation dry-run yapılır.

Audit: actorId, resource, purpose, policyRevision, tool/action, outcome code, süre,
kayıt sayısı ve token maliyeti. Ham Error yerine izinli code + correlationId. Token/payload/
isim/dosya byte'ı audit ve automation loglarına gitmez. Metrics: yetki reddi, stale preview,
retry, orphan cleanup failure, budget refusal ve job gecikmesi. Model içerikleri metric etiketi olmaz.

## 11. Kabul test matrisi ve bitiş koşulu

| Test | Beklenen |
| --- | --- |
| İzin/rıza/model policy tool round arasında iptal | Sonraki çağrı ve yan etki reddedilir |
| Başka kullanıcı/scope tokenı, expire/revoke | Referans çözülmez, kayıt varlığı sızmaz |
| Bilinmeyen isim/adres/sağlık serbest metni | Dış provider request'inde bulunmaz |
| Kişisel export sütunu query_dataset ile istenir | Model erişimi reddedilir |
| 100 görev, ilk 50 DONE | DB filtreli tüm açık görevler sayfalanır |
| İki eşzamanlı confirm / tekrar queue delivery | Aynı proposal tek generation'a bağlanır |
| Onay sonrası tutar/hedef değişimi | STALE_PREVIEW ve yeniden onay |
| Worker öncesi kaynak izni kaldırılır | İş durur, kişisel dosya üretilmez |
| Hazır dosya sonrası alan izni kaldırılır | Download policy kararına göre reddedilir |
| UI açılmadan retention dolması | Cleanup siler, read anında reddeder |
| Storage silme hatası | Retry/tombstone korunur, byte unutulmaz |
| Key rotasyonu / bozuk ciphertext | Eski veri okunur veya görünür kontrollü hata |
| Yerel uçta public DNS/redirect/metadata/scheme | Egress öncesi reddedilir |
| CSV formül / XLSX typed text | Hesaplanan formül veya dış bağlantı oluşmaz |
| Provider spy + log collector | PII/token/decrypted dosya içeriği kanallara sızmaz |

Build/typecheck, ilgili AI/shared/members/exports/automation/security testleri, module sync,
modül sınırı/zero-touch, sürüm/release ve TR/DE kontrolleri zorunludur. Testler gerçek
handler/service davranışını sınamalı; assert.ok(true) veya sadece kaynak regex'i ile
entegrasyon kabulü verilmez. DB testleri izole test DB'sindedir; üretimde migration provası yoktur.

## 12. Uygulama paketleri ve teslim

A: güvenlik kapıları/policy/endpoint/retention/CSV. B: v2 typed factory ve registry.
C: migration + referans/dataset/öneri + atomik onay. D: members adapter + exports/worker
uçtan uca. E: bütçe/claim/keyring/cleanup dayanıklılık. F: diğer modüller ve sekreter ürünleri.
A tamamlanmadan kişisel export flag açılmaz; B→C→D bağımlılığı korunur. E'nin ilgili güvenlik
ve kota önkoşulları da pilot yayın öncesi tamamlanır. Her paket ayrı review edilebilir PR.
Değişen her modülde module.config.ts/release sürümü birlikte artırılır. Doküman-only PR
runtime modül sürümü gerektirmez. PR birleştirme ve üretim yayını bu planın hazırlanmasına dahil değildir.
