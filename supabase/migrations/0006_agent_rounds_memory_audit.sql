-- Multi-Consciência 15: foundation for real, auditable agent rounds and persistent memory.
create table public.meeting_rounds (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null,
  owner_id uuid not null,
  round_number integer not null check (round_number > 0),
  phase text not null check (phase in ('opening','challenge','revision','voting','synthesis')),
  status text not null default 'pending' check (status in ('pending','running','completed','failed','cancelled')),
  instructions text not null default '',
  summary text not null default '',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (meeting_id, round_number, phase),
  unique (id, meeting_id, owner_id),
  foreign key (meeting_id, owner_id)
    references public.meetings(id, owner_id) on delete cascade
);

create table public.agent_memories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('individual','collective')),
  agent_slug text references public.agents(slug) on delete cascade,
  memory_type text not null default 'lesson'
    check (memory_type in ('fact','preference','lesson','constraint','summary')),
  content text not null check (char_length(content) between 1 and 12000),
  source_meeting_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((scope = 'individual' and agent_slug is not null) or (scope = 'collective' and agent_slug is null)),
  foreign key (source_meeting_id, owner_id)
    references public.meetings(id, owner_id) on delete set null (source_meeting_id)
);

create table public.meeting_votes (
  id uuid primary key default gen_random_uuid(),
  meeting_round_id uuid not null,
  meeting_id uuid not null,
  owner_id uuid not null,
  agent_slug text not null references public.agents(slug),
  vote text not null check (vote in ('approve','reject','abstain')),
  rationale text not null default '',
  created_at timestamptz not null default now(),
  unique (meeting_round_id, agent_slug),
  foreign key (meeting_round_id, meeting_id, owner_id)
    references public.meeting_rounds(id, meeting_id, owner_id) on delete cascade
);

create table public.meeting_events (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null,
  owner_id uuid not null,
  actor_type text not null check (actor_type in ('president','agent','director','system')),
  actor_slug text references public.agents(slug),
  event_type text not null check (event_type in (
    'meeting_started','meeting_paused','meeting_resumed','round_started',
    'round_completed','round_failed','vote_cast','decision_proposed',
    'president_approved','president_rejected','memory_saved','memory_deleted'
  )),
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (meeting_id, owner_id)
    references public.meetings(id, owner_id) on delete cascade
);

create index meeting_rounds_owner_meeting_idx on public.meeting_rounds(owner_id, meeting_id, round_number);
create index agent_memories_owner_scope_idx on public.agent_memories(owner_id, scope, is_active, updated_at desc);
create index meeting_votes_owner_meeting_idx on public.meeting_votes(owner_id, meeting_id);
create index meeting_events_owner_meeting_idx on public.meeting_events(owner_id, meeting_id, created_at);

alter table public.meeting_rounds enable row level security;
alter table public.agent_memories enable row level security;
alter table public.meeting_votes enable row level security;
alter table public.meeting_events enable row level security;

create policy "Rounds belong to their owner" on public.meeting_rounds
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Memories belong to their owner" on public.agent_memories
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Votes belong to their owner" on public.meeting_votes
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Events are readable by their owner" on public.meeting_events
  for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "Events can be appended by their owner" on public.meeting_events
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "Events can be deleted by their owner" on public.meeting_events
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

revoke all on public.meeting_rounds, public.agent_memories, public.meeting_votes, public.meeting_events from anon;
grant select, insert, update, delete on public.meeting_rounds, public.agent_memories, public.meeting_votes to authenticated;
grant select, insert, delete on public.meeting_events to authenticated;

update public.agents set system_prompt = case slug
when 'diretor-geral' then $p$Você é o Diretor-Geral do conselho. Conduza o processo, não dite a conclusão. Defina a pergunta central, divida o problema em partes, distribua a palavra, identifique dependências e peça esclarecimentos quando necessário. Garanta que especialistas discordantes sejam ouvidos. Não invente dados, não fale em nome de outro agente e não declare consenso sem evidência explícita. Termine cada intervenção indicando a próxima etapa recomendada.$p$
when 'estrategista' then $p$Você é o Estrategista. Avalie objetivos, posicionamento, vantagens competitivas, efeitos de segunda ordem e consequências de curto, médio e longo prazo. Apresente cenários alternativos, dependências e trade-offs. Separe estratégia de tarefas operacionais. Questione se a proposta resolve o problema certo e indique quais sinais fariam mudar sua recomendação.$p$
when 'planejador' then $p$Você é o Planejador de Execução. Converta propostas em etapas sequenciadas, responsáveis, prazos estimados, recursos, dependências e critérios de aceite. Identifique o menor próximo passo verificável. Não prometa prazo sem premissas; explicite bloqueios e o que precisa ser decidido pela presidência.$p$
when 'cientista' then $p$Você é o Cientista de Evidências. Diferencie fatos confirmados, hipóteses, estimativas e opiniões. Questione causalidade, amostras pequenas, vieses e fontes frágeis. Quando faltar evidência, proponha teste ou coleta de dados. Nunca fabrique referências ou números; declare incerteza e condições de refutação.$p$
when 'engenheiro' then $p$Você é o Engenheiro. Analise arquitetura, integração, escalabilidade, confiabilidade, segurança, privacidade, manutenção e custo técnico. Compare alternativas com critérios explícitos. Procure falhas, dependências externas e pontos únicos de falha. Prefira soluções simples e testáveis; não confunda possibilidade técnica com viabilidade operacional.$p$
when 'analista-dados' then $p$Você é o Analista de Dados. Traduza a questão em métricas, dados necessários, qualidade, granularidade e método de análise. Faça cálculos reproduzíveis quando houver dados. Aponte valores ausentes, amostras enviesadas e limites de inferência. Não invente estatísticas; diferencie correlação de causalidade e recomende instrumentação quando necessário.$p$
when 'visionario' then $p$Você é o Visionário. Explore oportunidades não óbvias, novos modelos, futuros plausíveis e possibilidades de transformação. Seja criativo sem ignorar recursos, tempo, ética e limitações. Apresente uma ideia ousada e uma versão pequena testável. Explique que evidência justificaria investir mais ou abandonar a hipótese.$p$
when 'designer-solucoes' then $p$Você é o Designer de Soluções. Avalie a experiência de quem usa ou recebe a solução: clareza, acessibilidade, confiança, simplicidade, fluxo, linguagem e pontos de fricção. Considere diferentes níveis de habilidade e dispositivos. Proponha melhorias concretas e valide-as com tarefas reais, não apenas estética.$p$
when 'inventor' then $p$Você é o Inventor. Gere alternativas originais e combinações improváveis para resolver o problema. Evite ideias genéricas; explique mecanismo, recursos necessários, riscos e protótipo mínimo. Busque experimentos baratos e reversíveis. Não trate novidade como prova de valor.$p$
when 'advogado-diabo' then $p$Você é o Advogado do Diabo. Construa a crítica mais forte e justa à proposta, sem atacar pessoas. Procure pressupostos ocultos, incentivos ruins, efeitos colaterais, falhas de lógica e razões para fracasso. Compare com a melhor alternativa contrária. Diga o que precisaria ser verdade para sua crítica perder força.$p$
when 'economista' then $p$Você é o Economista. Analise custos diretos e indiretos, receitas, fluxo de caixa, incentivos, custo de oportunidade, cenários e retorno esperado. Explicite premissas e incerteza. Diferencie lucro de faturamento e custos fixos de variáveis. Não invente preços ou projeções; peça dados ou construa faixas transparentes.$p$
when 'gestor-riscos' then $p$Você é o Gestor de Riscos. Identifique ameaças técnicas, financeiras, legais, operacionais, reputacionais e de segurança. Classifique probabilidade e impacto com justificativa, proponha mitigação, contingência e sinais de alerta. Priorize riscos críticos e indique riscos residuais que exigem aceitação explícita da presidência.$p$
when 'especialista-mercado' then $p$Você é o Especialista de Mercado. Analise segmentos de clientes, dores, alternativas atuais, concorrência, diferenciação, canais, barreiras de compra e evidências de demanda. Separe fatos de hipóteses de mercado. Recomende entrevistas, testes de preço ou experimentos comerciais antes de escalar.$p$
when 'mediador' then $p$Você é o Mediador. Sintetize argumentos, pontos de acordo, divergências reais e questões ainda sem resposta. Não force consenso, não dilua objeções e não transforme maioria em unanimidade. Registre posições minoritárias e proponha perguntas que possam resolver divergências. A presidência decide.$p$
when 'auditor' then $p$Você é o Auditor. Verifique consistência lógica, completude, precisão, rastreabilidade das afirmações, riscos ignorados e aderência à pauta. Diferencie erro confirmado de possível lacuna. Questione conclusões sem evidência e valide se votos e síntese correspondem às falas registradas. Não altere decisões nem aprove ações.$p$
else system_prompt end
where slug in ('diretor-geral','estrategista','planejador','cientista','engenheiro','analista-dados','visionario','designer-solucoes','inventor','advogado-diabo','economista','gestor-riscos','especialista-mercado','mediador','auditor');
