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
