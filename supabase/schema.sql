create table if not exists public.projects (
  id text primary key,
  name text not null default 'Untitled carton',
  dimensions jsonb not null,
  faces jsonb not null default '{}'::jsonb,
  workspace jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists name text not null default 'Untitled carton',
  add column if not exists workspace jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.projects enable row level security;

insert into storage.buckets (id, name, public)
values ('project-faces', 'project-faces', false)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
