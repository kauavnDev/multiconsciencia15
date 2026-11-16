import { redirect } from "next/navigation";
import { BriefcaseBusiness, Monitor, Coffee, CircleDot } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import WorkspaceShell from "@/components/workspace-shell";
import AgentRobot from "@/components/agent-robot";
import { agentIdentities, getAgentIdentity } from "@/lib/agents/identity";
export default async function OfficePage(){
  const supabase=await createClient();
  const {data:auth,error}=await supabase.auth.getUser();
  if(error||!auth.user)redirect("/login");
  const name=(auth.user.user_metadata?.display_name as string|undefined)||auth.user.email?.split("@")[0]||"Presidente";
  const {data:agents}=await supabase.from("agents").select("slug,name,specialty").eq("is_fixed",true);
  const ordered=(agents??[]).slice().sort((a,b)=>agentIdentities.findIndex(x=>x.slug===a.slug)-agentIdentities.findIndex(x=>x.slug===b.slug));
  return <WorkspaceShell active="office" name={name}>
    <header className="workspace-header"><div><span className="eyebrow">SEDE DO CONSELHO</span><h1>Escritório virtual</h1><p>As 15 cabines individuais do conselho, agora identificadas pelos seus robôs e cores próprios.</p></div><span className="workspace-badge"><CircleDot size={11}/> PLANTA V1</span></header>
    <div className="workspace-card" style={{marginBottom:16}}><div style={{display:"flex",alignItems:"center",gap:10}}><BriefcaseBusiness color="var(--cyan)"/><div><b>Sede Multi-Consciência</b><div className="workspace-muted">Área de trabalho · 15 estações individuais · Sala de reuniões</div></div></div></div>
    <div className="office-floor">{ordered.map((a)=>{const identity=getAgentIdentity(a.slug);return <article className="office-booth" key={a.slug} style={{"--agent-color":identity?.color??"#62e7df"} as React.CSSProperties}><div className="office-agent-head"><AgentRobot slug={a.slug}/><div className="agent-info"><b>{identity?.codename??a.name}</b><small>{a.name}</small></div></div><div className="booth-desk"><Monitor size={17}/><span style={{fontSize:9,marginLeft:7}}>ESTAÇÃO DE TRABALHO</span></div><div className="workspace-muted" style={{marginTop:9}}><Coffee size={12} style={{display:"inline",verticalAlign:"middle"}}/> Aguardando convocação</div></article>;})}</div>
  </WorkspaceShell>;
}
