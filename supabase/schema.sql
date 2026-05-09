create table if not exists public.projects (
  id text primary key,
  dimensions jsonb not null,
  faces jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

insert into storage.buckets (id, name, public)
values ('project-faces', 'project-faces', false)
on conflict (id) do nothing;
