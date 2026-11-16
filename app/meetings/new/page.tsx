import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BrainCircuit, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createMeeting } from "./actions";
import ParticipantPicker from "@/components/participant-picker";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewMeetingPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");

  const { data: agents } = await supabase.from("agents").select("slug,name,specialty").eq("is_fixed", true).order("name");
  const params = await searchParams;
  const errorMessage =
    params.error === "invalid"
      ? "Confira o título e a pauta. O título deve ter até 160 caracteres."
      : params.error === "save"
        ? "Não foi possível salvar a reunião. Tente novamente."
        : null;

  return (
    <main className="auth-shell">
      <Link href="/dashboard" className="back-home"><ArrowLeft size={16} /> Voltar ao conselho</Link>
      <section className="auth-panel">
        <div className="auth-brand">
          <span className="brand-mark"><BrainCircuit size={21} /></span>
          <span>MULTI<span className="brand-light">CONSCIÊNCIA</span><span className="brand-count">15</span></span>
        </div>
        <div className="auth-heading">
          <div className="eyebrow">NOVA SESSÃO</div>
          <h1>Coloque uma<br /><span className="gradient-text">ideia à mesa.</span></h1>
          <p>Registre o tema e a pauta que o conselho deverá analisar.</p>
        </div>
        {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
        <form className="auth-form" action={createMeeting}>
          <label className="field-label" htmlFor="title">Nome da reunião</label>
          <input className="field" id="title" name="title" required maxLength={160} placeholder="Ex.: Como lançar meu próximo produto?" />
          <label className="field-label" htmlFor="agenda">Pauta e contexto</label>
          <textarea className="field" id="agenda" name="agenda" rows={7} maxLength={12000} placeholder="Explique o desafio, o objetivo e o que você quer decidir..." />
          <ParticipantPicker agents={agents ?? []} />
          <p className="field-hint">A reunião será salva no seu espaço privado. O Diretor-Geral coordena; você pode definir ou complementar a equipe.</p>
          <button className="button button-primary button-full button-large" type="submit"><Plus size={18} /> Criar reunião</button>
        </form>
        <div className="auth-secure">◈ Somente você pode acessar suas reuniões</div>
      </section>
    </main>
  );
}
