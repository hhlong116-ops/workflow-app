create table if not exists public.project_file_notes (
  id uuid primary key default gen_random_uuid(),
  project_file_id uuid not null references public.project_files(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  note text not null check (length(trim(note)) > 0 and length(note) <= 2000),
  created_at timestamptz not null default now()
);

grant select, insert on public.project_file_notes to authenticated;

alter table public.project_file_notes enable row level security;

drop policy if exists "Users can view notes for their project files" on public.project_file_notes;
create policy "Users can view notes for their project files"
on public.project_file_notes for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_file_notes.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists "Users can add notes to their project files" on public.project_file_notes;
create policy "Users can add notes to their project files"
on public.project_file_notes for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.projects
    where projects.id = project_file_notes.project_id
      and projects.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.project_files
    where project_files.id = project_file_notes.project_file_id
      and project_files.project_id = project_file_notes.project_id
      and project_files.user_id = auth.uid()
  )
);

notify pgrst, 'reload schema';
