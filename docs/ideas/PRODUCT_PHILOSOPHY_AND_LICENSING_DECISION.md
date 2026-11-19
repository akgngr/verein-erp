# Verein ERP — Ürün Felsefesi ve Lisans Kararı İçin Notlar

> **Durum:** Ürün sahibi tarafından 2026-11-19 tarihinde kabul edilen **ürün ilkeleri**; lisans/paketleme/ticari model ise **ertelenmiş karar**. Bu metin bir lisans seçimi, fiyat taahhüdü veya modülleri kapatma talimatı değildir.
>
> **Karar zamanı:** Tüm hedef modüller ürün ve kalite açısından hazır olduğunda; hukuk, kullanıcı ihtiyacı, maliyet ve sürdürülebilirlik değerlendirmesi tamamlandıktan sonra ayrı ADR ile.

## 1. Temel felsefemiz

**Karmaşıklık satmayacağız; kullanıcıya zaman, kontrol ve huzur kazandıracağız.**

- **İş sonuçları modül sayısından önemlidir.** “40 modül” yerine “Derneğinizi/işletmenizi teknik uzman olmadan yönetebilirsiniz” vaadini doğrulanabilir kullanıcı senaryolarıyla destekle.
- **Sadelik:** Bir işi tamamlamak için gereken ekran, alan ve tıklama sayısını azalt; gereksiz ayarları zorunlu kılma.
- **Tutarlılık:** Modüller ortak UI, erişilebilirlik, navigasyon, yetki, durum, hata ve bildirim standartlarını kullanır. Kullanıcı bir modülü öğrendiğinde diğerlerinde yabancılık yaşamaz.
- **Modüler ama bütünlüklü:** Modüller kendi verilerinin, API'lerinin ve yetkilerinin sahibidir. Ortak iş akışları AI Chat, Personal Secretary ve otomasyon üzerinden birbirine bağlanabilir; çapraz modül veri erişimi rastgele yapılmaz.
- **Güven ve denetlenebilirlik:** AI Chat kullanıcı isteği üzerine yardımcı olur; Sekreter proaktif durumları ve önerileri yönetir; otomasyon yalnız yetkili/uygun şekilde onaylanmış işleri yürütür. Kaynağı, gerekçesi, yetki sınırı ve işlem/audit sonucu anlaşılır olmalıdır. Dışa etkili işlemlerde açık onay esastır.
- **Datenschutz ve kullanıcı kontrolü:** Veri minimizasyonu, rol/tenant/satır düzeyi yetki, self-host seçeneği, güvenli varsayılanlar, açık veri dışa aktarma ve silme süreçleri temel ürün niteliğidir.
- **Performans:** Görsel şıklık iş akışını yavaşlatmamalı; hafif, erişilebilir, mobil uyumlu arayüzler tercih edilir.
- **Açıklık ve dürüstlük:** Nelerin açık kaynak, ücretsiz, ücretli veya yönetilen hizmet olduğu; kapsam, bakım yükü ve kısıtlar anlaşılır biçimde anlatılmalıdır.

## 2. Odoo'dan alınacak ders, tekrar edilmeyecek yönler

Bu bölüm bir rakip hakkında kesin teknik hüküm değil, kendi ürün tercihimizdir.

| Öğrenilecek yaklaşım | Kaçınılacak risk |
| --- | --- |
| Düşük giriş eşiği ve erişilebilir başlangıç | Kullanıcıyı daha ilk günden karmaşık fiyat/kurulum/ayar süreçlerine sokmak |
| Büyümeye uygun modüler kapsam ve ekosistem | Modüller arasında kopuk kullanıcı deneyimi ve tutarsız süreçler |
| Ölçeklenebilen ticari sürdürülebilirlik | “Open source” ifadesinin Community/Commercial sınırlarını belirsiz bırakması |
| Müşterinin kullanarak değer görmesi | Kullanıcıyı sürekli ek özellik veya ek kullanıcı satın almaya zorlamak |

## 3. AI Chat + Kişisel Sekreter + Otomasyon farkımız

- **AI Chat — reaktif:** Soruları cevaplar, izinli verilere dayalı analiz ve taslaklar sunar.
- **Personal Secretary — proaktif:** Modül bazında `secretary.ts` sağlayıcılarından izinli özet/öneri alır; günlük işleri ve onay kutusunu koordine eder.
- **Otomasyon — yürütme:** Yetki, onay, idempotency, kuyruk, hata takibi ve audit çerçevesinde işleri gerçekleştirir.
- **Ortak sözleşmeler:** `ai.ts` ve `secretary.ts` farklı giriş kapıları olabilir; modülün güvenli iş servisleri gereksiz tekrar olmadan paylaşılır. AI veya Sekreter modül tablosuna doğrudan kestirme erişim sağlamaz.
- **Ölçülebilir değer:** Görev tamamlama süresi, adım/tıklama sayısı, zamanında tamamlanan işler ve kullanıcı memnuniyeti izlenir. AI kararları otomatik olarak “doğru” varsayılmaz.

## 4. Lisans ve ticari ayrım — **henüz karar verilmedi**

**Şu anda hiçbir özgür/açık kaynak lisansı, open-core sınırı, ücretli modül listesi, kullanıcı veya kuruluş bazlı fiyatlandırma ve abonelik rakamı onaylanmış değildir.** Yeni modüller geliştirilirken lisans değişikliği ya da ücretli erişim kısıtlaması bu nota dayanılarak uygulanamaz.

Değerlendirilecek seçenekler:

1. **Community:** Temel özelliklerin açık kaynak ve self-host kullanılabilmesi; uzun vadeli bakım/güvenlik taahhüdünün maliyeti.
2. **Yönetilen Cloud:** Barındırma, yedekleme, güncelleme, destek ve hizmet seviyesi karşılığında ücret.
3. **Opsiyonel ticari/Enterprise yetenekleri:** Büyük ölçekli yönetim, özel entegrasyon, destek veya yüksek maliyetli AI/otomasyon kapasitesi için ayrı seçenek; kapsam **henüz belirsiz**.
4. **Fiyatlandırma birimi:** Özellikle dernek ve gönüllü kullanıcılar için kuruluş bazlı fiyat ile kullanıcı başına fiyatın etkilerini karşılaştır; küçük ekiplerin büyümesini cezalandırma.
5. **AI maliyetleri:** Yerel/öz barındırılan modeller, üçüncü taraf API giderleri, kullanım kotası ve maliyet açıklığı.

### Karardan önce kontrol listesi

- [ ] Hedef modüller ve kritik iş akışları tamamlandı, kullanıcı kabul testleri yapıldı
- [ ] Kullanıcı segmentleri (dernek, KOBİ, freelancer) ve gerçek ödeme isteği araştırıldı
- [ ] Barındırma, destek, güvenlik bakımı ve AI maliyetleri hesaplandı
- [ ] Mevcut bağımlılıkların lisansları, katkıcı hakları ve üçüncü taraf yükümlülükleri incelendi
- [ ] Self-host, veri taşınabilirliği, GDPR/Datenschutz ve hizmet/abonelik sözleşmeleri değerlendirildi
- [ ] Community ile ticari ürün arasındaki sınır ve yükseltme politikası açıkça tasarlandı
- [ ] Lisans, fiyat ve paket kararı ayrı bir **ADR** ile onaylandı; ardından docs/site/UI'a uygulandı

## 5. Gelecek ürün kararlarını sınayan sorular

1. Bu özellik kullanıcının gerçekten daha az çabayla iş bitirmesini sağlıyor mu?
2. Başka bir modülde aynı iş için farklı bir kullanıcı deneyimi yaratıyor mu?
3. AI olmadan temel iş akışı güvenli ve anlaşılır şekilde çalışıyor mu?
4. Kullanıcı AI/Sekreter önerisini neden gördüğünü ve neye onay verdiğini anlayabiliyor mu?
5. Açık kaynak, self-host ve ticari seçenekler hakkında yanlış beklenti yaratıyor muyuz?
6. Bu özellik bir dernek ya da küçük işletme için adil ve sürdürülebilir mi?

## 6. Sonraki adım

Modüller tamamlandıktan sonra `docs/adr/` altında **“Lisans, Community/Commercial sınırı ve fiyatlandırma”** başlıklı ayrı bir karar kaydı oluşturulacak. Bu kayıt öncesinde burada sayılan fiyat/modül ayrımları yalnız araştırma hipotezidir.

**Ürün konumlandırma taslağı:** *“İşlerinizi yalnızca kaydeden değil, işlerinizi yönetmenize yardımcı olan akıllı ERP.”*
