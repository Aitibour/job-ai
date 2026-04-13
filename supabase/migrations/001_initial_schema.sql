-- Jobs table: one row per unique posting from any source
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  location text not null,
  province text not null,
  source text not null,
  url text not null,
  description text not null,
  industry text not null default 'other',
  posted_at timestamptz,
  found_at timestamptz not null default now(),
  external_id text not null unique
);

create index on jobs (industry);
create index on jobs (found_at desc);
create index on jobs (province);

-- Applications table: pipeline tracking
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  status text not null default 'new',
  applied_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  unique(job_id)
);

create index on applications (status);
create index on applications (created_at desc);

-- CV versions: frozen CV + JD snapshot per tailoring action
create table if not exists cv_versions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  cv_content text not null,
  pdf_url text,
  jd_snapshot text not null,
  jd_pdf_url text,
  ats_score integer not null default 0,
  keywords_matched text[] not null default '{}',
  version integer not null default 1,
  created_at timestamptz not null default now()
);

create index on cv_versions (job_id, version);

-- Supabase Storage bucket for PDFs
insert into storage.buckets (id, name, public)
values ('cv-pdfs', 'cv-pdfs', true)
on conflict do nothing;
