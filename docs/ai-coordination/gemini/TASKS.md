# Gemini — Modern Web görev panosu

**Koordinasyon:** [AI protokolü](../README.md) · [Onboarding](../ONBOARDING.md) · [Katkı atfı](../AI_CONTRIBUTORS.md)

**Durum (2026-11-19):** Gemini onboarding raporu incelendi; kayıt dokümantasyonu PR aşamasında. `agent:gemini` etiketinin oluşturulması, görev etiketlerinin atanması ve koordinatör Claude'un başlamaya onay vermesi henüz ayrı doğrulanacak adımlardır. Sadece bu dosyanın oluşması görevleri başlatmaz.

| Sıra | Issue | Başlık | Alan / sahiplik | Durum | Ön koşul |
| --- | --- | --- | --- | --- | --- |
| G0 | [#326](https://github.com/akgngr/verein-erp/issues/326) | Gemini onboarding ve ajan kaydı | Ortak koordinasyon belgeleri; Claude onayı | in review | Etiket, kayıt ve docs PR |
| MW1 | [#327](https://github.com/akgngr/verein-erp/issues/327) | IME/Enter yanlış gönderimi | AI chat UI ve ilgili test; AI modül sahibi onayı | blocked | #326 ve dosya sahipliği |
| MW2 | [#328](https://github.com/akgngr/verein-erp/issues/328) | Scrollbar ve color-scheme | Merkezi UI Platform; UI sahibi onayı | blocked | #326, mevcut tema sözleşmesi |
| MW3 | [#329](https://github.com/akgngr/verein-erp/issues/329) | TypeScript heap ve modern JS | Runtime/CI + modül sahipleri | blocked | #326, bellek ölçümü ve kapsam |
| MW4 | [#330](https://github.com/akgngr/verein-erp/issues/330) | Prisma JSON / structuredClone denetimi | Önce docs/test; automation sahibi onayı | blocked | #326, saklama sözleşmesi |

## Çalışma kuralları

1. Yalnız koordinatörce yetkilendirilmiş `agent:gemini` ve `status:ready` görevlerine başlanır. Issue kapalı/açık durumu ve PR merge kaydı ayrıca doğrulanır; eski etiketler körlemesine güvenilir sayılmaz.
2. Önce ilgili Issue, PR, dosya sahibi ve mevcut `alpha` incelenir. Ortak dosyalar üzerinde paralel çalışma yapılmaz.
3. Branch `gemini/<proje>-<kod>-<kısa-ad>`, hedef `alpha`; CI yeşil olmadan merge yok. `alpha → beta → main` terfisi sadece release kurallarına uygun yürütülür.
4. Modül değişikliğinde sürüm + TR/DE releases + module:sync + docs:modules + testler gereklidir. UI değişikliklerinde ortak kit, a11y, mobil ve reduced-motion korunur.
5. `AGENTS.md` yoksa uydurulmaz; sürüm ve kurulu Next.js dokümantasyonu kontrol edilir.
6. Gizli bilgi, gerçek kişi verisi, canlı otomatik gönderim, kırıcı migration veya kontrolsüz API/worker davranışı kabul edilmez.
7. PR açıklamasında test kanıtları ve `Agent-Primary: gemini`, `Agent-Role: modern-web-standards`, `Agent-Task: #...` bulunur.
