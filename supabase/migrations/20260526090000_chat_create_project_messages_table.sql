create table if not exists public.project_chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message_type text not null default 'message' check (message_type in ('message', 'file_upload')),
  body text not null check (length(trim(body)) > 0 and length(body) <= 2000),
  file_id uuid references public.project_files(id) on delete set null,
  file_name text,
  created_at timestamptz not null default now()
);

grant select, insert on public.project_chat_messages to authenticated;

alter table public.project_chat_messages enable row level security;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'project_chat_messages'
    ) then
    alter publication supabase_realtime add table public.project_chat_messages;
  end if;
end $$;

drop policy if exists "Users can view project chat messages" on public.project_chat_messages;
create policy "Users can view project chat messages"
on public.project_chat_messages for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_chat_messages.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists "Users can add project chat messages" on public.project_chat_messages;
create policy "Users can add project chat messages"
on public.project_chat_messages for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.projects
    where projects.id = project_chat_messages.project_id
      and projects.user_id = auth.uid()
  )
);

notify pgrst, 'reload schema';
