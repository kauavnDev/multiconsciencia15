import AiProviderTest from "./ai-provider-test";

export default function AiProviderStatus() {
  const providers = [
    { name: "Google Gemini", configured: Boolean(process.env.GEMINI_API_KEY) },
    { name: "Groq", configured: Boolean(process.env.GROQ_API_KEY) },
    { name: "OpenRouter", configured: Boolean(process.env.OPENROUTER_API_KEY) },
  ];
  const configuredCount = providers.filter((provider) => provider.configured).length;

  return (
    <section className="empty-state" style={{ marginTop: 18, textAlign: "left" }}>
      <b>Conexão dos provedores de IA</b>
      <p>{configuredCount} de 3 provedores gratuitos configurados no servidor. As chaves nunca são exibidas no navegador.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        {providers.map((provider) => (
          <span key={provider.name} style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 9px",
            borderRadius: 999, fontSize: 11,
            border: `1px solid ${provider.configured ? "rgba(98,231,223,.35)" : "rgba(255,180,100,.35)"}`,
            color: provider.configured ? "#9de9e2" : "#f2c18b",
            background: provider.configured ? "rgba(98,231,223,.06)" : "rgba(255,180,100,.06)",
          }}>
            <span>{provider.configured ? "●" : "○"}</span>{provider.name}
          </span>
        ))}
      </div>
      <small style={{ display: "block", marginTop: 10, color: "#8995ad" }}>Provedores pagos permanecem bloqueados por segurança.</small>
      <AiProviderTest />
    </section>
  );
}
