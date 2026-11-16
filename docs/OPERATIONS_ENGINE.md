# Núcleo de Operações — visão de produto

O Núcleo de Operações amplia o Multi-Consciência 15 sem substituir sua identidade de conselho.

## Princípio

**O conselho decide; o Núcleo transforma decisões em trabalho verificável; a Presidência mantém o controle.**

## Ciclo de trabalho

1. **Mandato:** a Presidência define objetivo, contexto, limites e critérios de sucesso.
2. **Plano:** o Diretor-Geral propõe frentes, tarefas, responsáveis, dependências e revisores.
3. **Portão presidencial:** nada entra em execução antes da aprovação explícita do plano.
4. **Missões:** cada tarefa tem um único responsável, estado, prioridade, critério de aceite e histórico.
5. **Revisão cruzada:** o revisor aprova ou solicita alterações com justificativa. O autor recebe a tarefa de volta.
6. **Entrega:** o Diretor consolida entregáveis, bloqueios, divergências e evidências para a Presidência.
7. **Aprendizado:** lições aprovadas podem alimentar as memórias individuais e coletivas existentes.

## Identidade original

- **Diretor-Geral:** distribui trabalho e acompanha dependências; não aprova o próprio resultado final.
- **Especialistas:** executam missões dentro da própria especialidade.
- **Auditor:** verifica qualidade, rastreabilidade e critérios de aceite.
- **Mediador:** registra divergências e não força consenso.
- **Presidência:** aprova planos, mudanças de escopo e entregas críticas.

## Regras de segurança e custo

- Provedores pagos permanecem bloqueados por padrão.
- Nenhuma tarefa recebe acesso a segredos ou integrações automaticamente.
- Ações externas e mudanças destrutivas exigem aprovação explícita.
- Toda mudança de estado gera trilha de atividade.
- Dados continuam isolados por proprietário via Supabase RLS.
- Falhas de provedor pausam a tarefa e preservam o estado; não simulam conclusão.

## Modelo de dados inicial

- `initiatives`: mandatos e objetivos aprovados.
- `mission_tasks`: tarefas atribuídas, dependências, critérios e resultados.
- `mission_task_reviews`: decisões de revisão cruzada.
- `mission_activity`: trilha auditável de eventos.

## Entrega incremental

### Fundação
- Criar tabelas e políticas RLS.
- Corrigir o tipo de evento `participant_preferences`, já utilizado pelas telas de convocação.
- Preservar reuniões, mensagens, votos, memórias e histórico existentes.

### Próxima camada
- Criador de mandato e gerador de plano do Diretor.
- Aprovação presidencial do plano.
- Quadro de missões com filtros por estado e responsável.
- Execução de tarefa com snapshots e fallback de provedores.
- Revisão cruzada, reabertura e pacote de entrega.

### Depois
- Rotinas agendadas, limites de uso por agente, integrações com permissões granulares e avaliação de qualidade.
