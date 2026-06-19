alter table public.projects enable row level security;

drop policy if exists "Users can view their projects" on public.projects;
create policy "Users can view their projects"
on public.projects for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can create their projects" on public.projects;
create policy "Users can create their projects"
on public.projects for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their projects" on public.projects;
create policy "Users can update their projects"
on public.projects for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete their projects" on public.projects;
create policy "Users can delete their projects"
on public.projects for delete
to authenticated
using (user_id = auth.uid());

notify pgrst, 'reload schema';
