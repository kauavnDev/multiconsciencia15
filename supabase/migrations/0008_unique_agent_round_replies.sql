-- Prevent duplicate agent replies for the same meeting round.
create unique index meeting_messages_one_agent_reply_per_round_idx
  on public.meeting_messages(meeting_id, round_number, agent_slug)
  where speaker_type = 'agent' and agent_slug is not null;
