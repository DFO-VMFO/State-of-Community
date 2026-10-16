# Staff runbook (one page per job)

Sign in with your staff email at the portal link. Your role decides what you see. If something looks wrong, check **Where we are** (status page) first.

## Daily (support)
1. **Survey replies:** review new ones within 3 days. Approve to create the member; reject spam. Duplicates are flagged.
2. **Support:** work tickets by priority. Bereavement and legal: first reply within 2 hours. Tick the three checks (member, documents, call) before dispatching a partner or any money.
3. **Engagement > Waiting to send:** glance at queued messages; cancel anything wrong.

## Weekly
- **Dues:** failed or due payments; the reminder goes out automatically each week.
- **Engagement:** households quiet for 3 weeks. Use **Queue check-in** (private, personal). Never share names or rankings publicly.
- **Backup:** confirm the GitHub "Weekly backup" ran green (docs/BACKUPS.md). Open the project in Supabase so the free plan never pauses.

## Monthly (ops and board)
1. **Finance > Ledger:** every entry has a bank account. Whoever enters cannot approve their own. $1,000+ and all payroll need the board.
2. **Month close:** reconcile each bank account, then lock the month. Only the board can unlock.
3. **Transparency report:** publish totals; individual pay is never shown.
4. **Investments:** trades are proposed by one person and approved by another on the board. Record payouts to services (board only).

## Content changes (ops, support)
- **Content:** edit About us anytime (support or ops). Legal pages: ops only, with the reviewer's name. A new legal version makes every member accept again at next sign-in.
- Do not publish legal changes until the attorney has reviewed them.

## Adding or removing staff (ops)
Staff > add email and role. Remove the same day someone leaves. Roles: ops, support, data, partnerships, board.

## Members
- **Add an adult to a household:** the member does it in Account > People. If they cannot, ops can add a `people` record.
- **Split a household or move the head role:** ops, in the database (there is no button yet). Take a backup first.
- **Delete a member's data on request:** within 30 days. Remove the household, then their `people`, `consents`, vault, reminders and votes rows. Keep the audit log and finance entries (legal retention).
- **Lost sign-in:** members sign in by email link; check the email on file matches.

## Messages (WhatsApp, email)
- WhatsApp only to members who opted in; "STOP" turns it off automatically.
- If sends fail: Supabase > Edge Functions > send-notifications > Logs. Common causes: expired WhatsApp token, template not approved, Resend domain not verified.
- Queued rows that fail show `failed` with a reason; they are not retried automatically.

## Incidents
1. Bad data or wrongful access: tell ops, stop edits, take a backup, then fix.
2. Suspected breach: rotate Supabase keys, Stripe keys and WhatsApp token the same day; tell the board; members must be told within the time the law requires (ask the attorney).
3. Payments: Stripe dashboard is the source of truth; never mark dues paid by hand without a receipt.

## Contacts to fill in
Ops lead __ · Board chair __ · Attorney __ · Supabase project owner __ · Stripe owner __
Last restore drill: __ (do one quarterly; see docs/BACKUPS.md)
