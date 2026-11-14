# AI v2 pilot ve geri alma

Bu belge kodun hazırlanmasını, üretimde etkinleştirilmesinden ayırır. Üretimde test DB komutları çalıştırılmaz.

## Sıra

1. Şifreli veriler dahil tutarlı DB/storage yedeği ve eski veri anahtarı erişimini doğrula.
2. CI test DB'sinde migration, şema drift, test ve build kapılarını çalıştır.
3. `AI_PERSONAL_EXPORT_ENABLED=false` ile sürümü dağıt; normal `pnpm db:deploy` sürecini kullan.
4. AI modülünün yeni users/exports/automation erişim bildirimlerini yönetici olarak incele ve onayla.
5. Yeni sağlayıcı yapılandırma sürümü nedeniyle kullanıcıların bilgilendirme onayını yenilemesini sağla.
6. Mevcut automation worker ve otomasyon özelliğini aç. `ai.cleanup_history` ve `exports.cleanup_files` otomatik zamanlamalarının oluştuğunu doğrula. Yönetici bunları kapatırsa worker yeniden açmaz.
7. Önce test kullanıcılarıyla isimli CSV/XLSX, rol iptali, stale veri ve dosya erişim testlerini tamamla.
8. Sonrasında `AI_PERSONAL_EXPORT_ENABLED=true` ile sınırlı pilot aç. Bu bayrak tüm kullanıcıların kaynak yetkilerini geçersiz kılmaz; her çağrıda yeniden kontrol edilir.

## Sağlayıcı hesabı için dış doğrulama (açık)

Gerçek organizasyon/proje hesabına erişilmedi; DPA, bölge ve retention seçenekleri doğrulanmış sayılmaz.
Resmî dokümantasyon kontrol tarihi: 14.11.2026.

- OpenAI: https://developers.openai.com/api/docs/guides/your-data ve https://developers.openai.com/api/docs/guides/data-residency . Bölge/saklama ayarları proje ve hesap uygunluğuna bağlıdır; bir API anahtarı tek başına bunları kanıtlamaz.
- Anthropic: https://platform.claude.com/docs/en/manage-claude/api-and-data-retention . Retention şartları modele/hesaba göre değişebilir; bu kod otomatik model fallback açmaz.
- Mistral: https://help.mistral.ai/en/articles/347612-can-i-activate-zero-data-retention-zdr . ZDR'nin hesabın ve kullanılan stateless çağrının kapsamına uygulanması ayrıca kontrol edilmelidir.

Bulut sohbeti yalnız tanımlı istatistik/dosya niyetlerini kanonik isteğe dönüştürerek işler. Kullanıcının serbest metni ve eski sohbet geçmişi buluta aktarılmaz. Hazır niyetler: Üye sayısı 2026, Bağış özeti 2026, Aidat dosyası 2026; Almanca/İngilizce karşılıkları desteklenir. Diğer metinler kontrollü reddedilir. Yerel modelin de gizlilik politikaları, ağ erişimi ve içerik izni ayrıca yönetilir; regex tam anonimleştirme garantisi değildir.

## Şifreleme anahtarı

DATA_ENCRYPTION_KEYS JSON anahtar haritası ve DATA_ENCRYPTION_CURRENT_KEY ile yeni yazımlar v2 key ID taşır. Eski key ID'lerini okumalar bitene kadar tut. V1 kayıtları için eski AUTH_SECRET değerini güvenli biçimde DATA_ENCRYPTION_LEGACY_SECRET olarak koru. Yeni AUTH_SECRET ile oturum anahtarını değiştirmek eski veri anahtarını silmek anlamına gelmemelidir. Önce v2 okuyabilen sürümü dağıt, sonra yeni anahtarla yazmayı aç. V2 ciphertext yazıldıktan sonra yalnız v1 okuyabilen eski binary’ye doğrudan dönülmez; uyumlu okuyucu korunmalı veya doğrulanmış geri sarma uygulanmalıdır. Anahtarlar Git'e, loga veya UI'ye konmaz.

Bu paket otomatik toplu re-encryption işi başlatmaz. Ciphertext'leri yeniden yazmadan eski key'leri kaldırmak veri kaybıdır. Rotasyon önce test kopyasında kanıtlanmalıdır.

## Bütçe ve gözlem

AI_DAILY_TOKEN_BUDGET kullanıcı/gün için muhafazakâr byte+çıktı token rezervasyonu sınırıdır; faturalandırılmış token ölçümü veya EUR maliyet garantisi değildir. Günlük EUR bütçesi için gerçek model fiyatı/sağlayıcı hesabı kontrolü hâlâ gereklidir. Model turu 6, toplam araç çağrısı 20, araç model çıktısı 64 KiB, istek deadline 120 saniyedir.

AiUsageBucket içindeki metric:usage_denied, metric:request_denied, metric:request_failed, metric:export_failed saatlik sayaçları içerik taşımaz. AutomationExecution/Log alanları iş gecikmesi, lease ve retry bilgilerini verir. Dış izleme/alert eşikleri operasyon ortamında kurulmalıdır.

## Durdurma

- Kişisel dosya akışını kapat: AI_PERSONAL_EXPORT_ENABLED=false; pending dataset işleri güncel izin/bayrak kontrolüyle durdurulmalı.
- İlgili kaynağı veya AI matrisini kapat; yeni tool/confirm/worker çalıştırmaları reddedilir.
- Worker'ı durdur; çalışan dış yan etkilerin iptali kesin gerçekleşmiş sayılmaz.
- Uygulamayı önceki sürüme alırken yeni tabloları otomatik DROP etme. İleri dönük migration korunur; geri dönüş DB'yi yıkmaz.
- EXECUTING durumunda kalmış öneri otomatik tekrar uygulanmaz. Operatör kaynak kaydı ve audit'i incelemeden aynı yan etkiyi yeniden başlatmaz.

## Açık işler

Tüm eski araçların v2 projection şemasına taşınması, cursor ile UI geçmişi, para biriminde bütçe, büyük veri için streaming ve 17 modülün tamamının dönüşümü TODO'da açık tutulur. S1–S6 sekreter ürünleri ayrı kapsamdır; bu belge bunların uygulandığını iddia etmez. Shopify benzeri tema çalışması da bu kabul sürecinden sonra yapılacaktır.
