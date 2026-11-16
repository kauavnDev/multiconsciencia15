"use client";
import {useEffect,useRef,useState} from "react";
import {createClient} from "@/lib/supabase/client";
type Message={id:string; speaker_type:string;agent_slug:string|null;content:string;round_number:number;created_at:string};
type Agent={slug:string;name:string;specialty:string};
const phaseNames=["Pauta","Análise","Conversa","Revisão","Votação","Síntese"];
export default function MeetingChat({meetingId,initialMessages,agents}:{meetingId:string;initialMessages:Message[];agents:Agent[]}){const [messages,setMessages]=useState(initialMessages);const [draft,setDraft]=useState("");const [sending,setSending]=useState(false);const [error,setError]=useState("");const bottom=useRef<HTMLDivElement>(null);
useEffect(()=>{const supabase=createClient();const channel=supabase.channel("meeting-chat-"+meetingId).on("postgres_changes",{event:"INSERT",schema:"public",table:"meeting_messages",filter:"meeting_id=eq."+meetingId},payload=>{const m=payload.new as Message;setMessages(old=>old.some(x=>x.id===m.id)?old:[...old,m]);}).subscribe();return()=>{void supabase.removeChannel(channel);};},[meetingId]);
useEffect(()=>{bottom.current?.scrollIntoView({behavior:"smooth",block:"end"});},[messages.length]);
async function send(){const content=draft.trim();if(!content||sending)return;setSending(true);setError("");try{const r=await fetch("/api/meetings/"+meetingId+"/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content})});const data=await r.json();if(!r.ok)throw new Error(data.error||"Falha ao enviar.");setDraft("");setMessages(old=>old.some(x=>x.id===data.message.id)?old:[...old,data.message]);}catch(e){setError(e instanceof Error?e.message:"Não foi possível enviar.");}finally{setSending(false);}}
return <section className="workspace-card" style={{padding:0,overflow:"hidden",marginBottom:18}}>
<div style={{padding:"14px 16px",borderBottom:"1px solid var(--line)",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><b>Conversa da reunião</b><div className="workspace-muted">Mensagens aparecem conforme são registradas</div></div><span className="workspace-badge">● AO VIVO</span></div>
<div style={{display:"grid",gap:12,padding:14,maxHeight:650,overflowY:"auto",minHeight:180}}>
{messages.map(m=>{const agent=agents.find(a=>a.slug===m.agent_slug);const president=m.speaker_type==="president";const label=president?"Você · Presidência":agent?.name??m.agent_slug??"Conselho";return <article key={m.id} style={{display:"flex",gap:9,justifyContent:president?"flex-end":"flex-start",alignItems:"flex-start"}}>
{!president&&<span className="agent-avatar av-2" style={{width:34,height:34,minWidth:34,fontSize:10}}>{(agent?.name??"IA").split(" ").map(x=>x[0]).slice(0,2).join("")}</span>}
<div style={{maxWidth:"88%",minWidth:0,background:president?"rgba(98,231,223,.10)":"rgba(255,255,255,.035)",border:"1px solid "+(president?"rgba(98,231,223,.2)":"var(--line)"),borderRadius:12,padding:"10px 12px"}}>
<div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:6}}><b style={{fontSize:11}}>{label}</b><small className="workspace-muted">{phaseNames[m.round_number]??"Mensagem"} · {new Date(m.created_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</small></div>
<p style={{margin:0,color:"#c5cee0",fontSize:12,lineHeight:1.65,whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{m.content}</p></div>
{president&&<span className="agent-avatar" style={{width:34,height:34,minWidth:34,fontSize:10}}>EU</span>}
</article>;})}
<div ref={bottom}/></div>
<form onSubmit={e=>{e.preventDefault();void send();}} style={{display:"flex",gap:8,padding:12,borderTop:"1px solid var(--line)"}}><input className="field" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={3000} placeholder="Fale com o conselho..." style={{flex:1,minWidth:0}}/><button className="button button-primary" type="submit" disabled={sending||!draft.trim()}>{sending?"Enviando...":"Enviar"}</button></form>
{error&&<p role="alert" style={{padding:"0 14px 12px",color:"#f2a6a6",fontSize:11}}>{error}</p>}
</section>}
