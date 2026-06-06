-- Run this in the Supabase SQL editor to set up the tables

create table if not exists cloze_tests (
  id bigint generated always as identity primary key,
  lesson text not null,
  part text not null,
  title text,
  display_order integer not null default 1,
  body text not null,
  trans text,
  created_at timestamptz not null default now()
);

create table if not exists sentence_rearrangements (
  id bigint generated always as identity primary key,
  lesson text not null,
  part text not null,
  title text,
  seq integer not null default 1,
  sentence text not null,
  trans text,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table cloze_tests enable row level security;
alter table sentence_rearrangements enable row level security;

-- Allow public read (for students)
create policy "public read cloze" on cloze_tests for select using (true);
create policy "public read seijo" on sentence_rearrangements for select using (true);

-- Note: writes go through server-side API routes using service_role key (bypasses RLS)
