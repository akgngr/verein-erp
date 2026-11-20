# Merkezi bildirim sistemi — görev panosu

**Karar:** [ADR 0006](../../adr/0006-central-notifications.md) · **Epic:** #365 · **Protokol:** [`../README.md`](../README.md) · **Koordinatör:** Claude

**Son güncelleme:** 2026-11-20. **done** = issue kapalı ve PR alpha'da.

| Faz | Kod | Issue | Sahip | Görev | Bağımlılık | Durum | PR |
|---|---|---|---|---|---|---|---|
| N0 | N0 | #353 | Claude | ADR + sözleşme + tablolar | — | done | #366 |
| N1 | N1a | #354 | Claude | Çekirdek servis, kutu, okundu/ertele, saklama | #353 | done | #368 |
| N1 | N1b | #355 | ChatGPT | Zil + rozet + sağ çekmece | #354 | in progress | #369 (taslak) |
| N1 | N1c | #356 | Claude | İlk kaynaklar (görev, toplantı, sekreter, posta) | #354 | done | #370 |
| N1 | N1d | #374 | Claude | Kitle (herkes/rol) + kurum duyurusu | — | done | #379 |
| N2 | N2a | #357 | Claude | Tercihler, e-posta, sessiz saat, özet | #354 | done | #371 |
| N2 | N2b | #358 | ChatGPT | Ayarlar → Bildirimler UI | #357 | in progress | #378 (taslak) |
| N3 | N3a | #359 | Claude | Web push backend (VAPID otomatik, DB) | #357 | done | #373 |
| N3 | N3b | #360 | Gemini | Service worker, izin akışı, PWA | #359 | ready | — |
| N4 | N4 | #361 | Claude | Telegram (DB token, tek tıkla bağlama) | #357 | done | #372 |
| N5 | N5 | #362 | Claude | WhatsApp (Meta Cloud API) | #357 | blocked: ürün sahibi Meta doğrulaması | — |
| N6 | N6 | #363 | Claude | Sekreter geçişi, SMS, otomasyon düğümü | #357, #361 | done | #382, #383 |
| N7 | N7 | #364 | Gemini | SSE anlık güncelleme + çekmece a11y | #355 | blocked | — |
| N8 | N8a | #375 | Claude | Abone görünümü (backend) | — | done | #380 |
| N8 | N8b | #376 | ChatGPT | Aboneler ekranı | #375 | ready | — |
| N8 | N8c | #381 | ChatGPT | Duyuru gönderme ekranı | #374 | ready | — |

**Ajan rolleri:** Claude — koordinatör, arka uç, PR incelemesi ve merge. ChatGPT (Codex) — kullanıcı arayüzü. Gemini — modern web (service worker, PWA, SSE, a11y/IME, tarayıcı uyumluluğu).

**Arayüz için hazır sunucu eylemleri:** `actions/inbox.ts` (liste, rozet, okundu, ertele, kapat), `actions/preferences.ts` (tercih tablosu, ayarlar), `actions/channels.ts` (Telegram/SMS/Web Push bağlama ve yönetici kanal ayarları), `actions/subscribers.ts` (abone görünümü), `actions/announcements.ts` (duyuru).
