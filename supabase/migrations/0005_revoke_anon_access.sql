-- Anonymous clients must not reach private council tables through the Data API.
-- Authenticated access remains protected by owner-scoped RLS policies.
revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;
