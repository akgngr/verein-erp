# Merkezi Dosya Üretim ve Dağıtım — TODO

- **Şartname:** [CENTRALIZED_FILE_PIPELINE_SPEC.md](./specs/CENTRALIZED_FILE_PIPELINE_SPEC.md)
- **Durum:** Planlandı — henüz uygulama yok
- **Başlama koşulu:** Mevcut Automation P0 güvenilirlik işleri tamamlanmalı; P1 işleriyle bağımlılıklar netleştirilmeli.
- **Kural:** Bu backlog tamamlanana kadar mevcut modüllerde doğrudan dosya üretim/indirme kodu için toplu refactor başlatılmayacak.

İşaret kutuları uygulama ilerledikçe PR'larla güncellenecektir.

## FILE-0 — Mevcut sistem envanteri ve tasarım doğrulaması

- [ ] Tüm modüllerde dosya üretim noktalarını tespit et.
- [ ] Doğrudan `Content-Disposition: attachment` veya download response oluşturan handler'ları listele.
- [ ] Client-side Blob/object URL ile indirme yapan noktaları tespit et.
- [ ] Mevcut upload, preview, storage ve download akışlarını haritala.
- [ ] Prisma file modellerini ve modül ilişkilerini envanterle.
- [ ] Format/kütüphane bağımlılıklarını ve lisanslarını belirle.
- [ ] Permission, tenant izolasyonu ve audit davranışlarını karşılaştır.
- [ ] Deployment, UPLOAD_DIR, volume ve backup beklentilerini doğrula.
- [ ] Mevcut schema symlink ve migration kurallarını not et.
- [ ] İlk pilot modülü ve geçiş sırasını seç.

## FILE-1 — Merkezi Files altyapısı

- [ ] Files modülünü ve module.config kaydını oluştur.
- [ ] Merkezi dosya metadata veri modelini tasarla.
- [ ] Migration oluştur ve schema/migration eşleşmesini doğrula.
- [ ] Server-only Files service API'sini oluştur.
- [ ] StorageProvider interface'ini tanımla.
- [ ] Mevcut `shared/files` yardımcılarını kontrollü biçimde yeniden kullan.
- [ ] Local filesystem provider'ını oluştur.
- [ ] Metadata, MIME, byte size ve SHA-256 yönetimini ekle.
- [ ] Tenant ve permission kontrollerini uygula.
- [ ] Modül-özel file relation'larını koruyacak ilişki desenini uygula.

## FILE-2 — Automation entegrasyonu

- [ ] Files generation task sözleşmesini tanımla.
- [ ] `requestGeneration` API'sini mevcut Automation API/outbox'a bağla.
- [ ] File record ve Automation execution ilişki/recovery davranışını kur.
- [ ] Generator Registry'yi oluştur.
- [ ] Worker-safe generator handler sözleşmesini tanımla.
- [ ] Retry ve idempotency politikasını uygula.
- [ ] Timeout ve AbortSignal desteğini uygula.
- [ ] Lease/heartbeat/fencing/recovery kurallarını mevcut Automation ile eşleştir.
- [ ] Stream output ve storage finalization akışını tamamla.
- [ ] Yarım kalan dosyalar ve orphan storage nesneleri için cleanup/recovery ekle.
- [ ] Execution loglarını fileId/executionId ile ilişkilendir.

## FILE-3 — Generator altyapısı ve formatlar

- [ ] Format registry ve MIME/extension doğrulamasını oluştur.
- [ ] XLSX generator.
- [ ] CSV generator.
- [ ] PDF generator.
- [ ] DOCX generator.
- [ ] JSON generator.
- [ ] XML generator.
- [ ] Markdown/TXT generator.
- [ ] PNG/JPG/WEBP generator veya dönüştürücüleri.
- [ ] SVG generator ve sanitize politikası.
- [ ] ZIP generator.
- [ ] Generator versioning ve payload schema doğrulamasını ekle.

## FILE-4 — Download, erişim ve dosya yaşam döngüsü

- [ ] Yetkilendirilmiş download endpoint'ini oluştur.
- [ ] Kısa süreli signed URL desteğini (provider uygunsa) ekle.
- [ ] RFC 5987 uyumlu dosya adı ve güvenli Content-Disposition uygula.
- [ ] Büyük dosyalar için stream tabanlı download/preview uygula.
- [ ] Download/preview audit kayıtlarını ekle.
- [ ] Soft-delete ve fiziksel silme süreçlerini ayır.
- [ ] Expiration/retention politikalarını uygula.
- [ ] Dosya versiyonlama politikasını uygula.
- [ ] Dosya boyutu, format ve tenant quota limitlerini ekle.

## FILE-5 — Mevcut modüllerin taşınması

- [ ] Documents modülünün upload/download ilişkilerini Files'a bağla.
- [ ] Documents Excel export işlemini taşı.
- [ ] Accounting export işlemlerini taşı.
- [ ] Members export işlemlerini taşı.
- [ ] Donations export işlemlerini taşı.
- [ ] Feedback ve diğer upload kullanan modülleri değerlendir/taşı.
- [ ] Diğer bütün export/download handler'larını envantere göre taşı.
- [ ] İlgili UI'ları asenkron durum takibine geçir.
- [ ] Eski endpoint'ler için kontrollü deprecation/uyumluluk planı uygula.
- [ ] Modüllerde doğrudan download response üretimini kaldır.

## FILE-6 — Files Control Center

- [ ] Dosya listesi, arama, filtre ve sayfalama ekranı.
- [ ] QUEUED/PROCESSING/READY/FAILED durum göstergeleri.
- [ ] Modül, format, owner ve tarih filtreleri.
- [ ] Execution/attempt/log detayına bağlantı.
- [ ] Yetkili manuel retry.
- [ ] Güvenli cancellation.
- [ ] Yetkili download ve delete işlemleri.
- [ ] Depolama kullanım metrikleri.
- [ ] Format/modül dağılımı ve üretim süresi metrikleri.
- [ ] Retention/expiration yönetimi.

## FILE-7 — Test, güvenlik ve üretime hazırlık

- [ ] Generator registry unit testleri.
- [ ] Files service/API permission ve tenant testleri.
- [ ] Automation enqueue/idempotency/retry/recovery entegrasyon testleri.
- [ ] Duplicate generation ve aynı talebin tekrar teslimi testleri.
- [ ] Worker crash, timeout ve lease recovery testleri.
- [ ] Storage stream/checksum/partial cleanup testleri.
- [ ] Büyük dosya/backpressure testleri.
- [ ] Signed URL expiry ve yetkisiz indirme testleri.
- [ ] Cross-tenant erişim reddi testleri.
- [ ] MIME spoofing, path traversal ve filename testleri.
- [ ] SVG/aktif içerik güvenlik testleri.
- [ ] Export çıktıları için regresyon testleri.
- [ ] Migration ve schema drift kontrolleri.
- [ ] Typecheck, lint, test ve production build.
- [ ] Modül sınırı/worker-safe import kontrolleri.
- [ ] Geliştirici ve operasyon dokümantasyonunu güncelle.
- [ ] Doğrudan download response kullanımını engelleyen mimari test/lint kuralı ekle.

## Tamamlanma kapısı

- [ ] Bütün üretim talepleri Files API üzerinden oluşturuluyor.
- [ ] Bütün dosya üretim işleri mevcut Automation Core'dan geçiyor.
- [ ] İndirme erişimi Files modülünden yetkilendiriliyor.
- [ ] Eski modüllerin doğrudan dosya indirme/üretim yolları kaldırıldı veya belgeli istisnaya bağlandı.
- [ ] Tenant izolasyonu, retry/idempotency, recovery ve güvenlik testleri geçiyor.
- [ ] CI ve production build başarılı.
- [ ] Geçiş ve işletim dokümantasyonu tamamlandı.
