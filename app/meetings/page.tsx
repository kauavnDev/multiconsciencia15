import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Plus, MessageSquareText, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import WorkspaceShell from "@/components/workspace-shell";
export default async function MeetingsPage(){
 const supabase=await createClient();const {data:auth,error}=await supabase.auth.getUser();if(error||!auth.user)redirect("/login");
 const name=(auth.user.user_metadata?.display_name as string|undefined)||auth.user.email?.split("@")[0]||"Presidente";
 const {data:meetings}=await supabase.from("meetings").select("id,title,agenda,status,created_at,round_count").order("created_at",{ascending:false});
 return <WorkspaceShell active="meetings" name={name}><header className="workspace-header"><div><span className="eyebrow">CENTRAL DE DECISÕES</span><h1>Reuniões</h1><p>Acompanhe sessões, debates, votações e decisões presidenciais.</p></div><Link className="button button-primary" href="/meetings/new"><Plus size={16}/> Nova reunião</Link></header>
 <div className="workspace-grid" style={{marginBottom:18}}><div className="stat-box"><span><CalendarDays size={15}/> TOTAL DE SESSÕES</span><strong>{meetings?.length??0}</strong><small>Reuniões no seu espaço</small></div><div className="stat-box"><span>EM ANDAMENTO</span><strong>{meetings?.filter(m=>m.status==="running").length??0}</strong><small>Sessões ativas</small></div><div className="stat-box"><span>CONCLUÍDAS</span><strong>{meetings?.filter(m=>m.status==="completed").length??0}</strong><small>Com decisão registrada</small></div></div>
 {meetings?.length?<div className="workspace-list">{meetings.map(m=><Link className="workspace-profile" href={`/meetings/${m.id}`} key={m.id}><span className="meeting-icon"><MessageSquareText size={18}/></span><span className="agent-info"><b>{m.title}</b><small>{new Date(m.created_at).toLocaleString("pt-BR")} · {m.round_count} etapas registradas</small><p>{m.agenda?.slice(0,170)||"Sem descrição adicional."}</p></span><span className="workspace-badge">{m.status}</span><ArrowUpRight size={16}/></Link>)}</div>:<div className="workspace-card empty-state"><CalendarDays size={24}/><b>Nenhuma reunião ainda</b><p>Crie a primeira pauta para convocar os 15 especialistas.</p><Link className="button button-primary" href="/meetings/new">Criar reunião</Link></div>}</WorkspaceShell>;
}