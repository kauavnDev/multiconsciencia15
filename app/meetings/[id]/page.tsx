import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BrainCircuit, Clock3, MessageSquareText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import StartRoundButton from "./start-round-button";
import PresidentDecision from "./president-decision";
import SummonAgent from "@/components/summon-agent";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ warning?: string }>;
};

export default async function MeetingPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) redirect("/login");

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id,title,agenda,status,created_at,round_count")
    .eq("id", id)
    .maybeSingle();

  if (!meeting) notFound();

  const [{ data: messages }, { data: agents }, { data: votes }, { data: preferenceEvent }] = await Promise.all([
    supabase.from("meeting_messages")
      .select("id,speaker_type,agent_slug,content,round_number,created_at")
      .eq("meeting_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("agents").select("slug,name").eq("is_fixed", true).order("name", { ascending: true }),
    supabase.from("meeting_votes").select("agent_slug,vote,rationale").eq("meeting_id", id),
    supabase.from("meeting_events").select("event_data").eq("meeting_id", id).eq("event_type", "participant_preferences").maybeSingle(),
  ]);

  const rows = messages ?? [];
  const participantPrefs = (preferenceEvent?.event_data ?? {}) as { mode?: string; selected_slugs?: string[] };
  const allAgents = agents ?? [];
  const topic = `${meeting.title} ${meeting.agenda ?? ""}`.toLowerCase();
  const topicRules: Array<{ terms: string[]; agents: string[] }> = [
    { terms: ["dinheiro","finance","orçamento","custo","preço","receita","lucro","caixa","investimento"], agents: ["economista","analista-dados","gestor-riscos","auditor","estrategista"] },
    { terms: ["app","aplicativo","software","site","sistema","tecnologia","api","produto","plataforma"], agents: ["engenheiro","designer-solucoes","inventor","analista-dados","planejador","gestor-riscos"] },
    { terms: ["marketing","venda","cliente","mercado","publicidade","anúncio","marca","concorrência"], agents: ["especialista-mercado","estrategista","analista-dados","economista","advogado-diabo"] },
    { terms: ["lei","contrato","lgpd","privacidade","segurança","risco","regulação"], agents: ["auditor","gestor-riscos","engenheiro","advogado-diabo","cientista"] },
    { terms: ["pesquisa","estudo","ciência","dados","experimento","hipótese"], agents: ["cientista","analista-dados","inventor","auditor","visionario"] },
  ];
  const matched = topicRules.filter(rule => rule.terms.some(term => topic.includes(term))).flatMap(rule => rule.agents);
  const autoRoster = Array.from(new Set(["diretor-geral","mediador",...(matched.length ? matched : ["estrategista","analista-dados","advogado-diabo","gestor-riscos"])]));
  const selectedSlugs = Array.isArray(participantPrefs.selected_slugs) && participantPrefs.selected_slugs.length
    ? Array.from(new Set([...participantPrefs.selected_slugs, "diretor-geral", "mediador"]))
    : participantPrefs.mode === "manual" ? ["diretor-geral","mediador"] : autoRoster;
  const activeAgents = allAgents.filter((agent) => selectedSlugs.includes(agent.slug));
  const expectedParticipants = activeAgents.length || 15;
  const countFor = (round: number) => rows.filter((message) => message.speaker_type === "agent" && message.round_number === round).length;
  const openingCount = countFor(1);
  const phaseCounts = {
    challenge: countFor(2),
    revision: countFor(3),
    voting: countFor(4),
    synthesis: countFor(5),
  };

  const voteTotals = (votes ?? []).reduce((acc, vote) => {
    acc[vote.vote] = (acc[vote.vote] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <main className="auth-shell">
      <Link href="/dashboard" className="back-home"><ArrowLeft size={16} /> Voltar ao conselho</Link>
      <section className="auth-panel" style={{ maxWidth: 760, width: "min(760px, calc(100% - 48px))" }}>
        <div className="auth-brand">
          <span className="brand-mark"><BrainCircuit size={21} /></span>
          <span>MULTI<span className="brand-light">CONSCIÊNCIA</span><span className="brand-count">15</span></span>
        </div>
        <div className="auth-heading">
          <div className="eyebrow">MEMÓRIA DO CONSELHO · {meeting.status.toUpperCase()}</div>
          <h1>{meeting.title}</h1>
          <p><Clock3 size={14} /> Criada em {new Date(meeting.created_at).toLocaleString("pt-BR")}</p>
        </div>
        {query.warning === "message" && <p className="form-error" role="alert">A reunião foi salva, mas não conseguimos registrar a mensagem inicial.</p>}
        <div className="empty-state" style={{ marginBottom: 18 }}>
          <MessageSquareText size={22} />
          <b>Pauta da presidência</b>
          <p>{meeting.agenda || "Nenhum contexto adicional foi informado."}</p>
        </div>

        <StartRoundButton
          meetingId={meeting.id}
          agents={agents ?? []}
          openingCount={openingCount}
          phaseCounts={phaseCounts}
        />

        {phaseCounts.synthesis >= 1 && (
          <div className="empty-state" style={{ marginBottom: 18 }}>
            <b>Placar da votação</b>
            <p>Favoráveis: {voteTotals.approve ?? 0} · Contrários: {voteTotals.reject ?? 0} · Abstenções: {voteTotals.abstain ?? 0}</p>
            <small>A votação é consultiva. A decisão final continua sendo da presidência.</small>
          </div>
        )}

        <div className="section-title">
          <div><span className="eyebrow">REGISTRO DA SESSÃO</span><h2>Mensagens e argumentos</h2></div>
          <span className="section-count">{rows.length} REGISTROS</span>
        </div>
        {rows.length > 0 ? (
          <div className="meeting-list">
            {rows.map((message) => (
              <article className="meeting-row" key={message.id}>
                <span className="meeting-icon"><MessageSquareText size={17} /></span>
                <div>
                  <b>{message.speaker_type === "president" ? "Presidência" : message.agent_slug ?? "Sistema"} · {["Pauta", "Análise inicial", "Contestação", "Revisão", "Votação", "Síntese"].at(message.round_number) ?? `Etapa ${message.round_number}`}</b>
                  <small>{new Date(message.created_at).toLocaleString("pt-BR")}</small>
                  <p>{message.content}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state"><b>Nenhuma mensagem registrada ainda.</b></div>
        )}
        <div className="auth-secure">◈ Cada etapa gera registros persistentes. Falhas de API podem ser retomadas sem apagar respostas já salvas. Nenhum voto substitui sua decisão como presidente.</div>
      </section>
    </main>
  );
}
