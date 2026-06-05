alter table projects
  add column if not exists assigned_to text,
  add column if not exists priority text,
  add column if not exists finance_status text,
  add column if not exists contracting_status text,
  add column if not exists product_status text,
  add column if not exists notes text;
