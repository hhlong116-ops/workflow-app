alter table public.project_files
add column if not exists file_stage text not null default 'PCM'
check (file_stage in ('PCM', 'Costing', 'Final'));
