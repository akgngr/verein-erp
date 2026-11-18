# ADR 0005 — Sekreter önerileri: `AiProposal`'ı genelleştirmek yerine sekreterin kendi öneri deposu

**Durum:** Önerildi · **Tarih:** 2026-11-18 · **Görev:** #248 (T0.1)
**İlgili:** `docs/specs/PERSONAL_SECRETARY.md`, `src/modules/ai/services/proposal-store.ts`, [ADR 0001](./0001-isolated-deployment-per-customer.md)

## Bağlam

Sekreter, kural kaynaklı öneriler üretecek. Örnek: "vadesi geçmiş fatura → ihtar taslağını aç". Kullanıcı bunları onaylayınca hedef modülün eylemi çalışacak. Fikir belgesi başlangıçta mevcut `AiProposal` tablosunu yeniden kullanmayı önermişti. Kod incelemesi şunu gösterdi:

- `AiProposal` **AI modülüne aittir** (`src/modules/ai`). AI modülü EXTENSION kategorisinde ve **varsayılan olarak kapalıdır**; kullanıcı rızası ve sağlayıcı yapılandırması ister.
- Onay yolu AI'ya özgü değişmezler taşır:
  - `providerRevision` eşleşmesi zorunlu (sağlayıcı değişince öneri geçersizleşir),
  - `conversationId`,
  - 15 dakikalık geçerlilik,
  - `exports/datasetExport` için özel kurtarma.
- Eylemler `moduleAiRegistry` içindeki `ai.ts` eylemlerinden çözülür. Yani kural kaynaklı bir öneri de AI modülünün kayıt ve izin matrisine bağlanır.
- Sekreter ilkesi: **AI kapalıyken de çalışır** (önce kurallar). Modül sınırı kuralına göre sekreter AI modülünü import etmez ve ona erişim bildirmez; erişim bildirmek, modülün yönetici onayına düşmesi demektir.

## Seçenekler

| | A — `AiProposal`'ı genelleştir (`source: model\|rule`) | **B — Sekreterin kendi öneri deposu, aynı güvenlik deseni** |
|---|---|---|
| AI kapalıyken çalışma | Hayır: tablo, onay ve eylem kaydı AI modülünde | **Evet** |
| Modül sınırı | Sekreter → AI erişimi (onay) veya ortak katmana taşıma gerekir | **Temiz:** eylemler `secretary.ts` sözleşmesinden |
| AI'ya özgü değişmezler | `providerRevision` vb. alanları kural kaynaklıda boş bırakma ve dallanma | Gereksiz |
| Kod tekrarı | Az | Az: mühürleme, hash ve atomik claim deseni küçük bir ortak yardımcıya alınır |
| İleride AI destekli öneriler (Pro) | Doğal | Sekreter önerisi `source: "model"` ile aynı depoya yazılır; AI yalnız taslak üretir |

## Karar

**B.** Sekreter modülü kendi `SecretaryProposal` tablosunu tutar.

- **Alanlar:** `id`, `userId`, `source` (`rule` | `model`), `itemId` (özet öğesine bağ), `moduleKey`, `actionKey`, `payloadEnc`, `previewEnc`, `payloadHash`, `preconditionsEnc?`, `status` (`PENDING` | `EXECUTING` | `APPLIED` | `FAILED` | `DISMISSED` | `EXPIRED`), `idempotencyKey` (benzersiz), `expiresAt`, `confirmedAt?`, `completedAt?`, `createdAt`.
- **Eylem kaydı:** `defineModuleSecretary` sözleşmesine isteğe bağlı `actions` eklenir: `{ key, permission, schema (zod), snapshot?(payload), execute(payload, context) }`. Onaylanan öneri, hedef modülün bu eylemini çağırır. Eylem, modülün mevcut server action veya servisini kullanır ve **çalışma anında** yetkiyi yeniden denetler.
- **Güvenlik deseni** (`AiProposal` ile aynı garanti):
  - payload ve önizleme `sealSecret` ile şifreli, hash ile bütünlük;
  - atomik `PENDING → EXECUTING` claim; belirsiz bir yazma asla otomatik tekrarlanmaz;
  - `preconditions` hash'i ile "kaynak değişti mi" kontrolü;
  - `idempotencyKey`;
  - TTL (varsayılan 7 gün; öğe kaybolursa `EXPIRED`);
  - audit'e yalnız meta veri.
- **Ortak yardımcı:** Mühürleme, hash ve claim mantığı `src/shared/proposals/` altına küçük, modülden bağımsız bir yardımcı olarak alınır. `AiProposal` kendi akışını korur; isterse ileride bu yardımcıya geçer (zorunlu değil).
- **Dış etkili eylemler** (e-posta gönderme, ödeme, beyan): eylem tanımında `risk: "external"` işaretlenir. UI bunlar için ek onay diyaloğu gösterir (T2.2). Hiçbir eylem otomatik onaylanmaz.

## Sonuçlar

- T0.4 (#251) tablolarına `SecretaryProposal` eklenir.
- T0.3 (#250) sözleşmesine `actions` ve `risk` alanı eklenir; geriye uyumlu ve isteğe bağlı.
- T2.1 (#255): "AiProposal genelleştirmesi" yerine bu ADR uygulanır.
- AI modülü değişmez. Mevcut sohbet önerileri etkilenmez.
- Bedel: iki benzer öneri tablosu. Ortak yardımcıyla davranış farkı en aza indirilir; sözleşme testleri iki tarafta da aynı değişmezleri sınar.
