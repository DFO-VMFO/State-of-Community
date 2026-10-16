-- State of Community. Run this whole file in the Supabase SQL editor (safe to re-run).
--
-- Who can do what:
--   public (anon)  : submit the survey, verify a membership card. Nothing else.
--   members        : read their own household, dues and requests; send a help request; edit their own phone/WhatsApp setting.
--   staff roles    : ops (everything) | support | data | partnerships. See the policies below.
--
-- First staff user (run once, with your own email):
--   insert into soc_staff (email, name, role) values ('you@example.org', 'Your name', 'ops');

create table if not exists soc_households (
  id text primary key,
  member_code text unique not null,
  status text not null default 'pending' check (status in ('pending','active','lapsed')),
  tier text not null default 'basic' check (tier in ('basic','standard','premium')),
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists soc_pool_entries (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  kind text not null check (kind in ('contribution','claim')),
  amount numeric(12,2) not null check (amount >= 0),
  note text
);
create table if not exists soc_records (
  collection text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz default now(),
  primary key (collection, id)
);
create table if not exists soc_staff (
  email text primary key,
  name text,
  role text not null check (role in ('ops','support','data','partnerships','board'))
);
alter table soc_staff drop constraint if exists soc_staff_role_check;
alter table soc_staff add constraint soc_staff_role_check check (role in ('ops','support','data','partnerships','board'));

alter table soc_households enable row level security;
alter table soc_pool_entries enable row level security;
alter table soc_records enable row level security;
alter table soc_staff enable row level security;

-- Helpers (security definer so policies can look people up without exposing the tables).
create or replace function soc_staff_role() returns text language sql stable security definer set search_path = public as $$
  select role from soc_staff where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) limit 1 $$;

-- One household, several adults. The head signs in with the household email; other adults are rows in the
-- `people` collection and sign in with their own email.
create or replace function soc_my_household_id() returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select id from soc_households where coalesce(data ->> 'email', '') <> '' and lower(data ->> 'email') = lower(coalesce(auth.jwt() ->> 'email', '')) limit 1),
    (select data ->> 'householdId' from soc_records where collection = 'people' and lower(data ->> 'email') = lower(coalesce(auth.jwt() ->> 'email', '')) limit 1)) $$;

-- The signed-in adult's own id: 'p-<householdId>' for the head, the person row id for anyone else.
create or replace function soc_my_person_id() returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select 'p-' || id from soc_households where coalesce(data ->> 'email', '') <> '' and lower(data ->> 'email') = lower(coalesce(auth.jwt() ->> 'email', '')) limit 1),
    (select id from soc_records where collection = 'people' and lower(data ->> 'email') = lower(coalesce(auth.jwt() ->> 'email', '')) limit 1)) $$;

-- Marks an invited adult active the first time they sign in.
create or replace function soc_activate_person() returns void language sql security definer set search_path = public as $$
  update soc_records set data = data || '{"status":"active"}'::jsonb
  where collection = 'people' and data ->> 'status' = 'invited' and lower(data ->> 'email') = lower(coalesce(auth.jwt() ->> 'email', '')) $$;

-- Votes already cast by the signed-in member (security definer: a policy cannot query its own table).
create or replace function soc_my_vote_count() returns bigint language sql stable security definer set search_path = public as $$
  select count(*) from soc_records where collection = 'waitlist' and coalesce(data ->> 'personId', 'p-' || (data ->> 'householdId')) = soc_my_person_id() $$;

-- Which staff roles may touch each kind of record.
create or replace function soc_record_roles(c text) returns text[] language sql immutable as $$
  select case c
    when 'tickets' then array['ops','support','partnerships']
    when 'partners' then array['ops','partnerships','board']
    when 'partner_complaints' then array['ops','partnerships','support']
    when 'broadcasts' then array['ops','support']
    when 'submissions' then array['ops','support','data']
    when 'services' then array['ops','support']
    when 'events' then array['ops','support']
    when 'clubs' then array['ops','support']
    when 'memberships' then array['ops','support','data']
    when 'rsvps' then array['ops','support','data']
    when 'waitlist' then array['ops','support','data']
    when 'suggestions' then array['ops','support']
    when 'ledger' then array['ops','support','board']
    when 'payroll' then array['ops','board']          -- salaries and contractor pay: restricted
    when 'payees' then array['ops','board']
    when 'projects' then array['ops','support','board']
    when 'recs' then array['ops','board']
    when 'locks' then array['ops','board']
    when 'audit' then array['ops','board']
    when 'transparency' then array['ops','board']
    when 'holdings' then array['ops','board']
    when 'trades' then array['ops','board']
    when 'navs' then array['ops','board']
    when 'fund_payouts' then array['ops','board']
    when 'fund_policy' then array['ops','board']
    when 'fund_reports' then array['ops','board']
    when 'accounts' then array['ops','support','board']
    when 'coi' then array['ops','support','board']
    when 'remit_rates' then array['ops','support']
    when 'vault' then array[]::text[]            -- document locations: private to the member
    when 'vault_contacts' then array[]::text[]
    when 'onboarding' then array[]::text[]        -- setup progress: private to the member
    when 'credit_plan' then array[]::text[]       -- self-reported credit goals: private to the member
    when 'reminders' then array[]::text[]  -- immigration dates: private to the member, no staff role can read them
    when 'people' then array['ops','support']       -- adults in a household: name and email only
    when 'consents' then array['ops','support']     -- who accepted which version of the terms and privacy policy
    when 'content' then array['ops','support']      -- About us, legal pages (support: pages only, enforced below)
    when 'content_history' then array['ops','support']
    when 'telemetry' then array['ops','data']       -- screen views and votes: totals and codes only
    when 'outbox' then array['ops','support']       -- reminders and messages waiting to go out
    -- goals stay private: default (ops) only
    else array['ops']  -- payments, gates, anything new
  end $$;

drop function if exists soc_whoami();
create or replace function soc_whoami() returns table (kind text, role text, household_id text, name text, person_id text)
language sql stable security definer set search_path = public as $$
  select * from (
    select 'staff'::text as kind, s.role, null::text as household_id, s.name, null::text as person_id from soc_staff s where lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    union all
    select 'member', null, h.id, h.data ->> 'headName', 'p-' || h.id from soc_households h
      where coalesce(h.data ->> 'email', '') <> '' and lower(h.data ->> 'email') = lower(coalesce(auth.jwt() ->> 'email', ''))
    union all
    select 'member', null, r.data ->> 'householdId', r.data ->> 'name', r.id from soc_records r
      where r.collection = 'people' and lower(r.data ->> 'email') = lower(coalesce(auth.jwt() ->> 'email', ''))
  ) x order by (kind = 'staff') desc limit 1 $$;

-- Public card check: initials, plan, status and join date only.
create or replace function soc_verify_member(code text)
returns table (member_code text, initials text, tier text, status text, since text)
language sql security definer set search_path = public as $$
  select h.member_code,
         (select string_agg(upper(left(p, 1)), '') from unnest((string_to_array(h.data ->> 'headName', ' '))[1:2]) p),
         h.tier, h.status, h.data ->> 'joinedAt'
  from soc_households h where lower(h.member_code) = lower(code) limit 1 $$;

-- A member may change only their phone number and message setting.
create or replace function soc_update_my_contact(p_phone text, p_opt boolean) returns void
language sql security definer set search_path = public as $$
  update soc_households set data = data || jsonb_build_object('phone', p_phone, 'whatsappOptIn', p_opt), updated_at = now() where id = soc_my_household_id() $$;

revoke execute on function soc_whoami(), soc_update_my_contact(text, boolean), soc_activate_person() from public, anon;
grant execute on function soc_verify_member(text) to anon, authenticated;
grant execute on function soc_whoami(), soc_update_my_contact(text, boolean), soc_activate_person() to authenticated;

-- households
drop policy if exists "staff households" on soc_households;
drop policy if exists "member own household" on soc_households;
create policy "staff households" on soc_households for all to authenticated
  using (soc_staff_role() in ('ops','support','data')) with check (soc_staff_role() in ('ops','support','data'));
create policy "member own household" on soc_households for select to authenticated using (id = soc_my_household_id());

-- pool ledger: every staff role can read it, ops and support can add entries, nobody edits history.
drop policy if exists "staff read pool" on soc_pool_entries;
drop policy if exists "staff add pool" on soc_pool_entries;
create policy "staff read pool" on soc_pool_entries for select to authenticated using (soc_staff_role() is not null);
create policy "staff add pool" on soc_pool_entries for insert to authenticated with check (soc_staff_role() in ('ops','support'));

-- records (tickets, partners, broadcasts, payments, survey replies, checklist)
drop policy if exists "staff records" on soc_records;
drop policy if exists "member read own records" on soc_records;
drop policy if exists "member new ticket" on soc_records;
drop policy if exists "public survey" on soc_records;
drop policy if exists "read portal content" on soc_records;
drop policy if exists "member own portal rows" on soc_records;
drop policy if exists "member household rows" on soc_records;
drop policy if exists "member household people" on soc_records;
drop policy if exists "member see people" on soc_records;
drop policy if exists "member shared rows" on soc_records;
drop policy if exists "member consents" on soc_records;
drop policy if exists "member usage" on soc_records;
drop policy if exists "public content" on soc_records;
create policy "staff records" on soc_records for all to authenticated
  using (soc_staff_role() = any (soc_record_roles(collection))) with check (soc_staff_role() = any (soc_record_roles(collection)));
create policy "member read own records" on soc_records for select to authenticated
  using (collection in ('tickets','payments') and data ->> 'householdId' = soc_my_household_id());
create policy "member new ticket" on soc_records for insert to authenticated
  with check (collection = 'tickets' and data ->> 'householdId' = soc_my_household_id() and data ->> 'status' = 'new');
create policy "public survey" on soc_records for insert to anon, authenticated
  with check (collection = 'submissions' and data ->> 'status' = 'new');

-- Member portal: everyone signed in reads the catalog, calendar and clubs; members manage only their own
-- goals, club memberships, RSVPs and waitlist entries.
create policy "read portal content" on soc_records for select to authenticated
  using (collection in ('services','events','clubs','remit_rates','transparency','fund_reports'));
-- Shared by the household: family goals, club memberships and RSVPs.
create policy "member household rows" on soc_records for all to authenticated
  using (collection in ('goals','memberships','rsvps') and data ->> 'householdId' = soc_my_household_id())
  with check (collection in ('goals','memberships','rsvps') and data ->> 'householdId' = soc_my_household_id()
              and (collection = 'goals' or id = (data ->> case collection when 'memberships' then 'clubId' else 'eventId' end) || ':' || soc_my_household_id()));
-- Private to one adult: votes, reminders, suggestions, documents, trusted contact, credit goals, setup progress.
-- Rows saved before the household had several adults carry no personId and belong to the head.
create policy "member own portal rows" on soc_records for all to authenticated
  using (collection in ('waitlist','reminders','suggestions','vault','vault_contacts','credit_plan','onboarding')
         and data ->> 'householdId' = soc_my_household_id() and coalesce(data ->> 'personId', 'p-' || (data ->> 'householdId')) = soc_my_person_id())
  with check (collection in ('waitlist','reminders','suggestions','vault','vault_contacts','credit_plan','onboarding')
              and data ->> 'householdId' = soc_my_household_id() and coalesce(data ->> 'personId', 'p-' || (data ->> 'householdId')) = soc_my_person_id()
              and (collection <> 'waitlist' or (soc_my_vote_count() < 5 and id = (data ->> 'serviceId') || ':' || soc_my_person_id())));
-- A reminder or document an adult chose to share with the household.
create policy "member shared rows" on soc_records for select to authenticated
  using (collection in ('reminders','vault') and data ->> 'shared' = 'true' and data ->> 'householdId' = soc_my_household_id());
-- People: everyone in the household sees the list; only the head adds or removes other adults.
create policy "member see people" on soc_records for select to authenticated
  using (collection = 'people' and data ->> 'householdId' = soc_my_household_id());
create policy "member household people" on soc_records for all to authenticated
  using (collection = 'people' and data ->> 'householdId' = soc_my_household_id() and soc_my_person_id() = 'p-' || (data ->> 'householdId'))
  with check (collection = 'people' and data ->> 'householdId' = soc_my_household_id()
              and soc_my_person_id() = 'p-' || (data ->> 'householdId') and data ->> 'role' <> 'head');
-- Terms and privacy acceptance: each adult records their own, and can read their own.
create policy "member consents" on soc_records for all to authenticated
  using (collection = 'consents' and data ->> 'personId' = soc_my_person_id())
  with check (collection = 'consents' and data ->> 'personId' = soc_my_person_id() and data ->> 'householdId' = soc_my_household_id());
-- Usage events: members can only add their own; nobody can edit them.
create policy "member usage" on soc_records for insert to authenticated
  with check (collection = 'telemetry' and data ->> 'personId' = soc_my_person_id() and data ->> 'householdId' = soc_my_household_id());
-- Published About us and legal pages are readable by everyone, including people who have not signed in.
create policy "public content" on soc_records for select to anon, authenticated using (collection = 'content');

-- Counts per club, event or service for display ("12 households going"). Returns numbers only.
create or replace function soc_public_counts(p_collection text, p_field text) returns table (k text, n bigint)
language sql stable security definer set search_path = public as $$
  select data ->> p_field, count(distinct data ->> 'householdId') from soc_records
  where collection = p_collection and p_collection in ('memberships','rsvps','waitlist') and p_field in ('clubId','eventId','serviceId')
    and (soc_staff_role() is not null or soc_my_household_id() is not null)
  group by 1 $$;
revoke execute on function soc_public_counts(text, text) from public, anon;
grant execute on function soc_public_counts(text, text) to authenticated;

-- staff directory: only the operations lead
drop policy if exists "ops manage staff" on soc_staff;
create policy "ops manage staff" on soc_staff for all to authenticated using (soc_staff_role() = 'ops') with check (soc_staff_role() = 'ops');


-- ---------------------------------------------------------------------------------------------
-- Finance controls. These are enforced in the database, so they hold even if someone edits the app.
--   * the person who enters an entry can never approve it
--   * entries of $1,000 or more, and all payroll or contractor pay, need the board role to approve
--   * approved entries cannot be edited or deleted: only voided, with a reason. Paid and void are final
--   * a month with a lock record accepts no new or changed entries
--   * every change is written to an audit log nobody can edit; only the board can remove a month lock
-- The service role (null email) bypasses these checks, which is how backups and migrations run.
-- ---------------------------------------------------------------------------------------------
create or replace function soc_month_locked(d text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from soc_records where collection = 'locks' and id = left(coalesce(d, ''), 7)) $$;

-- Security definer so the check sees every household, not just the caller's.
create or replace function soc_email_taken(e text, except_id text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from soc_households h where lower(h.data ->> 'email') = lower(e))
      or exists (select 1 from soc_records p where p.collection = 'people' and p.id <> except_id and lower(p.data ->> 'email') = lower(e)) $$;
revoke execute on function soc_email_taken(text, text) from public, anon, authenticated;

create or replace function soc_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare
  c text := coalesce(new.collection, old.collection);
  em text := lower(coalesce(auth.jwt() ->> 'email', ''));
  r text; o jsonb; n jsonb; creator text;
begin
  if em = '' then return coalesce(new, old); end if;
  r := soc_staff_role();
  if c = 'audit' and tg_op in ('UPDATE', 'DELETE') then raise exception 'The audit log cannot be changed'; end if;
  if c = 'locks' and tg_op = 'DELETE' and r is distinct from 'board' then raise exception 'Only the board can unlock a month'; end if;
  if c = 'fund_policy' and r is distinct from 'board' then raise exception 'Only the board changes the investment policy'; end if;
  if c = 'fund_payouts' and r is distinct from 'board' then raise exception 'Only the board records a payout to services'; end if;
  if c = 'trades' then
    if tg_op = 'DELETE' then raise exception 'Trades cannot be deleted'; end if;
    if tg_op = 'INSERT' then
      if new.data ->> 'status' <> 'proposed' then raise exception 'A trade starts as proposed'; end if;
      if lower(new.data ->> 'proposedBy') is distinct from em then raise exception 'proposedBy must be you'; end if;
      return new;
    end if;
    if old.data ->> 'status' in ('executed', 'rejected') then raise exception 'Executed and rejected trades are final'; end if;
    if (new.data ->> 'amount') is distinct from (old.data ->> 'amount') or (new.data ->> 'asset') is distinct from (old.data ->> 'asset') or (new.data ->> 'action') is distinct from (old.data ->> 'action') then raise exception 'A trade cannot change after it is proposed'; end if;
    if new.data ->> 'status' in ('approved', 'rejected') then
      if old.data ->> 'status' <> 'proposed' then raise exception 'Only proposed trades can be approved or rejected'; end if;
      if r is distinct from 'board' then raise exception 'Only the board approves trades'; end if;
      if em = lower(old.data ->> 'proposedBy') then raise exception 'You cannot approve or reject your own trade'; end if;
      if new.data ->> 'status' = 'approved' and lower(new.data ->> 'approvedBy') is distinct from em then raise exception 'approvedBy must be you'; end if;
    elsif new.data ->> 'status' = 'executed' then
      if old.data ->> 'status' <> 'approved' then raise exception 'Only approved trades can be executed'; end if;
      if lower(new.data ->> 'approvedBy') is distinct from lower(old.data ->> 'approvedBy') then raise exception 'The approver cannot be changed'; end if;
    else raise exception 'Unknown trade status'; end if;
    return new;
  end if;
  if c in ('consents', 'content_history') and tg_op <> 'INSERT' then raise exception 'This record is permanent and cannot be changed'; end if;
  if c = 'telemetry' and tg_op = 'UPDATE' then raise exception 'Usage events cannot be edited'; end if;
  if c = 'telemetry' and tg_op = 'DELETE' and r is distinct from 'ops' then raise exception 'Only the operations lead purges usage data'; end if;
  if c = 'telemetry' and tg_op = 'INSERT' and r is not null then raise exception 'Staff do not write usage events'; end if;
  if c = 'content' and tg_op = 'DELETE' then raise exception 'Pages cannot be deleted'; end if;
  if c = 'content' and r = 'support' and coalesce(new.data ->> 'kind', '') <> 'page' then raise exception 'Support can edit pages only. Legal text and settings need the operations lead'; end if;
  if c = 'content' and new.data ->> 'kind' = 'legal' and coalesce(trim(new.data ->> 'reviewedBy'), '') = '' and tg_op = 'UPDATE' and (new.data ->> 'version') is distinct from (old.data ->> 'version') then raise exception 'Legal text needs a reviewer name'; end if;
  if c = 'people' then
    if tg_op = 'DELETE' then
      if old.data ->> 'role' = 'head' then raise exception 'The head of household cannot be removed'; end if;
      return old;
    end if;
    if soc_email_taken(new.data ->> 'email', new.id) then raise exception 'That email already belongs to a household'; end if;
    if tg_op = 'UPDATE' and ((new.data ->> 'householdId') is distinct from (old.data ->> 'householdId') or (new.data ->> 'role') is distinct from (old.data ->> 'role')) then
      raise exception 'Household and role cannot change here. Contact the community team'; end if;
    return new;
  end if;
  if c = 'accounts' and r not in ('ops', 'board') then raise exception 'Only the operations lead or the board manage bank accounts'; end if;
  if c = 'coi' then
    if tg_op <> 'INSERT' then raise exception 'Signed disclosures cannot be changed'; end if;
    if lower(new.data ->> 'email') is distinct from em then raise exception 'Sign the disclosure under your own sign-in'; end if;
    return new;
  end if;
  if c = 'partners' and tg_op in ('INSERT', 'UPDATE') then
    -- Listing a partner is an approval: a different person from the one who vetted them.
    if new.data ->> 'stage' = 'listed' and (tg_op = 'INSERT' or old.data ->> 'stage' is distinct from 'listed') then
      if new.data ->> 'agreementStatus' is distinct from 'signed' then raise exception 'The agreement must be signed before listing'; end if;
      if r not in ('ops', 'board') then raise exception 'Only the operations lead or the board can list a partner'; end if;
      if (new.data ->> 'track' = 'institution' or new.data ->> 'kind' in ('Bank or credit union', 'Insurance carrier', 'Corporate sponsor')) and r <> 'board' then
        raise exception 'Listing an institution needs board approval'; end if;
      if lower(new.data ->> 'approvedBy') is distinct from em then raise exception 'approvedBy must be you'; end if;
      if lower(coalesce(new.data ->> 'vettedBy', '')) = em then raise exception 'The person who vetted a partner cannot approve the listing'; end if;
    end if;
    return new;
  end if;
  if c not in ('ledger', 'payroll') then return coalesce(new, old); end if;

  if tg_op = 'INSERT' then
    if coalesce(new.data ->> 'accountId', '') = '' then raise exception 'Choose a bank account for the entry'; end if;
    if lower(new.data ->> 'createdBy') is distinct from em then raise exception 'An entry must be created under your own sign-in'; end if;
    if new.data ->> 'status' not in ('draft', 'pending') then raise exception 'New entries start as draft or pending'; end if;
    if soc_month_locked(new.data ->> 'date') then raise exception 'That month is locked'; end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    if old.data ->> 'status' not in ('draft', 'rejected') then raise exception 'Only drafts can be deleted. Void the entry instead'; end if;
    return old;
  end if;

  o := old.data; n := new.data; creator := lower(o ->> 'createdBy');
  if o ->> 'status' in ('paid', 'void') then raise exception 'Paid and void entries are final'; end if;
  if soc_month_locked(o ->> 'date') or soc_month_locked(n ->> 'date') then raise exception 'That month is locked'; end if;
  if lower(n ->> 'createdBy') is distinct from creator then raise exception 'The creator cannot be changed'; end if;

  if n ->> 'status' in ('draft', 'pending') then
    if o ->> 'status' not in ('draft', 'pending', 'rejected') then raise exception 'Approved entries cannot be edited. Void and re-enter'; end if;
    if em <> creator then raise exception 'Only the person who entered it can edit it'; end if;
    return new;
  end if;

  if (n ->> 'amount') is distinct from (o ->> 'amount') or (n ->> 'date') is distinct from (o ->> 'date')
     or (n ->> 'category') is distinct from (o ->> 'category') or (n ->> 'payee') is distinct from (o ->> 'payee') then
    raise exception 'Amount, date, category and payee cannot change during approval';
  end if;
  if r not in ('ops', 'board') then raise exception 'Only the operations lead or the board can do that'; end if;

  if n ->> 'status' = 'approved' or n ->> 'status' = 'rejected' then
    if o ->> 'status' <> 'pending' then raise exception 'Only pending entries can be approved or rejected'; end if;
    if em = creator then raise exception 'You cannot approve or reject your own entry'; end if;
    if n ->> 'status' = 'approved' then
      if lower(n ->> 'approvedBy') is distinct from em then raise exception 'approvedBy must be you'; end if;
      if (c = 'payroll' or (o ->> 'amount')::numeric >= 1000) and r <> 'board' then raise exception 'This needs board approval'; end if;
    end if;
    return new;
  elsif n ->> 'status' = 'paid' then
    if o ->> 'status' <> 'approved' then raise exception 'Only approved entries can be marked paid'; end if;
    if lower(n ->> 'approvedBy') is distinct from lower(o ->> 'approvedBy') then raise exception 'The approver cannot be changed'; end if;
    return new;
  elsif n ->> 'status' = 'void' then
    if coalesce(trim(n ->> 'voidReason'), '') = '' then raise exception 'A void needs a reason'; end if;
    return new;
  end if;
  raise exception 'Unknown status';
end $$;

create or replace function soc_audit() returns trigger language plpgsql security definer set search_path = public as $$
declare c text := coalesce(new.collection, old.collection); row_ soc_records := coalesce(new, old);
begin
  if c in ('ledger', 'payroll', 'locks', 'recs', 'transparency', 'trades', 'holdings', 'fund_payouts', 'fund_policy', 'fund_reports') then
    insert into soc_records (collection, id, data) values ('audit', gen_random_uuid()::text, jsonb_build_object(
      'at', now(), 'actor', coalesce(auth.jwt() ->> 'email', 'service'), 'action', lower(tg_op), 'collection', c, 'entryId', row_.id,
      'status', row_.data ->> 'status', 'amount', row_.data -> 'amount', 'memo', left(coalesce(row_.data ->> 'memo', row_.data ->> 'payee', ''), 80)));
  end if;
  return null;
end $$;

drop trigger if exists soc_guard_trg on soc_records;
create trigger soc_guard_trg before insert or update or delete on soc_records for each row execute function soc_guard();
drop trigger if exists soc_audit_trg on soc_records;
create trigger soc_audit_trg after insert or update or delete on soc_records for each row execute function soc_audit();


-- ---------------------------------------------------------------------------------------------
-- Outbound reminders. soc_enqueue_reminders() writes rows to the `outbox` collection once a day;
-- the send-notifications edge function delivers them (email via Resend, WhatsApp via Meta Cloud API).
-- It is idempotent: each row has a unique key, so running it twice never sends twice.
--   * immigration dates: 180, 90 and 30 days out (and the day itself), to the adult who owns the reminder
--   * events: the day before, to households that RSVPed 'going'
--   * dues: payments still 'due', at most once a week
-- WhatsApp rows are created only when the household has opted in and has a phone number.
-- ---------------------------------------------------------------------------------------------
create or replace function soc_enqueue_reminders() returns integer language plpgsql security definer set search_path = public as $$
declare n integer := 0; k integer;
begin
  -- immigration
  insert into soc_records (collection, id, data)
  select 'outbox', x.key, jsonb_build_object('id', x.key, 'key', x.key, 'householdId', x.hid, 'personId', x.pid, 'channel', x.ch, 'kind', 'immigration',
    'subject', x.kind || ' reminder', 'body', 'Your ' || lower(x.kind) || ' date is in ' || x.d || ' days. Start early: open the Toolkit to see what to prepare.',
    'sendOn', current_date::text, 'status', 'queued')
  from (
    select r.id || ':' || s.step || ':' || c.ch as key, r.data ->> 'householdId' as hid, r.data ->> 'personId' as pid, c.ch, r.data ->> 'kind' as kind,
           ((r.data ->> 'date')::date - current_date) as d
    from soc_records r
    join soc_households h on h.id = r.data ->> 'householdId'
    cross join lateral (select unnest(array[180, 90, 30, 0]) as step) s
    cross join lateral (select unnest(case when coalesce((h.data ->> 'whatsappOptIn')::boolean, false) and coalesce(h.data ->> 'phone', '') <> '' then array['email', 'whatsapp'] else array['email'] end) as ch) c
    where r.collection = 'reminders' and (r.data ->> 'date') ~ '^\d{4}-\d{2}-\d{2}$'
      and ((r.data ->> 'date')::date - current_date) between greatest(s.step - 6, 0) and s.step
  ) x
  on conflict (collection, id) do nothing;
  get diagnostics k = row_count; n := n + k;
  -- events
  insert into soc_records (collection, id, data)
  select 'outbox', 'evt:' || e.id || ':' || (rs.data ->> 'householdId') || ':' || c.ch, jsonb_build_object('id', 'evt:' || e.id || ':' || (rs.data ->> 'householdId') || ':' || c.ch,
    'key', 'evt:' || e.id || ':' || (rs.data ->> 'householdId') || ':' || c.ch, 'householdId', rs.data ->> 'householdId', 'channel', c.ch, 'kind', 'event',
    'subject', 'Tomorrow: ' || (e.data ->> 'title'), 'body', (e.data ->> 'title') || ' is tomorrow at ' || (e.data ->> 'start') || ', ' || (e.data ->> 'place') || '.', 'sendOn', current_date::text, 'status', 'queued')
  from soc_records e
  join soc_records rs on rs.collection = 'rsvps' and rs.data ->> 'eventId' = e.id and rs.data ->> 'status' = 'going'
  join soc_households h on h.id = rs.data ->> 'householdId'
  cross join lateral (select unnest(case when coalesce((h.data ->> 'whatsappOptIn')::boolean, false) and coalesce(h.data ->> 'phone', '') <> '' then array['email', 'whatsapp'] else array['email'] end) as ch) c
  where e.collection = 'events' and (e.data ->> 'date')::date = current_date + 1
  on conflict (collection, id) do nothing;
  get diagnostics k = row_count; n := n + k;
  -- dues, once a week
  insert into soc_records (collection, id, data)
  select 'outbox', 'due:' || p.id || ':' || to_char(current_date, 'IYYY-IW'), jsonb_build_object('id', 'due:' || p.id || ':' || to_char(current_date, 'IYYY-IW'),
    'key', 'due:' || p.id || ':' || to_char(current_date, 'IYYY-IW'), 'householdId', p.data ->> 'householdId', 'channel', 'email', 'kind', 'dues',
    'subject', 'Your dues for ' || (p.data ->> 'month'), 'body', 'Your ' || (p.data ->> 'month') || ' dues of $' || (p.data ->> 'amount') || ' are due. You can pay in the portal under Account.', 'sendOn', current_date::text, 'status', 'queued')
  from soc_records p where p.collection = 'payments' and p.data ->> 'status' = 'due'
  on conflict (collection, id) do nothing;
  get diagnostics k = row_count; n := n + k;
  return n;
end $$;
revoke execute on function soc_enqueue_reminders() from public, anon, authenticated;

-- Lets the hourly sender prove it is the scheduler without a shared secret in the function settings.
-- The key lives in Supabase Vault (created by supabase/cron.sql).
do $do$ begin
  if exists (select 1 from pg_namespace where nspname = 'vault') then
    execute $f$ create or replace function soc_cron_key_ok(k text) returns boolean language sql stable security definer set search_path = public, vault as 'select exists (select 1 from vault.decrypted_secrets where name = ''soc_cron_key'' and decrypted_secret = k)' $f$;
    execute 'revoke execute on function soc_cron_key_ok(text) from public, anon, authenticated';
  end if;
end $do$;
