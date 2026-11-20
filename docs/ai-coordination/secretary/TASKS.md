# Kişisel Sekreter — görev panosu

**Şartname:** [`docs/specs/PERSONAL_SECRETARY.md`](../../specs/PERSONAL_SECRETARY.md) · **Protokol:** [`../README.md`](../README.md) · **Koordinatör:** Claude

**Son doğrulama:** 2026-11-19 (GitHub Issue durumları ve PR #320 merge kaydı, `alpha`). Bu panoda **done** = GitHub Issue kapalı; **open** = Issue açık. `status:*` etiketleri bazı kapalı Issue'larda hâlâ `status:ready` olduğundan tek başına güncel durum kaynağı değildir. Kodun kabul/CI durumu yalnızca Issue kapanışından çıkarılamaz.

| Aşama | Kod | Issue | Sahip | Görev | Bağımlılık | Durum | Not |
|---|---|---|---|---|---|---|---|
| S0 | T0.1 | #248 | Claude | ADR 0005 — AiProposal genelleştirmesi | — | done | |
| S0 | T0.2 | #249 | Claude | `secretary` modül iskeleti | — | done | |
| S0 | T0.3 | #250 | Claude | Sözleşme + `secretary.ts` kaydı + sınır testi | #249 | done | |
| S0 | T0.4 | #251 | Claude | Tablolar + migration | #249 | done | |
| S0 | C0 | #257 | ChatGPT | İş bölümü onayı ve takvim (doküman) | — | done | Issue kapalı; koordinasyon dokümanı tamamlandı |
| S1 | T1.1 | #252 | Claude | Toplayıcı `getBriefing` | #250, #251 | done | |
| S1 | T1.2 | #253 | Claude | Sağlayıcılar: accounting, documents, members | #250 | done | |
| S1 | T1.3 | #258 | ChatGPT | Sağlayıcılar: tasks, calendar, meetings | #250 | done | PR #289 alpha merge; güvenlik testleri Claude #292 |
| S1 | T1.4 | #259 | ChatGPT | "Bugün" kartı + sekreter sayfası | #249, #250 | done | Issue kapalı; UI #288 ve panel entegrasyonu #291 geçmişi |
| S1 | T1.5 | #254 | Claude | Kapat/ertele eylemleri | #251 | done | |
| S1 | T1.6 | #260 | ChatGPT | Kapat/ertele UI + smoke | #254, #259 | done | Issue kapalı; kapanış/erteleme UI görevi |
| S2 | T2.1 | #255 | Claude | Kural kaynaklı öneriler + onay yolu | #248, #252 | done | |
| S2 | T2.2 | #261 | ChatGPT | Onay kutusu UI | #255 | done | Issue kapalı; onay kutusu UI görevi |
| S3 | T3.1 | #256 | Claude | Günlük özet işi, sessiz saatler | #252, #251 | done | |
| S3 | T3.2 | #262 | ChatGPT | Tercih ekranı + özet e-postası | #256 | done | Issue kapalı; tercih/özet UI görevi |

S4–S5 geliştirmesi lisans kararını **beklemez**. Epic #263 ve aşağıdaki alt görevler açıldı. Lisans/fiyatlandırma ayrı ADR konusudur.

## S0–S3 tamamlanan geliştirme sırası (tarihçe)

S0–S3 kapsamındaki #248–#262 Issue'ları 2026-11-19 doğrulamasında **kapalıdır**. Önceki aşamaların bağımlılık sırası, artık yapılacak iş değil tarihçe olarak değerlendirilmelidir. Yeni geliştirme odağı açık #263 epic ve #313–#317 alt görevleridir.

## ChatGPT S0–S3 uygulama planı — tamamlanmış görevlerin tarihçesi (2026-11-19)

| Issue | PR tahmini | Sıra / bağımlılık | Sınır ve risk |
|---|---:|---|---|
| #257 | tamamlandı | Issue kapalı | Kod değişikliği yok |
| #258 | tamamlandı | Issue kapalı; PR #289 alpha merge; #292 test takibi | Üye/e-posta eşleştirme gizliliği, Berlin DST |
| #259 | tamamlandı | Issue kapalı; #288 UI, #291 panel yüzeyi | Dashboard registry yalnız koordinasyonla |
| #260 | tamamlandı | Issue kapalı; mevcut `SecretaryItemState` eylemleri | Undo görünürlüğü ve klavye erişimi |
| #261 | tamamlandı | Issue kapalı; T2.1 onay API bağımlılığı | Harici eylem için ikinci onay, bayat öneri |
| #262 | tamamlandı | Issue kapalı; T3.1 zamanlayıcı bağımlılığı | TR/DE, kişisel veri içermeyen yalnız sayı ve bağlantı |

Çakışma kararı: Merkezi UI W1/W2/W6 değişikliklerine doğrudan müdahale etmiyoruz; her yeni sekreter bileşeni `@/shared/components/kit` üzerinden yazılacak. Panel yüzeyi #291 ve güvenlik regression #292 Claude'un ayrı dosya sahipliği altında; ChatGPT yalnız kendi komponent/view/API tüketen dosyalarını değiştirir. Her PR'ın hedefi `alpha`, modül sürüm notu ve üretilmiş dosyalar CI ile doğrulanır. Ortak mesaj ve `module.config.ts` sürümleri merge sırasına göre yeniden senkronlanır.

## S4–S5 uygulama panosu — ürün sahibi onayı 2026-11-19

| Aşama | Issue | Sahip | Kapsam | Durum | Kabul / bağımlılık |
|---|---|---|---|---|---|
| S4 | #313 | Claude | Posta meta olayları, yerel-öncelikli sınıflama, cevap/görev taslakları | open | Mail izin/consent, dış gönderim onayı; S3 |
| S4 | #314 | Claude | Takip kaydı, scheduler ve geri alma | open | Tek pg-boss worker, yetki/audit/idempotency |
| S5 | #315 | Claude | Kurul raporu + OCR öneri servisi | open | Files otomasyon kuyruğu ve veri minimizasyonu |
| S5 | #316 | Claude | Kanal adapterleri ve vekil/ekip sözleşmesi | open | Explicit opt-in, scope, expiry, revoke, rate limit |
| S4–S5 | #317 | ChatGPT | Posta/takip/rapor/kanal/vekil UI | in progress | Backend public sözleşmeleri #313–#316, TR/DE, a11y |

**Epic #263:** açık. **#317 ilerleme:** PR [#320](https://github.com/akgngr/verein-erp/pull/320) 2026-11-19 tarihinde `alpha` dalına merge edildi; yalnız salt okunur güvenli çalışma masası / DTO sözleşmesi ve TR/DE görünüm hazır. Canlı posta, takip, rapor, OCR, kanallar ve vekil etkileşimlerinin API bağlantıları **#313–#316 public backend sözleşmelerine bağlıdır**. Mobil/klavye/tema/reduced-motion browser smoke ve izin regresyonları tamamlanmadan #317 kapanmaz.

**Güncel açık işler:** #263 (epic), #313, #314, #315, #316, #317. Bu panodaki kapalı S0–S3 kayıtlarının `status:ready` gibi eski etiketleri ayrı etiket temizliği gerektirebilir; kapanış esas alındı.

Dosya sahipliği: Claude servis/şema/worker/adapter; ChatGPT yalnız UI ve UI çevirileri. Çakışan `module.config.ts`, `releases.json`, üretilmiş mesaj ve katalog dosyaları merge sırasına göre güncellenir. Özellikler ücretli hale getirilmez. Epic #263 ancak tüm alt görevler ve uçtan uca testler kabul edilince kapanır.
