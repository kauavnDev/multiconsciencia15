import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BrainCircuit, Clock3, Download, MessageSquareText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import StartRoundButton from "./start-round-button";

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

  const [{ data: messages }, { data: agents }] = await Promise.all([supabase
    .from("meeting_messages")
    .select("id,speaker_type,agent_slug,content,round_number,created_at")
    .eq("meeting_id", id)
    .order("created_at", { ascending: true }),
    supabase.from("agents").select("slug,name").eq("is_fixed", true).order("name", { ascending: true }),
  ]);

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
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "18px 0" }}><StartRoundButton meetingId={meeting.id} agents={agents ?? []} alreadyStarted={(messages ?? []).filter((message) => message.speaker_type === "agent" && message.round_number === 1).length >= 15} /><Link className="button button-ghost" href={`/api/meetings/${meeting.id}/export`}><Download size={15} /> Exportar para continuar no ChatGPT</Link></div>
        <div className="section-title">
          <div><span className="eyebrow">REGISTRO DA SESSÃO</span><h2>Mensagens e argumentos</h2></div>
          <span className="section-count">{messages?.length ?? 0} REGISTROS</span>
        </div>
        {messages && messages.length > 0 ? (
          <div className="meeting-list">
            {messages.map((message) => (
              <article className="meeting-row" key={message.id}>
                <span className="meeting-icon"><MessageSquareText size={17} /></span>
                <div>
                  <b>{message.speaker_type === "president" ? "Presidência" : message.agent_slug ?? "Sistema"}</b>
                  <small>{new Date(message.created_at).toLocaleString("pt-BR")}</small>
                  <p>{message.content}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state"><b>Nenhuma mensagem registrada ainda.</b></div>
        )}
        <div className="auth-secure">◈ As análises são geradas individualmente pela API. As próximas fases de contestação, revisão e votação serão liberadas em etapas.</div>
      </section>
    </main>
  );
}
