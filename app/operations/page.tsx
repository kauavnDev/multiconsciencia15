import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, ArrowUpRight, BriefcaseBusiness, Flag, Plus, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import WorkspaceShell from "@/components/workspace-shell";
import { createInitiative } from "./actions";

type Props = { searchParams: Promise<{ created?: string; error?: string }> };

const statusLabels: Record<string,string> = {
  draft: "Rascunho", planning: "Planejamento", awaiting_approval: "Aguardando aprovação",
  active: "Em execução", paused: "Pausado", completed: "Concluído", cancelled: "Cancelado",
};

export default async function OperationsPage({ searchParams }: Props) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: auth, error } = await supabase.auth.getUser();
  if (error || !auth.user) redirect("/login");
  const name = (auth.user.user_metadata?.display_name as string | undefined) || auth.user.email?.split("@")[0] || "Presidente";
  const { data: initiatives } = await supabase.from("initiatives")
    .select("id,title,goal,status,priority,created_at")
    .order("created_at", { ascending: false }).limit(30);

  return <WorkspaceShell active="operations" name={name}>
    <header className="dash-top">
      <div><span className="eyebrow">MULTI-CONSCIÊNCIA / EXECUÇÃO</span><h1>Núcleo de Operações</h1><p>Transforme decisões em missões com responsáveis, revisão e entregas verificáveis.</p></div>
      <div className="top-status"><span className="live-dot"/> PRESIDÊNCIA NO CONTROLE</div>
    </header>

    {query.created === "1" && <p className="form-success" role="status">Mandato registrado. Ele está em rascunho e ainda não iniciou nenhuma execução.</p>}
    {query.error && <p className="form-error" role="alert">{query.error === "invalid" ? "Confira o título, objetivo e prioridade." : "Não foi possível salvar o mandato."}</p>}

    <section className="dash-hero">
      <div className="dash-hero-copy">
        <span className="eyebrow">01 / NOVO MANDATO</span>
        <h2>Qual resultado<br/>vamos <span className="gradient-text">construir?</span></h2>
        <p>Descreva o destino. O próximo passo será o Diretor-Geral propor um plano para sua aprovação. Nada será executado sem sua autorização.</p>
      </div>
      <div className="dash-hero-art"><div className="dash-core"><Target size={38}/></div><div className="dash-ring ring-a"/><div className="dash-ring ring-b"/><span className="art-tag">PLANEJAR → EXECUTAR</span></div>
    </section>

    <section className="dash-section">
      <div className="section-title"><div><span className="eyebrow">ABRIR UM MANDATO</span><h2>Defina o objetivo</h2></div><span className="section-count">VOCÊ AUTORIZA O INÍCIO</span></div>
      <form action={createInitiative} className="auth-form">
        <label htmlFor="mandate-title">Nome do projeto ou missão</label>
        <input id="mandate-title" name="title" maxLength={160} required placeholder="Ex.: Lançar a primeira versão do produto"/>
        <label htmlFor="mandate-goal">Objetivo e contexto</label>
        <textarea id="mandate-goal" name="goal" required maxLength={12000} rows={5} placeholder="O que precisa ser alcançado? Para quem? Quais são as limitações?"/>
        <label htmlFor="mandate-success">Como saberemos que deu certo?</label>
        <textarea id="mandate-success" name="success_criteria" maxLength={4000} rows={2} placeholder="Critérios de sucesso, entregáveis ou indicadores (opcional)."/>
        <label htmlFor="mandate-priority">Prioridade</label>
        <select id="mandate-priority" name="priority" defaultValue="normal">
          <option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="critical">Crítica</option>
        </select>
        <button className="button button-primary" type="submit"><Plus size={16}/> Registrar mandato</button>
      </form>
    </section>

    <section className="dash-section">
      <div className="section-title"><div><span className="eyebrow">PORTFÓLIO DA PRESIDÊNCIA</span><h2>Mandatos registrados</h2></div><span className="section-count">{initiatives?.length ?? 0} PROJETOS</span></div>
      {initiatives?.length ? <div className="meeting-list">{initiatives.map(item => <article className="meeting-row" key={item.id}>
        <span className="meeting-icon"><BriefcaseBusiness size={17}/></span>
        <div><b>{item.title}</b><small>{item.goal}</small></div>
        <span className="meeting-status">{statusLabels[item.status] ?? item.status}</span>
        <span className="section-count">{item.priority.toUpperCase()}</span>
      </article>)}</div> : <div className="empty-state"><Flag size={22}/><b>Nenhum mandato por enquanto.</b><p>Registre o primeiro objetivo para começar a transformar o conselho em uma equipe de execução.</p></div>}
    </section>
    <footer className="dash-footer"><span>Multi-Consciência 15 · Núcleo de Operações</span><span>Planejar primeiro. Executar com autorização.</span></footer>
  </WorkspaceShell>;
}
