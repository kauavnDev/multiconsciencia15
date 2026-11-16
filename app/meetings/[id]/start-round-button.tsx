"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Agent = { slug: string; name: string };
type Props = { meetingId: string; agents: Agent[]; alreadyStarted: boolean };
type Result = { ok: boolean; error: string };

export default function StartRoundButton({ meetingId, agents, alreadyStarted }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [message, setMessage] = useState("");

  async function startRound() {
    if (busy || alreadyStarted) return;
    setBusy(true);
    setDone(0);
    setMessage("Preparando a primeira rodada...");
    let successes = 0;
    let failures = 0;
    let lastError = "";

    // Limit concurrency to three model calls to reduce rate-limit spikes.
    for (let i = 0; i < agents.length; i += 3) {
      const batch = agents.slice(i, i + 3);
      const results: Result[] = await Promise.all(batch.map(async (agent) => {
        try {
          const response = await fetch(`/api/meetings/${meetingId}/agents/${agent.slug}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          const payload = await response.json().catch(() => ({})) as { error?: string };
          return { ok: response.ok, error: payload.error ?? "" };
        } catch {
          return { ok: false, error: "Falha de conexão com o servidor." };
        }
      }));
      successes += results.filter((result) => result.ok).length;
      failures += results.filter((result) => !result.ok).length;
      lastError = results.find((result) => !result.ok)?.error || lastError;
      setDone(successes);
      setMessage(failures ? `${successes} de ${agents.length} agentes responderam; ${failures} falharam. ${lastError}` : `${successes} de ${agents.length} agentes responderam.`);
    }

    setBusy(false);
    if (successes === agents.length) {
      setMessage("Primeira rodada concluída. Atualizando a reunião...");
      router.refresh();
    } else {
      setMessage(`${successes} respostas salvas. Corrija o problema informado e tente novamente para completar a rodada.`);
      router.refresh();
    }
  }

  return (
    <div style={{ margin: "18px 0", padding: 16, border: "1px solid rgba(98,231,223,.2)", borderRadius: 12, background: "rgba(98,231,223,.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <b style={{ display: "block", marginBottom: 5 }}>Primeira rodada · análise independente</b>
          <span style={{ color: "#8995ad", fontSize: 12 }}>Os 15 agentes recebem a pauta separadamente. Nenhuma decisão é executada sem sua autorização.</span>
        </div>
        <button className="button button-primary" type="button" onClick={startRound} disabled={busy || alreadyStarted} style={{ opacity: busy || alreadyStarted ? .55 : 1 }}>
          {busy ? "Agentes trabalhando..." : alreadyStarted ? "Rodada já iniciada" : "Iniciar 1ª rodada"}
        </button>
      </div>
      {(busy || message) && <p role="status" style={{ margin: "12px 0 0", color: "#9de9e2", fontSize: 12 }}>{busy ? `Processando: ${done}/${agents.length}. ` : ""}{message}</p>}
    </div>
  );
}
