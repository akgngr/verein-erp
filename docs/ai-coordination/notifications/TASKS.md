# Merkezi bildirim sistemi — görev panosu

**Karar:** [ADR 0006](../../adr/0006-central-notifications.md) · **Epic:** #365 · **Protokol:** [`../README.md`](../README.md) · **Koordinatör:** Claude

| Faz | Kod | Issue | Sahip | Görev | Bağımlılık | Durum |
|---|---|---|---|---|---|---|
| N0 | N0 | #353 | Claude | ADR + sözleşme + tablolar | — | in progress |
| N1 | N1a | #354 | Claude | Çekirdek servis, kutu, okundu/ertele, saklama | #353 | blocked |
| N1 | N1b | #355 | ChatGPT | Zil + rozet + sağ çekmece | #354 | blocked |
| N1 | N1c | #356 | Claude | İlk kaynaklar (görev, toplantı, sekreter, posta) | #354 | blocked |
| N2 | N2a | #357 | Claude | Tercihler, e-posta, sessiz saat, özet | #354 | blocked |
| N2 | N2b | #358 | ChatGPT | Ayarlar → Bildirimler UI | #357 | blocked |
| N3 | N3a | #359 | Claude | Web push backend (VAPID otomatik, DB) | #357 | blocked |
| N3 | N3b | #360 | Gemini | Service worker, izin akışı, PWA | #359 | blocked |
| N4 | N4 | #361 | Claude | Telegram (DB token, tek tıkla bağlama) | #357 | blocked |
| N5 | N5 | #362 | Claude | WhatsApp (Meta Cloud API) — ürün sahibi adımı gerekir | #357 | blocked |
| N6 | N6 | #363 | Claude | Sekreter geçişi, SMS, otomasyon düğümü | #357, #361 | blocked |
| N7 | N7 | #364 | Gemini | SSE anlık güncelleme + çekmece a11y | #355 | blocked |

**Ajan rolleri:** Claude — koordinatör, arka uç, PR incelemesi ve merge. ChatGPT (Codex) — kullanıcı arayüzü. Gemini — modern web (service worker, PWA, SSE, a11y/IME, tarayıcı uyumluluğu).
