-- Multi-Consciência 15: schema inicial com isolamento por proprietário.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Presidente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  agenda text not null default '',
  status text not null default 'draft' check (status in ('draft','scheduled','running','completed','cancelled')),
  round_count integer not null default 0 check (round_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  specialty text not null,
  system_prompt text not null,
  is_fixed boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.meeting_messages (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  agent_slug text,
  speaker_type text not null check (speaker_type in ('president','agent','system','moderator')),
  content text not null check (char_length(content) between 1 and 12000),
  round_number integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  result text not null default '',
  votes jsonb not null default '{}'::jsonb,
  president_decision text check (president_decision in ('approved','rejected') or president_decision is null),
  created_at timestamptz not null default now()
);

create index if not exists meetings_owner_created_idx on public.meetings(owner_id, created_at desc);
create index if not exists meeting_messages_meeting_created_idx on public.meeting_messages(meeting_id, created_at);
create index if not exists meeting_messages_owner_idx on public.meeting_messages(owner_id);
create index if not exists decisions_meeting_idx on public.decisions(meeting_id, created_at);

alter table public.profiles enable row level security;
alter table public.meetings enable row level security;
alter table public.agents enable row level security;
alter table public.meeting_messages enable row level security;
alter table public.decisions enable row level security;

create policy "Profiles are private to their owner" on public.profiles
 for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Meetings are private to their owner" on public.meetings
 for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy "Agents are readable by signed-in users" on public.agents
 for select to authenticated using (true);

create policy "Messages are private to their owner" on public.meeting_messages
 for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy "Decisions are private to their owner" on public.decisions
 for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', 'Presidente'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
 after insert on auth.users
 for each row execute procedure public.handle_new_user();

insert into public.agents (slug,name,specialty,system_prompt) values
('diretor-geral','Diretor-Geral','Coordenação','Organize a reunião, distribua turnos e garanta que posições divergentes sejam ouvidas. Nunca imponha consenso.'),
('estrategista','Estrategista','Estratégia','Analise consequências de longo prazo, dependências e posicionamento estratégico.'),
('planejador','Planejador','Execução','Transforme decisões em etapas práticas, responsáveis, prazos e critérios de sucesso.'),
('cientista','Cientista','Evidências','Questione afirmações, diferencie fatos de hipóteses e peça evidências verificáveis.'),
('engenheiro','Engenheiro','Tecnologia','Avalie arquitetura, viabilidade técnica, manutenção, segurança e implementação.'),
('analista-dados','Analista de Dados','Dados','Procure padrões, quantifique impactos e explicite limitações dos dados.'),
('visionario','Visionário','Inovação','Explore possibilidades não óbvias e cenários futuros sem ignorar restrições reais.'),
('designer-solucoes','Designer de Soluções','Produto','Avalie experiência do usuário, simplicidade, acessibilidade e coerência do produto.'),
('inventor','Inventor','Experimentação','Proponha abordagens originais e experimentos pequenos para testar hipóteses.'),
('advogado-diabo','Advogado do Diabo','Crítica','Construa o melhor argumento contra a proposta e procure pressupostos frágeis.'),
('economista','Economista','Finanças','Avalie custos, receitas, incentivos, retorno e custo de oportunidade.'),
('gestor-riscos','Gestor de Riscos','Riscos','Identifique ameaças, probabilidade, impacto e planos de contingência.'),
('especialista-mercado','Especialista de Mercado','Mercado','Analise clientes, concorrência, diferenciação e sinais de demanda.'),
('mediador','Mediador','Síntese','Resuma convergências e divergências sem apagar discordâncias.'),
('auditor','Auditor','Qualidade','Verifique contradições, lacunas, precisão e consistência das conclusões.')
on conflict (slug) do nothing;
