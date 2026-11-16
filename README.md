# Multi-Consciência 15

Conselho de inteligências artificiais independentes. Aplicação web em Next.js 16 com Supabase Auth e PostgreSQL.

## Recursos da base atual

- Cadastro, login, logout e recuperação de senha por e-mail.
- Sessão SSR com cookies e validação de identidade no servidor.
- Painel privado com os 15 conselheiros fixos.
- Criação de reuniões com pauta, histórico persistente e acesso privado.
- Estrutura de banco para perfis, reuniões, mensagens, decisões, rodadas, votos, memórias individuais/coletivas e trilha de auditoria.
- Perfis de instrução especializados para os 15 agentes fixos.
- RLS (Row Level Security) e vínculos que impedem misturar dados de usuários diferentes.
- Layout responsivo para celular e desktop.

A criação e o histórico de reuniões estão implementados. O fluxo multiagente executa análise independente, contestação, revisão individual de posições, votação independente e síntese do Mediador. As respostas, tentativas, provedor/modelo, votos, eventos e checkpoints são persistidos. A presidência registra a decisão final (aprovar/rejeitar), que encerra a reunião. As chamadas são limitadas a três agentes simultâneos e tarefas incompletas podem ser retomadas. A experiência em tempo real e memórias individuais automáticas continuam como melhorias futuras.

## Configuração local

1. Use Node.js 22 ou superior.
2. Copie `.env.example` para `.env.local`.
3. Defina `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` com os valores do projeto Supabase exclusivo desta aplicação.
4. Aplique as migrations SQL em ordem:
   - `supabase/migrations/0001_initial.sql`
   - `supabase/migrations/0002_data_api_grants.sql`
   - `supabase/migrations/0003_data_integrity.sql`
   - `supabase/migrations/0004_foreign_key_indexes.sql`
   - `supabase/migrations/0005_revoke_anon_access.sql`
   - `supabase/migrations/0006_agent_rounds_memory_audit.sql`
   - `supabase/migrations/0007_orchestration_fk_indexes.sql`
   - `supabase/migrations/0008_unique_agent_round_replies.sql`
   - `supabase/migrations/0009_ai_provider_fallback_resume.sql`
5. Em Supabase Auth > URL Configuration, configure a Site URL de produção e inclua os Redirect URLs usados pela aplicação:
   - `http://localhost:3000/auth/callback`
   - `https://SEU-DOMINIO/auth/callback`
6. Execute `npm install` e `npm run dev`.

## Variáveis de ambiente

No Render (ou Vercel), configure as duas variáveis públicas do Supabase no ambiente de execução:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

A chave publishable é apropriada para uso no cliente porque as tabelas expostas são protegidas por RLS. **Nunca** coloque `service_role`, chaves secretas do Supabase ou `OPENAI_API_KEY` em variáveis com prefixo `NEXT_PUBLIC_`, nem em arquivos commitados.

Para habilitar a primeira rodada, configure uma ou mais chaves server-side: `GEMINI_API_KEY`, `GROQ_API_KEY` e `OPENROUTER_API_KEY`. Os modelos padrão são Gemini 3.8 Flash, GPT-OSS 120B via Groq e `openrouter/free`. O roteador classifica os provedores por qualidade estimada, velocidade e saúde recente, tenta automaticamente o próximo quando encontra limite/indisponibilidade e aplica cooldown aos provedores que falham. OpenRouter fica restrito a modelos gratuitos (`:free` ou `openrouter/free`) por padrão.\n\nAs tarefas são registradas em `agent_task_runs` antes da chamada externa, com snapshot do prompt/contexto, tentativas, provedor/modelo usados e estado. Se todas as APIs falharem, a tarefa fica pausada e pode ser retomada com o mesmo snapshot ao repetir a rodada. A saúde dos provedores é persistida por usuário em `ai_provider_health`.\n\nProvedores pagos ficam bloqueados por padrão. Só habilite `AI_ALLOW_PAID=true` se decidir permitir cobrança; nesse caso, `OPENAI_API_KEY` e `OPENAI_MODEL` também podem ser usados. Nunca envie chaves para o navegador ou para o Git. O botão da reunião chama agentes em lotes de até três solicitações e permite repetir uma rodada incompleta sem duplicar respostas.

## Segurança

- Sessões Supabase via cookies SSR (PKCE).
- Rotas privadas verificadas no proxy e novamente no servidor.
- Redirecionamentos de autenticação limitados à mesma origem.
- Respostas que atualizam cookies de autenticação marcadas como privadas e não cacheáveis.
- RLS habilitada em todas as tabelas do schema público.
- Acesso `anon` revogado nas tabelas privadas e de agentes; somente usuários autenticados recebem os privilégios necessários.
- Políticas de propriedade baseadas em `auth.uid()`.
- Chaves secretas nunca devem ser publicadas no frontend ou no Git.

## Estado do produto

A base de autenticação e persistência está conectada ao projeto Supabase. As migrações 0001–0009 foram aplicadas e verificadas no projeto principal. O debate multiagente, os votos, a síntese, a memória coletiva de reuniões e a decisão final da presidência estão implementados no backend. A integração deve ser validada no ambiente Render com as chaves dos provedores configuradas; o painel mostra quais chaves estão presentes e oferece um teste real de conectividade usando somente provedores gratuitos.
