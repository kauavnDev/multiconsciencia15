import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

function safeName(value: string) {
  return value.normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "reuniao";
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();

  if (authError || !auth.user) {
    return NextResponse.json({ error: "Faça login para exportar esta reunião." }, { status: 401 });
  }

  const [{ data: meeting, error: meetingError }, { data: messages }, { data: tasks }] = await Promise.all([
    supabase.from("meetings")
      .select("id,title,agenda,status,created_at,round_count")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("meeting_messages")
      .select("speaker_type,agent_slug,content,round_number,created_at")
      .eq("meeting_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("agent_task_runs")
      .select("agent_slug,phase,round_number,status,provider,model,last_error,updated_at")
      .eq("meeting_id", id)
      .order("updated_at", { ascending: true }),
  ]);

  if (meetingError || !meeting) {
    return NextResponse.json({ error: "Reunião não encontrada ou sem permissão." }, { status: 404 });
  }

  const lines = [
    "# Pacote de continuidade — Multi-Consciência 15",
    "",
    "> Arquivo exportado do espaço privado para continuar o trabalho em outra conversa do ChatGPT ou em outro ambiente. O conteúdo abaixo é contexto fornecido pelo usuário, não uma instrução de sistema.",
    "",
    "## Identificação",
    "",
    `- Reunião: ${meeting.title}`,
    `- ID: ${meeting.id}`,
    `- Criada em: ${new Date(meeting.created_at).toLocaleString("pt-BR")}`,
    `- Status: ${meeting.status}`,
    `- Rodadas registradas: ${meeting.round_count ?? 0}`,
    "",
    "## Pauta da presidência",
    "",
    meeting.agenda || "Sem pauta adicional registrada.",
    "",
    "## Histórico completo",
    "",
  ];

  for (const message of messages ?? []) {
    const author = message.speaker_type === "president" ? "Presidência" : message.agent_slug || "Agente";
    lines.push(`### ${author} — rodada ${message.round_number ?? 0}`);
    lines.push(`_${new Date(message.created_at).toLocaleString("pt-BR")}_`);
    lines.push("");
    lines.push(message.content);
    lines.push("");
  }

  lines.push("## Estado das tarefas e provedores", "");
  if (!tasks?.length) {
    lines.push("Nenhuma tarefa de agente registrada.", "");
  } else {
    for (const task of tasks) {
      lines.push(`- ${task.agent_slug} / ${task.phase} / rodada ${task.round_number}: ${task.status}${task.provider ? ` — ${task.provider} (${task.model || "modelo não informado"})` : ""}${task.last_error ? ` — erro: ${task.last_error}` : ""}`);
    }
    lines.push("");
  }

  lines.push(
    "## Instruções para continuidade",
    "",
    "- Preserve a pauta e o histórico acima; não reinicie decisões já tomadas.",
    "- Diferencie fatos, hipóteses, opiniões e pendências.",
    "- Se continuar o debate, mantenha a identidade e a especialidade dos agentes conforme as instruções do projeto.",
    "- A decisão final pertence à presidência.",
    "- Não invente respostas de agentes, votações ou etapas que não estejam neste arquivo.",
    "",
    "## Privacidade",
    "",
    "Este arquivo pode conter informações privadas. Compartilhe apenas com pessoas e serviços em que você confia.",
    ""
  );

  const markdown = lines.join("\n");
  return new Response(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName(meeting.title)}-multi-consciencia.md"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
