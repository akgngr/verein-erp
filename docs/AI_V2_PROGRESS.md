# AI v2 uygulama ilerlemesi

PR #143 şartname ve PR #144 güvenlik temeli main'e birleştirildi. Runtime PR #145 ile birleştirildi. Takip paketi: https://github.com/akgngr/verein-erp/pull/146 . Üretim deploy/migration yapılmadı. Tema çalışması güvenilirlik kabulünden sonra ele alınacak.

## Tamamlanan çekirdek

- Sürümlü v2 input/server result/model projection şemaları; JSON Schema üretimi, alan/satır/byte/süre sınırları ve benzersiz araç adı kontrolü.
- Geçici owner/conversation/deployment/revision/TTL bağlı 256 bit referanslar; token yerine digest saklanır. Kişi tablolarına aiKey eklenmedi.
- Şifreli, kalıcı proposal ve yalnız proposalId ile onay. Kaynak snapshot kontrolü, eşzamanlı onay claim'i; yarıda kalan genel yazma otomatik tekrar edilmez.
- Members aidat için yıl/durum/min-max integer cent DSL, `create_dues_dataset` ve `query_dataset`; SQL veya kimlik araması modele açılmaz. Export kolonları ayrı enum'dur.
- Onaydan sonra aynı transaction'da generation + mevcut automation execution/outbox. Kaynak ve izinleri yeniden kontrol eden worker; isimli CSV/XLSX yalnız sunucuda üretilir. İptal/abort/stale/aktör iptali, deterministik dosya kimliği ve tombstone temizliği.
- Sohbet geçmişinde keyset UI cursor, DB'de sınırlı pencere, lease/request UUID ve mesaj+cached cevap için atomik commit. İlk istek cevabı ağ tekrarında yeni konuşma açmadan alınabilir.
- Paylaşılan PostgreSQL request/token sayaçları, yapılandırılabilir deployment mikro-EUR rezervasyonu, 6 model turu/20 araç/120 saniye sınırı.
- Buluta yalnız tanımlı kanonik niyet gider; serbest metin/geçmiş aktarılmaz. Belge listesi/detayı/ek metni local-only ve ayrı read_content iznine bağlıdır.
- Provider/model/endpoint revision'a bağlı yenilenen rıza; iptalde pending işleri ve referansları durdurma. Eski şifreleme formatını okuyan, key ID ile yeni formatı yazan keyring.
- Saatlik otomatik maintenance schedule, mesaj yaşına bağlı cleanup, silme tombstone/retry ve aged orphan reconciliation. Automation worker gereklidir.
- students/progress/donations istatistikleri v2'ye taşındı. Öğrenci/veli için kişi listesi veya kişisel dosya açılmadı; çocuk istatistikleri local-only.
- tasks/documents/meetings/inventory/events/calendar/courses/mailings listelerine sınırlı sayfalama metadata'sı eklendi; eksik `filter.*` parametreleri düzeltildi.

## Doğrulama

- PR #145 ilk runtime commit'i GitHub Quality gate, üretim build, hydration, secret scan ve dependency audit'ten geçti. Takip commit'leri aynı kontrolleri yeniden geçmelidir.
- Son yerel tam suite: 448 test başarılı, 0 başarısız, 0 atlanan; 100 suite. Auth yer tutucu testlerinin yerine 7 gerçek Auth.js davranışını çalıştıran subprocess testi konduğundan eski test sayısıyla doğrudan kıyaslanmamalıdır.
- İzole PostgreSQL 18'de mevcut migration zincirinden yükseltme ve şema drift kontrolü geçti. 102 gecikmiş satırlı CSV/XLSX, gerçek v2 araçtan fake-fetch sağlayıcı spy, aynı isimli ayrı kayıtlar, farklı durum filtreleri, eşzamanlı generation, onay cevabı kaybından toparlanma ve iptal senaryoları sınandı.
- TypeScript ve TR/DE anahtar kontrolü geçti. Yerel üretim build'i bellek sınırına takıldığı için GitHub build sonucu kullanıldı.

## Açık kabul sınırları

Bu paket tüm TODO'ların tamamı değildir. Tam durum `TODO_AI_ASSISTANT_V2.md` içindedir. Özellikle genel dosya generation facade/streaming, kalan legacy araçlar, çocuk verisi adapter'ları, sekreter S1–S6 ve aidat hatırlatma ürünü tamamlanmadı. Gerçek sağlayıcı hesabının DPA/bölge/retention/fiyat ayarları ve üretim pilotu dış doğrulama gerektirir.

`AI_PERSONAL_EXPORT_ENABLED=false` varsayılanı korunur. Kodun/testlerin geçmesi, otomatik Datenschutz uyumu veya tüm kişisel verinin anonim olduğu anlamına gelmez. Operatör sırası ve geri alma koşulları `operations/AI_V2_ROLLOUT.md` içindedir.

PR #146 ilk CI turunda progress v2 kaynak tanımı K0 ProgressNote içerdiği için build başarısız oldu. AI sorgusu bu tabloyu hiç okumayan ayrı aggregate servisine taşındı; not sayısı model çıktısından çıkarıldı. Yeni kaynak politikası ve korumalı tabloya erişimi reddeden reader testi eklendi. Düzeltmenin production build/hydration sonucu beklenir.

## Açık kimlik bağlantıları — C08

Student/guardian → member geçişi yalnız mevcut açık memberId, canlı kaynak/hedef ve güncel actor/matris/rıza doğrulamasıyla yeni scoped referans üretir. Veli ilişkisi aynı kişi anlamına gelmez. User/member bağlantı modeli yokken ad veya e-posta üzerinden eşleştirme yapılmaz. AI görevlerinin mine filtresi bu nedenle açıkça created_by_actor kapsamını bildirir; e-posta fallback'i kullanılmaz. Kişi tablolarında değişiklik yoktur. Bu paket öğrenci/veli kişisel dosyasını etkinleştirmez.

C08 yerel doğrulaması: 449 test geçti; typecheck/lint/module:sync başarılı. PR #146'nın 494a50b commit'inde CI build/hydration ve Security başarıyla tamamlandı; C08 takip commit'i ayrıca CI'dan geçmelidir.

## Gerçek worker kabulü — E10

450 test başarılı, 0 başarısız, 0 atlanan. Fake-fetch model kanalından gerçek dosya kuyruğuna kadar fixture genişletildi: gerçek worker/pg-boss, ölü lease toparlama, geçici disk hatası, aynı generation üzerinde sınırlı retry, tek dosya, tükenen deneme bütçesi ve temiz worker kapanışı. UI, otomasyonun terminal durumunu dar metadata API'sinden okuyarak kuyrukta kalma sorununu giderir. Kaynak snapshot, actor ve execution bağları her denemede yeniden denetlenir.

## Ortak dataset API — D03

Canonical create_dataset/query_dataset/export_dataset, v2 input/output planları ve TR/DE sağlayıcı açıklamaları eklendi. İlk kaynak members.dues'tir; tanımsız kaynak, SQL, kişi arama alanı veya IBAN kolonu kabul edilmez. Export yalnız onay kartı üretir. Eski araç adları v2 uyum alias'ları olarak kalır. 453 test başarılı; yeni commit'in CI kabulü beklenir.

## Merkezi FileGeneration facade — D04

Mevcut exports merkezi metadata/publication sahibidir. AiExportRequest ile aynı transaction'da FileGeneration + mevcut automation/outbox kaydı kurulur. Attempt ID'leri ve kilitli lease finalization eski worker'ın yeni sonucu yayımlamasını/silmesini engeller. Published metadata sorgusu liste/indirme/durum için ortaktır. Dolu eski şema backfill'i ve unpublished byte gizleme dahil 456 test geçti; yeni migration ve reader/worker sıra gereksinimi operations/AI_V2_ROLLOUT.md içindedir. Streaming ve tüm diğer üreticilerin taşınması henüz tamamlanmadı.


## Sınırlı şifreli akış — D06

Yeni veri kümesi sürümü 2, 500 adaylık keyset sayfaları ve DB ödeme toplamlarıyla seçim belleğini sınırlar. Önizleme count/fingerprint'i üretilen satırlarla doğrulanır. CSV/XLSX doğrudan 0600 ciphertext temp dosyaya akar; tag tamamlanmadan ve snapshot/izin kontrolü geçmeden rename/publication yoktur. Abort/süre/byte/row/cell sınırları, 64 MiB kimlikli download sınırı ve eski dataset/keyring format uyumu korunur. Genel HTTP streaming ve diğer format/producer geçişleri tamamlandı sayılmaz.

459 test, 100 suite: tamamı başarılı, 0 skipped. 6.001 kayıtlık kaynak/format testleri, ödeme aggregation, revoke/abort, ciphertext-only temp, typed/formül güvenli hücreler, byte/row/cell sınırları, key rotation/tamper ve gerçek worker stale snapshot reddi doğrulandı. Additive migration upgrade/drift, TypeScript/lint ve TR/DE/sabit metin kontrolleri geçti. PR #150 production build/hydration ve Security başarılı; yeni takip commit'i CI'ı ayrıca geçmelidir. Üretim deploy/pilot yapılmadı.


## F02 öneri ve aggregate araçları

18 öneri + 3 toplu istatistik aracı açık v2 şemalarına geçti. Öneri tanımları worker-safe dar servislere ayrıldı; kaynak başlıkları yalnız onay kartında kalır, modele sabit acknowledgement gider. Kurs/evrak/toplantı/görev hedef sorguları gereksiz kişi/not/ek okumaz. İstatistiklerin nullable/tutar/enum sonuçları doğrulanır. Diğer okuma/dosya araçları ve legacy registry fallback'i açık kalır.

463 test, 100 suite: tamamı başarılı, 0 atlanan. Yeni kaynak taraması ve metadata-only query spy testleri dahil. Typecheck/lint, module:sync, TR/DE, migration upgrade/drift geçti. PR #151 CI/build/hydration ve Security başarılıdır. Bu yeni paket için GitHub kabulü ayrıca izlenmelidir.
