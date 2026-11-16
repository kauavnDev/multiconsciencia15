"use client";

import { useState } from "react";

export default function AiProviderTest() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  async function test() {
    if (busy) return;
    setBusy(true);
    setResult("Testando uma chamada real em um provedor gratuito...");
    try {
      const response = await fetch("/api/ai/test", { method: "POST" });
      const payload = await response.json().catch(() => ({})) as { ok?: boolean; provider?: string; model?: string; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Falha no teste.");
      setResult(`Conexão confirmada: ${payload.provider} · ${payload.model}`);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Falha ao testar a IA.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button type="button" className="button" onClick={test} disabled={busy} style={{ fontSize: 12, padding: "8px 12px" }}>
        {busy ? "Testando..." : "Testar conexão real da IA"}
      </button>
      {result && <p role="status" style={{ margin: "8px 0 0", color: result.startsWith("Conexão confirmada") ? "#9de9e2" : "#f2c18b", fontSize: 12, overflowWrap: "anywhere" }}>{result}</p>}
    </div>
  );
}
