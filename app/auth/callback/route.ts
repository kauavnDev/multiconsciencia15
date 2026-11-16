import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeRedirectTarget(value: string | null, origin: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\r\n]/.test(value)) {
    return new URL("/dashboard", origin);
  }

  try {
    const target = new URL(value, origin);
    return target.origin === origin ? target : new URL("/dashboard", origin);
  } catch {
    return new URL("/dashboard", origin);
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(safeRedirectTarget(searchParams.get("next"), origin));
    }
  }

  return NextResponse.redirect(new URL("/login?message=auth_error", origin));
}
