# AI asistanı: mevcut mimari ve eksik analizi

Tarih: 14.11.2026. İnceleme temeli: main / 4bc9fdc16f9d9a01ff6d631cc2946319b746c26e.
Tasarım temeli: PR #143 / 31198c34c13d6d00d7cd5f18a24fecd2a1e1fee2.
Kapsam: AI, auth/permissions, veri politikası, documents, exports ve automation entegrasyon sınırları;
kişi tabloları ve ilgili testler. ERP'nin bütün modülleri için kapsamlı güvenlik denetimi değildir.
Canlı sistem, sağlayıcı hesabı, ağ yapılandırması ve üretim DB'si incelenmedi.

## Sonuç

Eksik vardır. Mevcut yapı yeni mimari için kullanılabilir bir temeldir; doğrudan üretim
hazırlığı tamamlanmış sayılmaz. REST/GraphQL değişikliği öncelik değildir. 17 modül 50 AI aracı
sunar. AI doğrudan modüllerin public sunucu API'lerini çağırır; temel veri erişimi Prisma'dır.
Referans/dataset/kalıcı öneri mimarisi henüz uygulanmamıştır.

İşaretler: D = doğrudan kaynak koduyla doğrulandı; Ç = bağımsız küçük çalışma zamanı
kontrolüyle de doğrulandı; T = yeni tasarım için gereken yetenek. P1 = kişisel veri kapsamı
genişlemeden önce; P2 = işlev ve dayanıklılık; P3 = sonraki ürün yetenekleri. Hiçbir bulgu
tek başına canlı ortamda saldırı yapıldığını veya yetkisiz erişim gerçekleştiğini göstermez.

## Korunacak mevcut kontroller

- createAction: güncel oturum/kullanıcı, rol izni ve Zod girdi kontrolü.
- AI araç keşfi: kullanılabilir modül + varsayılan kapalı AI matrisi + rol.
- Yazma önerilerinde hedef action'ın yeniden Zod ve kullanıcı izni denetimi.
- Sohbet erişiminde userId sahipliği; dosyada sahiplik ve expiresAt kontrolü.
- AES-256-GCM ile sohbet, sağlayıcı anahtarı ve üretilen dosya şifreleme.
- Otomasyon: statik görev kaydı, outbox, retry, lease/heartbeat/fencing ve modül kontrolleri.
- AI_TOOL_POLICY / DATA_POLICY ve modül sınırı testleri; TR/DE arayüzü.

## Bulgular

### AI-01 / P1 / Ç — maskeleme bütün kişisel içeriği korumuyor

Kanıt: src/modules/ai/services/privacy.ts:14, :36, :49;
src/modules/documents/ai.ts:103; src/modules/documents/queries/file-text.ts:7.
Yalnız tanımlı kalıplar ve kayıtlı tam adlar maskelenir. Kayıtsız kişi, adres, doğum tarihi ve
sağlık anlatımı değişmeden kalabilir. Belge metni bu katmandan sonra modele aktarılır.
Çalışma kontrolü: bilinmeyen tam ad + sokak + tarih + sağlık metni değişmeden kaldı.
Çözüm: güvenli projection, ayrı content izni ve sağlayıcı/veri sınıfı kapısı; güvenli
aktarımı doğrulanamayan kişisel serbest metni buluta göndermeme. Regex ikinci savunmadır.

### AI-02 / P1 / D — önerinin sunucu kökeni ve tek kullanımlılığı doğrulanmıyor

Kanıt: src/modules/ai/actions/execute-proposal.ts:14 ve :30;
src/modules/ai/components/ai-chat-panel.tsx:274 ve :528.
İstemci module/action/payload gönderir. Action şeması, AI matrisi ve hedef rol kontrolü
vardır; ancak önerinin daha önce sunucuda üretildiğini, kullanıcıya ait olduğunu, süresini
ve uygulanmadığını doğrulayan kayıt yoktur. UI done/restored kontrolü sunucu tekrarını önlemez.
Bu bulgu rol yetkisini atlayan genel bir açık iddiası değildir; mevcut izinler içindeki
tekrar çalışma ve onaylanan payload'ın güvenilirliğine ilişkin boşluktur.
Çözüm: kalıcı AiProposal, yalnız proposalId ile confirm, atomik claim, idempotency, güvenilir preview.

### AI-03 / P1 / D — uzun sohbet turunda yetki değişikliği yeniden kontrol edilmiyor

Kanıt: src/modules/ai/services/assistant.ts:45 ve :70;
src/modules/ai/services/tools.ts:53 ve :88.
Araçlar başlangıçta filtrelenir; runTool sadece girdiyi doğrular. Sonraki çağrılarda
kullanıcı pasifliği, rıza, modül/AI matrisi değişikliği merkezi olarak yeniden okunmaz.
Öneri confirm girişi de AI rızasını kontrol etmez. Hedef action kontrolleri korunmalıdır.
Çözüm: her çağrı/confirm/worker başlangıcında ortak güncel yetki değerlendirmesi.

### AI-04 / P1 / Ç — yerel sağlayıcı adres kontrolü hostname tahminine dayanıyor

Kanıt: src/modules/ai/services/providers/registry.ts:23.
10. ile başlayan PUBLIC hostname özel IP sanılır. http(s) protokolü şartı yoktur;
169.254/16 link-local adresler kabul edilir. Özel görünümlü DNS adlarının gerçek IP'si
ve redirect hedefi denetlenmez. Yönetici ayarıdır; anonim kullanıcı saldırısı gösterilmedi.
Kontrol: https://10.attacker.example/v1, ftp://localhost/v1 ve
http://169.254.169.254/v1 için predicate true döndü; hiçbir adrese istek yapılmadı.
Çözüm: gerçek IP parse + server allowlist, http(s), DNS/redirect/egress kontrolü;
metadata/link-local varsayılan yasak. Yalnız ağ adresi yerel veri işlemeyi kanıtlamaz.

### AI-05 / P1 / D — saklama süresi background temizliğe bağlı değil

Kanıt: src/modules/ai/services/history.ts:28, :34, :40;
src/modules/ai/services/reports.ts:11 ve :19.
Sohbet silme liste açılınca ve conversation.updatedAt üzerinden çalışır. getConversation
süre kontrol etmez; rapor temizliği yeni rapor kaydında yapılır, getReport süreyi denetlemez.
Aktif sohbet eski mesajları sınırsız yaşatabilir. Süresi dolmuş dosya indirmesi zaten reddedilir.
Çözüm: worker cleanup + okumada expiresAt/mesaj yaşı kapısı + saklama türü bazlı süreler.

### AI-06 / P1 / D — CSV formül nötralizasyonu yok

Kanıt: src/modules/exports/formats/csv.ts:7.
CSV kaçışı ayırıcı/çift tırnak/yeni satır içindir; =, +, -, @ ile başlayan metinleri
formül olarak yorumlayan uygulamalara karşı koruma yoktur. XLSX kodu normal string/sayı
hücreleri üretir; XLSX'te aynı açığın gerçekleştiği doğrulanmadı, regresyon testi gerekir.
Çözüm: veri tipine duyarlı güvenli CSV hücresi; negatif gerçek sayıları metinle karıştırmama.

### AI-07 / P1 / D+T — politika sınıfları uygulama kapısı değil, statik beyan

Kanıt: src/shared/data-policy.ts:203; tests/shared/data-policy.test.ts;
src/modules/ai/services/tools.ts:88.
AI_TOOL_POLICY/DATA_POLICY testlerde kullanılır; runTool bu politikaları yorumlamaz.
Test ai.ts metnini tarar, transitif servis dönüşlerini ve gerçek provider payload'ını doğrulamaz.
K1 aidat/veli verisinin dataset içinde sunucuda kullanılması ile modele açıklanması ayrı
kategorilerle yönetilmeli. v2 aggregate/internal/personal sınıfları K0–K3 yerine geçirilmemeli.
Çözüm: kaynak erişimi, server işlemesi, modele projection ve export için ayrı kararlar;
K0 sır/korunan not yasaklarını gevşetmeden politikaları tek kaynağa bağlama.

### AI-08 / P2 / D — tur sayısı toplam maliyet sınırı değil

Kanıt: src/modules/ai/handlers/chat.ts:26; providers/openai-compatible.ts:21;
providers/mistral.ts; providers/anthropic.ts:18; providers/types.ts.
15/dk sınırı süreç içindedir; instance'lar arasında ortak değildir. Altı tur içinde
birden çok çağrı yürütülebilir. Uygulama düzeyinde toplam çağrı, model çıktı boyutu,
konuşma tokenı, günlük bütçe ve ortak deadline/cancellation sözleşmesi yoktur.
SDK varsayılan timeout/retry davranışı olabilir; 'hiç timeout yok' iddiası yapılmıyor.
Tur sınırında son cevabın boş kalması da mümkün; kontrollü bitiş mesajı gerekir.

### AI-09 / P2 / D — konuşmanın tamamı okunup sonra geçmiş sınırı uygulanıyor

Kanıt: src/modules/ai/services/history.ts:40; handlers/chat.ts:70.
DB tüm mesajları yükler/decrypt eder; sonra 39 geçmiş mesaj seçilir. Paralel chat
istekleri aynı geçmişe cevap üretip sıralamayı karıştırabilir; tur idempotency'si yoktur.
Çözüm: DB'de sınır, UI için cursor, conversation revision ve tek aktif turn/claim.

### AI-10 / P2 / D — açık görevler sayfalamadan sonra filtreleniyor

Kanıt: src/modules/tasks/ai.ts:39 ve :44; tasks/queries/list-items.ts.
İlk 50 görevde DONE/CANCELLED kayıtlar yer kaplarsa sonraki açık görevler görülmez.
Bazı diğer araçlar da tek sayfayla sınırlıdır. Sonuç tamamlığı her araçta belirtilmez.
Çözüm: DB'de status filtresi, cursor/hasMore ve aynı scope/filtreli toplam.

### AI-11 / P1 / T — referans, dataset ve alan bazlı export sınırı yok

Kanıt: src/modules/ai/schema.prisma; exports/ai.ts:43;
shared/ai/define.ts. Bu bir mevcut bypass bulgusu değil, planlanan özelliğin eksikliğidir.
create_file tam Markdown alıp sunucuda restore eder ve dosya üretir. Dataset planı,
kişisel sütunu sadece renderer'da birleştirme, scoped opaque token deposu yoktur.
Çözüm: AiReferenceScope, AiEntityReference, AiDataset; queryable != exportable;
model yalnız plan/referans görür, içerik yalnız yetkili dosyaya gider.

### AI-12 / P2 / D — dosya üretimi senkron, mevcut merkezi pipeline henüz plan

Kanıt: exports/services/files.ts:40; exports/ai.ts:44;
docs/specs/CENTRALIZED_FILE_PIPELINE_SPEC.md ve docs/TODO_CENTRALIZED_FILE_PIPELINE.md.
createGeneratedFile içinde render tamamlanır; AI dosya işi automation kuyruğunu kullanmaz.
Ayrı Files modülü kodda yoktur; exports mevcut sahip modüldür. İkinci pipeline kurulmamalıdır.
Çözüm: exports üstünden uyumlu request-generation cephesi; tek automation task/outbox;
gelecekteki Files geçişi aynı dosya kimliği ve erişim davranışıyla yapılmalı.

### AI-13 / P2 / D — storage temizliğinde yetim dosya riski

Kanıt: exports/services/files.ts:28 ve :94.
Önce DB satırı silinir, sonra disk silinir. Disk silme başarısızsa aynı sorgu tekrar
satırı bulamaz; byte'lar yetim kalabilir. Disk hatası üretimde gözlemlenmedi.
Çözüm: deletion_pending/tombstone, retry ve storage reconciliation; aynı sorun lifecycle
silme akışlarında da ele alınmalı.

### AI-14 / P2 / D — secret rotasyonu veri sürekliliğini kesebilir

Kanıt: shared/security/secret-box.ts:17 ve :36;
ai/services/history.ts:15; providers/credentials.ts.
AUTH_SECRET değişince eski veri çözülemez; keyId/keyring yok. Bazı okumalar null'ı boş
metne dönüştürür, bozuk veri ile boş içerik ayrılmaz. Anahtar sızması gösterilmedi.
Çözüm: sürümlü şifreleme anahtarı, read-old/write-new rotasyon ve görünür hata;
mevcut API-key purpose ayrımı korunur. Kişi tokenı şifrelemeden bağımsızdır.

### AI-15 / P2 / D — hata logları ham Error nesnesi içeriyor

Kanıt: ai/services/tools.ts:94; shared/files/extract-text.ts catch.
Exception mesajı/stack'i kişisel içerik taşıyabilir; gerçek log sızıntısı doğrulanmadı.
Çözüm: izinli hata kodu + requestId; ham exception ve parse edilen metni audit/loga vermeme.

### AI-16 / P2 / D — rıza iptalinin kapsamı ve sağlayıcı değişimi eksik tanımlı

Kanıt: ai/actions/consent-actions.ts:37; ai/services/consent.ts:17;
ai/services/providers/anthropic.ts:23.
İptal sohbeti siler; AiReport ve exports dosyaları aynı işlemde silinmez. Bu dosyaların
kalması tek başına hata değildir, amaç/saklama politikası tanımlanmalı. Sağlayıcı rızası
provider ID + sürüme bağlı; aynı provider'ın model/endpoint/policy değişimi bağlanmaz.
Anthropic fallback ayarı server-side default; gerçek fallback davranışı hesabında doğrulanmadı.
Çözüm: provider policy revision ve açık değişiklik kuralları; bekleyen işleri durdurma,
çıktıların korunma/silinme kararını belgeleyip test etme; izinli model/fallback profili.

### AI-17 / P2 / D — dokümanlar ve test kapsamı gerçek durumu tam yansıtmıyor

Kanıt: ai/services/assistant.ts açıklaması, handlers/chat.ts:45, ai/schema.prisma
ilk açıklama: sohbet saklanmaz diyor; history.ts gerçekten şifreli saklıyor.
PERSONAL_SECRETARY.md AssistantSuggestion öneriyor; PR #143 AiProposal öneriyor.
AI_MODULE_PROMPT.md Prisma 6 diyor; package.json Prisma 7.10.x.
Bazı security/auth-bypass testleri assert.ok(true) ile yalnız yer tutucudur; tüm güvenlik
testlerinin anlamsız olduğu sonucu çıkarılmamalıdır. AI klasörü ağırlıkla privacy/UI testleri içerir.
Çözüm: tek öneri modeli, tek veri politikası, gerçek handler/provider/worker negatif testleri.

## Yeni şema ihtiyacı

User/Member/StudentGuardian/Student zaten cuid id taşır. Yeni aiKey sütunu ve kişi backfill'i
zorunlu değildir. Yeni modeller: AiReferenceScope, AiEntityReference, AiDataset, AiProposal;
bütçe/turn claim tablosu ihtiyaca göre eklenir. Kişiyi ad/doğum tarihinden otomatik birleştirme yok.
AiDataset kaynak ID'leri yumuşak referansla tutar; sahip modül servisinden canlı doğrular.
Tüm yeni tablolar DATA_POLICY + kullanıcı silme lifecycle + saklama işlerine eklenmelidir.

## Doğrulama kaydı

Mevcut test dosyaları değiştirilmeden Node 24 native TypeScript + geçici alias resolver ile:

- tests/ai/privacy.test.ts
- tests/ai/markdown.test.ts
- tests/ai/panel-state.test.ts
- tests/shared/data-policy.test.ts

Sonuç: 21 test, 8 suite, 21 başarılı, 0 başarısız. Bu standart pnpm test komutunun veya
tüm CI'ın çalıştırıldığı anlamına gelmez. Resolver yalnız geçici /tmp altında kuruldu;
uygulama bağımlılıkları ve package.json değiştirilmedi. DB/provider çağrısı yapılmadı.
Ek dört dar çalışma kontrolü AI-01 ve AI-04 davranışlarını doğruladı. Tam typecheck,
Next build, DB migration ve uçtan uca sağlayıcı/worker testleri çalıştırılmadı.

## Uygulama belgeleri

- Tasarım sözleşmesi: ../architecture/ai-contract-v2-proposal.md
- Ayrıntılı uygulama şartnamesi: ../specs/AI_ASSISTANT_V2_IMPLEMENTATION_SPEC.md
- Sıralı iş listesi: ../TODO_AI_ASSISTANT_V2.md

Bu inceleme dokümanları bir uygulama değişikliği değildir; hiçbir migration uygulanmadı.
