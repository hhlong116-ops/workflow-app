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
  progress integer not null default 0 check (progress between 0 and 100),
  assigned_to text,
  priority text,
  finance_status text,
  contracting_status text,
  product_status text,
  notes text,
  user_id uuid not null references auth.users(id) on delete cascade,
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

create table if not exists project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_bucket text not null default 'project-files',
  storage_path text not null unique,
  file_name text not null,
  file_stage text not null default 'PCM' check (file_stage in ('PCM', 'Costing', 'Final')),
  workflow_slot integer not null default 1,
  version_number integer not null default 1,
  uploaded_by text,
  uploaded_at timestamptz not null default now(),
  is_current_version boolean not null default true,
  deleted_at timestamptz,
  deleted_by text,
  file_type text not null,
  file_size bigint not null check (file_size > 0),
  created_at timestamptz not null default now()
);

create unique index if not exists project_files_one_current_version_per_cell
on project_files (project_id, workflow_slot, file_stage)
where is_current_version;

create table if not exists project_chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message_type text not null default 'message' check (message_type in ('message', 'file_upload')),
  body text not null check (length(trim(body)) > 0 and length(body) <= 2000),
  file_id uuid references project_files(id) on delete set null,
  file_name text,
  author_label text,
  created_at timestamptz not null default now()
);

create table if not exists project_file_audit_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  project_file_id uuid references project_files(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_label text,
  action text not null check (
    action in (
      'PCM uploaded',
      'PCM replaced',
      'PCM deleted',
      'Costing uploaded',
      'Costing replaced',
      'Costing deleted',
      'Final uploaded',
      'Final replaced',
      'Final deleted'
    )
  ),
  file_stage text not null check (file_stage in ('PCM', 'Costing', 'Final')),
  workflow_slot integer not null,
  version_number integer,
  file_name text,
  created_at timestamptz not null default now()
);

create table if not exists project_file_notes (
  id uuid primary key default gen_random_uuid(),
  project_file_id uuid not null references project_files(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  note text not null check (length(trim(note)) > 0 and length(note) <= 2000),
  created_at timestamptz not null default now()
);

alter table projects enable row level security;
alter table project_files enable row level security;
alter table project_chat_messages enable row level security;
alter table project_file_audit_events enable row level security;
alter table project_file_notes enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.projects to anon;
grant select on public.project_files to anon;
grant select on public.project_file_notes to anon;
grant select on public.project_chat_messages to anon;
grant select on public.project_file_audit_events to anon;

drop policy if exists "Users can view their projects" on projects;
create policy "Users can view their projects"
on projects for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Public demo can view projects" on projects;
create policy "Public demo can view projects"
on projects for select
to anon
using (true);

drop policy if exists "Users can create their projects" on projects;
create policy "Users can create their projects"
on projects for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their projects" on projects;
create policy "Users can update their projects"
on projects for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete their projects" on projects;
create policy "Users can delete their projects"
on projects for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can view their project files" on project_files;
create policy "Users can view their project files"
on project_files for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from projects
    where projects.id = project_files.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists "Public demo can view project files" on project_files;
create policy "Public demo can view project files"
on project_files for select
to anon
using (
  exists (
    select 1
    from projects
    where projects.id = project_files.project_id
  )
);

drop policy if exists "Users can attach files to their projects" on project_files;
create policy "Users can attach files to their projects"
on project_files for insert
to authenticated
with check (
  user_id = auth.uid()
  and storage_bucket = 'project-files'
  and exists (
    select 1
    from projects
    where projects.id = project_files.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete their project file records" on project_files;
create policy "Users can delete their project file records"
on project_files for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from projects
    where projects.id = project_files.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists "Users can update their project file records" on project_files;
create policy "Users can update their project file records"
on project_files for update
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from projects
    where projects.id = project_files.project_id
      and projects.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from projects
    where projects.id = project_files.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists "Users can view project chat messages" on project_chat_messages;
create policy "Users can view project chat messages"
on project_chat_messages for select
to authenticated
using (
  exists (
    select 1
    from projects
    where projects.id = project_chat_messages.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists "Public demo can view project chat messages" on project_chat_messages;
create policy "Public demo can view project chat messages"
on project_chat_messages for select
to anon
using (
  exists (
    select 1
    from projects
    where projects.id = project_chat_messages.project_id
  )
);

drop policy if exists "Users can add project chat messages" on project_chat_messages;
create policy "Users can add project chat messages"
on project_chat_messages for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from projects
    where projects.id = project_chat_messages.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists "Users can view project file audit events" on project_file_audit_events;
create policy "Users can view project file audit events"
on project_file_audit_events for select
to authenticated
using (
  exists (
    select 1
    from projects
    where projects.id = project_file_audit_events.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists "Public demo can view project file audit events" on project_file_audit_events;
create policy "Public demo can view project file audit events"
on project_file_audit_events for select
to anon
using (
  exists (
    select 1
    from projects
    where projects.id = project_file_audit_events.project_id
  )
);

drop policy if exists "Users can add project file audit events" on project_file_audit_events;
create policy "Users can add project file audit events"
on project_file_audit_events for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from projects
    where projects.id = project_file_audit_events.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists "Users can view notes for their project files" on project_file_notes;
create policy "Users can view notes for their project files"
on project_file_notes for select
to authenticated
using (
  exists (
    select 1
    from projects
    where projects.id = project_file_notes.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists "Public demo can view project file notes" on project_file_notes;
create policy "Public demo can view project file notes"
on project_file_notes for select
to anon
using (
  exists (
    select 1
    from projects
    where projects.id = project_file_notes.project_id
  )
);

drop policy if exists "Users can add notes to their project files" on project_file_notes;
create policy "Users can add notes to their project files"
on project_file_notes for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from projects
    where projects.id = project_file_notes.project_id
      and projects.user_id = auth.uid()
  )
  and exists (
    select 1
    from project_files
    where project_files.id = project_file_notes.project_file_id
      and project_files.project_id = project_file_notes.project_id
      and project_files.user_id = auth.uid()
  )
);

drop policy if exists "Users can update their project file notes" on project_file_notes;
create policy "Users can update their project file notes"
on project_file_notes for update
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from projects
    where projects.id = project_file_notes.project_id
      and projects.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from projects
    where projects.id = project_file_notes.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete their project file notes" on project_file_notes;
create policy "Users can delete their project file notes"
on project_file_notes for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from projects
    where projects.id = project_file_notes.project_id
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

drop policy if exists "Public demo can read project storage objects" on storage.objects;
create policy "Public demo can read project storage objects"
on storage.objects for select
to anon
using (bucket_id = 'project-files');

drop policy if exists "Users can delete files from their folder" on storage.objects;
create policy "Users can delete files from their folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'project-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

notify pgrst, 'reload schema';
