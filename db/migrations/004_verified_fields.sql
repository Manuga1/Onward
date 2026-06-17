-- Add verification fields to members (Phase 2)
alter table members
  add column if not exists verified         boolean not null default false,
  add column if not exists verified_at      timestamptz,
  add column if not exists verifier_txn_id  text,
  add column if not exists uniqueness_hash  text unique;
