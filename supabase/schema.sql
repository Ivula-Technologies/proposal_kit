-- ProposalKit database schema
-- Run in the Supabase SQL editor, in order. RLS is enabled immediately
-- after each table is created.

-- ── profiles ────────────────────────────────────────────────────────
-- Extends Supabase auth.users with display info
create table profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  full_name        text,
  business_name    text,
  email            text,
  plan             text default 'free',      -- 'free','solo','pro','agency'
  created_at       timestamptz default now()
);
alter table profiles enable row level security;
create policy "owner only" on profiles
     for all using (auth.uid() = id);


-- ── proposals ───────────────────────────────────────────────────────
create table proposals (
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
alter table proposals enable row level security;
create policy "owner only" on proposals
     for all using (auth.uid() = user_id);


-- ── signatures ──────────────────────────────────────────────────────
create table signatures (
  id               uuid primary key default gen_random_uuid(),
  proposal_id      uuid references proposals(id) on delete cascade,
  signer_name      text not null,
  signer_email     text,
  signature_url    text,        -- Supabase Storage path to base64 PNG
  ip_address       text,
  user_agent       text,
  signed_at        timestamptz default now()
);
alter table signatures enable row level security;
-- Public insert (client signs without login)
create policy "public insert" on signatures
     for insert with check (true);
-- Owner can read their own proposal signatures
create policy "owner read" on signatures
     for select using (
      proposal_id in (
          select id from proposals where user_id = auth.uid()
      )
  );


-- ── templates ───────────────────────────────────────────────────────
create table templates (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  name           text not null,
  category       text,     -- 'consulting','design','dev','marketing'
  content        jsonb,
  is_default     boolean default false,
  created_at     timestamptz default now()
);
alter table templates enable row level security;
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

create trigger proposals_set_updated_at
  before update on proposals
  for each row execute function set_updated_at();


-- ── Storage bucket ──────────────────────────────────────────────────
-- Create a bucket named "signatures" with public read access disabled.
-- Store signature images as signatures/[proposal_id]/[signature_id].png
-- Generate a signed URL (expiry 1 hour) when rendering the signed PDF.
--
-- Run separately (Storage API does not support plain SQL table creation
-- for buckets in all Supabase versions — prefer the dashboard or the
-- snippet below via the SQL editor):
insert into storage.buckets (id, name, public)
values ('signatures', 'signatures', false)
on conflict (id) do nothing;

create policy "public insert signatures" on storage.objects
  for insert with check (bucket_id = 'signatures');

create policy "owner read signatures" on storage.objects
  for select using (
    bucket_id = 'signatures'
    and (storage.foldername(name))[1] in (
      select id::text from proposals where user_id = auth.uid()
    )
  );
