"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Agent = { slug: string; name: string };
type Phase = "challenge" | "revision" | "voting" | "synthesis";
type Props = {
  meetingId: string;
  agents: Agent[];
  openingCount: number;
  phaseCounts: Record<Phase, number>;
};
type Result = { ok: boolean; error: string; model?: string };

const phases: { key: Phase; title: string; description: string; expected: number; agents: string[] | "all" }[] = [
  { key: "challenge", title: "Contestação", description: "Os especialistas confrontam as análises e apontam falhas, riscos e premissas frágeis.", expected: 15, agents: "all" },
  { key: "revision", title: "Revisão de posições", description: "Cada agente reconsidera sua posição sem ser obrigado a concordar com a maioria.", expected: 15, agents: "all" },
  { key: "voting", title: "Votação independente", description: "Cada conselheiro registra aprovar, rejeitar ou abster-se, com justificativa.", expected: 15, agents: "all" },
  { key: "synthesis", title: "Síntese do Mediador", description: "O Mediador registra acordos, divergências, votos e questões em aberto, sem forçar consenso.", expected: 1, agents: ["mediador"] },
];

export default function StartRoundButton({ meetingId, agents, openingCount, phaseCounts }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [message, setMessage] = useState("");
  const [activeTitle, setActiveTitle] = useState("");
  const next = useMemo(() => {
    if (openingCount < 15) return { key: "opening" as const, title: "Análise independente", expected: 15 };
    const pending = phases.find((phase) => phaseCounts[phase.key] < phase.expected);
    return pending ? { key: pending.key, title: pending.title, expected: pending.expected } : null;
  }, [openingCount, phaseCounts]);

  async function runNext() {
    if (busy || !next) return;
    setBusy(true);
    setDone(0);
    setActiveTitle(next.title);
    setMessage("Preparando os conselheiros...");
    const selected = next.key === "opening"
      ? agents
      : phases.find((phase) => phase.key === next.key)?.agents === "all"
        ? agents
        : agents.filter((agent) => agent.slug === "mediador");
    const targets = selected ?? [];
    let successes = 0;
    let failures = 0;
    let lastError = "";
    const models = new Set<string>();

    for (let i = 0; i < targets.length; i += 3) {
      const batch = targets.slice(i, i + 3);
      const results: Result[] = await Promise.all(batch.map(async (agent) => {
        try {
          const url = next.key === "opening"
            ? `/api/meetings/${meetingId}/agents/${agent.slug}`
            : `/api/meetings/${meetingId}/phases/${next.key}/${agent.slug}`;
          const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" } });
          const payload = await response.json().catch(() => ({})) as { error?: string; model?: string };
          return { ok: response.ok, error: payload.error ?? "", model: payload.model };
        } catch {
          return { ok: false, error: "Falha de conexão com o servidor." };
        }
      }));
      successes += results.filter((r) => r.ok).length;
      failures += results.filter((r) => !r.ok).length;
      results.filter((r) => r.model).forEach((r) => models.add(r.model as string));
      lastError = results.find((r) => !r.ok)?.error || lastError;
      setDone(successes);
      setMessage(failures
        ? `${successes} de ${targets.length} concluídos; ${failures} falharam. ${lastError}`
        : `${successes} de ${targets.length} concluídos. Modelos: ${Array.from(models).join(", ")}.`);
    }

    setBusy(false);
    if (successes === targets.length && failures === 0) {
      setMessage(`${next.title} concluída. Atualizando o conselho...`);
    } else {
      setMessage(`${successes} respostas salvas. As tarefas restantes foram preservadas; toque novamente para retomar.`);
    }
    router.refresh();
  }

  const completedStages = (openingCount >= 15 ? 1 : 0)
    + phases.filter((phase) => phaseCounts[phase.key] >= phase.expected).length;

  return (
    <section style={{ margin: "18px 0", padding: 16, border: "1px solid rgba(98,231,223,.2)", borderRadius: 12, background: "rgba(98,231,223,.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <b style={{ display: "block", marginBottom: 5 }}>Conselho multiagente · {completedStages}/5 etapas</b>
          <span style={{ color: "#8995ad", fontSize: 12 }}>Análise → contestação → revisão → votação → síntese. Você mantém a decisão final.</span>
        </div>
        <button className="button button-primary" type="button" onClick={runNext} disabled={busy || !next} style={{ opacity: busy || !next ? .55 : 1 }}>
          {busy ? "Conselheiros trabalhando..." : next ? `Executar: ${next.title}` : "Sessão analisada"}
        </button>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
        <StageLine title="1. Análise independente" count={openingCount} expected={15} />
        {phases.map((phase, index) => <StageLine key={phase.key} title={`${index + 2}. ${phase.title}`} count={phaseCounts[phase.key]} expected={phase.expected} />)}
      </div>
      {busy && <p role="status" style={{ margin: "12px 0 0", color: "#9de9e2", fontSize: 12 }}>Processando {activeTitle}: {done}/{next?.expected ?? 0}.</p>}
      {message && <p role="status" style={{ margin: "8px 0 0", color: "#9de9e2", fontSize: 12 }}>{message}</p>}
      {!next && <p style={{ margin: "12px 0 0", color: "#9de9e2", fontSize: 12 }}>Todas as etapas foram concluídas. Revise a síntese e os votos antes de registrar sua decisão.</p>}
    </section>
  );
}

function StageLine({ title, count, expected }: { title: string; count: number; expected: number }) {
  const complete = count >= expected;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
      <span style={{ color: complete ? "#9de9e2" : "#aab3c6" }}>{complete ? "✓" : "○"} {title}</span>
      <span style={{ color: "#8995ad", fontVariantNumeric: "tabular-nums" }}>{Math.min(count, expected)}/{expected}</span>
    </div>
  );
}
