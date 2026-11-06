# Hatırlatma: güvenlik test altyapısı

Durum: **ertelendi**. Ana geliştirmeler bitince kurulacak (karar: 2026-11-06).
Tetikleyici: takvim senkron eklentileri, CRM ve sekreter S1–S3 tamamlandığında veya ilk canlı müşteri öncesi — hangisi önce gelirse.

## Şimdiden açık kalan risk
- `tests/security` içindeki input-validation, path-traversal ve rate-limiting testleri canlı sunucu ister; CI'da çalışmıyorlar.
- CI'da SAST, bağımlılık, sır ve imaj taraması yok.

## Yapılacaklar (öncelik sırasıyla)
- [ ] **Yetki matrisi + IDOR testleri** — rol × sayfa/server action, başka kullanıcının kaydına id ile erişim (yetki kayıt defterinden otomatik üret)
- [ ] Canlı sunucu isteyen 3 security testini CI'da build edilmiş uygulamaya karşı çalıştır
- [ ] Gitleaks (sır taraması) + GitHub push protection
- [ ] `pnpm audit` / OSV-Scanner + Dependabot
- [ ] CodeQL + Semgrep (OWASP, Next.js kuralları)
- [ ] Trivy ile GHCR imaj taraması
- [ ] OWASP ZAP baseline + oturum açmış tarama (CSP, HSTS, çerez bayrakları dahil)
- [ ] Server action / API fuzzing (zod şemalarından)
- [ ] Marketplace modül imzasının CI'da doğrulanması
- [ ] Canlıya geçişte: testssl.sh, OWASP ASVS L2 kontrol listesi, yılda bir dış pentest
