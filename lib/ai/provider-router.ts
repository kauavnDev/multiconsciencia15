export type AiProviderName = "gemini" | "groq" | "openrouter" | "openai";

export type AiProvider = {
  name: AiProviderName;
  label: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  quality: number;
  speed: number;
  freeRoute: boolean;
};

export type ProviderAttempt = {
  provider: AiProviderName;
  model: string;
  ok: boolean;
  status?: number;
  latencyMs: number;
  error?: string;
};

type ProviderHealth = {
  provider: string;
  consecutive_failures: number;
  cooldown_until: string | null;
  average_latency_ms: number | null;
};

type RouterOptions = {
  systemPrompt: string;
  input: string;
  health: ProviderHealth[];
  allowPaid: boolean;
  onAttempt?: (attempt: ProviderAttempt) => Promise<void>;
};

export type RouterResult = {
  text: string;
  provider: AiProviderName;
  model: string;
  attempts: ProviderAttempt[];
};

function configuredProviders(allowPaid: boolean): AiProvider[] {
  const providers: AiProvider[] = [];
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) providers.push({
    name: "gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    apiKey: geminiKey,
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
    quality: 94,
    speed: 88,
    freeRoute: true,
  });

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) providers.push({
    name: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    apiKey: groqKey,
    model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    quality: 91,
    speed: 98,
    freeRoute: true,
  });

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    const model = process.env.OPENROUTER_MODEL || "openrouter/free";
    const isFreeModel = model.endsWith(":free") || model === "openrouter/free";
    if (allowPaid || isFreeModel) providers.push({
      name: "openrouter",
      label: "OpenRouter",
      baseUrl: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: openRouterKey,
      model,
      quality: 89,
      speed: 82,
      freeRoute: isFreeModel,
    });
  }

  if (allowPaid && process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL) providers.push({
    name: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1/chat/completions",
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL,
    quality: 100,
    speed: 80,
    freeRoute: false,
  });

  return providers.filter((provider) => allowPaid || provider.freeRoute);
}

function healthFor(provider: AiProvider, health: ProviderHealth[]) {
  return health.find((item) => item.provider === provider.name);
}

function rankProviders(providers: AiProvider[], health: ProviderHealth[]) {
  const now = Date.now();
  return providers
    .filter((provider) => {
      const state = healthFor(provider, health);
      return !state?.cooldown_until || new Date(state.cooldown_until).getTime() <= now;
    })
    .sort((a, b) => {
      const aState = healthFor(a, health);
      const bState = healthFor(b, health);
      const aScore = a.quality * 0.62 + a.speed * 0.18
        - (aState?.consecutive_failures ?? 0) * 9
        - (aState?.average_latency_ms ?? 0) / 2500;
      const bScore = b.quality * 0.62 + b.speed * 0.18
        - (bState?.consecutive_failures ?? 0) * 9
        - (bState?.average_latency_ms ?? 0) / 2500;
      return bScore - aScore;
    });
}

function extractText(payload: { choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }> }) {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  return (content ?? []).filter((part) => typeof part.text === "string").map((part) => part.text).join("\n").trim();
}

export async function runWithBestAvailableProvider(options: RouterOptions): Promise<RouterResult> {
  const providers = rankProviders(configuredProviders(options.allowPaid), options.health);
  if (providers.length === 0) {
    throw new Error("Nenhum provedor gratuito configurado ou disponível. A tarefa foi pausada e poderá ser retomada quando uma API estiver disponível.");
  }

  const attempts: ProviderAttempt[] = [];
  for (const provider of providers) {
    const started = Date.now();
    let attempt: ProviderAttempt;
    try {
      const response = await fetch(provider.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json",
          ...(provider.name === "openrouter" ? { "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://multiconsciencia15.vercel.app", "X-Title": "Multi-Consciência 15" } : {}),
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: "system", content: options.systemPrompt },
            { role: "user", content: options.input },
          ],
          temperature: 0.35,
          max_tokens: 650,
        }),
        signal: AbortSignal.timeout(45_000),
        cache: "no-store",
      });
      const latencyMs = Date.now() - started;
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 500);
        attempt = { provider: provider.name, model: provider.model, ok: false, status: response.status, latencyMs, error: detail || `HTTP ${response.status}` };
      } else {
        const payload = await response.json() as { choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }> };
        const text = extractText(payload);
        if (!text) {
          attempt = { provider: provider.name, model: provider.model, ok: false, latencyMs, error: "Resposta vazia do modelo." };
        } else {
          attempt = { provider: provider.name, model: provider.model, ok: true, latencyMs };
          attempts.push(attempt);
          await options.onAttempt?.(attempt);
          return { text, provider: provider.name, model: provider.model, attempts };
        }
      }
    } catch (error) {
      attempt = {
        provider: provider.name,
        model: provider.model,
        ok: false,
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : "Falha de conexão.",
      };
    }
    attempts.push(attempt);
    await options.onAttempt?.(attempt);
    // Do not keep retrying a provider with invalid credentials or a model that does not exist.
    if (attempt.status === 401 || attempt.status === 403 || attempt.status === 404) continue;
  }

  const reasons = attempts.map((attempt) => `${attempt.provider}: ${attempt.error || "falha"}`).join("; ");
  throw new Error(`Todos os provedores disponíveis falharam. A tarefa foi pausada para retomada. ${reasons}`);
}
