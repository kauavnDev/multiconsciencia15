"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, BrainCircuit, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function safeInternalPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\r\n]/.test(value)) {
    return "/dashboard";
  }

  try {
    const target = new URL(value, window.location.origin);
    return target.origin === window.location.origin
      ? target.pathname + target.search + target.hash
      : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      router.replace(safeInternalPath(params.get("next")));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label className="field-label" htmlFor="email">E-mail</label>
      <input
        id="email"
        className="field"
        type="email"
        autoComplete="email"
        required
        maxLength={254}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="voce@email.com"
      />

      <label className="field-label" htmlFor="password">Senha</label>
      <div className="password-wrap">
        <input
          id="password"
          className="field"
          type={show ? "text" : "password"}
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Sua senha"
        />
        <button
          className="password-toggle"
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>

      <div className="form-meta">
        <span />
        <Link href="/forgot-password">Esqueceu a senha?</Link>
      </div>

      {error && <p className="form-error" role="alert" aria-live="polite">{error}</p>}

      <button className="button button-primary button-full button-large" disabled={busy}>
        {busy ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : null}
        {busy ? "Entrando…" : "Entrar no conselho"}
      </button>
      <p className="auth-switch">
        Ainda não tem uma conta? <Link href="/signup">Criar conta</Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <Link href="/" className="back-home"><ArrowLeft size={16} /> Voltar ao início</Link>
      <div className="auth-panel">
        <div className="auth-brand">
          <span className="brand-mark"><BrainCircuit size={21} /></span>
          <span>MULTI<span className="brand-light">CONSCIÊNCIA</span><span className="brand-count">15</span></span>
        </div>
        <div className="auth-heading">
          <div className="eyebrow">SUA MESA ESTÁ ESPERANDO</div>
          <h1>Bem-vindo<br /><span className="gradient-text">de volta.</span></h1>
          <p>Acesse sua sala e continue de onde parou.</p>
        </div>
        <Suspense fallback={<div className="loading-line">Carregando…</div>}>
          <LoginForm />
        </Suspense>
        <div className="auth-secure">◈ Conexão protegida · Suas conversas são privadas</div>
      </div>
      <div className="auth-aside">
        <div className="aside-orb"><BrainCircuit size={48} /></div>
        <h2>Discordar também é<br /><span className="gradient-text">uma forma de pensar.</span></h2>
        <p>Um conselho forte não é aquele que concorda com tudo. É aquele que encontra os pontos cegos antes que virem problemas.</p>
        <div className="aside-signature">MULTI-CONSciÊNCIA <span>15</span></div>
      </div>
    </main>
  );
}
