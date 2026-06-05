create extension if not exists pgcrypto;

alter table projects
  add column if not exists user_id uuid,
  add column if not exists assigned_to text,
  add column if not exists priority text,
  add column if not exists finance_status text,
  add column if not exists contracting_status text,
  add column if not exists product_status text,
  add column if not exists notes text;

do $$
declare
  created_by_type text;
begin
  select udt_name
  into created_by_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'projects'
    and column_name = 'created_by';

  if created_by_type = 'uuid' then
    update projects
    set user_id = created_by
    where user_id is null
      and created_by is not null;
  elsif created_by_type is not null then
    update projects
    set user_id = created_by::uuid
    where user_id is null
      and created_by::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_user_id_fkey'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table projects
      add constraint projects_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-files',
  'project-files',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_bucket text not null default 'project-files',
  storage_path text not null unique,
  file_name text not null,
  file_type text not null,
  file_size bigint not null check (file_size > 0),
  created_at timestamptz not null default now()
);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.project_files to authenticated;

alter table public.project_files enable row level security;

drop policy if exists "Users can view their project files" on public.project_files;
create policy "Users can view their project files"
on public.project_files for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.projects
    where projects.id = project_files.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists "Users can attach files to their projects" on public.project_files;
create policy "Users can attach files to their projects"
on public.project_files for insert
to authenticated
with check (
  user_id = auth.uid()
  and storage_bucket = 'project-files'
  and exists (
    select 1
    from public.projects
    where projects.id = project_files.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete their project file records" on public.project_files;
create policy "Users can delete their project file records"
on public.project_files for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.projects
    where projects.id = project_files.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists "Users can upload files into their folder" on storage.objects;
create policy "Users can upload files into their folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'project-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can read files from their folder" on storage.objects;
create policy "Users can read files from their folder"
on storage.objects for select
to authenticated
using (
  bucket_id = 'project-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete files from their folder" on storage.objects;
create policy "Users can delete files from their folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'project-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

notify pgrst, 'reload schema';
