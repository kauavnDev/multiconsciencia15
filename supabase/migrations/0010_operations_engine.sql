-- Multi-Consciência 15: Núcleo de Operações (mandatos, missões e revisão).
-- This extends the existing council; it does not replace meetings, agents or memories.

-- Existing application flows already write this event type. Earlier migrations
-- omitted it from the check constraint, which made roster preferences fail.
alter table public.meeting_events
  drop constraint if exists meeting_events_event_type_check;
alter table public.meeting_events
  add constraint meeting_events_event_type_check check (event_type in (
    'meeting_started','meeting_paused','meeting_resumed','round_started',
    'round_completed','round_failed','vote_cast','decision_proposed',
    'president_approved','president_rejected','memory_saved','memory_deleted',
    'participant_preferences','mandate_created','plan_proposed','plan_approved',
    'plan_revised','mission_created','mission_assigned','mission_started',
    'mission_blocked','mission_submitted','mission_reviewed','mission_completed',
    'mission_reopened','initiative_paused','initiative_resumed','initiative_completed'
  ));

create table if not exists public.initiatives (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_meeting_id uuid,
  title text not null check (char_length(title) between 1 and 160),
  goal text not null check (char_length(goal) between 1 and 12000),
  success_criteria text not null default '',
  strategic_plan jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft','planning','awaiting_approval','active','paused','completed','cancelled')),
  priority text not null default 'normal'
    check (priority in ('low','normal','high','critical')),
  approved_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  foreign key (source_meeting_id, owner_id)
    references public.meetings(id, owner_id) on delete set null (source_meeting_id)
);

create table if not exists public.mission_tasks (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null,
  owner_id uuid not null,
  parent_task_id uuid,
  title text not null check (char_length(title) between 1 and 180),
  description text not null default '',
  assigned_agent_slug text references public.agents(slug),
  reviewer_agent_slug text references public.agents(slug),
  status text not null default 'backlog'
    check (status in ('backlog','ready','in_progress','blocked','in_review','changes_requested','done','cancelled')),
  priority text not null default 'normal'
    check (priority in ('low','normal','high','critical')),
  acceptance_criteria text not null default '',
  result_summary text not null default '',
  result_content text not null default '',
  blocker_reason text not null default '',
  position integer not null default 0,
  due_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, initiative_id, owner_id),
  foreign key (initiative_id, owner_id)
    references public.initiatives(id, owner_id) on delete cascade,
  foreign key (parent_task_id, initiative_id, owner_id)
    references public.mission_tasks(id, initiative_id, owner_id) on delete set null (parent_task_id)
);

create table if not exists public.mission_task_reviews (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null,
  owner_id uuid not null,
  reviewer_agent_slug text not null references public.agents(slug),
  status text not null default 'pending'
    check (status in ('pending','approved','changes_requested')),
  review_notes text not null default '',
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  foreign key (task_id, owner_id)
    references public.mission_tasks(id, owner_id) on delete cascade
);

create table if not exists public.mission_activity (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null,
  task_id uuid,
  owner_id uuid not null,
  actor_type text not null check (actor_type in ('president','agent','system')),
  actor_slug text references public.agents(slug),
  event_type text not null,
  summary text not null default '',
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (initiative_id, owner_id)
    references public.initiatives(id, owner_id) on delete cascade,
  foreign key (task_id, initiative_id, owner_id)
    references public.mission_tasks(id, initiative_id, owner_id) on delete cascade
);

create index if not exists initiatives_owner_status_idx
  on public.initiatives(owner_id, status, updated_at desc);
create index if not exists mission_tasks_owner_status_idx
  on public.mission_tasks(owner_id, status, priority, position);
create index if not exists mission_tasks_initiative_idx
  on public.mission_tasks(initiative_id, owner_id, position);
create index if not exists mission_tasks_assignee_idx
  on public.mission_tasks(owner_id, assigned_agent_slug, status);
create index if not exists mission_task_reviews_task_idx
  on public.mission_task_reviews(task_id, owner_id, created_at desc);
create index if not exists mission_activity_initiative_idx
  on public.mission_activity(initiative_id, owner_id, created_at desc);

alter table public.initiatives enable row level security;
alter table public.mission_tasks enable row level security;
alter table public.mission_task_reviews enable row level security;
alter table public.mission_activity enable row level security;

create policy "Initiatives belong to their owner" on public.initiatives
  for all to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "Mission tasks belong to their owner" on public.mission_tasks
  for all to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "Mission reviews belong to their owner" on public.mission_task_reviews
  for all to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "Mission activity belongs to its owner" on public.mission_activity
  for all to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

revoke all on public.initiatives, public.mission_tasks, public.mission_task_reviews, public.mission_activity from anon;
grant select, insert, update, delete on public.initiatives, public.mission_tasks, public.mission_task_reviews, public.mission_activity to authenticated;
