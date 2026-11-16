import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: meetingId } = await params;
  const body = await request.json().catch(() => null) as { decision?: string; note?: string } | null;
  if (!body || !["approved", "rejected"].includes(body.decision ?? "")) {
    return NextResponse.json({ error: "Escolha aprovar ou rejeitar a proposta." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "Faça login para registrar sua decisão." }, { status: 401 });

  const [{ data: meeting }, { data: synthesis }, { data: votes }, { data: preferenceEvent }] = await Promise.all([
    supabase.from("meetings").select("id,title,status").eq("id", meetingId).maybeSingle(),
    supabase.from("meeting_messages").select("id,content").eq("meeting_id", meetingId).eq("round_number", 5).eq("agent_slug", "mediador").maybeSingle(),
    supabase.from("meeting_votes").select("agent_slug,vote,rationale").eq("meeting_id", meetingId),
    supabase.from("meeting_events").select("event_data").eq("meeting_id", meetingId).eq("event_type", "participant_preferences").maybeSingle(),
  ]);

  if (!meeting) return NextResponse.json({ error: "Reunião não encontrada." }, { status: 404 });
  const prefs = (preferenceEvent?.event_data ?? {}) as { mode?: string; selected_slugs?: string[] };
  const expectedVotes = Array.isArray(prefs.selected_slugs) && prefs.selected_slugs.length ? new Set([...prefs.selected_slugs, "diretor-geral", "mediador"]).size : 15;
  if (meeting.status === "completed") return NextResponse.json({ error: "Esta reunião já recebeu uma decisão." }, { status: 409 });
  if (!synthesis || (votes?.length ?? 0) < expectedVotes) {
    return NextResponse.json({ error: "Conclua a síntese e a votação dos ${expectedVotes} conselheiros convocados antes de decidir." }, { status: 409 });
  }

  const voteSnapshot = Object.fromEntries((votes ?? []).map((vote) => [vote.agent_slug, {
    vote: vote.vote,
    rationale: vote.rationale,
  }]));
  const note = String(body.note ?? "").trim().slice(0, 4000);
  const { data: decision, error } = await supabase.from("decisions").insert({
    meeting_id: meetingId,
    owner_id: auth.user.id,
    title: meeting.title,
    result: [synthesis.content, note ? `DECISÃO DA PRESIDÊNCIA: ${note}` : ""].filter(Boolean).join("\n\n").slice(0, 12000),
    votes: voteSnapshot,
    president_decision: body.decision,
  }).select("id").single();

  if (error || !decision) return NextResponse.json({ error: "Não foi possível salvar a decisão." }, { status: 500 });

  const eventType = body.decision === "approved" ? "president_approved" : "president_rejected";
  await supabase.from("meeting_events").insert({
    meeting_id: meetingId,
    owner_id: auth.user.id,
    actor_type: "president",
    event_type: eventType,
    event_data: { decision_id: decision.id, note },
  });
  await supabase.from("meetings").update({ status: "completed" }).eq("id", meetingId);

  return NextResponse.json({ ok: true, decision: body.decision });
}
