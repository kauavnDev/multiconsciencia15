"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createMeeting(formData: FormData) {
  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.getUser();

  if (authError || !data.user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const agenda = String(formData.get("agenda") ?? "").trim();
  const participantMode = String(formData.get("participant_mode") ?? "director");
  const selectedParticipants = formData.getAll("participants").map(String).filter((slug) => /^[a-z0-9-]{2,50}$/.test(slug)).slice(0, 15);
  const topic = (title + " " + agenda).toLowerCase();
  const topicRules: Array<{terms:string[];agents:string[]}> = [
    {terms:["dinheiro","finance","orçamento","custo","preço","receita","lucro","caixa","investimento"],agents:["economista","analista-dados","gestor-riscos","auditor","estrategista"]},
    {terms:["app","aplicativo","software","site","sistema","tecnologia","api","produto","plataforma"],agents:["engenheiro","designer-solucoes","inventor","analista-dados","planejador","gestor-riscos"]},
    {terms:["marketing","venda","cliente","mercado","publicidade","anúncio","marca","concorrência"],agents:["especialista-mercado","estrategista","analista-dados","economista","advogado-diabo"]},
    {terms:["lei","contrato","lgpd","privacidade","segurança","risco","regulação"],agents:["auditor","gestor-riscos","engenheiro","advogado-diabo","cientista"]},
    {terms:["pesquisa","estudo","ciência","dados","experimento","hipótese"],agents:["cientista","analista-dados","inventor","auditor","visionario"]},
  ];
  const matched=topicRules.filter(rule=>rule.terms.some(term=>topic.includes(term))).flatMap(rule=>rule.agents);
  const savedPrefs = (data.user.user_metadata?.council_preferences ?? {}) as { maxParticipants?: number };
  const maxParticipants = [3,5,6,8,10,15].includes(Number(savedPrefs.maxParticipants)) ? Number(savedPrefs.maxParticipants) : 6;
  const autoRoster=Array.from(new Set(["diretor-geral","mediador",...(matched.length?matched:["estrategista","analista-dados","advogado-diabo","gestor-riscos"])] )).slice(0,maxParticipants);
  const roster=participantMode==="manual"
    ? Array.from(new Set([...selectedParticipants,"diretor-geral","mediador"]))
    : participantMode==="hybrid" ? Array.from(new Set([...autoRoster,...selectedParticipants])) : autoRoster;

  if (!title || title.length > 160 || agenda.length > 12000) {
    redirect("/meetings/new?error=invalid");
  }

  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({
      owner_id: data.user.id,
      title,
      agenda,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !meeting) redirect("/meetings/new?error=save");

  const { error: eventError } = await supabase.from("meeting_events").insert({
    meeting_id: meeting.id, owner_id: data.user.id, actor_type: "president",
    event_type: "participant_preferences",
    event_data: { mode: ["director","hybrid","manual"].includes(participantMode) ? participantMode : "director", selected_slugs: roster, president_selected_slugs: selectedParticipants },
  });
  if (eventError) redirect(`/meetings/${meeting.id}?warning=participants`);

  if (agenda) {
    const { error: messageError } = await supabase.from("meeting_messages").insert({
      meeting_id: meeting.id,
      owner_id: data.user.id,
      speaker_type: "president",
      content: agenda,
      round_number: 0,
    });

    if (messageError) redirect(`/meetings/${meeting.id}?warning=message`);
  }

  redirect(`/meetings/${meeting.id}`);
}
