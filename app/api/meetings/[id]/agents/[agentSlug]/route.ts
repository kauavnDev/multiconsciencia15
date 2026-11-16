import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type OutputItem = { type?: string; content?: Array<{ type?: string; text?: string }> };

function extractOutputText(payload: { output?: OutputItem[] }) {
  return (payload.output ?? [])
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; agentSlug: string }> },
) {
  const { id: meetingId, agentSlug } = await params;
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();

  if (authError || !auth.user) {
    return NextResponse.json({ error: "Faça login para iniciar a rodada." }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) {
    return NextResponse.json({
      error: "A API de IA ainda não foi configurada. Adicione OPENAI_API_KEY e OPENAI_MODEL nas variáveis server-side da Vercel.",
    }, { status: 503 });
  }

  const [{ data: meeting }, { data: agent }, { data: memories }] = await Promise.all([
    supabase.from("meetings").select("id,title,agenda,status").eq("id", meetingId).maybeSingle(),
    supabase.from("agents").select("slug,name,specialty,system_prompt").eq("slug", agentSlug).eq("is_fixed", true).maybeSingle(),
    supabase.from("agent_memories").select("scope,memory_type,content").eq("owner_id", auth.user.id).eq("is_active", true).or(`scope.eq.collective,and(scope.eq.individual,agent_slug.eq.${agentSlug})`).order("updated_at", { ascending: false }).limit(8),
  ]);

  if (!meeting) return NextResponse.json({ error: "Reunião não encontrada." }, { status: 404 });
  if (!agent) return NextResponse.json({ error: "Agente não encontrado." }, { status: 404 });
  if (meeting.status !== "draft" && meeting.status !== "running") {
    return NextResponse.json({ error: "Esta reunião não aceita novas respostas." }, { status: 409 });
  }

  const { data: existing } = await supabase
    .from("meeting_messages")
    .select("id")
    .eq("meeting_id", meetingId)
    .eq("agent_slug", agentSlug)
    .eq("round_number", 1)
    .eq("speaker_type", "agent")
    .maybeSingle();

  if (existing) return NextResponse.json({ ok: true, duplicate: true });

  const { error: roundError } = await supabase.from("meeting_rounds").upsert({
    meeting_id: meetingId,
    owner_id: auth.user.id,
    round_number: 1,
    phase: "opening",
    status: "running",
    instructions: "Análise independente inicial dos 15 conselheiros.",
    started_at: new Date().toISOString(),
  }, { onConflict: "meeting_id,round_number,phase", ignoreDuplicates: true });

  if (roundError) {
    return NextResponse.json({ error: "Não foi possível preparar a rodada." }, { status: 500 });
  }

  const memoryContext = (memories ?? []).map((memory) => `[${memory.scope}/${memory.memory_type}] ${memory.content}`).join("\n");
  const input = [
    `REUNIÃO: ${meeting.title}`,
    `PAUTA DA PRESIDÊNCIA: ${meeting.agenda || "Sem contexto adicional."}`,
    memoryContext ? `MEMÓRIAS RELEVANTES:\n${memoryContext}` : "",
    "FASE: primeira análise independente. Ainda não responda aos argumentos dos outros agentes.",
    "Entregue: (1) sua posição inicial, (2) três razões principais, (3) maior incerteza ou risco, (4) evidência que falta, (5) recomendação provisória.",
    "Seja específico, honesto sobre incertezas e conciso. Não invente dados. Não aprove nem execute ações. A decisão final pertence à presidência.",
  ].filter(Boolean).join("\n\n");

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: agent.system_prompt,
        input,
        max_output_tokens: 450,
        store: false,
      }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível conectar à API de IA." }, { status: 502 });
  }

  if (!response.ok) {
    return NextResponse.json({ error: "A API de IA recusou a solicitação. Verifique modelo, créditos e limites da conta." }, { status: 502 });
  }

  const payload = await response.json() as { output?: OutputItem[] };
  const content = extractOutputText(payload);
  if (!content) return NextResponse.json({ error: "O agente não retornou texto utilizável." }, { status: 502 });

  const { error: insertError } = await supabase.from("meeting_messages").insert({
    meeting_id: meetingId,
    owner_id: auth.user.id,
    agent_slug: agent.slug,
    speaker_type: "agent",
    content,
    round_number: 1,
  });

  if (insertError) {
    if (insertError.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
    return NextResponse.json({ error: "A resposta foi gerada, mas não pôde ser salva." }, { status: 500 });
  }

  await supabase.from("meetings").update({ status: "running", round_count: 1 }).eq("id", meetingId);
  const { data: round } = await supabase.from("meeting_rounds").select("id").eq("meeting_id", meetingId).eq("round_number", 1).eq("phase", "opening").maybeSingle();
  const { count } = await supabase.from("meeting_messages").select("id", { count: "exact", head: true }).eq("meeting_id", meetingId).eq("round_number", 1).eq("speaker_type", "agent");

  if (count === 15 && round) {
    await supabase.from("meeting_rounds").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", round.id);
    await supabase.from("meeting_events").insert({
      meeting_id: meetingId,
      owner_id: auth.user.id,
      actor_type: "system",
      event_type: "round_completed",
      event_data: { round_number: 1, phase: "opening", responses: count },
    });
  }

  return NextResponse.json({ ok: true, agent: agent.slug, round: 1 });
}
