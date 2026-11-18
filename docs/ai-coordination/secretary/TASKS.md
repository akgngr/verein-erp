# Kişisel Sekreter — görev panosu

**Şartname:** [`docs/specs/PERSONAL_SECRETARY.md`](../../specs/PERSONAL_SECRETARY.md) · **Protokol:** [`../README.md`](../README.md) · **Koordinatör:** Claude

Durum, GitHub Issue etiketlerinden (`status:*`) gelir; bu tablo her merge sonrası güncellenir.

| Aşama | Kod | Issue | Sahip | Görev | Bağımlılık | Durum | Not |
|---|---|---|---|---|---|---|---|
| S0 | T0.1 | #248 | Claude | ADR 0005 — AiProposal genelleştirmesi | — | done | |
| S0 | T0.2 | #249 | Claude | `secretary` modül iskeleti | — | done | |
| S0 | T0.3 | #250 | Claude | Sözleşme + `secretary.ts` kaydı + sınır testi | #249 | done | |
| S0 | T0.4 | #251 | Claude | Tablolar + migration | #249 | done | |
| S0 | C0 | #257 | ChatGPT | İş bölümü onayı ve takvim (doküman) | — | ready | |
| S1 | T1.1 | #252 | Claude | Toplayıcı `getBriefing` | #250, #251 | in review | |
| S1 | T1.2 | #253 | Claude | Sağlayıcılar: accounting, documents, members | #250 | ready | |
| S1 | T1.3 | #258 | ChatGPT | Sağlayıcılar: tasks, calendar, meetings | #250 | ready | |
| S1 | T1.4 | #259 | ChatGPT | "Bugün" kartı + sekreter sayfası | #249, #250 | ready | |
| S1 | T1.5 | #254 | Claude | Kapat/ertele eylemleri | #251 | in review | |
| S1 | T1.6 | #260 | ChatGPT | Kapat/ertele UI + smoke | #254, #259 | blocked | |
| S2 | T2.1 | #255 | Claude | Kural kaynaklı öneriler + onay yolu | #248, #252 | blocked | |
| S2 | T2.2 | #261 | ChatGPT | Onay kutusu UI | #255 | blocked | |
| S3 | T3.1 | #256 | Claude | Günlük özet işi, sessiz saatler | #252, #251 | blocked | |
| S3 | T3.2 | #262 | ChatGPT | Tercih ekranı + özet e-postası | #256 | blocked | |

Pro aşamaları (S4–S5): #263, lisans kararından sonra.

## Uygulama sırası

1. **Paralel başlangıç:** T0.1, T0.2 (Claude) · C0 (ChatGPT).
2. T0.3 ve T0.4 (Claude). **T0.3 merge olunca ChatGPT için T1.3 ve T1.4 açılır**; sözleşme tipleri o andan itibaren kodda.
3. S1 paralel: Claude T1.1, T1.2, T1.5 · ChatGPT T1.3, T1.4 → T1.6.
4. S2: Claude T2.1 → ChatGPT T2.2.
5. S3: Claude T3.1 → ChatGPT T3.2.

## ChatGPT'nin ilk görevleri

1. **#257 C0** — hemen başlanabilir (yalnız doküman).
2. **#259 T1.4** — T0.2 ve T0.3 merge olunca. Sözleşme tiplerine göre örnek veriyle UI hazırlığı.
3. **#258 T1.3** — T0.3 merge olunca.
