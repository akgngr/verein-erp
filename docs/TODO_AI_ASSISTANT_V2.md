# AI asistanı v2 — öncelikli TODO

Durum: uygulama başladı; işaretli kutular ilk güvenlik paketinde uygulanmış ve test edilmiştir.
Çekirdek uygulama ve PostgreSQL entegrasyonları ilerledi. Kısmi ve dış doğrulama gerektiren maddeler açık tutulmuştur.
Temel: main 4bc9fdc + PR #143 tasarımı.
İnceleme: reviews/AI_ASSISTANT_ARCHITECTURE_AUDIT.md.
Şartname: specs/AI_ASSISTANT_V2_IMPLEMENTATION_SPEC.md.

## A — veri kapsamını genişletmeden önce

- [x] A01 (AI-01, AI-07) K0–K3 ile model projection/export ayrımını tek politikada tanımla; K1'i K2'ye çevirme.
- [x] A02 (AI-01) Belge içeriğine ayrı izin ve varsayılan kapalı bulut aktarımı ekle; bilinmeyen PII preflight negatif testi.
- [x] A03 (AI-03) Her araç/confirm/worker için güncel actor, modül, AI matris, rıza ve policy kontrolü kur.
- [x] A04 (AI-04) Yerel URL'de gerçek IP/protokol/allowlist/DNS/redirect kontrolü ve metadata engeli; ağsız testler.
- [x] A05 (AI-05) Chat/report read expiry + mesaj yaşına göre cleanup worker; kullanıcı listesi açılmadan test et.
- [x] A06 (AI-06) CSV hücre formül koruması; negatif sayılar ve XLSX typed text regresyonları.
- [x] A07 (AI-15) Ham Error loglarını kod/correlationId ile değiştir; log sızıntı spy testi.
- [x] A08 (AI-17) Saklanmaz açıklamaları, veri politikası, Prisma sürümü ve sekreter öneri modeli çelişkilerini düzelt.

Bitiş: A01–A08 testli; hassas içerik için güvenli varsayılanlar aktif. Kişisel export flag kapalı.

## B — sürümlü sözleşme (A01/A03 bağımlılığı)

- [x] B01 Input/server result/modelOutput Zod şemaları ve typed closure factory'leri uygula.
- [x] B02 Zod'dan JSON Schema üret; unsupported input şemalarını ve duplicate araç adını build'de reddet.
- [x] B03 Registry'de açık v1/v2 ayrımı; legacy araca güvenli projection varsayma.
- [x] B04 Per-call output byte/row limiti ve kontrollü error sonuçları ekle.
- [x] B05 Şema-handler tip uyumsuzluğu ve gerçek provider payload negatif testleri yaz.

Bitiş: mevcut araçlar bozulmadan taşınabilir; kişisel veri model kanalına çıkmaz.

## C — migration ve sunucu referansları (B bağımlılığı)

- [x] C01 AiReferenceScope, AiEntityReference, AiDataset, AiProposal modelleri ve indeksleri; kişi tablolarına aiKey ekleme.
- [x] C02 DATA_POLICY, lifecycle, kullanıcı silme ve cleanup kapsamını tüm yeni modellere ekle.
- [x] C03 256 bit rastgele token + digest lookup; scope/owner/TTL/revoke kapıları.
- [x] C04 İzinli query DSL + enum sütunlar; queryable/exportable ayrımı.
- [x] C05 Şifreli dataset seçim/snapshot ve kaynak precondition hash'i; büyük seçim boyutu limiti.
- [x] C06 prepare/preview/confirm(proposalId); istemciden payload kabulünü kaldır.
- [x] C07 Atomik claim, idempotency ve automation outbox; çift onay/kuyruk tekrar testleri.
- [x] C08 User/member/guardian eşleşmesini yalnız doğrulanmış ilişkiyle çöz; aynı isimli kişiler testini ekle.
- [x] C09 Additive migration'ı izole DB'de uygula; rollback flag ve mevcut format uyumunu doğrula.

Bitiş: IDOR/süre/revoke/çift onay negatif testleri geçer. Runtime migration üretimde henüz uygulanmaz.

## D — ilk uçtan uca kişisel dosya (A+B+C bağımlılığı)

- [x] D01 members public/worker-safe dataset adapter: yıl/gecikme/durum/tutar; Decimal ve tarih kuralları.
- [x] D02 Kaynak servisinde kayıt kapsamı + alan projection + export izni; doğrudan cross-module Prisma yok.
- [x] D03 create_dataset/query_dataset/export_dataset araçlarını ve TR/DE açıklamalarını ekle.
- [ ] D04 exports request-generation facade'ını mevcut merkezi dosya şartnamesiyle birleştir; ikinci queue kurma.
- [x] D05 automation task payload'ını generationId/actorId metadata'sıyla sınırla; result/log PII taşımasın.
- [ ] D06 Worker'da güncel izin/precondition, typed satır renderer, streaming ve kaynak limitleri.
- [x] D07 UI preview, onay ve job durumu; gerçek isimli XLSX/CSV yalnız yetkili UI/dosyaya gider.
- [x] D08 Download'da source/alan yetkisini ve sahipliği yeniden denetle; dosya read-to-model geri sızıntısını engelle.
- [x] D09 100+ kayıt, izin iptali, stale hedef ve provider spy ile tam senaryoyu test et.

Bitiş: AI sadece datasetRef/durum görür; dosyada doğru ad ve tutarlar bulunur.

## E — pilot yayın öncesi dayanıklılık

- [x] E01 (AI-08) PostgreSQL ortak request bucket, toplam araç/token/maliyet bütçesi ve deadline.
- [x] E02 (AI-09) DB'de geçmiş penceresi, UI cursor, conversation revision + turn claim/idempotency.
- [x] E03 (AI-10) Açık görevleri DB'de filtrele; liste araçlarına cursor/hasMore/completeness.
- [x] E04 (AI-13) deletion_pending/tombstone + disk retry + orphan reconciliation.
- [x] E05 (AI-14) keyId/keyring, eski format okuma ve read-old/write-new rotasyon; decrypt hata görünürlüğü.
- [x] E06 (AI-16) Provider policy revision/model/endpoint/fallback ve yeniden onay kuralları.
- [x] E07 (AI-16) Rıza iptalinde pending iş/ref/dataset revoke; eski dosya/rapor purpose bazlı yaşam döngüsü.
- [ ] E08 Sağlayıcı timeout/retry/region/retention/fallback ayarlarını resmî belgeler ve gerçek hesapla doğrula.
- [x] E09 Metrics/alerts: budget, denial, stale preview, cleanup hatası, orphan ve job gecikmesi.
- [x] E10 İzole DB entegrasyon ve worker recovery/cancellation testleri; ilgili yer tutucu auth testlerini gerçek davranış testine dönüştür.
- [x] E11 module:sync, modül sürüm/releases, typecheck, lint, ilgili testler, build ve TR/DE kontrollerini tamamla.
- [ ] E12 Pilot feature flag, durdurma/rollback ve operatör runbook'u; kişisel export yayını için kabul matrisi.

## F — sonraki ürün kapsamı

- [ ] F01 students/guardian adapter'larını çocuk verisi politikasını koruyarak taşı.
- [ ] F02 Diğer 17 modülün araçlarını öncelik sırasıyla v2'ye geçir; sonrasında legacy desteği kaldır.
- [ ] F03 Aidat hatırlatma taslağı → bağımsız gönderim onayı → mevcut mailings otomasyonu.
- [ ] F04 PERSONAL_SECRETARY S1–S6: günlük brifing, inbox önerisi, OCR, boş zaman ve takip; v2 temeli üstünde ayrı planla.
- [ ] F05 Gerçek istemci/ilişkili sorgu ihtiyacı oluşursa GraphQL kararını yeniden değerlendir.

## Takip kuralı

Her kutu ilgili PR, test sonucu ve migration/operasyon notuyla kapanır. A–E kabulü olmadan
'kişisel veriyi AI görmez' özelliği üretimde tamamlandı olarak işaretlenmez. Bu listeyi
hazırlamak kod geliştirme, push, PR merge veya deployment yapıldığı anlamına gelmez.

## Bu paketin doğrulama sınırları

İşaretli çekirdek maddeler birleştirilmiş `feat/ai-v2-runtime` ve takip dalı `feat/ai-v2-hardening` kapsamındadır. Bunlar bütün ürün özelliklerinin tamamlandığı anlamına gelmez. A02 belge içerik izni, bilinmeyen PII için fail-closed bulut niyeti ve negatif testler uygulandı. E05 read-old/write-new keyring ve okunamayan kayıtta kontrollü hata tamamlandı; bu, tüm eski kayıtların topluca döndürüldüğü veya eski anahtarın kaldırılabileceği anlamına gelmez. E08 gerçek sağlayıcı hesabı olmadan kapanmaz. E11 PR #145'in GitHub build/hydration dahil kontrolleri geçti; takip paketinin CI sonucu ayrıca beklenir. F ürün paketi ve eski araçların tamamının dönüşümü henüz bitmedi.

## PR #145 takip paketi — 15.11.2026

- Aidat DSL: yıl, durum ve min/max kalan tutar (integer cent). Kimlik araması, serbest SQL ve bilinmeyen alan reddedilir. Query alanları ile export kolonları ayrı allowlist'tir. `query_dataset` eski referanstan yeni seçim/referans oluşturur. İlk kaynak members aidattır; genel SQL motoru yoktur.
- Aktarım 5.000 aday kayıtta fail-closed sınırlandırılır. Ödeme sonrası tutar filtresi bu sınırın içinde uygulanır; büyük veri streaming maddesi açık kalır.
- Ortak bütçe: günlük token limiti ve isteğe bağlı deployment geneli mikro-EUR limiti. EUR limiti için gerçek hesaba ait model fiyatları operatörce tanımlanmalıdır; eksik fiyatla çağrı reddedilir. Bu iç rezervasyon sağlayıcının gerçek faturası/sözleşmesi değildir.
- E02: kullanıcıya bağlı request UUID, ilk isteğin cached cevabı, lease, atomik mesaj+cevap commit'i ve UI keyset geçmiş cursor'u. Süresi dolan çalıştırma otomatik model tekrarına çevrilmez.
- E03: tüm mevcut liste araçlarında sınır/eksiksizlik açık; takvim, kurs ve kampanya cursor sayfaları da eklendi. Legacy canlı listelerin cursor'u snapshot garantisi vermez. 500 kaynak/5000 oluşum sınırını aşan takvim aralığı sessizce kesilmez; refine_range döner.
- C07/D09: 102 gecikmiş + aynı isimli farklı ücret durumu fixture'ı; gerçek v2 araç → sahte sağlayıcı fetch spy → şifreli dataset → tek automation outbox → CSV/XLSX typed dosya akışı sınandı. Export request commit'inden sonra kaybolan onay cevabı, mevcut generation kanıtıyla toparlanır. Genel yazmalarda belirsiz işlem otomatik tekrar edilmez; tam exactly-once domain transaction iddiası yoktur. Gerçek sağlayıcı hesabı E08'de ayrıdır.
- students/progress/donations istatistik araçları v2 oldu. Çocuk verisi için yalnız sayılar, local-only ve açık çıktı şeması; kişisel öğrenci/veli dosyası açılmadı. F01/F02 bu yüzden açık.
- Gerçek Auth.js token/çerez/yönlendirme testleri yer tutucu auth assert'lerinin yerini aldı. Son yerel suite: 441 başarılı, 0 başarısız, 0 atlanan; migration yükseltmesi ve şema drift kontrolü geçti.

## PR #146 — takip kabulü

https://github.com/akgngr/verein-erp/pull/146

İlk CI turunda progress aracı K0 ProgressNote kaynağını tanımladığı için build durdu. Politika gevşetilmedi: AI için ayrı devam/değerlendirme aggregate sorgusu eklendi, not sayısı dahil ProgressNote okuması kaldırıldı. K0 kaynak bildirimi regresyon testi artık build'den önce bu hatayı yakalar. Kurs/takvim/kampanya sayfaları ve Berlin saatli/tüm gün sınırları DB testleriyle doğrulandı. Güncel commit'in CI build/hydration kabulü ayrıca beklenir.

## C08 takip paketi

Owner-scoped kaynak referansından yalnız açık `Student.memberId` / `StudentGuardian.memberId` bağlantısı doğrulanır. Hedef üye silinmişse veya bağlantı yoksa ret gelir. Aynı ad/e-posta eşleştirme kanıtı değildir; veli/öğrenci ilişki kaydı aynı kişi olduklarını göstermez. User/member arasında doğrulanmış ilişki modeli bulunmadığı için kullanıcı otomatik üyeye çevrilmez. AI görev sorgusu e-posta eşleştirmesine düşmez; mine kapsamı açıkça created_by_actor olarak döner. Mevcut kullanıcı arayüzünün eski filtre uyumluluğu bu AI değişikliğinde topluca kaldırılmadı.

PR #146 (494a50b) için production build/hydration dahil CI ve Security başarılıdır. Yeni takip paketleri ayrıca aynı kapılardan geçmelidir. C08 son yerel suite: 449 başarılı, 0 başarısız, 0 atlanan; kişi tablolarına yeni sütun eklenmedi.

## E10 gerçek worker/pg-boss kabulü

İzole PostgreSQL üzerinde gerçek automation worker subprocess'i başlatılır. Süresi dolmuş RUNNING lease fixture'ı gerçek dispatcher tarafından toparlanır; bir rename hatası EISDIR ile geçici hata üretilip engel kaldırılır, aynı generation üçüncü denemede tek dosyayla tamamlanır. Outbox PUBLISHED, execution SUCCEEDED, lease recovery log'u, dosyada doğru isim/tutar ve worker'ın temiz kapanışı doğrulanır. Deneme hakkı biten/iptal edilen iş UI'da QUEUED kalmaz. Geçici hata erken FAILED yapmaz; policy/TTL/stale/cancel/plan hataları kalıcıdır. Son yerel suite: 450 başarılı, 0 başarısız, 0 atlanan. Aktif eski worker ile eşzamanlı storage finalization fencing'i ve streaming D06'da açıktır.

## D03 veri kümesi araç API'si

create_dataset (source=members.dues, query), query_dataset (datasetRef + izinli filtreler) ve export_dataset (onay kartı) mevcut kaynak izinleri, feature flag ve v2 şemalarıyla çalışır. Model açıklamaları TR/DE'dir; eksik çeviride sabit açıklamaya düşer. create_dues_dataset / propose_dataset_export adları uyum için korunur. Export aracı dosyayı doğrudan üretmez. Ortak plan enum'u UI onayı ve worker yolunda aynı doğrulanır. 453 test geçti; gerçek kaynak aracı/fake-fetch ve gerçek worker akışı canonical create_dataset üzerinden de doğrulandı.
