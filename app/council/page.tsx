import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import WorkspaceShell from "@/components/workspace-shell";
import AgentRobot from "@/components/agent-robot";
import { getAgentIdentity, agentIdentities } from "@/lib/agents/identity";

const descriptions:Record<string,string>={
  "diretor-geral":"Coordena o processo, distribui a palavra e mantém o debate organizado.",
  "estrategista":"Avalia posicionamento, cenários e consequências de longo prazo.",
  "planejador":"Transforma decisões em etapas, prazos e critérios de execução.",
  "cientista":"Distingue evidências, hipóteses e incertezas.",
  "engenheiro":"Avalia tecnologia, arquitetura, segurança e viabilidade.",
  "analista-dados":"Investiga métricas, dados e padrões mensuráveis.",
  "visionario":"Explora oportunidades e futuros alternativos.",
  "designer-solucoes":"Cuida da experiência, clareza e acessibilidade.",
  "inventor":"Cria alternativas e experimentos originais.",
  "advogado-diabo":"Constrói a crítica mais forte e testa pressupostos.",
  "economista":"Analisa custos, receitas e retorno.",
  "gestor-riscos":"Identifica ameaças e planos de contingência.",
  "especialista-mercado":"Avalia clientes, concorrência e demanda.",
  "mediador":"Registra convergências e divergências sem forçar consenso.",
  "auditor":"Verifica consistência, lacunas e qualidade das conclusões."
};
export default async function CouncilPage(){
  const supabase=await createClient();
  const {data:auth,error}=await supabase.auth.getUser();
  if(error||!auth.user)redirect("/login");
  const name=(auth.user.user_metadata?.display_name as string|undefined)||auth.user.email?.split("@")[0]||"Presidente";
  const {data:agents}=await supabase.from("agents").select("slug,name,specialty").eq("is_fixed",true);
  const ordered=(agents??[]).slice().sort((a,b)=>agentIdentities.findIndex(x=>x.slug===a.slug)-agentIdentities.findIndex(x=>x.slug===b.slug));
  return <WorkspaceShell active="council" name={name}>
    <header className="workspace-header"><div><span className="eyebrow">PESSOAS & ESPECIALIDADES</span><h1>Os 15 conselheiros</h1><p>Conheça os robôs, suas personalidades e a perspectiva que cada um traz para o debate.</p></div><span className="workspace-badge">15 CADEIRAS FIXAS</span></header>
    <div className="council-character-grid">{ordered.map((agent,i)=>{const identity=getAgentIdentity(agent.slug);return <Link className="council-character-card" href={`/council/${agent.slug}`} key={agent.slug} style={{"--agent-color":identity?.color??"#62e7df"} as React.CSSProperties}>
      <div className="council-character-art"><AgentRobot slug={agent.slug}/><span className="character-index">{String(i+1).padStart(2,"0")}</span></div>
      <div className="council-character-copy"><span className="character-codename">{identity?.codename??"CONSELHEIRO"}</span><h2>{agent.name}</h2><p>{agent.specialty}</p><small>{descriptions[agent.slug]??"Especialista do conselho, com perspectiva própria para avaliar a pauta."}</small><span className="character-profile-link">Ver perfil <ArrowUpRight size={13}/></span></div>
      <span className="character-fixed"><ShieldCheck size={12}/> FIXO</span>
    </Link>;})}</div>
  </WorkspaceShell>;
}
