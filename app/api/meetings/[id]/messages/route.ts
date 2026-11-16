import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;const body=await request.json().catch(()=>null) as {content?:string}|null;
 const content=String(body?.content??"").trim();
 if(!content||content.length>3000)return NextResponse.json({error:"A mensagem deve ter entre 1 e 3.000 caracteres."},{status:400});
 const supabase=await createClient();const {data:auth,error}=await supabase.auth.getUser();
 if(error||!auth.user)return NextResponse.json({error:"Faça login para participar."},{status:401});
 const {data:meeting}=await supabase.from("meetings").select("id,status").eq("id",id).maybeSingle();
 if(!meeting)return NextResponse.json({error:"Reunião não encontrada."},{status:404});
 if(meeting.status==="completed"||meeting.status==="cancelled")return NextResponse.json({error:"A reunião foi encerrada."},{status:409});
 const {data:message,error:insertError}=await supabase.from("meeting_messages").insert({meeting_id:id,owner_id:auth.user.id,speaker_type:"president",content,round_number:0}).select("id,speaker_type,agent_slug,content,round_number,created_at").single();
 if(insertError||!message)return NextResponse.json({error:"Não foi possível enviar a mensagem."},{status:500});
 return NextResponse.json({ok:true,message});
}