# CRM modülü — teknik şartname ve yapılacaklar

Durum: taslak (uygulanmadı) · Sahip modül: `crm` · Kategori: OFFICIAL

## 1. Amaç ve ilke
CRM, mevcut modüllerin üstünde **ince bir ilişki katmanıdır**. Kendi kişi/şirket ana kaydını tutmaz.
- Kişi/şirket kaynağı: muhasebe kişileri (Debitor/Kreditor) ve üyeler — yalnız public API (`@/modules/<m>/server` / `automation`) üzerinden.
- CRM yalnız ilişkiye ait bilgiyi ekler: aşama, sorumlu, etiket, fırsat, not, takip tarihi.
- Ekstra yok: lead puanlama, kampanya, pazarlama otomasyonu → iş akışları ve Toplu e-posta karşılar.

## 2. Veri modeli (Prisma, `src/modules/crm/schema.prisma`)
| Model | Alanlar | Veri sınıfı |
|---|---|---|
| `CrmParty` | id, sourceModule (`accounting`\|`members`), sourceId, ownerId?, stage enum (LEAD, ACTIVE, CUSTOMER, INACTIVE), tags string[], unique(sourceModule, sourceId) | K2 |
| `CrmDeal` | id, partyId, title, amountCents?, currency, stage enum (OPEN, PROPOSAL, WON, LOST), expectedCloseAt?, quoteId?, invoiceId?, ownerId | K2 |
| `CrmActivity` | id, partyId, dealId?, kind (NOTE, CALL, MAIL, MEETING, INVOICE, TASK, EVENT), sourceModule?, sourceId?, summary, occurredAt, createdById | K1 (summary hassas) |
| `CrmFollowUp` | id, partyId, dealId?, dueAt, doneAt?, assigneeId, note | K1 |

Kişi adı/iletişim **kopyalanmaz**; görüntülemede kaynak modülden okunur.

## 3. Modül bağlantıları
| Bağlantı | Yön | Mekanizma |
|---|---|---|
| Muhasebe kişileri, teklif → fatura | okuma + teklifi faturaya çevirme | `access: accounting read/write`, public API |
| Üyeler | okuma | `access: members read` |
| Mail / Toplu e-posta / Toplantılar / Görevler / Takvim | olay dinleme | otomasyon olayları → `CrmActivity` (yalnız kimlik + kısa özet) |
| Takvim | kaynak | `crm/calendar.ts`: takip tarihleri ve beklenen kapanışlar |
| Görevler | yazma | takipten görev oluşturma (`access: tasks write`) |
| AI | araçlar | `crm/ai.ts`: yalnız K2 tablolar (aşama/fırsat istatistiği) |

## 4. Otomasyon
- Olaylar: `crm.deal_stage_changed` {dealId, from, to}, `crm.followup_due` {followUpId}. PII yok; değişkenler gönderim anında yüklenir.
- Görevler: `crm.create_followup`, `crm.set_party_stage`.

## 5. Yetkiler
`crm.view|create|update|delete|approve`. Varsayılan: ADMIN/BOARD tümü, SECRETARY/TREASURER view+create+update, AUDITOR view. Sorumlu olmayanlar yalnız `view` kapsamı kadar görür.

## 6. UI
- Kişi listesi (kaynak rozeti, aşama, sorumlu, sonraki takip), kişi detay zaman akışı.
- Fırsat panosu (kanban, aşama sürükle-bırak), "teklif oluştur" / "faturaya çevir".
- Takip kutusu: bugün/gecikmiş.

## 7. Yapılacaklar
- [ ] `pnpm module:create crm "CRM" "CRM"`, şema + migration
- [ ] Muhasebe ve üyeler public API'lerine `getPartySummary(id)` ekle
- [ ] Veri politikası sınıflandırması + testler
- [ ] Olay dinleyicileri: mail, toplantı, görev, takvim, fatura → `CrmActivity`
- [ ] Fırsat panosu + teklif/fatura bağlantısı
- [ ] Takip → görev + takvim kaynağı
- [ ] Otomasyon olay/görevleri + tr/de etiketleri
- [ ] `ai.ts` (yalnız K2), testler, sürüm notları, tarayıcı kontrolü
