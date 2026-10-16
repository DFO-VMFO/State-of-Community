# State of Community

Platform for diaspora community snapshots, membership and benefits. First edition: Ugandan community, Dallas-Fort Worth.

## Modules
- **Survey** (`#/survey`): public English survey. Consent first. Replies land in **Survey replies** for staff to approve or reject.
- **Member portal**: members sign in with an email link and see only their own card, dues, requests and contact settings.
- **PDF report**: three-page anonymous report (works when the app is opened on its own page; the Artifact preview blocks downloads).
- **Staff roles**: Operations lead, Support manager, Data specialist, Partnerships coordinator. See the matrix on the Staff page.
- **Dues**: monthly invoices by plan; Standard and Premium route $5 to the bereavement pool.
- **Support**: mutual-aid and help requests with reply clocks, verification checklist, pool payouts and partner referrals.
- **Partners**: vetting pipeline (apply, license check, interview, agreement, listed) with launch minimums.
- **Broadcasts**: WhatsApp, text and email with audience segments and consent filtering.
- **Where we are**: launch checklist and build status.

## v1 (original)
- **Dashboard**: anonymized statistics, pilot progress (50 / 200 / 500), demand vs. supply of services, bereavement pool ledger. Groups under 5 households are hidden.
- **Members**: households with survey answers, dues plan, consent flag.
- **ID card**: printable card with QR code; the verify page shows only initials, plan and status.
- **Financial model**: the planning doc's three stages, editable.

## Run
    npm install && npm run dev
With no env vars it runs in demo mode (browser storage, 42 sample households).

## Connect Supabase
1. Run `supabase/schema.sql` in the SQL editor (staff-only row security, public `soc_verify_member` function).
2. Create staff users under Authentication.
3. Copy `.env.example` to `.env` and fill in URL and anon key. The app then asks for a staff sign-in.

## New community
Edit `src/lib/edition.ts` (name, languages, sectors, tiers, service catalog). Keep each community's data in its own Supabase project so its board owns it.

## Before real members
Legal entity, privacy policy/terms, and a licensed Texas insurance broker for the bereavement pool are still needed.

## Stripe, WhatsApp and email (not live yet)
Without Supabase, these are simulated. The three functions in `supabase/functions` are written but have not been run against live services. Test with Stripe test keys and your own phone number first.
1. `supabase functions deploy send-broadcast create-checkout` and `supabase functions deploy stripe-webhook --no-verify-jwt`
2. Set secrets with `supabase secrets set` (names are at the top of each function).
3. Stripe: add a webhook endpoint for `checkout.session.completed` pointing at the stripe-webhook URL.
4. WhatsApp: needs a Meta Business account, a verified number and approved message templates.
5. Collect pooled money only after a licensed Texas insurance broker and counsel have approved the structure.

## Sign-in and security
- Sign-in is an email link for both staff and members (Supabase Auth). In Supabase, set Authentication > URL Configuration to your site URL.
- Run `supabase/schema.sql`, then add yourself: `insert into soc_staff (email, name, role) values ('you@example.org', 'Your name', 'ops');`
- A member signs in with the email address on their household record. If it does not match, they see a "no membership found" message.
- The security rules were tested against a real Postgres (54 checks: each role, a member, and the public). Run them yourself: `npm i -D @electric-sql/pglite && node scripts/rls-test.mjs`.
- Not yet covered: rate limiting or CAPTCHA on the public survey (a hidden-field trap is the only bot filter), and audit logs.

## Member portal (v4)
Home, Services (the catalog with "Count me in" waitlists), Goals (net worth, savings, home, education, business, debt, custom), a community Calendar with RSVPs, Clubs (Wealth Builders, Women Empowering Women and more) and Account. Staff manage service status, events and clubs under **Community**; setting a service to "Open now" flips it to Offered on the dashboard. New record collections: services, events, clubs, goals, memberships, rsvps, waitlist (rules and tests in `supabase/schema.sql` and `scripts/rls-test.mjs`).

All database objects are prefixed `soc_` (soc_households, soc_records, soc_staff, soc_pool_entries and the soc_* functions) so the schema can share a Supabase project with another app, such as Diaspora House.

## Finance (v5)
Ledger with second-person approval, payroll and contractor pay (restricted to the operations lead and board), events and projects with budgets, monthly bank reconciliation and locks, QuickBooks CSV export, a quarterly member report, and an audit log. A new **Board treasurer** role approves entries of $1,000 or more and all payroll, and is the only role that can unlock a month. The rules are enforced by database triggers in `supabase/schema.sql` (tested in `scripts/rls-test.mjs`), not just in the app.

## v6: conflicts and agreements
- Finance > Conflicts: each ops, support and board user signs a yearly disclosure (immutable, own sign-in only). Ledger entries to a disclosed name are flagged.
- Partners: agreement status (not started, drafting, sent, signed); listing requires `signed`, enforced in `soc_guard`.
- Bank accounts: Finance > Month close lists the community's accounts; every entry is tagged to one account and each account is reconciled separately before a month locks (`accountId` required by `soc_guard`).
- Document vault (Toolkit > Family document vault): a private locator of where papers are kept, with optional expiry dates and a trusted-contact page. No documents or numbers are stored. Collections `vault`, `vault_contacts` are member-private; no staff role can read them.
- Credit builder (Toolkit > Credit builder and first-home track): a four-phase checklist, card-utilization check and down-payment planner. Self-reported and private (`credit_plan`). No credit data is pulled. Lender introductions go through the normal help request.

## v7: investment fund, phase 1 (transparency)
- Staff page `/investments` (ops, board): overview with the "nest egg" goal, holdings, trades (propose, board approves, record executed), payouts to services (board only, capped by policy), policy (board edits), quarterly member report.
- Members see only the published `fund_reports` snapshot on Home. Not an offer; the fund is not open to outside investors.
- Rules in `soc_guard`: trades cannot be self-approved or edited, executed trades are final, only the board records payouts or changes policy.

- Member onboarding checklist on Home (private `onboarding` collection; steps auto-complete from real activity) and an About us page (tab `about`, reached from the Home hero) with purpose, pillars and promises.

## v14: people, consent, content, analytics, reminders
- **Household people.** One household, several adults, each with their own sign-in (Account > People). Shared: dues, card, family goals, clubs, events. Private per adult: immigration reminders, document vault and trusted contact, credit goals, setup progress, service votes (5 each; demand counts a household once). Splitting a household or moving the head role is done by staff in the database.
- **Terms and privacy.** Staff-editable drafts at `/legal/...`, accepted per adult and re-requested when a version changes. Drafts are not attorney-reviewed.
- **Content.** Staff > Content edits About us and legal text with version history. Support edits pages only; legal needs ops and a reviewer name.
- **Survey.** Required core (~2 min) plus optional sections with "Prefer not to say"; skipped sections are excluded from statistics.
- **Engagement.** Staff > Engagement (ops, data): active people, weekly households, funnel, screen time, votes over time, quiet households and private check-ins. Members can opt out in Account.
- **Reminders.** `soc_enqueue_reminders()` (pg_cron daily) fills the outbox; `send-notifications` delivers via Resend and WhatsApp and handles STOP. See the header of `supabase/functions/send-notifications/index.ts` for secrets.

## v15: installable app, free-plan backups, translations
- **Installable app.** `public/manifest.webmanifest`, icons, `sw.js` (offline shell only; member data is never cached), `offline.html`, and an Install card in Account. Needs HTTPS hosting. The service worker is skipped in iframes and dev.
- **Backups.** `scripts/backup.sh` + `.github/workflows/backup.yml`, encrypted, no paid Supabase plan needed. See `docs/BACKUPS.md`. Staff runbook: `docs/RUNBOOK.md`.
- **Languages.** English, Kiswahili, Luganda (`src/lib/i18n.tsx`). Covers navigation, Home headings, Account, consent gate, survey buttons. Strings not listed stay English. Translations are drafts: have native speakers review them.
