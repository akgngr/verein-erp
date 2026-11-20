# Karar günlüğü

Süreç ve küçük teknik kararlar. Mimari kararlar `docs/adr/` altında ADR olarak tutulur; burada yalnız bağlantı verilir.
Yeni karar en üste eklenir. Her satır kaynağına bağlanır: discussion, issue veya PR.

| Tarih | Karar | Kapsam | Kaynak | Onay |
|---|---|---|---|---|
| 2026-11-20 | Brainstorm-001 sonucu: ürün yol haritası B001. Önce yarım kalan işler (bildirim ve sekreter UI'ları), sonra 0. dalga (bağlamsal yardım çekmecesi, gizlilik ön ayarları + veri çıkış raporu, modül hazırlık paneli), 1. dalga ilk 5 (Gemeinnützigkeit uyum paneli, üye gizlilik paneli + portal, Behörden-Lotse + sayfa AI'ı, §72a takibi, genel kurul) ve hızlı kazanımlar (denetçi odası, SEPA koçu, sayman raporu). Cenaze fonu hukuki incelemeye kadar engelli; kermes kasası yalnız sayım tutanağı. Başlangıç 2026-11-23. | Ürün / süreç | [B001_PRODUCT_ROADMAP.md](../specs/B001_PRODUCT_ROADMAP.md), discussion #392, #398–#415 | Ürün sahibi |
| 2026-11-20 | Ajanlar arası iletişim dili İngilizce (issue, PR, inceleme, Discussions); ürün sahibine bilgilendirme Türkçe; arayüz metinleri ve kullanıcı belgeleri TR/DE kalır. | Süreç | [README.md](./README.md) | Ürün sahibi |
| 2026-11-20 | Merkezi bildirim sistemi (CORE `notifications`): modül sözleşmesi, uygulama içi + e-posta + web push + Telegram + WhatsApp + SMS; sağlayıcı sırları DB'de şifreli; VAPID otomatik; saklama 90 gün; sekreter kanalları taşınır; WhatsApp kısa vadede ertelenir (uzun vadede Meta Cloud API); görev dağılımı Claude/ChatGPT/Gemini. | Mimari / süreç | [ADR 0006](../adr/0006-central-notifications.md), #365 | Ürün sahibi |
| 2026-11-19 | Katı dal geçişi: hedefe özel zorunlu kontrol `Promotion policy (<dal>)`, alpha yalnız önekli dal + squash, beta yalnız alpha + merge, main yalnız beta + merge; hedefte kaynakta olmayan içerik varsa geçiş reddedilir; fork PR yasak. | Süreç | [BRANCH_RELEASE_WORKFLOW.md](../development/BRANCH_RELEASE_WORKFLOW.md) | Ürün sahibi |
| 2026-11-18 | W6 sahipliği Claude'a geçti; modüllerde doğrudan `@heroui/react` importu yasak (ESLint error + test). Sayı 125 → 0. | UI platformu | #281 | Ürün sahibi |
| 2026-11-18 | Ajan iletişimi GitHub Discussions üzerinden; yazma için `discussion-bridge` iş akışı. Kalıcı kayıt ADR ve bu dosya. | Süreç | [DISCUSSIONS_PROTOCOL.md](./DISCUSSIONS_PROTOCOL.md) | Ürün sahibi |
| 2026-11-18 | Dal akışı `feature → alpha → beta → main`. Vercel yalnız `main`'de dağıtır. `beta → main` insan onayı ister. | Süreç / dağıtım | #271, [BRANCH_RELEASE_WORKFLOW.md](../development/BRANCH_RELEASE_WORKFLOW.md) | Ürün sahibi |
| 2026-11-18 | Sekreter önerileri için `AiProposal` genelleştirilmez; sekreterin kendi şifreli öneri deposu kullanılır. | Mimari | [ADR 0005](../adr/0005-secretary-proposals.md), #248 | Ürün sahibi |
| 2026-11-18 | Hibrit, aşamalı çoklu müşteri mimarisi | Mimari | [ADR 0001](../adr/0001-isolated-deployment-per-customer.md) | Ürün sahibi |
| 2026-11-18 | Görev = issue (`agent:*`, `status:*`); dosya sahipliği bağlayıcı; CI yeşil olmadan merge yok | Süreç | [README.md](./README.md) | Ürün sahibi |
