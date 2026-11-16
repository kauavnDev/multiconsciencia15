-- Cover every foreign key introduced by the orchestration foundation.
create index agent_memories_agent_slug_idx on public.agent_memories(agent_slug);
create index agent_memories_source_meeting_owner_idx on public.agent_memories(source_meeting_id, owner_id);
create index meeting_events_actor_slug_idx on public.meeting_events(actor_slug);
create index meeting_events_meeting_owner_idx on public.meeting_events(meeting_id, owner_id);
create index meeting_rounds_meeting_owner_idx on public.meeting_rounds(meeting_id, owner_id);
create index meeting_votes_agent_slug_idx on public.meeting_votes(agent_slug);
create index meeting_votes_round_meeting_owner_idx on public.meeting_votes(meeting_round_id, meeting_id, owner_id);
