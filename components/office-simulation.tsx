"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Coffee, Gamepad2, MessageCircle, Pause, Play, Sparkles, Users, X } from "lucide-react";
import AgentRobot from "@/components/agent-robot";
import { agentIdentities } from "@/lib/agents/identity";

type Member={slug:string;name:string;specialty:string};
type Actor={slug:string;name:string;specialty:string;x:number;y:number;activity:string;line:string;targetX:number;targetY:number};
const initialPoints=[[9,20],[22,19],[35,19],[65,19],[78,19],[91,20],[10,73],[24,75],[39,75],[61,75],[76,75],[90,73],[50,39],[42,53],[58,53]];
const idleLines=["Revisando minhas anotações.","Organizando algumas ideias…","Alguém quer conversar?","Só observando o movimento.","Hora de pensar um pouco.","Atualizando meus planos."];
const pairLines=[
 ["AURIX","Vamos alinhar as prioridades da equipe.","ATLAS","Já estou organizando os próximos passos."],
 ["SPARK","Alguém topa uma partida rápida?","VEX","Só se você aceitar perder."],
 ["QUANTA","Temos evidências suficientes para isso?","PIXEL","Posso conferir os dados agora."],
 ["LUMA","Como podemos deixar isso mais simples?","FORGE","Vou pensar numa solução prática."],
 ["HARMONIA","Acho que os dois lados têm um ponto válido.","VEX","Tudo bem, mas ainda quero testar essa hipótese."],
 ["ORION","E se tentássemos uma abordagem diferente?","NEXUS","Vamos comparar os cenários primeiro."]
];
const games=["SPARK","VEX","PULSE","ATLAS","LUMA","PIXEL","ORION","FORGE","QUANTA","HARMONIA","NEXUS","LEDGER","BASTION","SCOPE","AURIX"];
const pick=(a:number,b:number)=>Math.floor(Math.random()*(b-a+1))+a;
function nameOf(slug:string){return agentIdentities.find(a=>a.slug===slug)?.codename??slug.toUpperCase();}
export default function OfficeSimulation({members}:{members:Member[]}){
 const roster=useMemo(()=>members.map((m,i)=>({...m,identity:agentIdentities.find(a=>a.slug===m.slug),point:initialPoints[i%initialPoints.length]})),[members]);
 const [actors,setActors]=useState<Actor[]>(()=>roster.map((m)=>({slug:m.slug,name:m.name,specialty:m.specialty,x:m.point[0],y:m.point[1],targetX:m.point[0],targetY:m.point[1],activity:"Trabalhando",line:"Concentrado na estação."})));
 const [paused,setPaused]=useState(false);
 const [event,setEvent]=useState("Escritório aberto · atividades em andamento");
 const [eventType,setEventType]=useState<"idle"|"chat"|"game">("idle");
 const [round,setRound]=useState(0);
 const [winner,setWinner]=useState("");
 const [showLog,setShowLog]=useState(true);
 const byCodename=(code:string)=>roster.find(m=>m.identity?.codename===code)||roster[0];
 const movePair=useCallback((codes:string[],x:number,y:number)=>{setActors(old=>old.map(a=>{const code=roster.find(m=>m.slug===a.slug)?.identity?.codename??"";const idx=codes.indexOf(code);return idx>=0?{...a,targetX:x+(idx===0?-5:5),targetY:y+(idx===0?0:4),activity:"Conversando"}:a;}));},[roster]);
 const startGame=useCallback(()=>{
   const a=byCodename("SPARK"),b=byCodename("VEX");
   if(!a||!b)return;
   setEventType("game");setWinner("");setRound(0);movePair([a.identity?.codename??"SPARK",b.identity?.codename??"VEX"],50,45);
   setActors(old=>old.map(v=>v.slug===a.slug?{...v,line:"Pedra, papel ou tesoura? Preparado?",activity:"Desafiando"}:v.slug===b.slug?{...v,line:"Aceito! Sem reclamar do resultado.",activity:"Jogando"}:v));
   setEvent("SPARK desafiou VEX para pedra, papel e tesoura.");
 },[movePair,roster]);
 const startChat=useCallback(()=>{
   const pair=pairLines[pick(0,pairLines.length-1)];
   const a=byCodename(pair[0]),b=byCodename(pair[2]);
   if(!a||!b)return;
   setEventType("chat");movePair([pair[0],pair[2]],50,45);
   setActors(old=>old.map(v=>v.slug===a.slug?{...v,line:pair[1],activity:"Conversando"}:v.slug===b.slug?{...v,line:pair[3],activity:"Respondendo"}:v));
   setEvent(pair[0]+" e "+pair[2]+" começaram uma conversa.");
 },[movePair,roster]);
 useEffect(()=>{
   if(paused)return;
   const timer=window.setInterval(()=>{
     setActors(old=>old.map(a=>{
       if(a.activity==="Conversando"||a.activity==="Respondendo"||a.activity==="Jogando"||a.activity==="Desafiando")return a;
       if(Math.random()>.38)return a;
       const x=pick(8,92),y=pick(16,79);
       return {...a,targetX:x,targetY:y,x,y,activity:Math.random()>.65?"Dando uma volta":"Indo para estação",line:idleLines[pick(0,idleLines.length-1)]};
     }));
     setRound(r=>r+1);
   },3600);
   return ()=>window.clearInterval(timer);
 },[paused]);
 useEffect(()=>{
   if(eventType==="idle")return;
   const timer=window.setTimeout(()=>{
     setActors(old=>old.map(a=>({...a,activity:"Trabalhando",line:"Concentrado na estação."})));
     setEventType("idle");setEvent("Escritório aberto · atividades em andamento");
   },eventType==="game"?5200:7200);
   return ()=>window.clearTimeout(timer);
 },[eventType]);
 const playRound=()=>{
   const options=["PEDRA","PAPEL","TESOURA"],a=options[pick(0,2)],b=options[pick(0,2)];
   const result=a===b?"Empate":(a==="PEDRA"&&b==="TESOURA")||(a==="PAPEL"&&b==="PEDRA")||(a==="TESOURA"&&b==="PAPEL")?"SPARK venceu":"VEX venceu";
   setWinner("SPARK: "+a+" · VEX: "+b+" — "+result);
   setActors(old=>old.map(v=>v.slug===byCodename("SPARK")?.slug?{...v,line:"Eu escolho "+a+"!",activity:"Jogando"}:v.slug===byCodename("VEX")?.slug?{...v,line:"Minha jogada: "+b+".",activity:"Jogando"}:v));
 };
 const stopEvent=()=>{setEventType("idle");setWinner("");setActors(old=>old.map(a=>({...a,activity:"Trabalhando",line:"Concentrado na estação."})));setEvent("Escritório aberto · atividades em andamento");};
 return <section className="office-sim">
  <div className="office-sim-toolbar"><div className="office-live"><span className="live-dot"/><span>SIMULAÇÃO AO VIVO</span><small>{paused?"PAUSADA":"CICLO "+String(round+1).padStart(3,"0")}</small></div><div className="office-controls"><button onClick={()=>setPaused(p=>!p)}>{paused?<Play size={14}/>:<Pause size={14}/>} {paused?"Retomar":"Pausar"}</button><button onClick={startChat}><MessageCircle size={14}/> Conversa</button><button onClick={startGame}><Gamepad2 size={14}/> Pedra, papel e tesoura</button></div></div>
  <div className="office-scene" aria-label="Escritório virtual com robôs em movimento">
   <div className="scene-ceiling-label">MULTI-CONSCIÊNCIA HQ <span>· PISO 01</span></div>
   <div className="scene-window"><i/><i/><i/><i/></div>
   <div className="scene-zone-label zone-work">ESTAÇÕES INDIVIDUAIS</div>
   <div className="scene-desks">{roster.map((m,i)=><div className="scene-desk" key={m.slug} style={{left:(initialPoints[i][0])+"%",top:(initialPoints[i][1]+7)+"%"}}><span/><small>{m.identity?.codename??"AI"}</small></div>)}</div>
   <div className="scene-meeting-table"><span>MESA DE REUNIÃO</span><i/><i/><i/><i/></div>
   <div className="scene-lounge"><Coffee size={16}/><b>LOUNGE</b><small>PAUSA & IDEIAS</small></div>
   <div className="scene-plant plant-one">✳</div><div className="scene-plant plant-two">✳</div>
   {actors.map(a=>{const identity=roster.find(m=>m.slug===a.slug)?.identity;return <div key={a.slug} className={`scene-actor ${a.activity==="Conversando"||a.activity==="Respondendo"||a.activity==="Jogando"||a.activity==="Desafiando"?"actor-active":""}`} style={{left:a.targetX+"%",top:a.targetY+"%",transition:paused?"none":"left 2.4s ease,top 2.4s ease"}}><div className="actor-bubble">{a.line}</div><div className="actor-robot" style={{"--robot-color":identity?.color??"#62e7df","--robot-accent":identity?.accent??"#c6fff7"} as React.CSSProperties}><AgentRobot slug={a.slug}/></div><span className="actor-name">{identity?.codename??a.name}</span><span className="actor-state">{a.activity}</span></div>;})}
   <div className="scene-clock">● SISTEMA ONLINE</div>
  </div>
  <div className="office-sim-footer"><div><Users size={15}/><b>{members.length} robôs</b><span>na sede</span></div><div><Sparkles size={15}/><span>{event}</span></div><button onClick={()=>setShowLog(v=>!v)}>{showLog?"Ocultar painel":"Mostrar painel"}</button></div>
  {showLog&&<div className="office-activity-log"><div><b>ATIVIDADE DO ESCRITÓRIO</b><span>{paused?"PAUSADO":"AUTÔNOMO"}</span></div><p>{event}</p>{eventType==="game"&&<div className="office-game-controls"><button onClick={playRound}>Jogar uma rodada</button>{winner&&<strong>{winner}</strong>}<button className="quiet" onClick={stopEvent}><X size={13}/> Encerrar brincadeira</button></div>}{eventType==="chat"&&<button className="quiet" onClick={stopEvent}>Encerrar conversa</button>}</div>}
  <p className="office-sim-disclaimer">As movimentações, brincadeiras e diálogos desta sala são simulações locais predefinidas. Não representam chamadas ou conversas reais entre os modelos de IA.</p>
 </section>;
}
