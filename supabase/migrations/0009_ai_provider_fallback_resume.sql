-- Durable AI task checkpoints and provider health for resumable orchestration.
create table public.agent_task_runs (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null,
  owner_id uuid not null,
  agent_slug text not null references public.agents(slug),
  phase text not null default 'opening',
  round_number integer not null default 1 check (round_number > 0),
  status text not null default 'pending' check (status in ('pending','running','paused','completed','failed')),
  input_snapshot jsonb not null default '{}'::jsonb,
  output_text text not null default '',
  provider text,
  model text,
  attempt_log jsonb not null default '[]'::jsonb,
  last_error text not null default '',
  started_at timestamptz,
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (meeting_id, agent_slug, phase, round_number),
  foreign key (meeting_id, owner_id)
    references public.meetings(id, owner_id) on delete cascade
);

create table public.ai_provider_health (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  cooldown_until timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  average_latency_ms integer,
  updated_at timestamptz not null default now(),
  unique (owner_id, provider)
);

create index agent_task_runs_owner_status_idx
  on public.agent_task_runs(owner_id, status, updated_at desc);
create index ai_provider_health_owner_cooldown_idx
  on public.ai_provider_health(owner_id, cooldown_until);

alter table public.agent_task_runs enable row level security;
alter table public.ai_provider_health enable row level security;

create policy "Agent task runs belong to their owner" on public.agent_task_runs
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Provider health belongs to its owner" on public.ai_provider_health
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

revoke all on public.agent_task_runs, public.ai_provider_health from anon;
grant select, insert, update, delete on public.agent_task_runs, public.ai_provider_health to authenticated;
