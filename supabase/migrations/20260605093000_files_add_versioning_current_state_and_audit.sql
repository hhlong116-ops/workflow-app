alter table public.project_files
  add column if not exists workflow_slot integer,
  add column if not exists version_number integer not null default 1,
  add column if not exists uploaded_by text,
  add column if not exists uploaded_at timestamptz not null default now(),
  add column if not exists is_current_version boolean not null default true,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by text;

with ordered_files as (
  select
    id,
    row_number() over (
      partition by project_id, file_stage
      order by created_at, id
    ) as inferred_slot
  from public.project_files
  where workflow_slot is null
)
update public.project_files
set
  workflow_slot = ordered_files.inferred_slot,
  uploaded_at = coalesce(public.project_files.created_at, now()),
  uploaded_by = coalesce(public.project_files.uploaded_by, public.project_files.user_id::text)
from ordered_files
where public.project_files.id = ordered_files.id;

alter table public.project_files
  alter column workflow_slot set not null;

create unique index if not exists project_files_one_current_version_per_cell
on public.project_files (project_id, workflow_slot, file_stage)
where is_current_version;

create table if not exists public.project_file_audit_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_file_id uuid references public.project_files(id) on delete set null,
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

grant select, insert on public.project_file_audit_events to authenticated;

alter table public.project_file_audit_events enable row level security;

drop policy if exists "Users can update their project file records" on public.project_files;
create policy "Users can update their project file records"
on public.project_files for update
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.projects
    where projects.id = project_files.project_id
      and projects.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.projects
    where projects.id = project_files.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists "Users can view project file audit events" on public.project_file_audit_events;
create policy "Users can view project file audit events"
on public.project_file_audit_events for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_file_audit_events.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists "Users can add project file audit events" on public.project_file_audit_events;
create policy "Users can add project file audit events"
on public.project_file_audit_events for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.projects
    where projects.id = project_file_audit_events.project_id
      and projects.user_id = auth.uid()
  )
);

notify pgrst, 'reload schema';
