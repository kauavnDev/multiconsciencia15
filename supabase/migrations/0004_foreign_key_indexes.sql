-- Cover foreign keys to keep cascades and ownership joins efficient.
create index if not exists meeting_messages_meeting_owner_idx
  on public.meeting_messages (meeting_id, owner_id);
create index if not exists meeting_messages_agent_slug_idx
  on public.meeting_messages (agent_slug);
create index if not exists decisions_owner_idx
  on public.decisions (owner_id);
create index if not exists decisions_meeting_owner_idx
  on public.decisions (meeting_id, owner_id);
