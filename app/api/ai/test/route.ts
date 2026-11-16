import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runWithBestAvailableProvider } from "@/lib/ai/provider-router";

export async function POST() {
  const supabase = await createClient();
  const { data: auth, error } = await supabase.auth.getUser();
  if (error || !auth.user) return NextResponse.json({ error: "Faça login para testar a IA." }, { status: 401 });

  try {
    const result = await runWithBestAvailableProvider({
      systemPrompt: "Você é um verificador de conectividade. Responda somente: CONEXÃO OK.",
      input: "Confirme que o provedor está respondendo.",
      health: [],
      allowPaid: false,
    });
    return NextResponse.json({ ok: true, provider: result.provider, model: result.model, response: result.text });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Não foi possível conectar aos provedores configurados.";
    return NextResponse.json({ ok: false, error: message.slice(0, 1200) }, { status: 503 });
  }
}
