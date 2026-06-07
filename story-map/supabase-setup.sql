create table if not exists public.story_maps (
  share_id text primary key,
  title text,
  map_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.story_maps enable row level security;

drop policy if exists "public can read story maps" on public.story_maps;
create policy "public can read story maps"
on public.story_maps
for select
to anon
using (true);

drop policy if exists "public can insert story maps" on public.story_maps;
create policy "public can insert story maps"
on public.story_maps
for insert
to anon
with check (true);

drop policy if exists "public can update story maps" on public.story_maps;
create policy "public can update story maps"
on public.story_maps
for update
to anon
using (true)
with check (true);
