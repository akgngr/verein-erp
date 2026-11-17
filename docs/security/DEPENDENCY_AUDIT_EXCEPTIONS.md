# Dependency Audit Exceptions

Bu dosya, güvenlik audit kapısında kullanılan **geçici ve dar kapsamlı** istisnaları belgeler.

## GHSA-fc5q-39xc-vjpf — picomatch ReDoS

- **Severity:** High
- **Etkilenen:** picomatch <= 4.0.7
- **Repo içindeki yol:** transitive dependency (`@parcel/watcher`, `tinyglobby` / `fdir`)
- **Doğrudan dependency:** Hayır
- **Başlangıç:** 2026-11-17
- **Son tarih:** 2026-12-15
- **Upstream durum:** npm'de 4.0.7'den yeni yamalı sürüm yok; upstream fix PR `micromatch/picomatch#254` açık.
- **CI davranışı:** yalnız bu GHSA `pnpm audit --ignore` ile geçici olarak toleranslıdır. Diğer high/critical advisory'ler CI'yi kırmaya devam eder. Son tarihten sonra workflow bilinçli olarak fail olur.

## Kaldırma koşulu

Aşağıdakilerden ilki gerçekleştiğinde istisna kaldırılır:

1. picomatch yamalı sürüm yayımlar ve transitive dependency zinciri onu doğal olarak kullanır;
2. üst dependency (`tinyglobby`, `@parcel/watcher` vb.) picomatch'in etkilenmeyen sürümüne geçer;
3. ilgili transitive dependency üretim ağacından çıkar.

Yayınlanmamış bir fork/PR commit'i production dependency olarak pinlenmez; upstream'in resmi paketi tercih edilir.
