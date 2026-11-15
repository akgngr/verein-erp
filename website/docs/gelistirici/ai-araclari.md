---
title: Asistan araçları (v2, katı kural)
sidebar_position: 4
---

# Asistan araçları: yalnız v2 sözleşmesi

Modüller asistana `ai.ts` dosyasıyla araç sağlar. Araçlar **yalnız `aiToolV2`**, modül **`defineModuleAiV2`** ile
tanımlanır; eski `aiTool` / `defineModuleAi` (v1) modüllerde yasaktır.

```ts title="src/modules/sponsors/ai.ts"
import "server-only";
import { z } from "zod";
import { aiToolV2, defineModuleAiV2 } from "@/shared/ai/v2";
import { yearSchema } from "@/shared/ai/define";
import { can } from "@/shared/permissions/define";
import { sponsorsPermissions } from "./permissions";
import { getSponsorStats } from "./server";

const output = z.object({ year: z.number().int(), byStatus: z.array(z.object({ status: z.string(), count: z.number().int() }).strict()) }).strict();

export const ai = defineModuleAiV2({
  module: "sponsors",
  tools: [
    aiToolV2({
      name: "get_sponsor_statistics",
      operation: "read",
      allowed: (user) => can(user.role, sponsorsPermissions, "view"),
      description: "Sponsor totals per status for a year. No names.", // i18n-ignore (model-facing)
      input: yearSchema, result: output, modelOutput: output,
      policy: {
        purpose: "sponsors-statistics",
        serverReads: ["Sponsor"],
        modelFields: ["year", "byStatus", "byStatus.status", "byStatus.count"],
        processing: "approved_provider",
        modelDataClass: "aggregate",
      },
      projectForModel: (result) => result,
      run: async ({ year }) => getSponsorStats(year),
    }),
  ],
  actions: {},
});
```

Aynı alan listesi `src/shared/data-policy.ts` → `AI_TOOL_POLICY.get_sponsor_statistics` içine `serverReads` ile
yazılır (merkezi inceleme tablosu).

## Veri sınıfı seçimi

| `modelDataClass` | Ne zaman | Bulutta |
|---|---|---|
| `aggregate` | Yalnız sayı/toplam | Denetimli modda |
| `internal` | Kurumsal kayıtlar (başlık, durum, tarih), kişi alanı yok | Denetimli modda |
| `pseudonymous` | Kişi düzeyi; kişi yalnız `context.pseudonym(...)` ile `[[Kn]]` | Yalnız "takma adlı kişi verisi" açıkken |
| `processing: "local_only"` | Serbest kişisel içerik (evrak metni, notlar, tartışmalar) | Asla |

Takma adlı araçlarda ad, iletişim, adres, doğum tarihi, kimlik/IBAN ve notlar **asla** döndürülmez; tarihleri yıl/ay,
tutarları tam avro düzeyinde kabalaştırın. Model bir takma ad verirse kayda `context.resolvePseudonym(...)` ile
çevirin.

## Yazma: yalnız öneri

Araçlar veri değiştirmez. `context.propose({ action, title, details, payload })` bir onay kartı gösterir; kullanıcı
onaylayınca `actions.<action>` kullanıcının yetkisiyle yeniden doğrulanıp çalışır.

## Zorlama

- `aiToolV2`, sınıf bildirmeyen sağlayıcı aracında yüklenirken `AI_TOOL_DATA_CLASS_REQUIRED` hatası verir;
  listede olmayan çıktı alanı `AI_OUTPUT_FIELD_DENIED` ile reddedilir.
- `pnpm module:validate`: `ai.ts` yalnız `defineModuleAiV2`.
- `tests/ai/ai-contract-v2-only.test.ts`, `tests/shared/data-policy.test.ts`, `tests/ai/v2-contract.test.ts`.

Mimari ayrıntılar: [Bulut takma ad aktarımı](/teknik/architecture/ai-cloud-pseudonym-relay),
[v2 sözleşme önerisi](/teknik/architecture/ai-contract-v2-proposal).
