# AI v2 uygulama ilerlemesi

## Güvenlik temeli — ilk uygulama paketi

Şartname PR #143 main dalına birleştirildi. Ayrıntılı audit, uygulama şartnamesi ve TODO bu paketle repoya eklenir.

Uygulananlar:
- Belge listesi/detayı/ek metni için `processing: local_only`; bulut araç keşfi ve çalışma anında kapı.
- Her model turu, araç çalıştırması ve öneri onayında güncel kullanıcı, AI rızası/modül/rol kontrolü.
- Gerçek IP aralık kontrolü; http(s) zorunluluğu, credentials/link-local/metadata engeli.
- Yerel HTTP transport: her istekte DNS doğrulama, doğrulanan IP'ye sabitleme, redirect yasağı, iptal ve yanıt boyutu sınırı.
- Chat ve eski rapor okumalarında süre denetimi; aktif konuşmada da yaşlı mesaj temizliği.
- `ai.cleanup_history` zamanlanabilir worker görevi; aynı automation scheduler kullanılır.
- Chat çağrısı için geçmiş DB sorgusunda 40 mesaj sınırı; UI geçmişi ayrı okunur.
- CSV metin formülü nötralizasyonu; sayılar korunur.
- AI araç hatasında ham exception loglama kaldırıldı; bazı eski saklama açıklamaları düzeltildi.

## Operasyon

Üretim migration'ı bu pakette yoktur; şema değişikliği yalnız yorum düzeyindedir.
Yeni migration veya üretim DB bağlantısı çalıştırılmadı.
Mevcut automation worker çalışmalı. Yönetici otomasyon zamanlamalarında `ai.cleanup_history`
görevini saatlik çalışacak şekilde eklemelidir; görev henüz kendiliğinden schedule oluşturmaz.
Worker/schedule çalışmıyor olsa bile süresi dolan sohbet/rapor okumaları reddedilir.
Yerel model ağı yalnızca loopback/RFC1918/IPv6 ULA olmalı; tüm DNS cevapları özel olmalıdır.
Yerel model servisinin kendi dış bağlantılarını sınırlamak deployment sorumluluğudur.

## Açık sınırlar

Kayıtsız kişisel serbest metin için tam DLP/anonimleştirme çözümü bu paket değildir.
Kullanıcı mesajları hâlâ mevcut PseudonymVault'tan geçer; bulut kullanımında genel PII
aktarımı sıfırlandı iddiası yoktur. Alan bazlı v2 projection ve güvenli kişi seçimi sıradadır.
Kalıcı AiProposal/idempotency, scoped token/dataset, kişisel server-side export henüz yoktur.
Cleanup'ın otomatik schedule kurulumu, batching ve DB entegrasyon testleri tamamlanmalıdır.
Tema değişikliği yapılmadı. Shopify benzeri sade, tutarlı ve zarif panel tasarımı güvenilirlik
kabulü sonrasında ayrı çalışma olarak ele alınacaktır.

## İkinci uygulama paketi — v2 runtime

- Input/result/projection şemaları, alan allowlist'i, satır/byte/süre limitleri ve duplicate isim koruması. İlk canlı v2 araç: create_dues_dataset; eski araçlar açık legacy sürümüyle kalır.
- Altı yeni çekirdek tablo ve AiExportRequest; kişi tablolarına aiKey eklenmedi. Migration ayrı test veritabanında hem temiz kurulum hem mevcut migration zincirinden yükseltme ile sınandı.
- Şifreli ve kullanıcıya bağlı öneriler; sadece proposalId ile onay, atomik claim ve kaynak snapshot kontrolü.
- 256 bit geçici referanslar, digest lookup, scope/TTL/revoke ve şifreli dataset seçimi.
- Aidat CSV/XLSX planı → onay → atomik automation execution/outbox → yetkili worker → sunucuda kişi birleştirme → rolü yeniden kontrol eden indirme. Kişisel export bayrağı varsayılan kapalıdır.
- Ortak kullanım sayaçları, request deadline, konuşma claim ve cevap tekrar kullanımı. EUR bütçe garantisi değildir.
- Anahtar sürümü ve read-old/write-new desteği; dosya silmede tombstone ve aged orphan reconciliation.
- Otomatik bakım zamanlamaları ve içerik taşımayan hata sayaçları.
- Bulut istekleri hazır niyetlerden kanonikleştirilir; serbest kullanıcı metni ve eski sohbet geçmişi buluta gönderilmez. Belge metni için ek read_content izni gerekir.

Üretim deploy/migration yapılmadı. Yerel tam üretim derlemesi bellek sınırına takıldı; CI kabulü olmadan hazır sürüm sayılmamalı. Gerçek sağlayıcı hesabının bölge, sözleşme ve saklama ayarları doğrulanmadı. Önceki bölümdeki eksikler için bu bölüm ve güncel TODO esas alınır.

### Yerel doğrulama kaydı

- Ayrı PostgreSQL 18 test DB'sinde eski migration zinciri → yeni migration yükseltmesi uygulandı. Şema drift kontrolü: fark yok.
- 449 test, 107 suite, 449 başarılı, 0 başarısız ve 0 atlandı (DB testleri dahil). Sonraki yalnız çeviri metni değişikliği için i18n/type/lint yeniden kontrol edilir.
- TypeScript, 36 modül doğrulaması, i18n/hardcoded text, hedefli ESLint geçti.
- Yerel webpack üretim build'i varsayılan heap ile OOM, 6 GiB denemesinde ortam tarafından SIGKILL aldı. Build kabulü açık; bu yüzden paket taslak PR olarak sunulur.
