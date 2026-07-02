grant usage on schema public to anon, authenticated;
grant select on public.projects to anon;
grant select on public.project_files to anon;
grant select on public.project_file_notes to anon;
grant select on public.project_chat_messages to anon;
grant select on public.project_file_audit_events to anon;

drop policy if exists "Public demo can view projects" on public.projects;
create policy "Public demo can view projects"
on public.projects for select
to anon
using (true);

drop policy if exists "Public demo can view project files" on public.project_files;
create policy "Public demo can view project files"
on public.project_files for select
to anon
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_files.project_id
  )
);

drop policy if exists "Public demo can view project file notes" on public.project_file_notes;
create policy "Public demo can view project file notes"
on public.project_file_notes for select
to anon
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_file_notes.project_id
  )
);

drop policy if exists "Public demo can view project chat messages" on public.project_chat_messages;
create policy "Public demo can view project chat messages"
on public.project_chat_messages for select
to anon
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_chat_messages.project_id
  )
);

drop policy if exists "Public demo can view project file audit events" on public.project_file_audit_events;
create policy "Public demo can view project file audit events"
on public.project_file_audit_events for select
to anon
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_file_audit_events.project_id
  )
);

drop policy if exists "Public demo can read project storage objects" on storage.objects;
create policy "Public demo can read project storage objects"
on storage.objects for select
to anon
using (bucket_id = 'project-files');

notify pgrst, 'reload schema';
