# ERP Motion System

**Tarih:** 2026-11-17

Motion, dekoratif hareket değil; kullanıcının state değişimini anlamasına yardımcı olan geri bildirimdir.

## Tokenlar

- `--motion-fast: 120ms`
- `--motion-normal: 180ms`
- `--motion-slow: 240ms`
- `--motion-ease-standard`
- `--motion-ease-enter`
- `--motion-ease-exit`

## Ortak sınıflar

- `.erp-motion-interactive`: hover/focus gibi küçük state değişimleri
- `.erp-motion-enter`: surface/bulk bar gibi kısa giriş animasyonu
- `.erp-motion-selection`: selected row/surface feedback

## Kurallar

1. Motion işlevsel olmalı; sürekli dekoratif animasyon eklenmez.
2. Standart UI geçişleri 300ms üzerine çıkmaz.
3. Büyük translate/scale ve bounce kullanılmaz.
4. `transition: all` yerine değişecek özellikler açık yazılır.
5. Kritik işlev animasyona bağımlı olamaz.
6. `prefers-reduced-motion: reduce` her zaman desteklenir.
7. Yeni motion paketi ancak CSS/Web Animations API yetersizse ve bundle maliyeti gerekçelendirilirse eklenir.

## Önerilen kullanım

- hover/focus: fast
- selection/state feedback: normal
- drawer/popover/surface enter: normal veya slow
- success feedback: normal
