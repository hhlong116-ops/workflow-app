-- Supabase SQL schema for the workflow projects table

create extension if not exists pgcrypto;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  project_name text not null,
  agent text not null,
  channel text not null default 'General',
  deadline date not null,
  status text not null check (status in ('Product', 'Finance', 'Contracting', 'Completed')),
  description text,
  progress text not null default '0%',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_set_updated_at
before update on projects
for each row execute function set_updated_at();
