grant update, delete on public.project_file_notes to authenticated;

drop policy if exists "Users can update their project file notes" on public.project_file_notes;
create policy "Users can update their project file notes"
on public.project_file_notes for update
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.projects
    where projects.id = project_file_notes.project_id
      and projects.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.projects
    where projects.id = project_file_notes.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete their project file notes" on public.project_file_notes;
create policy "Users can delete their project file notes"
on public.project_file_notes for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.projects
    where projects.id = project_file_notes.project_id
      and projects.user_id = auth.uid()
  )
);

notify pgrst, 'reload schema';
