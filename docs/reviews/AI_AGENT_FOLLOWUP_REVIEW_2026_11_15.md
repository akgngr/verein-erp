# İkinci AI agent çalışması — kod incelemesi

İlk incelenen sürüm: main `58adc1876ba6172e809214633a815998965adab2` (15.11.2026). Takip incelemesi: `320a41e8bc62cc4ec08d9fb8e5e2bbc3c4ad52ff` (16.11.2026). Karşılaştırma: ilk v2 öneri paketinin `7ccbfbe` ağacı sonrası değişiklikler. Bu bir kod/negatif örnek incelemesidir; gerçek sağlayıcı hesabı veya üretim pilotu testi değildir. Eklenen sohbet dosyası agentin gerekçe notu değil, eski PR #152 CI logudur. Logdaki Set<string>/PolicyTable TypeScript hatası sonraki `860e19c` commit'inde düzeltilmiştir.

## Sonuç

PS1–PS5 ve EV1–EV3 anlamlı ürün yetenekleri eklemiştir. Konuşma kapsamlı takma ad, canlı isim çözümleme, varsayılan kapalı kişi düzeyi bulut ayarı, sağlayıcı revision/rıza bağı, yerel OCR ve taslak/onay ağırlıklı iş akışı doğru yöndedir. Ancak orijinal TODO tamamlanmamıştır ve yeni bulut içerik yolları ilk şartnamenin daha dar sınırını genişletmiştir. “Kişisel veriyi AI hiçbir şekilde okuyamaz” kabulü bu sürüm için verilmemelidir.

## Bulgular

### Yüksek — serbest metin ve belge bulut taraması kaçırılan kişisel içeriği güvenli kabul ediyor

Kaynaklar: `src/modules/ai/services/cloud-preflight.ts`, `cloud-screening.ts`, `document-masking.ts`, `document-summary.ts`.

Bilinmeyen isimler sınırlı ön-ad sözlüğü ve büyük harf kalıbıyla aranır. Özel kategori taraması ancak kişi bulunduysa engel olur. Tamamen sentetik `Xaviera Sondermann hat eine schwere Allergie.` girdisi bilinen kişi listesi boşken preflight'tan geçer; belge maskelemesi de aynı metni değiştirmeden kabul eder. Bu test yerel saf fonksiyonlarla yapılmıştır; hiçbir gerçek sağlayıcıya metin gönderilmemiştir. Bir ismin regex/sözlükte bulunmaması metnin kimliksiz olduğunu kanıtlamaz.

`SCREENED` ayarı açıldığında sohbet serbest metni bu kapıdan sağlayıcıya gider. Belge özeti de aynı modda maskelenmiş saydığı metni buluta verir; `read_content` izni kimliksizleştirme kanıtı değildir. Üstelik relay karar belgesi belge/e-posta/görev içeriğinin hiçbir bulut modunda açılmayacağını söylerken EV-2 uygulaması bu sınırı açmıştır.

Öneri: doğrulanmış declassification/redaksiyon yolu olmadan belge serbest metnini local-only tut; bulutta kontrollü niyet ve typed projection kullan. Serbest metin ürün olarak korunacaksa risk modeli ve kullanıcı kabulü ayrı ve açık olmalı, tarama için “fail-closed / bilinmeyen PII gitmez” iddiası kaldırılmalıdır. Yeni negative provider-wire testleri isim sözlüğü dışında, küçük harf, farklı alfabe, sağlık bağlamı ve kategori başlıklarını da kapsamalıdır. Bu inceleme canlı ayar değiştirmemiştir.

### Yüksek — cached sohbet cevabı güncel kaynak yetkisini atlayarak çözülmüş isim döndürüyor

Kaynaklar: `src/modules/ai/handlers/chat.ts` (iki cached return yolu), `services/turns.ts`.

Yeni normal cevapta alias canlı yetkiyle çözülür; fakat `response.reply` gerçek isimli gösterim sonucuyla `AiTurnClaim.resultEnc` içine yazılır. Aynı requestKey tekrarlandığında cached response doğrudan döner ve alias/source yetki kapısı çalışmaz. Kaynak modül/rol izni sonradan kaldırılmış olsa bile AI erişimi devam eden kullanıcı eski isimli cevabı tekrar alabilir. DB bağımlılığı yerine içerik kontrollü test çiftinde `getCachedAiTurn` eski çözülmüş isimli yanıtı hiçbir kaynak çağrısı olmadan döndürdü.

Öneri: idempotency cevabını alias biçiminde sakla; ilk cevap ve her cache yolu aynı canlı display çözümlemesini kullansın. Eski cache kayıtları için güvenli uyumluluk/ret politikası belirle. Rol/matris/modül/kayıt silme sonrası aynı requestKey ile replay regresyonu ekle.

### Orta — alias yaşam döngüsü ve çocuk verisi sınırında açıklık eksik

Kaynaklar: `services/aliases.ts`, `known-identifiers.ts`, `cloud-screening.ts`.

Alias scope araması providerRevision'a göre filtrelenmez; politika değişiminde yeni alias üretimi eski scope'u tekrar kullanabilir. Aynı anda ilk scope'u açan iki çağrı için tek scope'u zorlayan unique/transaction kapısı yoktur. Gösterimde ilk seçilen scope dışındaki referanslar kaybolabilir veya sıra numaraları karışabilir. Çözümleyici rol/modül yetkisini kontrol eder, AI matrisini kontrol etmez.

Öğrenci/veli kayıtları SCREENED metninde alias'a çevrilebilir; sentetik `Schülerin Livia Sommer besucht die Grundschule.` örneği bir student alias'ıyla geçer. Karar belgesindeki “çocuk verisi takma adla da buluta gitmez” kuralını bu yol uygulamaz. Kaynak türü metin tarama kararına taşınmalı; çocuk kaynağı için açık ret/local-only gerekir.

### Orta — OCR sınırları web worker kaynak tüketimini tamamen sınırlamıyor

Kaynaklar: `src/modules/documents/services/ocr.ts`, `document-analysis.ts`, `handlers/analyze-file.ts`.

60s timer Tesseract worker oluşturulduktan sonra başlar; worker başlangıcı ve PDF image extraction kapsanmaz. Piksel sayısı/eşzamanlı OCR iş sayısı sınırı yoktur. Büyük sıkıştırılmış görüntü/PDF daha pahalı decode/bellek tüketimine yol açabilir. PDF'in ilk 5 sayfası işlenir, ancak sonuçta “kısmi/truncated” bilgisi yoktur; ileri sayfadaki termin veya tutarın görülmediği kullanıcıya anlaşılmayabilir.

Öneri: tek toplam deadline, decode öncesi görüntü/piksel ve concurrency bütçesi, AbortSignal, PDF kaynak cleanup ve açık completeness bilgisi. Web üzerinde küçük dosya pilotu anlaşılır bir tercih olsa da “otomasyon izni modülü kilitlerdi” gerekçesi kaynak bütçesinin alternatifi değildir.

### Orta — görev ve kabul dokümanları yeni kodla eşzamanlı tutulmamış

Relay belgesi TODO'da F06'ya işaret eder; incelenen listede F06 yoktur. Beşten küçük grup sayımlarının bastırılması karar belgesinde yer alır, fakat `list_dues_by_person` tek kişilik sonucu da döndürebilir. EV-1 belgesi OCR konumunu shared olarak yazar; gerçek servis documents sahibindedir. Bu farklar tamamlanma/koruma iddialarının denetlenmesini zorlaştırır.

## Orijinal işlerden kalanlar

| Madde | Kodda gözlenen durum |
|---|---|
| E08 | Gerçek sağlayıcı hesabı, bölge/saklama/fiyat/timeout kabul kanıtı yok. |
| E12 | Flag/runbook mevcut; gerçek pilot ve imzalı kabul matrisi tamamlanmış değil. |
| F01 | Öğrenci/veli için label/alias helper'ları var; tam izinli çocuk adapter/export geçişi bitmemiş. |
| F02 | İlk kontrolde 26 legacy araç vardı; #164 muhasebenin 6 aracını taşıdı. Güncel kalan sayı 20; registry fallback'i sürüyor. |
| F03 | Aidat hatırlatma taslağı → bağımsız gönderim onayı → mailings akışı henüz yok. |
| F04 | OCR/form doldurma/özet bir kısmı karşılıyor; brifing, inbox, uygun zaman, takip ve ses akışları bitmemiş. Ayrı v2 planı gereklidir. |
| F05 | Bu çalışma GraphQL gereksinimini kanıtlamıyor; transport kararı ayrı kaydedilmeli. |
| Evrak | `analyze_document` sohbet aracı yeni evrak şartnamesinde açık. |
| Merkezi dosya | İlk aidat pilotu hazır; tüm producer/formatların merkezi dosya yoluna geçişi tamamlanmış değil. |

F04 orijinal görevde ayrı plan hazırlamayı ister; S1–S6'nın tamamı uygulanmış varsayılmamalıdır. Açık kutuların sayısı tek başına kod eksikliği sayısı değildir; bazıları gerçek hesap/pilot kabulü gerektirir.

## Doğrulama

Son birleşen PR #160 head `0c46da9`: CI run 43769397296 ve Security 43769397252 başarılı. Yerelde incelenen main üstünde baseline migration yükseltmesi/drift ve 488 test / 100 suite çalıştı: 488 başarılı, 0 başarısız, 0 atlanan. Bu testler yukarıdaki atlanan durumları kapsamadığından yeşil CI bulguları geçersiz kılmaz. Ek sentetik negatif örnekler ağ kullanmadan çalıştırıldı. Gerçek müşteri kaydı, üretim migration'ı veya dış mesaj gönderimi kullanılmadı.


## 16.11.2026 — eşzamanlı yeni main güncellemesi

PR #163 modüller arası bağları açıkça beyan edip sınır testi eklemiştir; bu, mimari denetlenebilirlik açısından olumlu bir gelişmedir. PR #164 muhasebenin 6 aracını v2'ye taşımış ve takma adlı üye profili aracı eklemiştir. Kalan legacy araç sayısı 20'dir. İlk test sayısı 488, 58adc18 ağacına aittir; yeni ağacın doğrulaması ayrıca yapılmalıdır. Önceki yüksek öncelikli iki bulgunun ilgili kodu bu iki PR'da değişmemiştir.

Yeni üye profili girişinde `name` serbest ad parçası kabul eder. Bu, yalnız opaque referans üzerinden sorgu tasarımından farklı bir ürün kararıdır; kısmi adın bulut modeline aktarılması risk modeline açıkça yazılmalıdır. `overdueEur`, tüm borçların toplamı değil `listMemberDues(...).slice(0,5)` içindeki gecikmiş borçların toplamıdır. Beş yıldan eski borç varsa eksik toplam olarak anlaşılabilir; ya tüm izinli satırlardan aggregate hesaplanmalı ya kapsam alan adına/metadata'ya yansıtılmalıdır.

Muhasebe aggregate DTO'larında kategori ve hesap adı gibi serbest metin etiketleri vardır. Bunları `aggregate` olarak işaretlemek, etiket içeriğinde kişisel veri olmayacağını tek başına garanti etmez. Bulut kapsamına yeni eklenen bu alanlar projection/content açısından ayrıca değerlendirilmelidir; bu bir üretim kaydında sızıntı gözlemi değil şema ve kaynak türünden çıkarılan risktir.
