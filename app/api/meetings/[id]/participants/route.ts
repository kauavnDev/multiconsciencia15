import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
 const {id}=await params; const body=await request.json().catch(()=>null) as {slug?:string}|null;
 const slug=String(body?.slug??"");
 if(!/^[a-z0-9-]{2,50}$/.test(slug)) return NextResponse.json({error:"Especialista inválido."},{status:400});
 const supabase=await createClient(); const {data:auth,error}=await supabase.auth.getUser();
 if(error||!auth.user) return NextResponse.json({error:"Faça login."},{status:401});
 const [{data:meeting},{data:agent},{data:pref},{data:synthesis}] = await Promise.all([
  supabase.from("meetings").select("id,status").eq("id",id).maybeSingle(),
  supabase.from("agents").select("slug").eq("slug",slug).eq("is_fixed",true).maybeSingle(),
  supabase.from("meeting_events").select("id,event_data").eq("meeting_id",id).eq("event_type","participant_preferences").maybeSingle(),
  supabase.from("meeting_messages").select("id").eq("meeting_id",id).eq("round_number",5).eq("agent_slug","mediador").maybeSingle()
 ]);
 if(!meeting) return NextResponse.json({error:"Reunião não encontrada."},{status:404});
 if(meeting.status==="completed"||meeting.status==="cancelled") return NextResponse.json({error:"A reunião já foi encerrada."},{status:409});
 if(!agent) return NextResponse.json({error:"Especialista não encontrado."},{status:404});
 const old=(pref?.event_data??{}) as {mode?:string;selected_slugs?:string[]};
 const selected=Array.from(new Set([...(old.selected_slugs??[]),slug,"diretor-geral","mediador"]));
 const eventData={mode:"manual",selected_slugs:selected};
 const result=pref?.id
  ? await supabase.from("meeting_events").update({event_data:eventData}).eq("id",pref.id).eq("meeting_id",id)
  : await supabase.from("meeting_events").insert({meeting_id:id,owner_id:auth.user.id,actor_type:"president",event_type:"participant_preferences",event_data:eventData});
 if(result.error) return NextResponse.json({error:"Não foi possível atualizar a equipe."},{status:500});
 return NextResponse.json({ok:true,selected});
}