import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {runWithBestAvailableProvider} from "@/lib/ai/provider-router";
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;const supabase=await createClient();const {data:auth,error}=await supabase.auth.getUser();
 if(error||!auth.user)return NextResponse.json({error:"Faça login para conversar com o conselho."},{status:401});
 const [{data:meeting},{data:director},{data:messages},{data:health}]=await Promise.all([
  supabase.from("meetings").select("id,title,agenda,status").eq("id",id).maybeSingle(),
  supabase.from("agents").select("slug,name,system_prompt").eq("slug","diretor-geral").eq("is_fixed",true).maybeSingle(),
  supabase.from("meeting_messages").select("speaker_type,agent_slug,content,round_number,created_at").eq("meeting_id",id).order("created_at",{ascending:false}).limit(14),
  supabase.from("ai_provider_health").select("provider,consecutive_failures,cooldown_until,average_latency_ms,last_success_at,last_failure_at").eq("owner_id",auth.user.id)
 ]);
 if(!meeting)return NextResponse.json({error:"Reunião não encontrada."},{status:404});
 if(meeting.status==="completed"||meeting.status==="cancelled")return NextResponse.json({error:"A reunião já foi encerrada."},{status:409});
 if(!director)return NextResponse.json({error:"Diretor-Geral não encontrado."},{status:404});
 const transcript=(messages??[]).reverse().map(m=>`[${m.speaker_type==="president"?"PRESIDÊNCIA":m.agent_slug??"CONSELHO"}] ${m.content}`).join("\n\n").slice(-5000);
 try{
  const result=await runWithBestAvailableProvider({
   systemPrompt:director.system_prompt+"\n\nVocê é o Diretor-Geral e está em uma conversa ao vivo com a Presidência. Responda diretamente à última mensagem, reconheça o contexto e seja natural. Não escreva relatório. Máximo 120 palavras. Se a questão exigir especialistas, diga quais funções devem ser convocadas e por quê. Não invente informações. Não exponha raciocínio interno privado; forneça apenas uma resposta objetiva.",
   input:`REUNIÃO: ${meeting.title}\nPAUTA: ${meeting.agenda??""}\nHISTÓRICO RECENTE:\n${transcript}\n\nResponda à última mensagem da Presidência.`,
   health:health??[],allowPaid:false
  });
  const chatRound = Math.floor(Date.now() / 1000);
  const {data:message,error:insertError}=await supabase.from("meeting_messages").insert({meeting_id:id,owner_id:auth.user.id,agent_slug:"diretor-geral",speaker_type:"agent",content:result.text,round_number:chatRound}).select("id,speaker_type,agent_slug,content,round_number,created_at").single();
  if(insertError||!message)return NextResponse.json({error:"Resposta gerada, mas não foi possível salvá-la."},{status:500});
  return NextResponse.json({ok:true,message,provider:result.provider,model:result.model});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"O Diretor não conseguiu responder agora."},{status:503});}
}