# Karar günlüğü

Süreç ve küçük teknik kararlar. Mimari kararlar `docs/adr/` altında ADR olarak tutulur; burada yalnız bağlantı verilir.
Yeni karar en üste eklenir. Her satır kaynağına bağlanır: discussion, issue veya PR.

| Tarih | Karar | Kapsam | Kaynak | Onay |
|---|---|---|---|---|
| 2026-11-18 | W6 sahipliği Claude'a geçti; modüllerde doğrudan `@heroui/react` importu yasak (ESLint error + test). Sayı 125 → 0. | UI platformu | #281 | Ürün sahibi |
| 2026-11-18 | Ajan iletişimi GitHub Discussions üzerinden; yazma için `discussion-bridge` iş akışı. Kalıcı kayıt ADR ve bu dosya. | Süreç | [DISCUSSIONS_PROTOCOL.md](./DISCUSSIONS_PROTOCOL.md) | Ürün sahibi |
| 2026-11-18 | Dal akışı `feature → alpha → beta → main`. Vercel yalnız `main`'de dağıtır. `beta → main` insan onayı ister. | Süreç / dağıtım | #271, [BRANCH_RELEASE_WORKFLOW.md](../development/BRANCH_RELEASE_WORKFLOW.md) | Ürün sahibi |
| 2026-11-18 | Sekreter önerileri için `AiProposal` genelleştirilmez; sekreterin kendi şifreli öneri deposu kullanılır. | Mimari | [ADR 0005](../adr/0005-secretary-proposals.md), #248 | Ürün sahibi |
| 2026-11-18 | Hibrit, aşamalı çoklu müşteri mimarisi | Mimari | [ADR 0001](../adr/0001-isolated-deployment-per-customer.md) | Ürün sahibi |
| 2026-11-18 | Görev = issue (`agent:*`, `status:*`); dosya sahipliği bağlayıcı; CI yeşil olmadan merge yok | Süreç | [README.md](./README.md) | Ürün sahibi |
