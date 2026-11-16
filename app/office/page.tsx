import { redirect } from "next/navigation";
import { CircleDot } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import WorkspaceShell from "@/components/workspace-shell";
import OfficeSimulation from "@/components/office-simulation";
import { agentIdentities } from "@/lib/agents/identity";
export default async function OfficePage(){
  const supabase=await createClient();
  const {data:auth,error}=await supabase.auth.getUser();
  if(error||!auth.user)redirect("/login");
  const name=(auth.user.user_metadata?.display_name as string|undefined)||auth.user.email?.split("@")[0]||"Presidente";
  const {data:agents}=await supabase.from("agents").select("slug,name,specialty").eq("is_fixed",true);
  const ordered=(agents??[]).slice().sort((a,b)=>agentIdentities.findIndex(x=>x.slug===a.slug)-agentIdentities.findIndex(x=>x.slug===b.slug));
  return <WorkspaceShell active="office" name={name}>
    <header className="workspace-header"><div><span className="eyebrow">SEDE DO CONSELHO</span><h1>Escritório virtual</h1><p>Um espaço vivo para os 15 conselheiros circularem, conversarem e fazerem pequenas pausas.</p></div><span className="workspace-badge"><CircleDot size={11}/> AO VIVO</span></header>
    <OfficeSimulation members={ordered}/>
  </WorkspaceShell>;
}
