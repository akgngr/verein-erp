# ELSTER ERiC doğrulaması (2. aşama)

**Tarih:** 2026-11-17 · **İş akışı:** `.github/workflows/elster-eric.yml` · **Durum:** hazır. Senin ERiC paketini eklemen bekleniyor.

ERiC, Alman maliyesinin resmî kütüphanesidir. UStVA ve beyanname verilerini, maliyenin kendi uygunluk kurallarıyla (Plausibilitätsprüfung) denetler. Kütüphane yalnızca kayıtlı geliştiricilere verilir ve projeye eklenip dağıtılamaz. Bu yüzden CI işi paketi senin vereceğin gizli bir adresten indirir.

## Ne yapılır

- `pnpm elster:corpus <klasör>`: sentetik UStVA dosyaları üretir.
  - Örnekler: aylık iade, çeyreklik ödeme, sıfır beyan.
  - Test vergi dairesi 9198 kullanılır, dosyalar Testmerker `700000004` ile işaretlenir.
  - Gerçek kurum verisi kullanılmaz.
- `scripts/elster/eric-validate.c`: ERiC'i **yalnızca doğrulama** bayrağıyla (`ERIC_VALIDIERE`) çağırır. Hiçbir şey gönderilmez, sertifika gerekmez.
- Kaynak kod:
  - `src/modules/accounting/services/elster-ustva.ts`: UStVA verisini ELSTER XML'ine çevirir.
  - `src/modules/accounting/services/elster-taxnumber.ts`: eyalet formatındaki vergi numarasını 13 haneli ELSTER formatına çevirir.
  - Testler: `tests/accounting/elster.test.ts`.

## Senin yapman gerekenler

1. **ELSTER geliştirici kaydı:** <https://www.elster.de/elsterweb/entwickler> → "Registrierung als Softwareentwickler".
   - Ücretsizdir.
   - Onay birkaç gün sürebilir.
   - Kayıt sonunda bir **HerstellerID** verilir.
2. Geliştirici alanından **ERiC Linux-x86_64** paketini indir.
3. Paketi yalnızca CI'ın erişebileceği gizli bir yere koy. Örneğin özel bir depo sürümü ya da imzalı (süreli) bir indirme linki.
4. GitHub → Settings → Secrets and variables → Actions altına şunları ekle:
   - `ERIC_ARCHIVE_URL`: paketin indirme adresi.
   - `ERIC_ARCHIVE_TOKEN`: gerekiyorsa, Bearer token.
   - `ELSTER_PRODUCER_ID`: HerstellerID'n. Verilmezse herkese açık test kimliği `74931` kullanılır.
5. Actions → "ELSTER ERiC validation" → **Run workflow**.

Secret yoksa iş, bir uyarı bırakıp atlanır; CI kırmızıya dönmez.

## Sınırlar ve sonraki adımlar

- UStVA XML yapısı ELSTER'in yayımlanmış yapısına göre yazıldı. ERiC'in kendi şeması ile ilk çalıştırma, sürüm özniteliği gibi ayrıntılarda düzeltme gerektirebilir; ilk sonuçla birlikte düzeltilecek.
- Anlage EÜR, UStVA doğrulaması oturunca aynı altyapıyla eklenecek. EÜR'ün alan kodları her yıl değişir ve ERiC şemasından alınması gerekir.
- Uygulamaya "ELSTER dosyası indir" ya da gönderme özelliği **eklenmedi**. Bu ancak ERiC doğrulaması kalıcı olarak yeşil olunca ve senin onayınla eklenir. Gerçek gönderim için ayrıca bir ELSTER sertifikası gerekir.
