# Multi-Consciência 15

Conselho de inteligências artificiais independentes. Next.js 16 + Supabase Auth/Postgres.

## Desenvolvimento
1. Instale Node.js 22 ou superior.
2. Copie `.env.example` para `.env.local`.
3. Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Execute a migration `supabase/migrations/0001_initial.sql` no SQL Editor do projeto Supabase.
5. Configure no Supabase Auth a URL local `http://localhost:3000` e a URL de produção.
6. Execute `npm install` e `npm run dev`.

## Segurança
- Sessões Supabase via cookies SSR (PKCE).
- Rotas privadas protegidas no proxy e validadas no servidor.
- Row Level Security em todas as tabelas do schema público.
- Nenhuma chave secreta deve ser publicada no frontend.
- O banco isola reuniões, mensagens e decisões por `auth.uid()`.

## Estado
A interface inicial e os fluxos de cadastro/login já estão preparados. O banco e as variáveis de ambiente precisam ser conectados antes de autenticação real e persistência funcionarem. A orquestração de IA será ativada numa etapa separada, após configurar a chave de API no ambiente server-side.
