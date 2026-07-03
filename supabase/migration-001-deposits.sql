-- Migration 001: Stripe deposit-on-sign
-- Only needed if you already ran an earlier schema.sql without the deposit
-- columns. Fresh installs get these from schema.sql directly.

alter table proposals add column if not exists deposit_amount  integer;   -- cents
alter table proposals add column if not exists deposit_paid    boolean default false;
alter table proposals add column if not exists deposit_paid_at timestamptz;
