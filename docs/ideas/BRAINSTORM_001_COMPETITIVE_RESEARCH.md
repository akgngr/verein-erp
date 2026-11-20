# Brainstorm-001: competitive research and idea pool

**Status:** Research record (2026-11-20). Decisions and work packages live in [`docs/specs/B001_PRODUCT_ROADMAP.md`](../specs/B001_PRODUCT_ROADMAP.md).
**Source:** Discussion [#392](https://github.com/akgngr/verein-erp/discussions/392), with contributions from claude, gemini, chatgpt and the product owner.
**Caveat:** Prices and review signals come from public comparison portals (Nov 2026). Samples are small and some portals earn affiliate commissions, so verify on vendor sites before quoting. All examples are synthetic.

## 1. Competitor landscape

Prices are list prices found in public comparison portals in Nov 2026. They vary by billing period and member count, so verify them on vendor sites before quoting. Review-portal samples are small and some portals earn affiliate commissions, so treat the weaknesses as **signals, not verdicts**.

### German-speaking market

| Product | Target group | Pricing model | Standout features | Known weaknesses (reviews/forums) |
|---|---|---|---|---|
| **easyVerein** (AT) | Small to large Vereine, all types | SaaS, 3 tiers by feature package and member count; entry roughly 7-18 EUR/month depending on billing period | Very broad modular scope: members, finance with bank sync, inventory, **room booking**, online membership application, reminders, member app; strong accounting ratings (trusted.de) | Feature placement called confusing; no public API per GetApp; few reviews |
| **Vereinsplaner** (DE) | Small clubs, app-first | Freemium (free tier with few member accounts); paid roughly 8-12 EUR/month | **Member app** with news feed, **polls**, **messenger**, events, documents, finance overview; well-rated support | Limited finance; users miss automatic dues collection (direct debit) |
| **ClubDesk** (CH/DE) | Small to mid clubs | Free up to a member limit, then member-count tiers | All-in-one incl. **website builder** and members area, calendar subscription (ICS) for members, mail | Rigid form/layout customisation, too many clicks for simple lists, weak member queries |
| **campai** (DE) | Mid-size Vereine wanting "everything online" | Flat price by active members (around 30 EUR/month cited); SMS pay-per-use | Member portal, **digital membership cards**, online forms, DATEV export, online banking, donation receipts and SEPA donations; usable by all members, not only the board | Little public critique found; price higher than freemium rivals |
| **WISO MeinVerein (Web / 365)** | Traditional Vereine, often treasurer-driven | Subscription (~10 EUR/month web), no permanent free version | Strong SEPA (batch debits, returns), cash, invoices, donations; big user base | Performance problems at year start (peak load), learning curve; trial lacks core features; mixed ratings |
| **Netxp-Verein** | Classic Vereine, Windows desktop heritage | Licence/subscription (~7.50 EUR/month cited) | Classic full member + finance admin, very extensive training material | Perceived as old-fashioned; few reviews |
| **"SPG-Verein"** | Not found under this name; closest: **S-Verein**, **Vereinsmeister** (bank-distributed), **JVerein** (open source, Hibiscus) | Desktop licence / free (JVerein) | Bookkeeping + dues on Windows; JVerein: free, HBCI banking | Desktop-only, single-user, dated UX, no member surface |
| Also seen: **KURABU, SportMember, SEWOBE, Collmex** | Sports clubs (KURABU, SportMember); larger associations (SEWOBE) | SaaS | Sports-team scheduling, training attendance (SportMember); enterprise CRM-like (SEWOBE) | Sports focus; SEWOBE complex/expensive |

### International

| Product | Target group | Pricing model | Standout features | Known weaknesses |
|---|---|---|---|---|
| **Wild Apricot** (US/CA) | Membership non-profits, professional associations | SaaS by **contact count**; Capterra lists from ~63 USD/month | Website + membership + events + payments in one, easy for non-technical staff | Price increases criticised; payment fees; slow support (Trustpilot 1.5/5 on 153 reviews); clunky/dated apps; lacks community/social features; no German non-profit law |
| **Join It** (US) | Small membership orgs | Freemium; paid from ~29 USD/month plus a transaction fee on online payments | Self-service signup and renewals, digital membership cards, Stripe, Mailchimp/QuickBooks/Eventbrite integrations | Slow feature delivery, limited flexibility; US-centric |
| **MembershipWorks** | Small US orgs | SaaS tiers | WordPress-integrated directory, events, renewals | No relevant German localisation found |
| **Odoo** (Membership app + OCA `membership_extension` + third-party add-ons) | SMEs already on Odoo | Per-user Enterprise pricing or Community + paid add-ons | Full ERP; membership lines, categories, portal and online directory via add-ons | Membership is thin in core; nonprofit features rely on paid add-ons of varying version support; no Zuwendungsbestätigung or Sphären out of the box; complexity (also noted in our own PRODUCT_PHILOSOPHY doc) |

### Turkish-speaking diaspora, mosque and cultural associations

- **No dedicated bilingual TR/DE association ERP was found** in German or Turkish searches. Associations use generic German tools (often desktop WISO/S-Verein for the treasurer), plus WhatsApp groups, spreadsheets and paper receipts.
- **Niche mosque apps exist** (store listings found for community news, AGM info, prayer times), but they are communication apps without accounting, dues, SEPA or donation-receipt compliance.
- Research on mosque communities (DKJS "Moscheen für Integration", bpb Zukunftsforum Islam workshop "Von der Hinterhofmoschee zum multifunktionalen Träger") stresses **professionalisation needs**: qualified volunteers, structures for social services, visibility toward municipalities, and grant-funded programmes. These match our grants, courses and reporting strengths.
- General studies on digitalisation in civic engagement (Uni Hamburg "Digitale Geschäftsstelle" report, digital.engagiert coverage) show the same barriers: **no time, no money, no staff for IT**, and slow adoption. Simplicity and "it does the paperwork for you" matter more than feature count.

### Sources

- easyVerein: trusted.de/easyverein, omr.com/de/reviews/product/easyverein, getapp.de/software/2038775/easyverein, easyverein.com/vereinsverwaltungssoftware/preise/
- Vereinsplaner: trusted.de/vereinsplaner, omr.com/de/reviews/contenthub/vereinsverwaltung-kostenlos-software, vereinsplaner.com/en/preise, softwareabc24.de/verein-software/vereinsplaner
- ClubDesk: omr.com/de/reviews/product/clubdesk/all, getapp.de/software/2037647/clubdesk, trusted.de/clubdesk-vs-campai
- campai: omr.com/de/reviews/product/campai/pricing, trusted.de/campai, netzwelt.de/download/24554-campai-vereinssoftware.html
- WISO / Netxp: trusted.de/wiso-meinverein-web-vs-netxp-verein, omr.com/de/reviews/product/wiso-meinverein-web/all, heise.de/download/specials/Vereinsmanagement-Software-im-Vergleich-9308467
- Wild Apricot: g2.com/products/wildapricot, ca.trustpilot.com/review/wildapricot.com, capterra.com/p/76116/WildApricot/
- Join It: capterra.com/p/148692/Join-It/, softwareadvice.com/membership-management/join-it-profile/
- Odoo: apps.odoo.com/apps/modules/16.0/membership_extension, odoo.com/documentation/17.0/applications/sales/members.html
- Diaspora/mosques: dkjs.de (Themenheft "Moscheen für Integration"), bpb.de Zukunftsforum Islam 2015 workshop 5, wiso.uni-hamburg.de "Abschlussbericht Digitale Geschäftsstelle" (2024)


## 2. Gap analysis (state of 2026-11-20)

Based on README, `src/modules/*/module.config.ts`, docs/adr and docs/specs as of branch `alpha`. "Verify" means a quick code search was inconclusive.

### What we already do better than most

- **Accounting depth:** GoBD hash chain + Z3 export, DATEV EXTF, SKR03/04, UStVA/EÜR, XRechnung/ZUGFeRD, CAMT/MT940 import, AfA, year-end closing. Only desktop incumbents come close, and none combine it with a modern web UX.
- **Grants with Verwendungsnachweis PDF and a 20 % deviation alert.** Not seen in any competitor.
- **e-Sign with guardian consent for minors.** Competitors offer online forms, not signed consent with an audit key.
- **AI with a K0-K3 data policy, pseudonymisation and an OpenAI-compatible endpoint (self-hostable model).** Competitors have no AI, or plain cloud AI.
- **Secretary (daily briefing, mail triage, follow-ups, weekly board report).** Unique.
- **Per-customer isolation (ADR 0001) and self-host.** Rare. JVerein is self-hosted but desktop-only.
- **Bilingual TR/DE UI and documents.** Unique in the German market.

### Must-have parity (they have it, we lack or only partly have it)

| Gap | Who has it | Why it matters | Suggested shape |
|---|---|---|---|
| **Member self-service portal / mobile app (PWA)** | campai, easyVerein, Vereinsplaner, ClubDesk, Wild Apricot, Join It | Members update their own data, download receipts, register for events; this cuts board workload | Privacy-first portal (top-5 #4) |
| **Member communication inside the app: news feed, polls, chat** | Vereinsplaner, easyVerein | Replaces WhatsApp groups, which are a DSGVO problem for many Vereine | Feed + polls first; chat later and optional |
| **Digital membership card** (QR, wallet pass) | campai, Join It | Discounts, entry checks | Small; signed QR without personal data beyond the number |
| **Room/resource booking** | easyVerein | Mosques and cultural centres rent rooms constantly | Builds on calendar + inventory (verify: no room-booking model found) |
| **Volunteer shift planning (Helferplanung)** | Some sports tools; partially easyVerein | Festivals, iftar dinners, bazaars | Idea #7 |
| **Departments / sub-groups with own budgets (Abteilungen)** | easyVerein, SEWOBE, sports tools | Youth, women's, sports branches inside one e.V. | Cost centres + role scoping (no department model found) |
| **Website / public page** | ClubDesk, Wild Apricot | Many small Vereine have no website | A minimal public page (events, join form, donate) rather than a CMS |
| **Online payment for dues/donations** (card, PayPal, wallets) | Join It, Wild Apricot, campai | Younger members do not use direct debit | Payment-link adapter as EXTENSION; donations already reference Stripe/PayPal as a payment method, verify whether online checkout exists |
| **One-click migration from competitors** | Rarely done well | Switching cost is the biggest sales blocker | Import profiles for WISO, easyVerein, ClubDesk and JVerein exports |
| **Public API / webhooks with docs** | Join It (integrations), Odoo | Integrators and larger customers ask for it | Webhook code exists internally; a documented, scoped, opt-in public API is missing |
| **Free tier for very small clubs** | ClubDesk, Vereinsplaner, Join It | Market entry for associations under ~50 members | Licensing decision is deferred (PRODUCT_PHILOSOPHY); flag as input, not a decision |

### Differentiation opportunities (nobody does this well)

1. **Proactive compliance** for Gemeinnützigkeit, fund use, reserves, allowance limits and deadlines. Everyone records; nobody warns.
2. **Diaspora/bilingual workflows:** explanations of German authority letters, bilingual minutes and reports, language preference per member and channel.
3. **The AGM done right:** deadlines from the bylaws, quorum, hybrid voting with ballot secrecy, minutes and register filing.
4. **Privacy as a visible member benefit:** a consent and data cockpit, not a hidden settings page.
5. **Community-specific workloads:** weekend schools, religious-calendar fundraising with correct receipts, festival cash, burial-assistance funds, earmarked donations with impact reporting.
6. **Board continuity:** handover after elections (access, obligations, deadlines). Every board change is a crisis today.
7. **Bylaws as code:** rules extracted from the Satzung that drive validation and reminders.
8. **Federation roll-ups without PII:** umbrella organisations want statistics; members' data must stay local.


## 3. Idea pool, part 1 (ideas 1-11, agent:claude)

Fields: **Problem · Idea · Why unique · Effort · DSGVO risk · Builds on**. Every idea is an EXTENSION module (default off) unless noted. Cross-module reads go through admin-approved access grants, external flows are opt-in and audited, and AI sees only K0-K3-permitted data.

### 1. Gemeinnützigkeit Compliance Cockpit
- **Problem:** Volunteer boards lose or endanger tax-exempt status through missed deadlines and silent rule breaches: expired Freistellungsbescheid, funds not spent in time (zeitnahe Mittelverwendung), reserves without a documented purpose, a wirtschaftlicher Geschäftsbetrieb crossing the revenue threshold, Übungsleiter/Ehrenamtspauschale limits exceeded per person, receipts issued with outdated templates.
- **Idea:** A rule engine over existing data producing a traffic-light dashboard and secretary nudges ("3 checks need attention"). Each rule shows its legal basis, the computed number and a suggested action (a draft task, not an automatic change). Rules are versioned per tax year and maintained as data, not code.
- **Why unique:** No competitor found monitors compliance; they only store bookings.
- **Effort:** M (rules framework S; correct rule content needs tax-advisor review).
- **DSGVO risk:** Low. Runs inside the instance on aggregates; per-person allowance checks show member numbers, not names, in summaries.
- **Builds on:** accounting (Sphären, projects, year-end), donations, courses (teacher payouts already track allowances), grants, secretary (`secretary.ts` providers), notifications, tasks.

### 2. Bilingual board assistant ("Behörden-Lotse")
- **Problem:** Many diaspora boards are fluent in everyday German but not in Amtsdeutsch. Letters from Finanzamt, Registergericht, Ordnungsamt or a bank get misread or ignored.
- **Idea:** Upload or forward a letter to the documents inbox. It gets OCR, the pseudonymisation layer replaces names, addresses and identifiers, and the AI produces a side-by-side TR/DE plain-language summary: what they want, the deadline, the consequence, and a suggested reply draft in German. It creates a dated task. A curated glossary covers terms such as Vorstand, Satzung, Kassenprüfer, Gemeinnützigkeit and Zuwendungsbestätigung. Works with a self-hosted model for zero egress.
- **Why unique:** No German association tool is bilingual, and none explains authority letters.
- **Effort:** M.
- **DSGVO risk:** Medium. Inbound letters contain personal and tax data. Mandatory pseudonymisation before any model call, a per-instance opt-in, a provider choice (self-hosted model recommended), and no retention at the provider. The output is advice, not legal advice.
- **Builds on:** documents (Evrak Kayıt), mail (triage), ai, secretary, tasks, calendar.

### 3. General Assembly end-to-end (Mitgliederversammlung)
- **Problem:** Invalid invitations (wrong deadline or channel), unclear quorum, mishandled secret ballots and late register filings make resolutions contestable. Hybrid/virtual assemblies have been allowed by BGB §32 since 2023, but the tooling is ad hoc (video call + chat poll).
- **Idea:** An assembly wizard: compute the invitation deadline and form from the bylaws (#8), produce invitations through the member's preferred channel with proof of sending, run an online/hybrid check-in, show a live quorum, and handle open and secret votes. For secret votes, voter eligibility and ballot content are stored separately (a one-time token, then an unlinkable ballot). Generate minutes PDF and resolutions list, and draft the Registergericht notification for board changes or bylaw amendments (to be notarised as required).
- **Why unique:** Competitors offer meetings or polls, not a legally structured assembly with ballot secrecy.
- **Effort:** L.
- **DSGVO risk:** Medium. Ballot secrecy needs a careful design (separate tables, no join path, audit of the process but not of the choice). Voting results are published only as aggregates.
- **Builds on:** meetings (agenda, decisions, minutes PDF), members, e-sign, campaigns, calendar, documents, audit.

### 4. Member privacy cockpit + self-service portal
- **Problem:** Boards answer the same requests by hand (address change, receipt copy, "what do you store about me?"). Competitors' portals are convenience features that expose more data than needed.
- **Idea:** A data-minimal PWA portal using magic-link login. Members can view and correct their master data (changes go to an approval queue where needed), manage consents and channel preferences, download dues/donation receipts, sign pending documents, register for events, and get an **Art. 15 export on demand**. A "processing log" in plain language shows which module used their data and when, built from the audit log. No member-to-member directory by default; a directory is a separate opt-in per member.
- **Why unique:** Turns DSGVO from a burden into a visible trust feature; nobody positions a portal this way.
- **Effort:** L.
- **DSGVO risk:** Low-Medium. A new public attack surface needs rate limiting, short-lived links and step-up auth for downloads. Net effect: fewer manual data exports by email.
- **Builds on:** members, notifications (consents), audit, e-sign, online-forms, donations, events, sepa (mandate view).

### 5. Weekend school & parent hub
- **Problem:** Associations run weekend, Koran, mother-tongue, homework-help and tutoring classes with paper registers and WhatsApp. Parents miss absences and payments. Eligible families do not use BuT (Bildung und Teilhabe) funding for tutoring or club fees because the paperwork is hard.
- **Idea:** A parent view in the portal (#4): attendance with same-day absence notice, progress notes and report PDF, installments and sibling discounts, bilingual messages. A **BuT helper** generates the provider confirmation and invoice to the responsible authority for eligible children, flagged per enrollment.
- **Why unique:** Course tools exist, but none combine guardian e-sign, progress reports, BuT billing and bilingual parent communication.
- **Effort:** M.
- **DSGVO risk:** Medium-High. Minors' data and social-benefit eligibility are sensitive, so classify BuT eligibility as K3 with field encryption and a dedicated permission. AI is excluded from these fields. Retention is limited to the billing period plus statutory retention.
- **Builds on:** students, courses, progress, e-sign (guardian consent), campaigns, accounting (receivables/invoices).

### 6. Board handover pack ("Vereinsgedächtnis")
- **Problem:** After every election, knowledge, passwords, bank access and deadlines are lost. New boards start blind.
- **Idea:** A handover wizard triggered by an election resolution (#3). It lists the outgoing person's roles, open tasks, recurring obligations, upcoming deadlines and accounts to transfer. It revokes or reassigns app permissions in one step (with a confirmation), drafts the register notification and bank signatory change letter, and produces a "first 30 days" checklist for the new board.
- **Why unique:** Nobody models board continuity.
- **Effort:** M.
- **DSGVO risk:** Low. Internal; it actually improves access hygiene.
- **Builds on:** users, meetings, tasks, documents, secretary, organization, audit.

### 7. Volunteer shift planning (Helferplanung) with allowance tracking
- **Problem:** Festivals, iftar dinners, bazaars and tournaments need dozens of helper slots, coordinated today by chat lists. Paid volunteers can exceed the Ehrenamtspauschale without anyone noticing.
- **Idea:** Shift templates per event; helpers sign up via the portal or a link; reminders go through the member's preferred channel; swap requests; hours are logged; optional allowance payouts feed the compliance cockpit (#1).
- **Why unique:** Exists in some sports tools; combining it with allowance-limit tracking and accounting is new.
- **Effort:** M.
- **DSGVO risk:** Low-Medium. Helper lists show first names only to other helpers, and only if opted in.
- **Builds on:** events, tasks, calendar, notifications, members, accounting.

### 8. Bylaws as code (Satzung rules)
- **Problem:** Notice periods, quorums, term lengths, fee rules and membership types live in a PDF nobody re-reads.
- **Idea:** The AI extracts a structured rule set from the uploaded bylaws (non-personal text, so low risk). The board reviews and confirms each rule. Confirmed rules drive validations (AGM invitation deadline, cancellation periods, board term expiry) and reminders. A diff view appears when the bylaws change.
- **Why unique:** Not found anywhere.
- **Effort:** M.
- **DSGVO risk:** Low (bylaws are public register documents).
- **Builds on:** ai, documents, meetings, members, secretary.

### 9. Religious/cultural calendar fundraising with correct receipts
- **Problem:** Ramadan, Kurban, fitre/zakat, and holiday or cultural campaigns produce large, time-bound donation spikes. Many are recorded as cash in spreadsheets, and associations are unsure which ones may receive a Zuwendungsbestätigung (e.g. purpose-bound transfers abroad, or payments that are really a purchase of a service rather than a donation).
- **Idea:** Campaign templates tied to a movable calendar (lunar dates computed locally). Each template has a pre-classified tax treatment (donation, membership-like contribution, service/purchase, pass-through), with a warning when receipts would be wrong. Includes collection-box counting sheets (two-person count) and bulk receipting.
- **Why unique:** No tool handles faith-calendar campaigns with tax classification.
- **Effort:** M.
- **DSGVO risk:** Low-Medium. Religious affiliation can be implied (Art. 9 special category), so these templates must not create per-person "religious" tags; donations stay in the donations module with the existing protection.
- **Builds on:** donations, campaigns, calendar, accounting (Sphären, cash closing).

### 10. Earmarked donations with impact reporting
- **Problem:** Donors give for a specific purpose (a roof repair, a scholarship, disaster relief). The board must prove use of funds and wants to show impact without exposing beneficiaries.
- **Idea:** Purpose funds with balance tracking (donations in, linked expenses out), alerts for unused or overspent funds (feeds #1), and an aggregate impact page or PDF per fund ("82 % spent, 3 milestones reached"). It can be shared with donors via a link.
- **Why unique:** Grants handle public funding; nobody does this cleanly for small private earmarked funds.
- **Effort:** M.
- **DSGVO risk:** Low. Reports are aggregate only; beneficiaries never appear.
- **Builds on:** donations, accounting (projects), grants (plan vs. actual logic), documents.

### 11. Festival / kermes cash mode
- **Problem:** Weekend festivals generate significant cash across many stands. Counting is informal, and the split between ideeller Bereich, Zweckbetrieb and wirtschaftlicher Geschäftsbetrieb is guessed at year end.
- **Idea:** Start with an **open-cash-drawer (offene Ladenkasse) counting mode**, not an electronic register: per-stand start float, end count by two people on a phone, a difference log, an automatic cash-closing booking per Sphäre, and an optional inventory deduction. A true electronic POS is out of scope unless a certified TSE solution is integrated (KassenSichV).
- **Why unique:** Competitors either ignore festivals or sell generic POS without non-profit spheres.
- **Effort:** M (counting mode); L+ (certified POS, not recommended now).
- **DSGVO risk:** Low (no personal data). **Legal risk:** high if it drifts into an uncertified electronic register; needs product-owner and tax review.
- **Builds on:** accounting (cash closing, GoBD), inventory, events.


## 4. Idea pool, part 2 (ideas 12-22, agent:claude)

### 12. Burial-assistance fund (solidarity fund) administration
- **Problem:** Many Turkish diaspora associations run a burial-assistance or repatriation fund: families pay yearly contributions, and the fund covers transport and burial costs. It is administered in spreadsheets, with unclear coverage of family members and unclear legal status.
- **Idea:** Contribution tracking per household (via SEPA), coverage rules (household members, waiting periods), case handling with a document checklist and payout booking, and annual statements. **Hard legal gate:** depending on its design, such a fund can count as insurance business under supervisory law (VAG). The module would only support models the association has legally cleared (e.g. a voluntary solidarity fund without legal entitlement, or cooperation with a licensed insurer), with explicit warnings.
- **Why unique:** Very common need in the target segment; zero tool support found.
- **Effort:** M.
- **DSGVO risk:** High. Death and health-related case data and family structure are sensitive. Use K3 classification, field encryption, a tiny role set and no AI access. **Requires legal review before any work.**
- **Builds on:** members, sepa, accounting, documents.

### 13. Federation roll-up without personal data
- **Problem:** Umbrella organisations ask member associations for statistics (members by age band, courses, events, finances) and get inconsistent spreadsheets.
- **Idea:** The local instance computes a fixed, versioned statistics set with k-anonymity thresholds (suppress cells under 5). The board previews the exact payload, then sends it, signed, to a federation endpoint. This is opt-in per send and never automatic. It fits the ADR 0001 control plane, but the data flows only by explicit action.
- **Why unique:** Federations today either get nothing or get raw exports containing personal data.
- **Effort:** L.
- **DSGVO risk:** Medium if done wrong, low with preview + thresholds + aggregate-only schema. It is an external flow, so it is permission-gated and audited.
- **Builds on:** exports, members, courses, events, accounting, system (marketplace/control plane).

### 14. Grant finder and application drafting
- **Problem:** Associations miss integration, youth and volunteering grants because the funding landscape is fragmented.
- **Idea:** Match a curated, public catalogue of programmes (maintained as data and updated through the marketplace) against the association's non-personal profile (purpose, region, size band). The AI drafts the application narrative from public info plus the board's notes. Accepted applications become grant records with a finance plan.
- **Why unique:** Our grants module already does the after-award part; competitors do neither part.
- **Effort:** M.
- **DSGVO risk:** Low. The catalogue is inbound public data; no personal data leaves.
- **Builds on:** grants, ai, documents, tasks.

### 15. Bilingual AGM treasurer report (quick win)
- **Problem:** Treasurers hand-craft the yearly Kassenbericht; members do not understand it.
- **Idea:** One click produces a plain-language TR/DE report (income/expenses by sphere and project, reserves, earmarked funds, year-on-year changes) as a PDF plus slides for the assembly. Aggregates only.
- **Effort:** S. **DSGVO risk:** Low. **Builds on:** accounting, meetings, ai (optional wording), grants.

### 16. Auditor (Kassenprüfer) audit room (quick win)
- **Problem:** Auditors get a USB stick or the treasurer's password.
- **Idea:** A time-boxed, read-only auditor access (a role already exists) with a guided checklist: sample bookings, receipt completeness, cash counts, bank reconciliation, open items. Findings are recorded and an audit report PDF is generated for the assembly. Access expires automatically.
- **Effort:** S. **DSGVO risk:** Low (least privilege, auto-expiry, audited). **Builds on:** accounting, users/roles, audit, documents, meetings.

### 17. SEPA return-debit coach (quick win)
- **Problem:** Returned direct debits cause fees and awkward conversations; return reason codes are cryptic.
- **Idea:** Map return reason codes to a plain explanation plus the next action (e.g. update mandate vs. contact the member). Send a bilingual, polite reminder template (approval required), track fees, and pause collection after repeated returns.
- **Effort:** S. **DSGVO risk:** Low. **Builds on:** sepa, banking, members, campaigns, secretary.

### 18. Per-member language and multilingual campaigns
- **Problem:** Mixed-language memberships (TR, DE, sometimes AR, KU, BS or EN) get German-only or duplicated messages.
- **Idea:** A language preference per contact; campaign editor with per-language variants and an AI translation suggestion of the **template text only** (non-personal, before merge fields are filled); a fallback language; reports per language.
- **Why unique:** Competitors are single-language.
- **Effort:** S-M. **DSGVO risk:** Low (no personal data in the translated text). **Builds on:** campaigns, notifications, ai, members.

### 19. Privacy presets and a monthly "data egress report"
- **Problem:** Admins cannot tell what left their instance (AI calls, SMS/WhatsApp providers, bank API, calendar sync).
- **Idea:** Presets ("Strict: nothing leaves", "Standard", "Connected") that toggle extension modules and AI providers coherently. A monthly report lists every external flow by category, provider, volume and legal basis, with links to switch each off. Recommends a self-hosted model endpoint (already supported via the OpenAI-compatible provider) when the Strict preset is chosen.
- **Why unique:** Turns our architecture into a sellable, verifiable promise.
- **Effort:** M. **DSGVO risk:** Reduces risk. **Builds on:** system (module management), ai, audit, notifications, campaign channels, banking, calendar extensions.

### 20. Room and facility booking with rental contracts
- **Problem:** Community centres and mosques rent rooms (weddings, courses, other groups). Double bookings happen, and rental income is booked in the wrong sphere.
- **Idea:** A resource calendar, a public request form, approval, a contract via e-sign, a deposit invoice, and sphere suggestions (Vermögensverwaltung vs. wirtschaftlicher Geschäftsbetrieb) with feed into #1.
- **Effort:** M. **DSGVO risk:** Low-Medium (external renters' contact data with retention rules). **Builds on:** calendar, inventory, online-forms, e-sign, accounting.

### 21. Migration assistant from competitors
- **Problem:** Switching cost is the main sales blocker.
- **Idea:** Import profiles for common exports (WISO, easyVerein, ClubDesk, JVerein, generic CSV/Excel). The AI suggests column mapping using **header names and synthetic samples only**, never real rows. A dry-run report and a rollback are included.
- **Effort:** M. **DSGVO risk:** Low (local processing; AI sees headers only). **Builds on:** members (Excel import), accounting imports, donations, exports.

### 22. Departments with own budgets and scoped roles
- **Problem:** Youth, women's, sports or education branches inside one e.V. want autonomy without seeing everything.
- **Idea:** Department as a dimension (cost centre + member grouping + role scope): department leads see their members, events and budget vs. actual, nothing else.
- **Effort:** M-L (touches permissions broadly; needs an RFC). **DSGVO risk:** Reduces over-sharing. **Builds on:** members, accounting (projects/budget), users, events, courses.

---

### Ranking rationale (scoring)

Each idea was scored 1-5 on **impact for the target segment**, **uniqueness**, **fit with existing modules**, **effort (inverse)** and **privacy/legal risk (inverse)**, with impact and uniqueness double-weighted (weighted = 2·impact + 2·unique + fit + effort⁻¹ + risk⁻¹, max 35). Rows 1-5 are the proposed top 5; rows 6-10 are the strongest runners-up.

| Order | Idea | Impact | Unique | Fit | Effort⁻¹ | Risk⁻¹ | Weighted |
|---|---|---|---|---|---|---|---|
| 1 | #1 Compliance Cockpit | 5 | 5 | 5 | 3 | 5 | 33 |
| 2 | #2 Bilingual Behörden-Lotse | 5 | 5 | 4 | 3 | 3 | 30 |
| 3 | #3 General Assembly | 5 | 4 | 4 | 2 | 3 | 27 |
| 4 | #4 Privacy cockpit + portal | 5 | 3 | 4 | 2 | 4 | 26 |
| 5 | #5 Weekend school & parent hub | 4 | 4 | 5 | 3 | 2 | 26 |
| 6 | #19 Privacy presets & egress report | 3 | 5 | 5 | 3 | 5 | 29 |
| 7 | #16 Auditor room (S) | 3 | 3 | 5 | 5 | 5 | 27 |
| 8 | #10 Earmarked funds | 4 | 3 | 5 | 3 | 5 | 27 |
| 9 | #12 Burial-assistance fund | 5 | 5 | 3 | 3 | 1 | 27 |
| 10 | #21 Migration assistant | 4 | 2 | 4 | 3 | 4 | 23 |

*Note:* #19, #16 and #10 score as high as or higher than #3-#5 on raw points, but they mainly strengthen trust and efficiency for existing users. #3-#5 open or defend market segments (every e.V., member-facing parity, schools). I kept the top 5 market-driven and recommend #16, #15 and #17 as parallel quick wins and #19 as an enabler for #2 and #4. #12 has the highest segment pull but stays blocked until a legal review clarifies VAG exposure.


## 5. Ideas added by other agents

| # | Idea | By | Effort | Privacy risk | Builds on | Outcome |
|---|---|---|---|---|---|---|
| 23 | Offline-first field and attendance kiosk: PWA with an encrypted IndexedDB cache (Web Crypto AES-GCM, ephemeral key), deterministic sync, minimal manifest | gemini | M | Low-Medium | courses, students, events, online-forms | Wave 2 |
| 24 | Accessible micro-polls ("Stimmungsbild"): WCAG 2.1 AA, bilingual, responses decoupled from identity, results withheld under 5 responses | gemini | S-M | Low | online-forms, campaigns, members, portal | Later W2 portal feature |
| 25 | Equipment lending station: QR labels, in-browser camera scanning (no image upload), due dates, deposits | gemini | M | Low | inventory, accounting, members | Wave 2 |
| 26 | SEPA mandate health checker + digital renewal via e-sign | gemini | S-M | Medium | sepa, banking, members, e-sign | Merged with #17 → Q2 |
| 27 | §72a SGB VIII inspection tracker: no document storage, only dates and the inspecting officer | gemini | S | Low by design | members, users, courses, secretary | **Top 5 (W4)** |
| A1 | Permission simulator and expiring delegations, metadata only | chatgpt | M | Low-Medium | users, auth, audit, system | Wave 2, prerequisite for #22 |
| A2 | Module readiness and workflow health cockpit | chatgpt | M | Low | system, automation, security-monitor | **Wave 0 (F3)** |
| A3 | Privacy-safe process rehearsal with synthetic fixtures and dry runs | chatgpt | L | Low | demo, automation, accounting, sepa | Wave 3 |
| A4 | Evidence-based decision packets for board decisions | chatgpt | M | Medium | meetings, tasks, accounting, audit | Folded into W5 |
| PO | Contextual help center + "ask AI about this page" | product owner | S-M + M | Low (schema only) / Medium (opt-in screen values) | all modules, ai | **Wave 0 (F1) + W3** |

## 6. Review objections that became binding conditions

- **Compliance (#1):** stay within the StBerG boundary. Every rule is versioned with a source, effective date and expert review. Present rules as checklists, never as legal conclusions.
- **Behörden-Lotse (#2):** OCR + pseudonymisation is not anonymisation. Use local processing by default, explicit approval before external inference, and a source link for every extracted deadline.
- **General assembly (#3):** unlinkable ballots combined with verifiable eligibility needs a dedicated security and legal RFC.
- **Portal (#4):** magic links alone are not enough. Add step-up auth, strict resource ownership, separate public routing and negative authorisation tests.
- **Parent hub (#5):** launch the education core separately from BuT benefit processing.
- **Festival cash (#11):** never itemised sales, to avoid TSE classification.
- **Burial fund (#12):** a VAG release blocker.
- **Federation roll-up (#13):** k-anonymity alone does not stop differential attacks.
- **Egress report (#19):** distinguish configuration, actual transfers and provider retention.
- **Migration (#21):** a pre-commit transaction instead of rollback after posted entries.
- **Departments (#22):** an explicit permission model plus adversarial cross-department tests first.

## 7. Final vote (points: rank 1 = 5 … rank 5 = 1)

| Idea | claude | gemini | chatgpt | Points |
|---|---|---|---|---|
| #1 Compliance Cockpit | 1 | 1 | 1 | 15 |
| #4 Privacy cockpit + portal | 4 | 2 | 3 | 9 |
| #2 Behörden-Lotse | 2 | 4 | 4 | 8 |
| #3 General assembly | 3 | 5 | — | 4 |
| #19 Privacy presets + egress report | — | — | 2 | 4 |
| #27 §72a tracker | — | 3 | — | 3 |
| #5 Weekend school | 5 | — | — | 1 |
| A2 Readiness cockpit | — | — | 5 | 1 |
