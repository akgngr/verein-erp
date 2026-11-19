# Yeni ajanlar için giriş

Bu depoda birden fazla AI ajanı birlikte çalışır. Başlamadan önce bu sayfayı ve bağlantılarını oku.

## 1. Okuma sırası

1. [README.md](./README.md): görev, branch, PR, dosya sahipliği ve kalite kapıları.
2. [DISCUSSIONS_PROTOCOL.md](./DISCUSSIONS_PROTOCOL.md): nerede konuşulur, nasıl yazılır, hangi veri yasaktır.
3. [DECISION_LOG.md](./DECISION_LOG.md) ve `docs/adr/`: alınmış kararlar. Yeniden tartışmadan önce oku.
4. [BRANCH_RELEASE_WORKFLOW.md](../development/BRANCH_RELEASE_WORKFLOW.md): `feature → alpha → beta → main`.
5. Kök dizinde `AGENTS.md` **varsa** içindeki Next.js sürüm uyarılarını uygula. Dosya yoksa varmış gibi davranma; kurulu `next` sürümünü `package.json` ve yerel `node_modules/next/dist/docs/` (varsa) üzerinden doğrula, eksikliği Issue'da bildir.
6. [MODULE_DEVELOPMENT_GUIDE.md](../MODULE_DEVELOPMENT_GUIDE.md): modül kuralları. Modüller yalnız public girişleri import eder (`@/modules/<m>/server` vb.).

## 2. Kayıt

Yeni ajan şu adımlarla kaydolur:
1. **Agent Coordination** kategorisinde kısa bir tanıtım: ad, uzmanlık, çalışma ritmi (ne sıklıkla kontrol eder), yazma yolu (GraphQL veya köprü).
2. Koordinatör `agent:<ad>` etiketini oluşturur ve bu tabloya ekler.

| Ajan | Etiket | Rol | Yazma yolu |
|---|---|---|---|
| Claude | `agent:claude` | Koordinatör; arka uç, şema, sözleşme, otomasyon, test; PR incelemesi ve `alpha`'ya merge | Köprü |
| ChatGPT | `agent:chatgpt` | Mimari değerlendirme, UI ve entegrasyon planı | Köprü veya elle |
| Codex | `agent:chatgpt` görevleri | ChatGPT'ye atanan geliştirme görevlerini uygular | PR |
| Gemini | `agent:gemini` (etiket kaydı bekleniyor) | Modern Web, a11y/IME, tarayıcı uyumluluğu, TypeScript/performans; #326 onboarding, #327–#330 teknik işler | Ayrı branch → `alpha` PR; GitHub Issues/Discussions |

## 3. Değişmez kurallar

- **Veri:** Kişisel veya dernek verisi hiçbir yerde paylaşılmaz: Discussions, issue, PR, log, test. Testlerde yalnız sentetik veri kullanılır. Sırlar ve ortam değişkeni değerleri yazılmaz.
- **Onay:** Ürün sahibinin açık onayı olmadan şunlar yapılmaz: `main`'e merge, üretim dağıtımı, mevcut sistemi bozabilecek değişiklik. Şema, güvenlik ve lisans kararları da onaya tabidir.
- **Görev:** Yalnız sana atanmış (`agent:<ad>`) ve `status:ready` issue'larda çalış. Dosya sahipliği dışına çıkman gerekirse önce issue'ya yaz.
- **PR:**
  - `alpha` hedeflidir, CI yeşil olmadan merge edilmez.
  - Modül değişikliğinde sürüm artışı, `releases.json` (TR/DE), `pnpm module:sync` ve `pnpm docs:modules` gerekir.
- **Kod kararları:** Next.js 16, Prisma 7, PostgreSQL, pg-boss, HeroUI v3 ve `@/shared/components/kit` korunur.

## 4. Gemini onboarding (Issue #326)

- Kayıt: `gemini` / `Agent-Role: modern-web-standards`; Claude koordinatör, dosya sahipliği ve başlama yetkisinin kaynağıdır.
- Etiket `agent:gemini` oluşturulup görevler etiketlenene ve `status:ready` onayı verilene kadar #327–#330 uygulamasına başlanmaz. Etiketin varlığı tek başına onay değildir.
- Görev panosu: [`gemini/TASKS.md`](./gemini/TASKS.md). Aynı dosya veya modül üzerinde paralel agent yazımı yapılmaz.
- Zorunlu PR attribution: `Agent-Primary: gemini`, `Agent-Role: modern-web-standards`, `Agent-Task: #<issue>`.
- Kişisel veri içeren örnek/test/log kullanılmaz; Claude/ChatGPT/Codex görevleri izinsiz devralınmaz.
