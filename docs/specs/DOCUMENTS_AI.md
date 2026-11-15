# Gelen-giden evrak: OCR ve AI ile akıllı kayıt — şartname ve yapılacaklar

Durum: uygulanıyor · Kapsam: `documents` modülü (+ accounting, tasks entegrasyonu) · Tarih: 2026-11-15

## Amaç

Kullanıcı evrakı (PDF, tarama, fotoğraf) yükler; sistem metni çıkarır, form alanlarını önerir,
kısa bir özet yazar; ödeme varsa muhasebede, termin varsa ilgili modülde **onaylı** iş oluşturur.
Hiçbir kayıt kullanıcı onayı olmadan değişmez.

## Mimari kararlar

| Konu | Karar | Gerekçe |
| --- | --- | --- |
| OCR motoru | `tesseract.js` 7 + `@tesseract.js-data` (deu, tur, eng) | Saf JS/WASM, yerel bileşen yok, Almanca/Türkçe dil paketi hazır, veri dışarı gitmez. Deneme: test faturası güven 93, ~1 sn/sayfa. `@gutenye/ocr` (PaddleOCR/ONNX) DE/TR karakterlerinde ölçülmedi, ~100 MB yerel ONNX çalışma ortamı getirir; motor soyutlanır, sonra değiştirilebilir. |
| Taranmış PDF | `unpdf.extractImages` → sayfa görüntüsü → BMP → OCR (en çok 5 sayfa) | Ek canvas/poppler bağımlılığı yok. |
| Nerede çalışır | Web sunucusunda, kullanıcı "Evraktan doldur" dediğinde | Evrak modülüne otomasyon erişimi eklemek modülü yönetici onayına kadar kilitlerdi. Süre: sayfa başına 1–2 sn, 5 sayfa sınırı. |
| Alan çıkarma | Önce kural tabanlı (tarih, termin, tutar, IBAN, referans no, gönderen, konu) | AI olmadan da çalışır, deterministik ve test edilebilir. |
| AI (özet + sınıflandırma) | Mevcut sağlayıcı katmanı; yerel model veya bulutta yalnız takma adlı/maskelenmiş metin | Evrak içeriği en hassas sınıf (read_content). Bulutta `SCREENED` + tarama; özel nitelikli veri → yalnız yerel. |
| Muhasebe / termin | Öneri + onay kartı; muhasebede gelen fatura taslağı, görev/termin | Mevcut onay protokolü; yazma yetkisi yeniden denetlenir. |

## Fazlar

### EV-1 OCR + kural tabanlı form doldurma
- [x] `src/shared/files/ocr.ts`: görüntü/taranmış PDF OCR (deu+tur+eng), sayfa ve süre sınırı.
- [x] `services/field-extraction.ts`: saf alan çıkarma (DE/TR kalıpları) + testler.
- [x] `POST /api/documents/analyze`: dosyayı kaydetmeden analiz eder (create/update yetkisi).
- [x] Form: seçilen dosyanın yanında "Evraktan doldur" → öneri penceresi → seçilen alanlar forma.

### EV-2 AI özet ve sınıflandırma
- [ ] Özet (2–3 cümle), evrak türü (fatura, resmî yazı, sözleşme, bilgilendirme), kategori önerisi.
- [ ] Sağlayıcı politikası: yerel ya da maskelenmiş metinle bulut; reddedilirse kural tabanlı sonuç kalır.

### EV-3 İş oluşturma
- [ ] Ödeme tespiti → "Muhasebede gelen fatura taslağı oluştur" (tutar, IBAN, vade, ek dosya).
- [ ] Termin tespiti → evrak `dueDate` + görev/takvim önerisi.
- [ ] Sohbetten: `analyze_document` aracı (yalnız yetkili, read_content kapısı).

## Kabul ölçütleri
- Taranmış PDF ve fotoğraftan Almanca/Türkçe metin çıkar; kuralı tutan alanlar forma önerilir.
- Kullanıcı seçmediği alan değişmez; kayıt mevcut doğrulamadan geçer.
- Analiz edilen dosya ayrıca saklanmaz; metin loglara yazılmaz.
