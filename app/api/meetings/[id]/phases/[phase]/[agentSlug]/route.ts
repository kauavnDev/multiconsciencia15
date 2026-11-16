import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runWithBestAvailableProvider, type ProviderAttempt } from "@/lib/ai/provider-router";

const stages = {
  challenge: { round: 2, label: "Contestação", requiredPrevious: 1, expected: 15 },
  revision: { round: 3, label: "Revisão", requiredPrevious: 2, expected: 15 },
  voting: { round: 4, label: "Votação", requiredPrevious: 3, expected: 15 },
  synthesis: { round: 5, label: "Síntese do Mediador", requiredPrevious: 4, expected: 1 },
} as const;

type Stage = keyof typeof stages;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; phase: string; agentSlug: string }> },
) {
  const { id: meetingId, phase, agentSlug } = await params;
  if (!(phase in stages)) return NextResponse.json({ error: "Fase inválida." }, { status: 400 });
  const stage = stages[phase as Stage];
  if (phase === "synthesis" && agentSlug !== "mediador") {
    return NextResponse.json({ error: "Agente não permitido nesta fase." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });

  const [{ data: meeting }, { data: agent }, { data: allMessages }] = await Promise.all([
    supabase.from("meetings").select("id,title,agenda,status").eq("id", meetingId).maybeSingle(),
    supabase.from("agents").select("slug,name,specialty,system_prompt").eq("slug", agentSlug).eq("is_fixed", true).maybeSingle(),
    supabase.from("meeting_messages").select("agent_slug,speaker_type,content,round_number,created_at").eq("meeting_id", meetingId).order("created_at", { ascending: true }),
  ]);

  if (!meeting) return NextResponse.json({ error: "Reunião não encontrada." }, { status: 404 });
  if (!agent) return NextResponse.json({ error: "Agente não encontrado." }, { status: 404 });
  if (meeting.status === "completed" || meeting.status === "cancelled") {
    return NextResponse.json({ error: "Esta reunião já foi encerrada." }, { status: 409 });
  }

  const previousRound = stage.requiredPrevious;
  const previousCount = (allMessages ?? []).filter((m) => m.speaker_type === "agent" && m.round_number === previousRound).length;
  const expectedPrevious = previousRound === 4 ? 15 : 15;
  if (previousCount < expectedPrevious) {
    return NextResponse.json({ error: `A fase anterior ainda não terminou (${previousCount}/${expectedPrevious}).` }, { status: 409 });
  }

  const { data: existing } = await supabase.from("meeting_messages").select("id")
    .eq("meeting_id", meetingId).eq("agent_slug", agentSlug).eq("round_number", stage.round)
    .eq("speaker_type", "agent").maybeSingle();
  if (existing) return NextResponse.json({ ok: true, duplicate: true, phase, agent: agentSlug });

  const { data: round, error: roundError } = await supabase.from("meeting_rounds").upsert({
    meeting_id: meetingId,
    owner_id: auth.user.id,
    round_number: stage.round,
    phase,
    status: "running",
    instructions: stage.label,
    started_at: new Date().toISOString(),
  }, { onConflict: "meeting_id,round_number,phase", ignoreDuplicates: true })
    .select("id").maybeSingle();

  let roundId = round?.id;
  if (!roundId) {
    const { data: savedRound, error } = await supabase.from("meeting_rounds").select("id")
      .eq("meeting_id", meetingId).eq("round_number", stage.round).eq("phase", phase).single();
    if (error || !savedRound) return NextResponse.json({ error: roundError?.message || "Não foi possível abrir a fase." }, { status: 500 });
    roundId = savedRound.id;
    await supabase.from("meeting_rounds").update({ status: "running", started_at: new Date().toISOString() }).eq("id", roundId);
  }

  const transcript = (allMessages ?? []).map((m) => {
    const who = m.speaker_type === "president" ? "PRESIDÊNCIA" : m.agent_slug || "SISTEMA";
    return `[${who} | etapa ${m.round_number}] ${m.content}`;
  }).join("\n\n").slice(-24000);

  const phaseInstructions: Record<Stage, string> = {
    challenge: "FASE DE CONTESTAÇÃO. Leia as análises iniciais e conteste argumentos concretos. Identifique pelo menos duas premissas frágeis, riscos ou pontos cegos. Reconheça o que estiver bem fundamentado. Não faça ataques pessoais nem invente fatos. Termine com perguntas que precisam ser respondidas.",
    revision: "FASE DE REVISÃO. Considere a análise inicial e as contestações. Diga explicitamente o que mantém, o que mudou e por quê. Apresente uma posição revisada, condições de validade e o que ainda permanece incerto. Não mude de opinião só para concordar com a maioria.",
    voting: "FASE DE VOTAÇÃO. Vote de forma independente na proposta em pauta. Comece obrigatoriamente com uma linha: VOTO: APROVAR, VOTO: REJEITAR ou VOTO: ABSTER. Depois justifique com base nos argumentos e riscos registrados. Se a proposta estiver incompleta, pode abster-se. A presidência mantém a decisão final.",
    synthesis: "FASE DE SÍNTESE. Você é o Mediador. Produza uma síntese imparcial de toda a sessão: questão central, propostas, pontos de acordo, divergências reais, argumentos minoritários, riscos, incertezas, distribuição dos votos e perguntas em aberto. Não force consenso. Não recomende aprovação automática. A presidência decide.",
  };

  const input = [
    `REUNIÃO: ${meeting.title}`,
    `PAUTA DA PRESIDÊNCIA: ${meeting.agenda || "Sem contexto adicional."}`,
    `ETAPA: ${stage.label}`,
    `HISTÓRICO DA SESSÃO:\n${transcript || "Sem mensagens anteriores."}`,
    phaseInstructions[phase as Stage],
    "Seja claro, específico e fiel ao histórico. Não invente dados, fontes, falas ou votos. A decisão final pertence à presidência.",
  ].join("\n\n");

  const { data: taskData, error: taskError } = await supabase.from("agent_task_runs").upsert({
    meeting_id: meetingId,
    owner_id: auth.user.id,
    agent_slug: agentSlug,
    phase,
    round_number: stage.round,
    status: "running",
    input_snapshot: { meeting_title: meeting.title, agenda: meeting.agenda, system_prompt: agent.system_prompt, input },
    last_error: "",
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "meeting_id,agent_slug,phase,round_number", ignoreDuplicates: true })
    .select("id,attempt_log,input_snapshot").maybeSingle();

  let task = taskData;
  if (!task) {
    const { data, error } = await supabase.from("agent_task_runs").select("id,attempt_log,input_snapshot")
      .eq("meeting_id", meetingId).eq("agent_slug", agentSlug).eq("phase", phase).eq("round_number", stage.round).single();
    if (error || !data) return NextResponse.json({ error: taskError?.message || "Não foi possível criar a tarefa." }, { status: 500 });
    task = data;
  }

  const snapshot = task.input_snapshot as { system_prompt?: string; input?: string } | null;
  const systemPrompt = snapshot?.system_prompt || agent.system_prompt;
  const savedInput = snapshot?.input || input;
  await supabase.from("agent_task_runs").update({ status: "running", last_error: "", updated_at: new Date().toISOString() }).eq("id", task.id);

  const { data: health } = await supabase.from("ai_provider_health")
    .select("provider,consecutive_failures,cooldown_until,average_latency_ms,last_success_at,last_failure_at")
    .eq("owner_id", auth.user.id);
  const attemptLog = Array.isArray(task.attempt_log) ? [...task.attempt_log] as ProviderAttempt[] : [];

  const recordAttempt = async (attempt: ProviderAttempt) => {
    attemptLog.push(attempt);
    await supabase.from("agent_task_runs").update({ attempt_log: attemptLog, updated_at: new Date().toISOString() }).eq("id", task.id);
    const previous = (health ?? []).find((item) => item.provider === attempt.provider);
    const failures = attempt.ok ? 0 : (previous?.consecutive_failures ?? 0) + 1;
    const cooldownSeconds = attempt.ok ? 0 : Math.min(900, 30 * (2 ** Math.min(failures, 5)));
    const previousLatency = previous?.average_latency_ms ?? attempt.latencyMs;
    await supabase.from("ai_provider_health").upsert({
      owner_id: auth.user.id,
      provider: attempt.provider,
      consecutive_failures: failures,
      cooldown_until: attempt.ok ? null : new Date(Date.now() + cooldownSeconds * 1000).toISOString(),
      last_success_at: attempt.ok ? new Date().toISOString() : previous?.last_success_at ?? null,
      last_failure_at: attempt.ok ? previous?.last_failure_at ?? null : new Date().toISOString(),
      average_latency_ms: Math.round(previousLatency * 0.7 + attempt.latencyMs * 0.3),
      updated_at: new Date().toISOString(),
    }, { onConflict: "owner_id,provider" });
  };

  try {
    const result = await runWithBestAvailableProvider({
      systemPrompt,
      input: savedInput,
      health: health ?? [],
      allowPaid: process.env.AI_ALLOW_PAID === "true",
      onAttempt: recordAttempt,
    });

    if (phase === "voting") {
      const firstLine = result.text.split("\n")[0].toUpperCase();
      const vote = firstLine.includes("REJEITAR") ? "reject" : firstLine.includes("ABSTER") ? "abstain" : "approve";
      const { error: voteError } = await supabase.from("meeting_votes").upsert({
        meeting_round_id: roundId,
        meeting_id: meetingId,
        owner_id: auth.user.id,
        agent_slug: agentSlug,
        vote,
        rationale: result.text.slice(0, 4000),
      }, { onConflict: "meeting_round_id,agent_slug" });
      if (voteError) throw new Error(`Não foi possível salvar o voto: ${voteError.message}`);
    }

    const { error: insertError } = await supabase.from("meeting_messages").insert({
      meeting_id: meetingId,
      owner_id: auth.user.id,
      agent_slug: agentSlug,
      speaker_type: "agent",
      content: result.text,
      round_number: stage.round,
    });
    if (insertError && insertError.code !== "23505") throw new Error(`Não foi possível salvar a resposta: ${insertError.message}`);

    await supabase.from("agent_task_runs").update({
      status: "completed", output_text: result.text, provider: result.provider, model: result.model,
      last_error: "", completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", task.id);

    if (phase === "synthesis") {
      const { error: memoryError } = await supabase.from("agent_memories").insert({
        owner_id: auth.user.id,
        scope: "collective",
        agent_slug: null,
        memory_type: "summary",
        content: `Síntese da reunião "${meeting.title}":\\n\\n${result.text}`.slice(0, 12000),
        source_meeting_id: meetingId,
        is_active: true,
      });
      if (memoryError) {
        await supabase.from("meeting_events").insert({
          meeting_id: meetingId, owner_id: auth.user.id, actor_type: "system",
          event_type: "round_completed",
          event_data: { phase, warning: "synthesis_memory_not_saved", error: memoryError.message.slice(0, 300) },
        });
      }
    }

    const { count } = await supabase.from("meeting_messages").select("id", { count: "exact", head: true })
      .eq("meeting_id", meetingId).eq("round_number", stage.round).eq("speaker_type", "agent");
    if ((count ?? 0) >= stage.expected) {
      await supabase.from("meeting_rounds").update({
        status: "completed", summary: phase === "synthesis" ? result.text.slice(0, 12000) : "",
        completed_at: new Date().toISOString(),
      }).eq("id", roundId);
      await supabase.from("meeting_events").insert({
        meeting_id: meetingId, owner_id: auth.user.id, actor_type: "system",
        event_type: "round_completed", event_data: { phase, round_number: stage.round, responses: count },
      });
      await supabase.from("meetings").update({ status: "running", round_count: stage.round }).eq("id", meetingId);
    }

    return NextResponse.json({ ok: true, phase, agent: agentSlug, provider: result.provider, model: result.model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha inesperada no processamento da IA.";
    await supabase.from("agent_task_runs").update({
      status: "paused", last_error: message.slice(0, 1500), updated_at: new Date().toISOString(),
    }).eq("id", task.id);
    await supabase.from("meeting_rounds").update({ status: "failed" }).eq("id", roundId);
    return NextResponse.json({ error: message, paused: true, resumable: true }, { status: 503 });
  }
}
