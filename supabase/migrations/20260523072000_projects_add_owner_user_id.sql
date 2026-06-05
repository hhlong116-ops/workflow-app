alter table projects
  add column if not exists user_id uuid;

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

do $$
begin
  if not exists (select 1 from projects where user_id is null) then
    alter table projects
      alter column user_id set not null;
  end if;
end $$;

notify pgrst, 'reload schema';
