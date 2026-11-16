import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BrainCircuit, MessageCircle, ShieldCheck, Sparkles, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import WorkspaceShell from "@/components/workspace-shell";
import AgentRobot from "@/components/agent-robot";
import { getAgentIdentity, agentIdentities } from "@/lib/agents/identity";

export function generateStaticParams() { return agentIdentities.map((agent) => ({ slug: agent.slug })); }

export default async function AgentProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const identity = getAgentIdentity(slug);
  if (!identity) notFound();
  const supabase = await createClient();
  const { data: auth, error } = await supabase.auth.getUser();
  if (error || !auth.user) redirect("/login");
  const name = (auth.user.user_metadata?.display_name as string | undefined) || auth.user.email?.split("@")[0] || "Presidente";
  const { data: agent } = await supabase.from("agents").select("slug,name,specialty").eq("slug", slug).maybeSingle();
  if (!agent) notFound();
  return <WorkspaceShell active="council" name={name}>
    <div className="profile-back"><Link href="/council"><ArrowLeft size={15}/> Voltar ao conselho</Link><span>PERFIL DO CONSELHEIRO</span></div>
    <section className="agent-profile-hero" style={{ "--agent-color": identity.color } as React.CSSProperties}>
      <div className="agent-profile-art"><AgentRobot slug={slug} size="large"/></div>
      <div className="agent-profile-intro"><span className="eyebrow">MEMBRO {String(agentIdentities.findIndex((item)=>item.slug===slug)+1).padStart(2,"0")} / 15 · {identity.codename}</span><h1>{agent.name}</h1><p>{agent.specialty}</p><div className="agent-profile-tags"><span><ShieldCheck size={13}/> Cadeira fixa</span><span><BrainCircuit size={13}/> {identity.silhouette}</span></div></div>
      <div className="agent-profile-watermark">{identity.codename}</div>
    </section>
    <div className="agent-profile-grid">
      <article className="workspace-card"><span className="eyebrow"><Sparkles size={12}/> PERSONALIDADE</span><h2>Como pensa</h2><p>{identity.personality}</p></article>
      <article className="workspace-card"><span className="eyebrow"><MessageCircle size={12}/> COMUNICAÇÃO</span><h2>Como se expressa</h2><p>{identity.communication}</p></article>
      <article className="workspace-card"><span className="eyebrow"><Target size={12}/> MISSÃO</span><h2>Seu foco no conselho</h2><p>{identity.signature}</p></article>
      <article className="workspace-card profile-design-card"><span className="eyebrow">IDENTIDADE VISUAL</span><h2>{identity.silhouette}</h2><p>{identity.design}</p><div className="profile-color-line"><span style={{background:identity.color}}/><span style={{background:identity.accent}}/><small>Paleta exclusiva de {identity.codename}</small></div></article>
    </div>
    <div className="profile-note"><BrainCircuit size={16}/><span>Esta é a identidade de personagem e a orientação de comunicação. O modelo de IA, as ferramentas e a qualidade das respostas são configurados separadamente e não são medidos por esta ficha.</span></div>
  </WorkspaceShell>;
}
