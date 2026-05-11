-- Migration inicial
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  created_at timestamptz default now()
);

alter table public.posts enable row level security;

create policy "Posts são públicos" on public.posts
  for select using (true);
