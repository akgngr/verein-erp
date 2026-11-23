# ADR 0010 — Member portal: passwordless login, path-isolated surface, data-minimal scope

Status: **accepted** (owner, 2026-11-23)
Target: alpha · Source: RFC-003 (`docs/specs/RFC_003_MEMBER_PORTAL_AUTH.md`, #399) · Related: ADR 0001, ADR 0008, RFC-004

## Context
The portal is the first internet-facing surface for members (W2). Today every authenticated route serves the board and staff. Members need to exercise their GDPR rights (Art. 15–21), see receipts and manage consents without becoming admin users.

## Decision
1. **Authentication:**
   - no member passwords;
   - login by an **email magic link**: about 15 min TTL, single use, bound to the requesting browser by a `__Host-` nonce cookie, consumed only by POST, rate-limited per IP and per address hash, with the same response for unknown addresses;
   - **passkey (WebAuthn) step-up** for downloads, Art. 15 requests, address changes and signing. Without a passkey, a fresh magic link of at most 5 min serves as step-up.
   - Sessions: idle 15 min, absolute 8 h, at most 3 per member, "sign out everywhere".
   - Member sessions and admin sessions never mix.
   - SMS is **not** a login channel in v1.
2. **Deployment: same runtime, path isolation only.**
   - A separate route group and layout with no admin navigation, widgets or search.
   - Its own branch in `src/proxy.ts` that never accepts the admin session cookie, and the admin side never accepts the portal cookie.
   - Strict headers: CSP `default-src 'self'`, `frame-ancestors 'none'`, `Referrer-Policy: no-referrer`.
   - A separate portal container is **not** built now; it would need a new decision.
3. **Module:** a new module `member-portal`. It calls other modules only through their `server` contracts, declared in `access`, and never reads their tables directly.
4. **Data scope (v1):**
   - own master data, read only; corrections go to the **board's approval queue**;
   - consents and channels, with masked addresses;
   - own dues and donation receipts;
   - Art. 15 request, one open at a time, an encrypted download with 7-day expiry;
   - a plain-language processing log from `audit` (roles, not names);
   - **no member directory**.

   K3 data of minors is visible only to the linked guardian (explicit `StudentGuardianLink`, no name or email matching).
5. **Tier:** the core portal of point 4 is **Community**, because it serves GDPR rights. Portal event registration and portal document signing are **Business+** (ADR 0008).
6. **Release gate:**
   - `PORTAL_ENABLED=false` is the default.
   - Each phase must pass the negative-authorization matrix (SEC2 #409) before the flag is offered.
   - WCAG 2.1 AA / EN 301 549.

## Consequences
- Phase P1 (auth core and shell) also unblocks remote secret voting (RFC-004 phase 4), together with the legal review.
- A shared, Postgres-backed rate limiter becomes platform code (`src/shared/security`). There is no Redis requirement for self-host.
- The egress ledger records magic-link sends (metadata only).

## Phases (issues)
- **P1:** auth core (tokens, nonce, sessions, rate limiter, passkey), portal shell, master data read only.
- **P2:** correction queue, consents and channels, receipts with step-up.
- **P3:** Art. 15 export, processing log; Business+: events and document signing.
