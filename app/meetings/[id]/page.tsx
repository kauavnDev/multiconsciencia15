import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BrainCircuit, Clock3, MessageSquareText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

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

  const { data: messages } = await supabase
    .from("meeting_messages")
    .select("id,speaker_type,agent_slug,content,round_number,created_at")
    .eq("meeting_id", id)
    .order("created_at", { ascending: true });

  return (
    <main className="auth-shell">
      <Link href="/dashboard" className="back-home"><ArrowLeft size={16} /> Voltar ao conselho</Link>
      <section className="auth-panel" style={{ maxWidth: 760 }}>
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
        <div className="auth-secure">◈ A reunião está salva. A rodada de debate com IA será ativada na próxima etapa.</div>
      </section>
    </main>
  );
}
