alter table public.project_chat_messages
  add column if not exists author_label text;

notify pgrst, 'reload schema';
