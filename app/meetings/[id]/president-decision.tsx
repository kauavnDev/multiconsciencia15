"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PresidentDecision({ meetingId, completed }: { meetingId: string; completed: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function decide(decision: "approved" | "rejected") {
    if (busy || completed) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/meetings/${meetingId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível registrar a decisão.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao registrar a decisão.");
    } finally {
      setBusy(false);
    }
  }

  if (completed) return <div className="empty-state" style={{ marginBottom: 18 }}><b>Decisão da presidência registrada.</b><p>Esta reunião foi encerrada e permanece no histórico.</p></div>;

  return (
    <section className="empty-state" style={{ marginBottom: 18, textAlign: "left" }}>
      <b>Decisão final da presidência</b>
      <p>Os votos são consultivos. Você pode aprovar ou rejeitar a proposta, mesmo que discorde da maioria.</p>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={4000}
        placeholder="Justificativa ou condições da decisão (opcional)"
        rows={3}
        style={{ width: "100%", margin: "10px 0", padding: 12, borderRadius: 10, color: "inherit", background: "rgba(8,14,30,.55)", border: "1px solid rgba(140,160,190,.25)", resize: "vertical" }}
      />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="button button-primary" type="button" disabled={busy} onClick={() => decide("approved")}>{busy ? "Salvando..." : "Aprovar proposta"}</button>
        <button className="button" type="button" disabled={busy} onClick={() => decide("rejected")}>Rejeitar proposta</button>
      </div>
      {error && <p role="alert" style={{ color: "#ff9b9b", fontSize: 12 }}>{error}</p>}
    </section>
  );
}
