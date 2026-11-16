import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, BrainCircuit, CalendarDays, CircleDot, Clock3, MessageSquareText, Plus, Sparkles, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import WorkspaceShell from "@/components/workspace-shell";
import AiProviderStatus from "@/components/ai-provider-status";
import AgentRobot from "@/components/agent-robot";
import { agentIdentities, getAgentIdentity } from "@/lib/agents/identity";

export default async function DashboardPage(){
  const supabase=await createClient();
  const {data,error}=await supabase.auth.getUser();
  if(error||!data.user)redirect("/login");
  const name=(data.user.user_metadata?.display_name as string|undefined)||data.user.email?.split("@")[0]||"Presidente";
  const [{data:meetings},{data:councilAgents}]=await Promise.all([
    supabase.from("meetings").select("id,title,status,created_at").order("created_at",{ascending:false}).limit(5),
    supabase.from("agents").select("slug,name,specialty").eq("is_fixed",true)
  ]);
  const orderedAgents=(councilAgents??[]).slice().sort((a,b)=>agentIdentities.findIndex(x=>x.slug===a.slug)-agentIdentities.findIndex(x=>x.slug===b.slug));
  return <WorkspaceShell active="dashboard" name={name}>
    <header className="dash-top"><div><span className="eyebrow">SEU CONSELHO / VISÃO GERAL</span><h1>Bom dia, {name} <span className="wave">✳</span></h1><p>O que vamos colocar à prova hoje?</p></div><div className="top-status"><span className="live-dot"/> BASE CONECTADA</div></header>
    <AiProviderStatus/>
    <div className="dash-hero"><div className="dash-hero-copy"><span className="eyebrow">SALA DE CONSELHO</span><h2>Uma nova ideia<br/>merece <span className="gradient-text">15 olhares.</span></h2><p>Apresente um desafio. Os 15 especialistas analisam, contestam, revisam e votam. O Mediador registra acordos e divergências; você mantém a decisão final.</p><Link href="/meetings/new" className="button button-primary">Criar reunião <Plus size={17}/></Link></div><div className="dash-hero-art"><div className="dash-core"><BrainCircuit size={38}/></div><div className="dash-ring ring-a"/><div className="dash-ring ring-b"/><span className="art-tag">15 AGENTES FIXOS</span></div></div>
    <div className="stat-row"><div className="stat-box"><span><Users size={16}/> CONSELHEIROS</span><strong>{councilAgents?.length??15}</strong><small>Especialistas independentes</small></div><div className="stat-box"><span><CalendarDays size={16}/> REUNIÕES</span><strong>{meetings?.length??0}</strong><small>Histórico recente</small></div><div className="stat-box"><span><CircleDot size={16}/> STATUS</span><strong className="status-word">Conectada</strong><small>Fluxo multiagente habilitado</small></div></div>
    <section className="dash-section"><div className="section-title"><div><span className="eyebrow">QUEM ESTÁ À MESA</span><h2>Seu conselho</h2></div><Link className="section-count" href="/council">VER OS 15 <ArrowUpRight size={13}/></Link></div><div className="agent-grid">{orderedAgents.map((agent)=>{const identity=getAgentIdentity(agent.slug);return <Link className="agent-card dashboard-agent-card" href={`/council/${agent.slug}`} key={agent.slug}><span className="dashboard-robot-thumb"><AgentRobot slug={agent.slug} size="small"/></span><span className="agent-info"><b>{identity?.codename??agent.name}</b><small>{agent.name}</small></span><span className="agent-state" title="Perfil cadastrado"/></Link>;})}</div></section>
    <section className="dash-section"><div className="section-title"><div><span className="eyebrow">MEMÓRIA DO CONSELHO</span><h2>Reuniões recentes</h2></div><Link className="section-count" href="/meetings"><Clock3 size={13}/> HISTÓRICO</Link></div>{meetings&&meetings.length>0?<div className="meeting-list">{meetings.map(m=><Link href={`/meetings/${m.id}`} className="meeting-row" key={m.id}><span className="meeting-icon"><MessageSquareText size={17}/></span><div><b>{m.title}</b><small>{new Date(m.created_at).toLocaleDateString("pt-BR")}</small></div><span className="meeting-status">{m.status}</span><ArrowUpRight size={16}/></Link>)}</div>:<div className="empty-state"><Sparkles size={22}/><b>Nenhuma reunião registrada ainda.</b><p>Crie sua primeira reunião para convocar os especialistas, acompanhar o debate e registrar sua decisão.</p></div>}</section>
    <footer className="dash-footer"><span>Multi-Consciência 15 · Sala privada</span><span>Você tem a palavra final.</span></footer>
  </WorkspaceShell>;
}