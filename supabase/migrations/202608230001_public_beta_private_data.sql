-- Omni IELTS public-beta private storage. Every row is owned by auth.uid().
create table if not exists public.user_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.private_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artifact_type text not null check (artifact_type in ('source', 'transcript', 'generated_audio', 'mock_package', 'mock_attempt')),
  provenance jsonb not null default '{}'::jsonb,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists private_artifacts_user_type_idx on public.private_artifacts (user_id, artifact_type, updated_at desc);

alter table public.user_snapshots enable row level security;
alter table public.private_artifacts enable row level security;

create policy "snapshot owner select" on public.user_snapshots for select using (auth.uid() = user_id);
create policy "snapshot owner insert" on public.user_snapshots for insert with check (auth.uid() = user_id);
create policy "snapshot owner update" on public.user_snapshots for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "snapshot owner delete" on public.user_snapshots for delete using (auth.uid() = user_id);

create policy "artifact owner select" on public.private_artifacts for select using (auth.uid() = user_id);
create policy "artifact owner insert" on public.private_artifacts for insert with check (auth.uid() = user_id);
create policy "artifact owner update" on public.private_artifacts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "artifact owner delete" on public.private_artifacts for delete using (auth.uid() = user_id);

revoke all on public.user_snapshots from anon;
revoke all on public.private_artifacts from anon;
grant select, insert, update, delete on public.user_snapshots to authenticated;
grant select, insert, update, delete on public.private_artifacts to authenticated;
