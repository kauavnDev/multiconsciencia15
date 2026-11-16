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

A criação e o histórico de reuniões estão implementados. O banco comporta rodadas, votos, memórias e auditoria, e os 15 prompts foram especializados. A primeira rodada já possui endpoint server-side para chamar cada agente separadamente e salvar as respostas. As fases de contestação, revisão, votação, síntese e a experiência em tempo real ainda estão em desenvolvimento.

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
5. Em Supabase Auth > URL Configuration, configure a Site URL de produção e inclua os Redirect URLs usados pela aplicação:
   - `http://localhost:3000/auth/callback`
   - `https://SEU-DOMINIO/auth/callback`
6. Execute `npm install` e `npm run dev`.

## Variáveis de ambiente

No Vercel, configure as duas variáveis públicas do Supabase para Production, Preview e Development:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

A chave publishable é apropriada para uso no cliente porque as tabelas expostas são protegidas por RLS. **Nunca** coloque `service_role`, chaves secretas do Supabase ou `OPENAI_API_KEY` em variáveis com prefixo `NEXT_PUBLIC_`, nem em arquivos commitados.

Para habilitar a primeira rodada, configure `OPENAI_API_KEY` e `OPENAI_MODEL` somente como variáveis server-side da Vercel (sem prefixo `NEXT_PUBLIC_`). O botão da reunião chama cada agente em lotes de até três solicitações e salva as respostas individualmente. Sem essas variáveis, a aplicação informa que a API ainda não está configurada.

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

A base de autenticação e persistência está conectada ao projeto Supabase. As migrações 0001–0008 foram aplicadas e verificadas. As reuniões reais, o debate multiagente, as votações e o fluxo de aprovação do presidente dependem da próxima etapa de implementação do backend de orquestração.
