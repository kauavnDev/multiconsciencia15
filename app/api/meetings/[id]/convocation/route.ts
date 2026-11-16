import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {runWithBestAvailableProvider} from "@/lib/ai/provider-router";
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;const supabase=await createClient();const {data:auth,error}=await supabase.auth.getUser();
 if(error||!auth.user)return NextResponse.json({error:"Faça login."},{status:401});
 const [{data:meeting},{data:agents},{data:director},{data:pref},{data:health}]=await Promise.all([
  supabase.from("meetings").select("id,title,agenda,status").eq("id",id).maybeSingle(),
  supabase.from("agents").select("slug,name,specialty,system_prompt").eq("is_fixed",true),
  supabase.from("agents").select("slug,name,system_prompt").eq("slug","diretor-geral").eq("is_fixed",true).maybeSingle(),
  supabase.from("meeting_events").select("id,event_data").eq("meeting_id",id).eq("event_type","participant_preferences").maybeSingle(),
  supabase.from("ai_provider_health").select("provider,consecutive_failures,cooldown_until,average_latency_ms,last_success_at,last_failure_at").eq("owner_id",auth.user.id)
 ]);
 if(!meeting||!director)return NextResponse.json({error:"Reunião ou Diretor-Geral não encontrado."},{status:404});
 const old=(pref?.event_data??{}) as {mode?:string;selected_slugs?:string[];director_reviewed?:boolean;director_reason?:string};
 if(old.mode==="manual")return NextResponse.json({ok:true,skipped:true,reason:"A equipe foi escolhida pela Presidência."});
 if(old.director_reviewed)return NextResponse.json({ok:true,alreadyReviewed:true,selected:old.selected_slugs,reason:old.director_reason});
 const prefs=(auth.user.user_metadata?.council_preferences??{}) as {maxParticipants?:number;directorAutonomy?:string};
 const max=[3,5,6,8,10,15].includes(Number(prefs.maxParticipants))?Number(prefs.maxParticipants):6;
 const catalogue=(agents??[]).map(a=>({slug:a.slug,name:a.name,specialty:a.specialty}));
 const input=`PAUTA: ${meeting.title}\nCONTEXTO: ${meeting.agenda??"Não informado"}\nCATÁLOGO DE ESPECIALISTAS: ${JSON.stringify(catalogue)}\n\nEscolha até ${max} participantes no total. Inclua diretor-geral e mediador sempre. Selecione apenas especialistas que realmente acrescentem perspectiva para esta pauta. Evite convocar todos por padrão. Preserve também estes participantes que a Presidência já adicionou: ${(old.selected_slugs??[]).join(", ")}. Responda SOMENTE JSON válido neste formato: {"selected_slugs":["slug"],"reason":"uma frase curta explicando a escolha"}. Não invente slugs.`;
 try{
  const result=await runWithBestAvailableProvider({systemPrompt:director.system_prompt+"\nVocê decide a composição do conselho para cada pauta. Pense como coordenador: diversidade de competências, relevância e eficiência. Retorne somente JSON válido.",input,health:health??[],allowPaid:false});
  const raw=result.text.replace(/^```(?:json)?/i,"").replace(/```$/,"").trim();
  const parsed=JSON.parse(raw) as {selected_slugs?:unknown;reason?:unknown};
  const allowed=new Set(catalogue.map(a=>a.slug));
  const proposed=Array.isArray(parsed.selected_slugs)?parsed.selected_slugs.filter((v):v is string=>typeof v==="string"&&allowed.has(v)):[];
  const selected=Array.from(new Set(["diretor-geral","mediador",...(old.selected_slugs??[]),...proposed])).filter(s=>allowed.has(s)).slice(0,Math.max(2,max));
  if(!selected.includes("diretor-geral"))selected.unshift("diretor-geral");
  if(!selected.includes("mediador"))selected.push("mediador");
  const reason=typeof parsed.reason==="string"?parsed.reason.slice(0,300):"Equipe selecionada pela relevância das especialidades para a pauta.";
  const eventData={...old,mode:old.mode??"director",selected_slugs:selected,director_reviewed:true,director_reason:reason,director_provider:result.provider};
  const saved=pref?.id?await supabase.from("meeting_events").update({event_data:eventData}).eq("id",pref.id).eq("meeting_id",id):await supabase.from("meeting_events").insert({meeting_id:id,owner_id:auth.user.id,actor_type:"agent",event_type:"participant_preferences",event_data:eventData});
  if(saved.error)throw new Error("A equipe foi escolhida, mas não foi possível salvar a convocação.");
  return NextResponse.json({ok:true,selected,reason,provider:result.provider});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"O Diretor não conseguiu revisar a equipe.",fallback:true,selected:old.selected_slugs??[]},{status:503});}
}