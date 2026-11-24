# RFC-003 — Public member portal: surface and authentication

**Issue:** #399 · **Gates:** W2 member privacy cockpit + self-service portal (`docs/specs/B001_PRODUCT_ROADMAP.md` §5 W2), SEC2 #409
**Status:** **Accepted** by the owner on 2026-11-23 (§10, ADR 0010).
**Author:** agent:claude · **Date:** 2026-11-23 · **Related:** ADR 0001 (hybrid multi-tenant), RFC-002 #417, DECISION_LOG

> The portal is the first **internet-facing surface for members**. Today every authenticated route is for the board and staff (Auth.js Credentials, roles). This RFC defines a separate, data-minimal surface with its own threat model, authentication and routing. It does not change the admin surface.

## 1. Goals and non-goals

**Goals (W2 scope)**
- Members can:
  - view their master data and propose corrections, which go through an approval queue for the board;
  - manage consents and channels;
  - download dues and donation receipts;
  - sign pending documents;
  - register for events;
  - request an **Art. 15** export;
  - read a plain-language **processing log** derived from the audit log.
- A legal guardian can act for a minor student. The scope is limited to that student and to what the guardian already signs in `online-forms`.

**Non-goals (v1)**
- No member directory. A member appears to other members only if they opt in per field, and not in v1 at all.
- No passwords for members, and no Auth.js admin roles for members.
- No payments in the portal (SEPA stays in `sepa`, done by the treasurer).
- No AI in the portal.

## 2. Existing building blocks (reuse, do not duplicate)

| Building block | Where | Reuse |
|---|---|---|
| Single-use signed form links: `tokenHash` (SHA-256, token never stored), `expiresAt`, masked `sentTo`, evidence PDF + hash | `online-forms` (`OnlineFormRequest`, `public/formular/[token]`) | Same token pattern for magic links; signing pending documents links into the existing flow. |
| Self-service read/write contracts | `students/server` (`getStudentSelfService`, `applyStudentSelfService`, guardian variants), `members` online-form handlers | Portal calls module contracts only; no direct table access. |
| Login lockout (`failedLoginCount`, `lockedUntil`) | `auth/services/authorize.ts`, `shared/security/login-lockout.ts` | Same policy idea for magic-link requests, but keyed per address hash and IP, never per account existence. |
| Channel consents, masked addresses | `notifications`, `secretary/services/channels.ts` (`maskChannelAddress`) | Consent screen and masked display. |
| Audit log | `audit` | Source for the processing log (filtered, plain-language). |
| Egress ledger | `system_egress_ledger` (#511) | Records mail and SMS sends of magic links (metadata only). |

## 3. Threat model

| # | Threat | Vector | Mitigation (binding) |
|---|---|---|---|
| T1 | **Credential stuffing / account takeover** | Reused passwords | No member passwords. Possession-based login (magic link) plus **step-up with a passkey** for sensitive actions. |
| T2 | **Link interception** | Forwarded mail, shared mailbox, mail scanner prefetch, referrer leak | Single use; about **15 min** TTL; bound to the requesting browser by a `__Host-` nonce cookie (the link only works in the browser that asked for it); a GET shows a confirm page and the token is consumed by a POST (scanner prefetch safe); `Referrer-Policy: no-referrer`; the token is never logged. |
| T3 | **Enumeration** (is X a member?) | Login form, error texts, timing | Identical response and constant-time path for known and unknown addresses ("If this address is registered, we sent a link"); rate limits per IP and per address hash; no account existence in any error. |
| T4 | **IDOR on downloads** | Guessing receipt or document ids | Every portal read is scoped server-side to `portalSubject` (member id, or guardian → student links). Ids in URLs are opaque, single-purpose references (short-lived signed refs), not database ids. Negative tests in the SEC2 matrix (#409). |
| T5 | **Resource exhaustion of the admin surface** | Flooding portal endpoints that share the runtime | Separate route group and optional separate deployment (§5); per-IP and per-subject quotas; PDF and export generation through the existing queue (`exports`, `online-forms` pdf-queue) with per-subject concurrency 1; request size limits. |
| T6 | **Session theft / fixation** | XSS, stolen cookie | `__Host-` cookies, `HttpOnly`, `Secure`, `SameSite=Strict`; session rotation after login and after step-up; strict CSP on the portal (no inline scripts, no third-party origins). |
| T7 | **Guardian overreach** | A guardian sees another child or adult data | Only explicit `StudentGuardianLink` relations; no matching by name or email (same rule as AI C08); scope list shown to the guardian. |
| T8 | **Mass data exfiltration via Art. 15** | Repeated exports | One open Art. 15 request per subject; step-up required; the result is delivered as an encrypted download with expiry; the board sees the request in the queue. |
| T9 | **Phishing look-alike** | Fake portal mails | Mails never contain data, only "a link was requested"; the association's domain and sender are fixed; the portal shows the last login time. |

## 4. Authentication design

### 4.1 Magic link (primary login)
1. The member enters an email address (or phone for SMS, if the channel is configured and consented).
2. The server looks up the address. Whether it exists or not, the response and timing are the same (T3).
3. If it exists:
   - the server creates `PortalLoginToken { tokenHash, subjectRef, nonceHash, expiresAt = now + 15 min, usedAt }`;
   - it sets the `__Host-portal-nonce` cookie;
   - it sends the link through the existing mail channel and records the send in the egress ledger.
4. The link opens a confirm page (GET has no side effect). A POST:
   - checks the token hash, the nonce cookie, the expiry and that the token is unused;
   - marks it used in the same transaction;
   - creates the session.
5. Limits:
   - 3 link requests per address hash per 15 min;
   - 20 per IP per hour;
   - 5 wrong-token POSTs per IP per 15 min, then exponential delay.

### 4.2 Step-up (passkey / WebAuthn)
- **Required for:** receipt and document downloads, Art. 15 requests, changing channel addresses, signing.
- **Enrolment:** after the first magic-link login the member can register a passkey. If no passkey exists, step-up falls back to a **fresh magic link** (≤ 5 min old login).
- **Policy:**
  - `userVerification: "required"`;
  - resident keys allowed;
  - attestation `none`;
  - one RP id per tenant domain (ADR 0001).
- **Library:** decided in the implementation issue (e.g. `@simplewebauthn/server`). It must pass the outbound and dependency rules (no external calls).

### 4.3 Sessions
- Idle timeout 15 min; absolute timeout 8 h; step-up valid for 5 min.
- At most 3 parallel sessions per subject; the oldest is revoked.
- A "sign out everywhere" button.
- Separate from admin sessions. A board member who is also a member uses two separate sessions. Roles are never mixed.

## 5. Routing and deployment (ADR 0001)

- **Route group:** a separate group, e.g. `src/app/(portal)/portal/**`, with its own layout:
  - no admin navigation, widgets or global search;
  - its own middleware branch in `src/proxy.ts` that **never** accepts the admin session cookie, and vice versa.
- **Module contract:** a portal module (working name `member-portal`) only calls other modules' `server` contracts (`members`, `students`, `donations`, `events`, `online-forms`, `notifications`, `audit`). It declares them in `access` and has no direct table access to other modules.
- **Deployment options:**
  - (a) same runtime with path isolation, the default for self-host and phase 1;
  - (b) a separate `portal` container from the same image with `PORTAL_ONLY=1`, which disables every non-portal route and is recommended for hosted Business and Enterprise (ADR 0001, phase 1–2);
  - (c) a separate subdomain per tenant (`portal.<verein>.de`).
- **Rate limiting:** a shared limiter abstraction (Postgres-backed for self-host, no Redis requirement). Limits are per tenant (ADR 0001 phase 2 context).
- **Headers:**
  - CSP `default-src 'self'`;
  - `frame-ancestors 'none'`;
  - `Referrer-Policy: no-referrer`;
  - `Permissions-Policy` minimal;
  - no third-party fonts or scripts.

## 6. Data scope (data-minimal by default)

| Feature | Data shown | Write path |
|---|---|---|
| Master data | Own name, address, contact, membership type and number, masked IBAN | Correction proposal → approval queue (board) → module contract applies it. No direct write. |
| Consents and channels | Own consents with text version; masked addresses | Revoke immediately; add only with double opt-in |
| Receipts | Own dues and donation receipts (PDF) | Read only; step-up |
| Documents | Pending documents to sign (`online-forms`) | Existing signing flow and evidence |
| Events | Public events and own registrations | Register and cancel through the `events` contract |
| Art. 15 | Request status | One open request; export generated by the queue; encrypted download with 7-day expiry |
| Processing log | Plain-language entries from `audit` for this subject only: who (role, not person name), when, what category | Read only |

- No other member's data is ever shown.
- K3 data (minors) is visible only to the linked guardian.
- Health and Art. 9 data are not shown in v1.

## 7. Test plan

- **Negative authorization (SEC2 #409 matrix):**
  - every portal endpoint is called with another subject's reference, with an expired, used or foreign-nonce token, with the admin session, and with no session;
  - all must be refused with the same error shape.
- **Enumeration:** identical response body and status for known and unknown addresses; timing difference below the threshold over 200 runs (CI statistical test with fake mail).
- **Token:** single use under concurrency (two parallel POSTs → exactly one session); a scanner GET does not consume the token; TTL boundary.
- **Step-up:** download without step-up → refused; step-up older than 5 min → refused.
- **Guardian:** guardian A cannot read student B; no name or email matching.
- **Abuse:** rate-limit tests per IP and per address hash; queue concurrency per subject.
- **Accessibility:** WCAG 2.1 AA (axe in CI plus manual keyboard and screen-reader pass), TR/DE, mobile first.
- **Privacy:** no PII in logs (log scan in tests); egress ledger entry per link send.

## 8. Rollout

1. ADR (after approval) and DECISION_LOG row.
2. P1: auth core (tokens, nonce, sessions, rate limiter), the portal shell, and master data read only.
3. P2: corrections queue, consents, receipts with step-up.
4. P3: documents, events, Art. 15, processing log.

The feature flag `PORTAL_ENABLED=false` is the default. Each phase passes the negative-test matrix before the flag is offered to tenants.

## 9. Decisions requested from the owner

1. Approve possession-based login (magic link) with passkey step-up, and **no member passwords**.
2. Default deployment: same runtime with path isolation (a), and a separate `portal` container (b) for hosted plans.
3. Approve the data scope table (§6), in particular "no member directory in v1" and "corrections go through an approval queue".
4. Is SMS an allowed magic-link channel in v1 (cost, SIM-swap risk), or email only?
5. Is the portal Community-tier, or a Business+ feature (licensing, RFC-002 model)?

## 10. Owner decisions (2026-11-23)
1. **Possession-based login with passkey step-up and no member passwords:** approved.
2. **Deployment:** option **(a) only**, the same runtime with path isolation (separate route group and proxy branch). The separate `PORTAL_ONLY` container (b) is **not** built now. It stays a later option if hosted plans need it, and needs a new decision.
3. **Data scope (§6):** approved. No member directory in v1; corrections go through the board's approval queue.
4. **Magic-link channel:** **email only** in v1. SMS may come later as an opt-in per association.
5. **Tier:** the **core portal is Community**, because these are rights under the GDPR:
   - own data and correction proposals;
   - consents and channels;
   - receipts;
   - Art. 15 request;
   - processing log.

   Event registration and document signing in the portal are **Business+** features (licensing model of RFC-002 / ADR 0008).

Implementation follows ADR 0010 in three phases (§8); the issues are opened with this decision.
