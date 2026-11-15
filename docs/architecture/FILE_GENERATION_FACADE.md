# Merkezi dosya talep facade'ı — ilk üretici

Dosya talebi, metadata ve publication yaşam döngüsünün sahibi mevcut `exports` modülüdür. İkinci bir Files modülü veya queue oluşturulmaz. `FileGeneration` genel metadata'yı, `AiExportRequest` ise AI'ya özel dataset/revision/kolon/onay bağını tutar. Kaynak iş modülü kendi planını ve source yetkisini korur. İlk üretici üyelerin aidat CSV/XLSX akışıdır; diğer doğrudan download handler'ları bu paketle topluca taşınmaz.

Web servisleri `@/modules/exports/server`, worker'lar `@/modules/exports/automation` public girişlerini kullanır. Source actor yetkilendirmesi bu çağrıdan önce ilgili modülün sorumluluğudur.

## Sözleşme

1. Kaynak servis actor/rol/modül/matris/rıza ve scope/snapshot kontrollerini yapar.
2. `prepareGenerationRequest` metadata, kayıtlı generator/task ve kullanılabilirlik kontrolünü transaction dışında yapar.
3. Kaynak transaction'ı kendi plan kaydıyla `requestGeneration(prepared, tx)` çağırır. `FileGeneration`, tek automation execution ve outbox atomik commit olur. Kaynak transaction yoksa facade kendi transaction/idempotency recovery'sini kullanır.
4. Worker source yetkisini ve input'u yeniden doğrular. Runtime'dan gelen executionId/leaseToken ile `startGeneration` çağırır.
5. Her lease ayrı attempt dosya kimliği kullanır. Byte'lar şifreli saklanır; GeneratedFile.publicationPending=true olduğu sürece liste ve download görünmez.
6. Kaynak kontrollerinden sonra aynı transaction'da kaynak durumunu ve `finalizeGeneration` çağrısını commit eder. Automation lease row'u kilitli doğrulanır; FileGeneration READY ve GeneratedFile publication birlikte değişir.
7. Abort/kayıp lease eski denemenin dosyasını yayımlayamaz. Temizleme yalnız o denemenin ayrı ID'sine uygulanır; sonraki worker'ın dosyasını silemez.

`GeneratedFile` yeni generationId, publicationPending ve SHA-256 metadata'sını taşır. Eski dosyaların alanları nullable/default uyumludur. Generic başlık şifreli, byte'lar AES-GCM'dir. Actor/source yetkisi download'da ayrıca yeniden kontrol edilir; referans veya dosya ID'si izin değildir.

## Worker-safe public sınır

`automation/public/file-generation` registry bağımsız dar girişidir. Status/lease/transaction/outbox işlemlerini sunar; workflow registry'yi eager import etmez. Kayıtlı task kontrolü yalnız prepare çağrısında ertelenmiş sabit import ile yapılır. Bu, module automation tanımlarının kendi registry'sine döngüyle bağlanmasını önler. Modül validator'u yalnız bu açık girişi tanır; services/private import'ları serbest bırakılmaz.

## Geçiş ve operasyon

`20261115094500_file_generations` eklemeli migration'dır. Önceki migration dosyaları değiştirilmez. Eski AI talepleri aynı ID/execution/file bağlarıyla taşınır; tamamlanmış dosyalar korunur, yarım eski byte'lar publication/deletion pending olur. İlgisiz dosyalar etkilenmez. Kişi tablolarında değişiklik yoktur.

Güvenli sıra: kişisel export bayrağını kapat, eski worker'ları durdur, migration'ı uygula, bütün web okuyucularını güncelle, exports→automation erişim onayını yenile, yeni worker'ı başlat ve test kullanıcılarıyla kabul et. Bütün okuyucular publicationPending filtresini öğrenmeden yeni worker/personal export açılmaz. Eski binary'ye bu alanları yok sayarak dönülmez.

## Sınırlar

Bu ilk producer/facade paketidir; tüm formatların ve modüllerin merkezi dosya pipeline'ına geçişi değildir. Kaynak 5.000 aday ve renderer 10 MiB ile sınırlı Buffer kullanır. Büyük veri streaming/row iterator D06'da ayrıdır. Queue teslimi en az bir defadır; iş/file state CAS ve lease fencing ile korunur. Harici yan etkiler için exactly-once iddiası yoktur.
