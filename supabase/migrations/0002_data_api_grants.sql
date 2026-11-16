-- Explicit Data API grants; RLS continues to enforce per-user ownership.
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.meetings to authenticated;
grant select on public.agents to authenticated;
grant select, insert, update, delete on public.meeting_messages to authenticated;
grant select, insert, update, delete on public.decisions to authenticated;

-- The profile trigger runs only through auth.users inserts. Keep it non-callable
-- from API roles; trigger execution remains managed by Postgres.
revoke all on function public.handle_new_user() from public, anon, authenticated;
