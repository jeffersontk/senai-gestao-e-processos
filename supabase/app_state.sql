create table if not exists public.app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

insert into public.app_state (id, data)
values ('gestao-horas', '{}'::jsonb)
on conflict (id) do nothing;
