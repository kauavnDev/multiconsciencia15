"use client";
import { useState } from "react";
type Agent={slug:string;name:string;specialty:string};
export default function ParticipantPicker({agents}:{agents:Agent[]}){const [mode,setMode]=useState("director");const [selected,setSelected]=useState<string[]>([]);return <section className="workspace-card" style={{display:"grid",gap:12}}>
<div><b>Quem participa desta reunião?</b><p className="field-hint">O Diretor-Geral será o coordenador. Você pode definir os especialistas manualmente ou deixar a seleção para o Diretor.</p></div>
<div style={{display:"grid",gap:8}}>{[{v:"director",t:"Diretor-Geral escolhe (automático)"},{v:"hybrid",t:"Diretor escolhe; posso adicionar pessoas"},{v:"manual",t:"Quero escolher os participantes"}].map(x=><label key={x.v} style={{display:"flex",gap:9,alignItems:"center",fontSize:12,color:"#cbd5e7"}}><input type="radio" name="participant_mode" value={x.v} checked={mode===x.v} onChange={()=>setMode(x.v)}/>{x.t}</label>)}</div>
<input type="hidden" name="participant_mode" value={mode}/>
{mode!=="director"&&<div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>{agents.map(a=><label key={a.slug} style={{display:"flex",gap:7,alignItems:"flex-start",padding:9,border:"1px solid var(--line)",borderRadius:8,fontSize:11,color:"#b8c3d7"}}><input type="checkbox" name="participants" value={a.slug} checked={selected.includes(a.slug)} onChange={e=>setSelected(old=>e.target.checked?[...old,a.slug]:old.filter(v=>v!==a.slug))}/><span><b>{a.name}</b><br/><small>{a.specialty}</small></span></label>)}</div>}
{mode==="manual"&&selected.length===0&&<p className="field-hint">Escolha pelo menos um especialista. O Diretor-Geral e o Mediador são incluídos na coordenação.</p>}
</section>}
