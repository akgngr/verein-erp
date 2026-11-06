# Kişisel sekreter — teknik şartname ve yapılacaklar

Durum: taslak · Hedef: KOBİ ve serbest çalışanlar için önerici asistan

## 1. Temel ilkeler
1. **Öneri, onay, kayıt.** AI hiçbir kaydı kendiliğinden oluşturmaz; her öneri kullanıcı onayıyla yazılır.
2. **Veri politikası:** K0/K1 modele gitmez; yalnız `AI_TOOL_POLICY`'de beyanlı K2/K3 araçlar + takma adlandırma.
3. **Modül sınırları:** asistan yalnız modüllerin `ai.ts` araçlarını ve public API'lerini kullanır.
4. Kapalı modülün yeteneği görünmez.

## 2. Bileşenler
| # | Yetenek | Kaynak | Çıktı |
|---|---|---|---|
| S1 | Günlük brifing | takvim, görevler, evrak, muhasebe OPOS | sabah özet kartı + isteğe bağlı e-posta (iş akışı zamanlaması) |
| S2 | Gelen kutusu → işlem önerisi | mail (IMAP) | "randevu / fatura / görev" öneri kartı, tek tıkla onay |
| S3 | Evrak OCR + otomatik doldurma | evrak/dosyalar | alan önerileri; son tarih → takvim (kullanıcı açar/kapatır) |
| S4 | Takvim asistanı | takvim + senkron eklentileri | boş zaman önerisi, davet taslağı |
| S5 | Takip ve hatırlatma | iş akışı motoru | "cevap gelmedi" → görev/hatırlatma |
| S6 | Hızlı giriş (metin/ses) | tarayıcı Web Speech API | ayrıştırılmış kayıt taslağı |

## 3. Teknik yapı
- `AssistantSuggestion` tablosu (K1): id, userId, kind, sourceModule, sourceId, payload (yalnız kimlikler + öneri alanları), status (PENDING, ACCEPTED, DISMISSED), expiresAt.
- Onaylanan öneri, hedef modülün mevcut server action'ını çağırır (izin kontrolleri aynen geçerli).
- Brifing: pg-boss zamanlanmış görevi, kullanıcı başına; sonuç K1, 7 gün saklama.
- OCR: yerel motor (Tesseract) öncelikli; dış AI yalnız kullanıcı açarsa ve maskelenmiş metinle.
- Ses: tarayıcıda metne çevrilir, sunucuya yalnız metin gider.

## 4. Yapılacaklar
- [ ] Takvim senkron eklentileri (S4 ön koşulu) — devam ediyor
- [ ] `AssistantSuggestion` modeli + öneri kutusu UI + veri politikası
- [ ] S1 günlük brifing (zamanlama + kart)
- [ ] S3 Evrak yeniden tasarımı: OCR + AI doldurma anahtarı
- [ ] S2 mail sınıflandırma önerileri
- [ ] S5 takip kuralları (iş akışı şablonları)
- [ ] S4 boş zaman bulma
- [ ] S6 hızlı giriş
- [ ] Her adımda: politika testi, tr/de, tarayıcı kontrolü
