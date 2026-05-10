create table if not exists public.projects (
  id text primary key,
  name text not null default 'Untitled carton',
  status text not null default 'draft',
  dimensions jsonb not null,
  faces jsonb not null default '{}'::jsonb,
  workspace jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists name text not null default 'Untitled carton',
  add column if not exists status text not null default 'draft',
  add column if not exists workspace jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.projects
  alter column status set default 'draft';

update public.projects
set status = 'draft'
where status is null or status not in ('draft', 'published');

alter table public.projects
  alter column status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_status_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_status_check
      check (status in ('draft', 'published'));
  end if;
end $$;

alter table public.projects enable row level security;

insert into storage.buckets (id, name, public)
values ('project-faces', 'project-faces', false)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
