-- Enforce that child records belong to the same owner as their meeting.
-- RLS protects row visibility; these constraints protect relational integrity too.
alter table public.meetings
  add constraint meetings_id_owner_unique unique (id, owner_id);

alter table public.meeting_messages
  add constraint meeting_messages_owner_meeting_fk
  foreign key (meeting_id, owner_id)
  references public.meetings (id, owner_id)
  on delete cascade;

alter table public.decisions
  add constraint decisions_owner_meeting_fk
  foreign key (meeting_id, owner_id)
  references public.meetings (id, owner_id)
  on delete cascade;

-- Agent messages must refer to one of the fixed council members.
alter table public.meeting_messages
  add constraint meeting_messages_agent_slug_fk
  foreign key (agent_slug)
  references public.agents (slug)
  on delete set null;
