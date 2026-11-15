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
