import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runWithBestAvailableProvider, type ProviderAttempt } from "@/lib/ai/provider-router";

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

  const [{ data: meeting }, { data: agent }, { data: memories }] = await Promise.all([
    supabase.from("meetings").select("id,title,agenda,status").eq("id", meetingId).maybeSingle(),
    supabase.from("agents").select("slug,name,specialty,system_prompt").eq("slug", agentSlug).eq("is_fixed", true).maybeSingle(),
    supabase.from("agent_memories").select("scope,agent_slug,memory_type,content").eq("owner_id", auth.user.id).eq("is_active", true).order("updated_at", { ascending: false }).limit(30),
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

  const memoryContext = (memories ?? [])
    .filter((memory) => memory.scope === "collective" || (memory.scope === "individual" && memory.agent_slug === agentSlug))
    .slice(0, 8)
    .map((memory) => `[${memory.scope}/${memory.memory_type}] ${memory.content}`)
    .join("\n");
  const input = [
    `REUNIÃO: ${meeting.title}`,
    `PAUTA DA PRESIDÊNCIA: ${meeting.agenda || "Sem contexto adicional."}`,
    memoryContext ? `MEMÓRIAS RELEVANTES:\n${memoryContext}` : "",
    "FASE: primeira análise independente. Ainda não responda aos argumentos dos outros agentes.",
    "Entregue: (1) sua posição inicial, (2) três razões principais, (3) maior incerteza ou risco, (4) evidência que falta, (5) recomendação provisória.",
    "Seja específico, honesto sobre incertezas e conciso. Não invente dados. Não aprove nem execute ações. A decisão final pertence à presidência.",
  ].filter(Boolean).join("\n\n");

  // Save a durable checkpoint before contacting any provider. A later retry rebuilds
  // the same task from this snapshot instead of silently starting a different job.
  const { error: taskError } = await supabase.from("agent_task_runs").upsert({
    meeting_id: meetingId,
    owner_id: auth.user.id,
    agent_slug: agentSlug,
    phase: "opening",
    round_number: 1,
    status: "running",
    input_snapshot: { meeting_title: meeting.title, agenda: meeting.agenda, system_prompt: agent.system_prompt, input, memory_context: memoryContext },
    last_error: "",
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "meeting_id,agent_slug,phase,round_number", ignoreDuplicates: true });

  if (taskError) return NextResponse.json({ error: "Não foi possível salvar o ponto de retomada da tarefa." }, { status: 500 });

  const { data: task } = await supabase.from("agent_task_runs")
    .select("id,attempt_log,input_snapshot")
    .eq("meeting_id", meetingId)
    .eq("agent_slug", agentSlug)
    .eq("phase", "opening")
    .eq("round_number", 1)
    .single();

  if (!task) return NextResponse.json({ error: "Ponto de retomada não encontrado." }, { status: 500 });

  const savedSnapshot = task.input_snapshot as { system_prompt?: string; input?: string } | null;
  const resumedSystemPrompt = savedSnapshot?.system_prompt || agent.system_prompt;
  const resumedInput = savedSnapshot?.input || input;
  await supabase.from("agent_task_runs").update({
    status: "running",
    last_error: "",
    updated_at: new Date().toISOString(),
  }).eq("id", task.id);

  const { data: health } = await supabase.from("ai_provider_health")
    .select("provider,consecutive_failures,cooldown_until,average_latency_ms")
    .eq("owner_id", auth.user.id);

  const attemptLog = Array.isArray(task.attempt_log) ? [...task.attempt_log] as ProviderAttempt[] : [];
  const recordAttempt = async (attempt: ProviderAttempt) => {
    attemptLog.push(attempt);
    await supabase.from("agent_task_runs").update({
      attempt_log: attemptLog,
      updated_at: new Date().toISOString(),
    }).eq("id", task.id);

    const previous = (health ?? []).find((item) => item.provider === attempt.provider);
    const failures = attempt.ok ? 0 : (previous?.consecutive_failures ?? 0) + 1;
    const cooldownSeconds = attempt.ok ? 0 : Math.min(900, 30 * (2 ** Math.min(failures, 5)));
    const previousLatency = previous?.average_latency_ms ?? attempt.latencyMs;
    const averageLatency = Math.round(previousLatency * 0.7 + attempt.latencyMs * 0.3);
    await supabase.from("ai_provider_health").upsert({
      owner_id: auth.user.id,
      provider: attempt.provider,
      consecutive_failures: failures,
      cooldown_until: attempt.ok ? null : new Date(Date.now() + cooldownSeconds * 1000).toISOString(),
      last_success_at: attempt.ok ? new Date().toISOString() : (previous as { last_success_at?: string | null } | undefined)?.last_success_at ?? null,
      last_failure_at: attempt.ok ? (previous as { last_failure_at?: string | null } | undefined)?.last_failure_at ?? null : new Date().toISOString(),
      average_latency_ms: averageLatency,
      updated_at: new Date().toISOString(),
    }, { onConflict: "owner_id,provider" });
  };

  try {
    const result = await runWithBestAvailableProvider({
      systemPrompt: resumedSystemPrompt,
      input: resumedInput,
      health: health ?? [],
      allowPaid: process.env.AI_ALLOW_PAID === "true",
      onAttempt: recordAttempt,
    });

    const { error: insertError } = await supabase.from("meeting_messages").insert({
      meeting_id: meetingId,
      owner_id: auth.user.id,
      agent_slug: agent.slug,
      speaker_type: "agent",
      content: result.text,
      round_number: 1,
    });

    if (insertError && insertError.code !== "23505") {
      await supabase.from("agent_task_runs").update({
        status: "paused",
        last_error: "Resposta gerada, aguardando gravação no histórico.",
        updated_at: new Date().toISOString(),
      }).eq("id", task.id);
      return NextResponse.json({ error: "A resposta foi gerada, mas não pôde ser salva. A tarefa ficou preservada para retomada." }, { status: 500 });
    }

    await supabase.from("agent_task_runs").update({
      status: "completed",
      output_text: result.text,
      provider: result.provider,
      model: result.model,
      last_error: "",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", task.id);

    await supabase.from("meetings").update({ status: "running", round_count: 1 }).eq("id", meetingId);
    const { data: round } = await supabase.from("meeting_rounds").select("id")
      .eq("meeting_id", meetingId).eq("round_number", 1).eq("phase", "opening").maybeSingle();
    const { count } = await supabase.from("meeting_messages").select("id", { count: "exact", head: true })
      .eq("meeting_id", meetingId).eq("round_number", 1).eq("speaker_type", "agent");

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

    return NextResponse.json({ ok: true, agent: agent.slug, round: 1, provider: result.provider, model: result.model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha inesperada no roteador de IA.";
    await supabase.from("agent_task_runs").update({
      status: "paused",
      last_error: message.slice(0, 1500),
      updated_at: new Date().toISOString(),
    }).eq("id", task.id);
    return NextResponse.json({
      error: message,
      paused: true,
      resumable: true,
    }, { status: 503 });
  }
}
