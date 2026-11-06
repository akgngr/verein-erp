# Hatırlatma: güvenlik test altyapısı

Durum: **ertelendi**. Ana geliştirmeler bitince kurulacak (karar: 2026-11-06).
Tetikleyici: takvim senkron eklentileri, CRM ve sekreter S1–S3 tamamlandığında veya ilk canlı müşteri öncesi — hangisi önce gelirse.

## Şimdiden açık kalan risk
- `tests/security` içindeki input-validation, path-traversal ve rate-limiting testleri canlı sunucu ister; CI'da çalışmıyorlar.
- CI'da SAST ve imaj taraması yok (sır taraması + bağımlılık denetimi #110 ile eklendi).

## Yapılacaklar (öncelik sırasıyla)
- [ ] **Yetki matrisi + IDOR testleri** — rol × sayfa/server action, başka kullanıcının kaydına id ile erişim (yetki kayıt defterinden otomatik üret)
- [ ] Canlı sunucu isteyen 3 security testini CI'da build edilmiş uygulamaya karşı çalıştır
- [x] Gitleaks (sır taraması) — `.github/workflows/security.yml` (#110)
- [ ] GitHub secret scanning + push protection (repo ayarı; sahibi açmalı)
- [x] `pnpm audit --prod --audit-level high`, haftalık (#110)
- [ ] OSV-Scanner + Dependabot
- [ ] CodeQL + Semgrep (OWASP, Next.js kuralları)
- [ ] Trivy ile GHCR imaj taraması
- [ ] OWASP ZAP baseline + oturum açmış tarama (CSP, HSTS, çerez bayrakları dahil)
- [ ] Server action / API fuzzing (zod şemalarından)
- [ ] Marketplace modül imzasının CI'da doğrulanması
- [ ] Canlıya geçişte: testssl.sh, OWASP ASVS L2 kontrol listesi, yılda bir dış pentest
