-- Explicit Data API grants; Row Level Security remains the source of row ownership.
-- All exposed public tables must keep RLS enabled and have owner-scoped policies.
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.meetings to authenticated;
grant select on public.agents to authenticated;
grant select, insert, update, delete on public.meeting_messages to authenticated;
grant select, insert, update, delete on public.decisions to authenticated;
