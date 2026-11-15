# AI dataset araç API'si

İlk izinli kaynak `members.dues` (aidat). Kaynaklar serbest tablo/SQL adı değildir. Araçlar modül AI registry'sinden gelir; actor, modül, matris, rıza, provider revision ve feature flag kapıları korunur.

| Araç | Girdi | Model çıktısı |
|---|---|---|
| create_dataset | source: members.dues; query: year, status, minimumRemainingCents, maximumRemainingCents | 43 karakterlik süreli datasetRef ve count |
| query_dataset | datasetRef; izinli status/min-max kalan sent filtreleri | Yeni datasetRef ve count |
| export_dataset | datasetRef; format: csv/xlsx; columns enum | Sabit proposed acknowledgement; onay kartı UI'ya gider |

Query'nin durum enum'u OVERDUE/OPEN/PARTIAL/PAID/WAIVED/ALL'dur. Varsayılan OVERDUE. Tutarlar EUR sent cinsinden tamsayıdır; min > max reddedilir. İlk pilot 5.000 aday kayıtla sınırlıdır. Query alanları ve dosya kolonları ayrıdır: model ad, doğum tarihi, e-posta, IBAN veya SQL selector gönderemez.

Dosya kolonları `member.fullName`, `dues.year`, `dues.overdueAmount`. Gerçek isimler yalnız kaynak modülünün sunucu adapter'ından worker'a ve şifreli dosyaya gider. Kaynak kayıt ID'leri veya satırlar model çıktısı değildir. Snapshot/izin değişirse yeni önizleme gerekir.

Export aracı onaydan önce dosya üretmez. Kullanıcı yalnız proposalId onaylar; istemci payload'ı veya dosya içeriği kabul edilmez. Talep mevcut automation execution/outbox yoluna girer; ikinci kuyruk açılmaz.

## Dil ve uyumluluk

Araç açıklamaları `members.ai.tools.*.description` ve `exports.ai.tools.*.description` anahtarlarından isteğin TR/DE dilinde çözülür. Anahtar yoksa sabit açıklama kullanılır; eksik mesaj exception'ı üretilmez.

| Uyum adı | Önerilen ad | Fark |
|---|---|---|
| create_dues_dataset | create_dataset | Eski ad doğrudan year/filtre alır; yeni ad source + query içerir |
| propose_dataset_export | export_dataset | Aynı onay zorunluluğu ve aynı sıkı plan şeması |

Bu alias'lar v2 sözleşmesidir. Diğer modüllerin v1 araçlarının kaldırılması ayrı F02 işidir. Yeni dataset kaynakları ilgili modülün adapter/politika/onay/worker/download kabulü tamamlanmadan bu API'ye eklenmez.
