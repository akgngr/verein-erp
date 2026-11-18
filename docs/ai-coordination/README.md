# AI koordinasyon protokolü (çok ajanlı)

> Yeni ajan mısın? Önce [AGENTS.md](./AGENTS.md). Tartışma ve kararlar: [DISCUSSIONS_PROTOCOL.md](./DISCUSSIONS_PROTOCOL.md) · [DECISION_LOG.md](./DECISION_LOG.md).

**Amaç:** İki AI ajanının aynı depoda, birbirinin işini bozmadan, yalnızca GitHub üzerinden asenkron çalışması. ChatGPT'nin webhook ucu yoktur; her şey **Issue, PR ve bu klasördeki Markdown** üzerinden yürür.

## 1. Görev = GitHub Issue

- Her görev bir issue'dur. Başlık biçimi: `[<Proje> <Kod>] <Başlık>`, ör. `[Secretary T1.3] …`.
- **Etiketler**
  - Sahip: `agent:claude` veya `agent:chatgpt`
  - Proje: `module:<ad>`
  - Aşama: `stage:S0`…`stage:S3`
  - Durum: `status:ready` (başlanabilir) veya `status:blocked` (bağımlılık bekliyor)
- Issue gövdesinde zorunlu bölümler: **Branch**, **Dosya sahipliği**, **Bağımlılıklar** (issue numarasıyla), **Kabul kriterleri** (işaret kutuları).
- Bağımlılık merge olunca koordinatör (Claude) bağımlı issue'yu `status:ready` yapar ve issue'ya "başlayabilirsin" yorumu yazar.

## 2. Branch ve PR

- Branch adı: `<ajan>/<proje>-<kod>-<kısa-ad>`, ör. `chatgpt/secretary-t1-3-providers`.
- Bir PR = bir issue. Açıklamada `Closes #<issue>`, değişen modüller ve test kanıtı.
- **Hedef dal `alpha`'dır** ([BRANCH_RELEASE_WORKFLOW.md](../development/BRANCH_RELEASE_WORKFLOW.md)). `alpha → beta` terfisini koordinatör açar. `beta → main` yalnız ürün sahibi onayıyla yapılır.
- **CI yeşil olmadan merge yok:** Quality gate, Build docs, CodeQL ve ilgili ek iş akışları.
- Modül dosyası değiştiyse: `module.config.ts` sürüm artışı + `releases.json` notu (TR/DE) + `pnpm module:sync` + `pnpm docs:modules`.
- Merge yöntemi: squash. Merge'ü ürün sahibinin yetkilendirdiği koordinatör (Claude) yapar; iki ajan da yalnız CI yeşilken merge eder.

## 3. Dosya sahipliği (paralel değişiklik yasağı)

- Issue'daki "Dosya sahipliği" listesi bağlayıcıdır. Listede olmayan dosyaya dokunmak gerekirse önce issue'ya yorum yazılır ve diğer ajan etiketlenir.
- **Paylaşılan dosyalar için kurallar**
  - `messages/tr.json` ve `de.json`: Claude `<modül>.*` arka uç anahtarlarını, ChatGPT `<modül>.ui.*` anahtarlarını ekler.
  - Üretilen dosyalar (`src/*-registry.ts`, `src/app/**` köprüleri, `website/docs/kullanim/moduller/*`): yalnız `pnpm module:sync` ve `pnpm docs:modules` ile üretilir, elle düzenlenmez.
  - Sürüm çakışması: sonra merge eden `origin/main`'i alır ve mevcut en yüksek sürümün bir üstüne çıkar. `releases.json`'da önceki notları korur.

## 4. İletişim

- **Göreve özel soru:** ilgili issue'ya yorum, diğer ajanı `agent:<ad>` ile anarak.
- **Birden fazla ajanı etkileyen konu, beyin fırtınası, mimari öneri:** GitHub Discussions ([DISCUSSIONS_PROTOCOL.md](./DISCUSSIONS_PROTOCOL.md)). Kesinleşen karar ADR veya DECISION_LOG'a yazılır.
- **Sözleşme değişikliği** (paylaşılan tipler, API): yalnız sahibi değiştirir. Değişiklik PR'ı açıklamasında "Sözleşme değişikliği" başlığı ve etkilenen issue'lar listelenir.
- **Durum panosu:** `docs/ai-coordination/<proje>/TASKS.md`. Koordinatör her merge sonrası günceller. ChatGPT yalnız kendi satırlarının "Not" sütununu düzenler.
- **Engel:** Bir ajan engellenirse issue'ya `status:blocked` ekler ve nedenini yazar.

## 5. Otomasyon

- **İş akışı:** `.github/workflows/ai-coordination.yml`
  - Birincil tetikleyici GitHub olayları: issue açılması, kapanması, düzenlenmesi veya etiketlenmesi; PR açılması veya kapanması.
  - **Yedek:** 15 dakikada bir zamanlanmış çalışma. GitHub yoğunlukta geciktirebilir.
- **Ne yapar:** Bir issue kapanınca, bütün bağımlılıkları kapanmış görevleri `status:blocked` → `status:ready` yapar ve sahibine yorum bırakır. Ayrıca açık görev ve PR özetini iş akışı özetine yazar.
- **Ne yapmaz:** Ajanları çalıştırmaz, kod yazmaz, PR açmaz veya merge etmez. `agent:chatgpt` görevlerini yürüten ajan (ChatGPT otomasyonu ya da Codex) `status:ready` etiketli görevlerini kendi zamanlamasıyla kontrol eder.
- **Ajan rolleri:**
  - Claude: koordinatör, arka uç görevleri, PR incelemesi ve merge.
  - Codex: `agent:chatgpt` geliştirme görevlerini uygular ve PR açar.
  - ChatGPT: mimari değerlendirme ve koordinasyon raporlarını takip eder.

## 6. Kalite kapıları (her PR)

- `tsc` 0 hata, `pnpm test`, `pnpm lint` (0 hata), `pnpm module:validate`, `scripts/check-i18n-keys.ts`, `scripts/check-hardcoded-text.ts`.
- UI içeren PR'da: `@/shared/components/kit` kullanımı (doğrudan `@heroui/react` yok), mobil, klavye, açık/koyu tema ve reduced-motion kontrolü.
- Kişisel veri log'lanmaz; testlerde yalnız sentetik veri.
