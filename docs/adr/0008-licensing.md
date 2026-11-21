# ADR 0008 — Enterprise licensing (signed, domain + organisation bound)

**Status:** accepted (product owner, 2026-11-20) · **Source:** [RFC-002](https://github.com/akgngr/verein-erp/discussions/417), #419

## Context
Some features are Enterprise-only, first of all the contextual help center with AI help (RFC-002). The product owner decided:
- Self-hosted instances without a license do **not** get these features. A self-hoster buys a license and activates it with that license.
- A license is bound to **both** the instance domain and the organisation.
- AI help runs on the customer's own AI provider (no vendor-hosted endpoint).

The main repository is public, so a check in public code alone can be patched out.

## Decision
1. **License document `vlic-1`:** JSON `{ format, payload, signature }`. The payload has `licenseId`, `tier`, `organisation { name, registryId? }`, `domain`, `features[]`, `issuedAt` and `expiresAt`. The Ed25519 signature covers `canonicalJson(payload)`, the same canonicalisation used for module packages.
2. **Offline verification** against public keys in `src/config/license-issuers.json`, which changes only by code review. The private key stays with the product owner and never enters a repository (`*.pem` is git-ignored). If the issuer list is empty, no license is valid.
3. **Binding:** the license is valid only when
   - `payload.domain` equals the hostname of `APP_URL`, **and**
   - the organisation name (normalised) equals the Organization profile name, **and**
   - when `registryId` is set, it equals the profile's register number, or the tax number as fallback.
4. **Expiry:** after `expiresAt` there is a **14-day grace period**, during which features stay on and admins see a warning. After that, licensed features turn off. Nothing else in the app changes.
5. **Gate:** `ModuleConfig.license = { feature }`. `getModuleAvailability` returns `unlicensed` and `listUsableModuleKeys` excludes the module. This covers menu, generated page/API bridges and worker checks. Server code uses `hasLicensedFeature(feature)`; the UI only receives booleans.
6. **Storage:** the license text sits in `system_settings["license"]`. It is not secret: it is signed and holds no credentials. The computed status is cached in memory for 60 s, and save/remove clears the cache.
7. **Admin screen:** Settings → License (`/ayarlar/lisans`, `system:update`). It shows a status summary; the raw text is never displayed after saving. Save/remove events are audited with the license id, state, features and expiry only.
8. **Distribution of licensed modules:** licensed modules (e.g. `help-center`) and their content live in a **private repository** and ship as signed marketplace packages. The public repo contains only the license core and generic extension points.
9. **Tooling:** `pnpm license:keygen <label>` creates the issuer key pair. `pnpm license:issue --key … --org … [--registry …] --domain … --features … --until …` prints a signed license.

## Consequences
- A determined self-hoster with the source of a licensed module could remove the check. Licensed module sources are therefore not public, and the license terms forbid circumvention. This is the accepted trade-off for offline, privacy-friendly verification (no phone-home).
- Changing the domain or the organisation name requires a re-issued license.
- The same mechanism is reused for future Enterprise features.
