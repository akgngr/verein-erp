# RFC-004 — Secret ballot architecture for the general assembly

**Issue:** #400 · **Gates:** W5 General assembly end-to-end (`docs/specs/B001_PRODUCT_ROADMAP.md` §5 W5)
**Status:** Proposed. Requires **owner approval and a legal review** before any implementation issue is opened.
**Author:** agent:claude · **Date:** 2026-11-23 · **Depends on:** RFC-003 (portal authentication) for remote voting

> **Not legal advice.** Sections 7 and 8 list legal questions for a lawyer. They are not answers (RDG § 3; DECISION_LOG 2026-11-22, `src/shared/ai/advice-policy.ts`).

## 1. Problem and scope

- Associations decide by open votes, but **elections and sensitive motions are often secret**: the bylaws, a member's request, or custom.
- Today `meetings` stores only the totals per decision (`MeetingDecision.votesFor/Against/Abstain`).
- W5 needs secret votes for in-person, hybrid and fully virtual assemblies (BGB § 32 Abs. 2). The design must meet three requirements together:
  1. **Eligibility is verifiable:** only eligible members vote, at most once (or with a documented proxy weight).
  2. **Ballots are unlinkable:** nobody can link a ballot to a member. This includes the board, the operator, a database admin, a log reader and our own code.
  3. **The result is auditable:** the counted totals can be checked against the cast ballots.

**Out of scope (v1):** cryptographic end-to-end verifiability (voter-verifiable receipts, mix-nets, homomorphic tallying). v1 is a **trusted-server design with strict data separation**. §6 states plainly what it can and cannot prove.

## 2. Design: two stores that share no key

```
┌───────────────────────────────┐          ┌─────────────────────────────┐
│ Eligibility register (E)      │          │ Ballot box (B)              │
│ vote_eligibility              │   no FK  │ vote_ballots                │
│  voteId, memberId, weight,    │  ──────  │  voteId, choice, weight,    │
│  status: ISSUED → USED        │  no join │  batch  (no time, no order) │
│  usedAt (minute precision)    │   key    │  ballotNonce (random)       │
└───────────────────────────────┘          └─────────────────────────────┘
          ▲ step 2: mark USED                      ▲ step 3: insert ballot
          │                                          │
   step 1: authenticated member ─────► one-time ballot credential (in memory only)
```

### 2.1 Flow
1. **Issue (authenticated).** The member is identified: a portal session with step-up (RFC-003), or an in-person check-in at the assembly.
   - The server checks eligibility (membership status and the bylaws rules) and the proxy weight.
   - It creates `vote_eligibility(voteId, memberId, weight, status=ISSUED)`.
   - It returns a **one-time ballot credential**: a 256-bit random value, **kept only in the client's memory**, plus the weight. The server stores only `credentialHash` in a **third, short-lived table** `vote_credentials(voteId, credentialHash, weight, spent)`. That table has **no `memberId`** and no timestamps.
2. **Mark used (authenticated, same transaction as issue).** Eligibility `status=USED` immediately. This tells everyone "this member received a ballot", which is the same fact as signing an attendance list. It never says what the member voted.
3. **Cast (unauthenticated channel, credential only).** The client posts `{ credential, choice }` to a cast endpoint that **does not read the session cookie**: a separate route with no cookies and `credentials: "omit"`.
   - The server checks `hash(credential)` in `vote_credentials` and that it is not spent.
   - It marks it spent and inserts the ballot `vote_ballots(voteId, choice, weight, batch, ballotNonce)` in one transaction.
4. **Close.** When the vote closes:
   - `vote_credentials` rows are **deleted** (spent and unspent);
   - the ballot box is shuffled into its final order;
   - totals are computed and written to `MeetingDecision` (the existing totals).

### 2.2 Unlinkability rules (binding)
- **No joinable keys:**
  - `vote_ballots` holds no `memberId`, `credentialHash`, `sessionId`, IP, user agent or request id;
  - `vote_credentials` holds no `memberId`;
  - no foreign keys between E, the credentials table and B except `voteId`.
- **No timestamps or sequence correlation on ballots:**
  - no `createdAt` and no autoincrement; ids are random (`cuid` is not allowed because it embeds time, so a 128-bit random id is used);
  - the table is returned in a random order;
  - `batch` is a coarse bucket (the closing round number), not a time.
- **Small-count protection:** results are published only when ≥ `minBallots` (default 5) were cast.
  - With fewer ballots, the totals are shown only to the chair, with a warning, because tiny votes are de-anonymisable by arithmetic.
  - Ballots are not shown per proxy holder.
- **Timing side channel:** issue and cast are separate requests. The client waits a **random 2–20 s** before it casts, or casts at "close of voting" for in-person kiosks.
  - Eligibility `usedAt` is stored at **minute precision** and may be dropped after close (decision §9).
  - Server logs for the cast route record no user or IP; a log-redaction test enforces this.
- **Process memory:** the credential is never logged. The issue and cast handlers do not share a request-scoped object.
- **Database audit:** row-level audit triggers are disabled for `vote_ballots`, and the app audit log records only "vote X: ballot accepted" without ids.
- **AI and exports:** both tables are `K0` in `DATA_POLICY`, so no AI tool and no generic export can read them.

### 2.3 Proxies and weights
- Proxy votes (Stimmrechtsübertragung, if the bylaws allow them) are handled at **issue time**: the proxy holder receives one credential per represented member. The weight stays 1 per credential, so no weight correlation is possible.
- A weighted vote (e.g. corporate members) carries `weight` on the credential. Weight classes with fewer than `minBallots` members are flagged (de-anonymisation risk).

### 2.4 Hybrid assemblies
- In-person voters are checked in by the secretary (attendance list). They get a printed one-time code, or vote at a kiosk device in "booth mode": no session, and the code is the credential.
- Remote voters use the portal (RFC-003) with step-up.
- Both channels feed the same eligibility register, so double voting across channels is impossible.

## 3. Data model (sketch, `meetings` module)

```prisma
model VoteSession {            // one secret vote = one agenda item / decision
  id          String   @id
  meetingId   String
  decisionId  String?  // filled on close (MeetingDecision)
  question    String
  options     String[] // e.g. ["yes","no","abstain"] or candidate list
  minBallots  Int      @default(5)
  status      VoteStatus // DRAFT | OPEN | CLOSED
}
model VoteEligibility {        // E: who received a ballot
  voteId   String
  memberId String
  weight   Int     @default(1)
  status   EligibilityStatus // ISSUED | USED
  usedAt   DateTime? // minute precision; may be nulled after close
  @@id([voteId, memberId])
}
model VoteCredential {         // short-lived; deleted on close
  voteId         String
  credentialHash String @unique
  weight         Int
  spent          Boolean @default(false)
}
model VoteBallot {             // B: what was voted (no member, no time)
  id          String @id      // 128-bit random, not cuid
  voteId      String
  choice      String
  weight      Int
  batch       Int
  ballotNonce String          // random; for the auditor's count list
}
```

## 4. What an auditor (Kassenprüfer, election committee) can check

| Can check | How |
|---|---|
| The number of ballots issued equals the number of members marked USED | `count(E where USED) == count(credentials issued)`; logged at close |
| The number of ballots cast is at most the number issued, and the totals match | Sum of `weight` per `choice` in B equals the published totals |
| Every ballot belongs to an eligible person, at the population level | Count consistency between E and B; ballots without a credential are impossible (the transaction checks the hash) |
| Nobody voted twice | `@@id([voteId, memberId])` on E plus a single-use credential |
| The ballot list is unchanged after close | A SHA-256 hash of the sorted ballot list (`choice,weight,ballotNonce`) is written into the minutes PDF; a re-count reproduces it |

| Cannot check (stated plainly in the UI and minutes) | Why |
|---|---|
| That the server did not secretly link ballots during casting | Trusted-server design; mitigated by code review, tests and logging rules. It is not cryptographically proven. |
| That an individual voter's ballot was counted as cast | No voter-verifiable receipt in v1, by choice: receipts create coercion risk |
| That nobody coerced or watched a remote voter | This is inherent to remote voting. The bylaws decide whether remote secret votes are allowed. |

## 5. Test strategy (agent:gemini offered to write these)

- **Schema guard:**
  - `vote_ballots` has no `memberId`, timestamp, autoincrement, `credentialHash` or session/IP column;
  - no relation from `VoteBallot` or `VoteCredential` to `Member`;
  - the test fails on any new column that is not on an allowlist.
- **Join impossibility:** with a fixture of 50 voters, no SQL join or ordering on any ballot column reproduces the issue order (Spearman correlation below the threshold over repeated runs).
- **Single use:** two concurrent casts with the same credential → exactly one ballot; a spent or unknown credential → the same error shape.
- **Session isolation:** the cast route ignores cookies (a request with an admin or portal cookie behaves the same as one without); the route does not import the session helpers (static check).
- **Logging:** a request-log capture during casting contains no member id, credential, IP or user agent.
- **Close:** `vote_credentials` is empty after close; totals match the ballots; the hash is in the minutes; `minBallots` gating works.
- **Hybrid:** the same member cannot vote both remote and in person.
- **Data policy:** `VoteBallot`/`VoteCredential` are `K0`, and an AI source scan rejects them.

## 6. Legal notes (questions for legal review, not advice)

- **BGB § 32 Abs. 2 (virtual or hybrid assembly)** allows virtual participation when the invitation says so, or by board decision for hybrid assemblies. Legal question: does a secret electronic vote meet the bylaws' "geheime Wahl" clause when the platform is a trusted server (this design) rather than end-to-end verifiable?
- **Contestation risk (Anfechtung / Nichtigkeit of resolutions):** what documentation must be kept so that a resolution survives a challenge (eligibility list, counts, ballot hash), and for how long?
- **Bylaws (Satzung) precedence:** voting rules, proxies and majority types come from the bylaws. The software must model them as configuration, never as defaults that silently apply.
- **DSGVO:** the eligibility register is personal data (participation). Lawful basis, retention, and whether `usedAt` must be deleted after the challenge period.
- **Minors / youth sections:** whether youth members vote (bylaws) and the guardian rules.

The result is marked "not legal advice". The owner requests the legal review before implementation starts.

## 7. Phasing

1. Owner approval and legal review → ADR and DECISION_LOG row.
2. Open votes in the meeting module (existing totals) with per-member digital roll call. This is not part of this RFC but is the base.
3. Secret votes in person: kiosk and printed codes, no portal dependency.
4. Remote and hybrid secret votes, after RFC-003 auth (portal, step-up) is live.

## 8. Decisions requested from the owner

1. Approve the trusted-server separation design (E / credential / B, no joinable keys) as v1, with the "cannot check" list shown in the UI and minutes.
2. Default `minBallots` = 5? Should the chair be able to lower it, with a warning?
3. Drop `VoteEligibility.usedAt` after the challenge period, or keep it at minute precision?
4. Order the legal review (BGB § 32, contestation, bylaws mapping) before phase 3.
5. Confirm that agent:gemini writes the decoupling tests (§5) as a separate issue.

**Owner approval must be recorded (DECISION_LOG) before any implementation issue is opened.**
