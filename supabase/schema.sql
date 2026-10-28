-- ProposalKit database schema
-- Run the whole file in the Supabase SQL editor, then seed.sql.
-- Safe to re-run: it creates what's missing and replaces policies, so it
-- also upgrades a database set up from an earlier version of this file.
--
-- Security model: the browser (anon key + user session) can only READ its
-- own rows and edit its own display name/business name. Every write that
-- touches money, plan limits or signatures goes through app/api/* with the
-- service-role key, after the route has checked the user.

-- ── profiles ────────────────────────────────────────────────────────
create table if not exists profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  full_name        text,
  business_name    text,
  email            text,
  plan             text,                     -- 'solo' | 'pro' | null (no paid plan)
  created_at       timestamptz default now()
);

alter table profiles add column if not exists trial_ends_at        timestamptz default (now() + interval '14 days');
alter table profiles add column if not exists stripe_customer_id   text unique;
alter table profiles add column if not exists subscription_id      text;
alter table profiles add column if not exists subscription_status  text;   -- Stripe status: active, trialing, past_due, canceled...
alter table profiles add column if not exists current_period_end   timestamptz;
-- Stripe Connect Express account that receives the freelancer's deposits
alter table profiles add column if not exists stripe_account_id    text unique;
alter table profiles add column if not exists charges_enabled      boolean default false;
alter table profiles add column if not exists payouts_enabled      boolean default false;

-- Earlier versions defaulted plan to 'free' and let users write it.
alter table profiles alter column plan drop default;
update profiles set plan = null where plan not in ('solo', 'pro');
update profiles set trial_ends_at = created_at + interval '14 days' where trial_ends_at is null;

alter table profiles enable row level security;
drop policy if exists "owner only" on profiles;
drop policy if exists "owner read" on profiles;
drop policy if exists "owner update" on profiles;
create policy "owner read" on profiles
  for select using (auth.uid() = id);
create policy "owner update" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Users may only change their own display fields. Plan, trial and Stripe
-- columns are written by the server (webhooks) with the service role.
revoke insert, update, delete on profiles from anon, authenticated;
grant select on profiles to authenticated;
grant update (full_name, business_name) on profiles to authenticated;

-- Create the profile row when someone signs up (magic link or Google).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ── proposals ───────────────────────────────────────────────────────
create table if not exists proposals (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users(id) on delete cascade,
  title              text not null,
  client_name        text,
  client_email       text,
  content            jsonb,     -- TipTap JSON document
  status             text default 'draft',     -- draft|sent|viewed|signed
  viewed_at          timestamptz,
  signed_at          timestamptz,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

alter table proposals add column if not exists deposit_amount   integer;   -- cents; null = no deposit
alter table proposals add column if not exists deposit_paid     boolean default false;
alter table proposals add column if not exists deposit_paid_at  timestamptz;
alter table proposals add column if not exists deposit_payment_intent text;
-- Follow-ups and expiry
alter table proposals add column if not exists sent_at          timestamptz;  -- last emailed to the client
alter table proposals add column if not exists auto_remind      boolean default true;
alter table proposals add column if not exists reminders_sent   integer default 0;
alter table proposals add column if not exists expires_on       date;         -- last day it can be signed; null = never

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'proposals_status_check') then
    alter table proposals add constraint proposals_status_check
      check (status in ('draft', 'sent', 'viewed', 'signed'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'proposals_deposit_check') then
    alter table proposals add constraint proposals_deposit_check
      check (deposit_amount is null or deposit_amount between 50 and 10000000);
  end if;
end $$;

create index if not exists proposals_user_created_idx on proposals (user_id, created_at desc);
create index if not exists proposals_reminders_idx on proposals (sent_at)
  where auto_remind and status in ('sent', 'viewed');

alter table proposals enable row level security;
drop policy if exists "owner only" on proposals;
drop policy if exists "owner read" on proposals;
drop policy if exists "owner delete" on proposals;
create policy "owner read" on proposals
  for select using (auth.uid() = user_id);
create policy "owner delete" on proposals
  for delete using (auth.uid() = user_id);

-- Inserts and edits go through /api/proposals so plan limits, signed-lock
-- and deposit rules can't be skipped from the browser.
revoke insert, update on proposals from anon, authenticated;
grant select, delete on proposals to authenticated;


-- ── signatures ──────────────────────────────────────────────────────
create table if not exists signatures (
  id               uuid primary key default gen_random_uuid(),
  proposal_id      uuid references proposals(id) on delete cascade,
  signer_name      text not null,
  signer_email     text,
  signature_url    text,        -- Supabase Storage path to the PNG
  ip_address       text,
  user_agent       text,
  signed_at        timestamptz default now()
);
alter table signatures enable row level security;
-- Signatures are only written by /api/sign (service role).
drop policy if exists "public insert" on signatures;
drop policy if exists "owner read" on signatures;
create policy "owner read" on signatures
  for select using (
    proposal_id in (select id from proposals where user_id = auth.uid())
  );
revoke insert, update, delete on signatures from anon, authenticated;


-- ── templates ───────────────────────────────────────────────────────
create table if not exists templates (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  name           text not null,
  category       text,     -- 'consulting','design','dev','marketing'
  content        jsonb,
  is_default     boolean default false,
  created_at     timestamptz default now()
);
alter table templates enable row level security;
drop policy if exists "owner or default" on templates;
create policy "owner or default" on templates
  for select using (auth.uid() = user_id or is_default = true);


-- ── updated_at trigger for proposals ───────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists proposals_set_updated_at on proposals;
create trigger proposals_set_updated_at
  before update on proposals
  for each row execute function set_updated_at();


-- ── Storage bucket ──────────────────────────────────────────────────
-- Private bucket; images live at signatures/[proposal_id]/[signature_id].png
-- and are only uploaded by /api/sign with the service role.
insert into storage.buckets (id, name, public)
values ('signatures', 'signatures', false)
on conflict (id) do nothing;

drop policy if exists "public insert signatures" on storage.objects;
drop policy if exists "owner read signatures" on storage.objects;
create policy "owner read signatures" on storage.objects
  for select using (
    bucket_id = 'signatures'
    and (storage.foldername(name))[1] in (
      select id::text from proposals where user_id = auth.uid()
    )
  );
