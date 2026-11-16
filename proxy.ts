import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Keep public pages available during the first deploy, but the dashboard
  // also performs a server-side auth check and remains closed without a session.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // A response that refreshes an auth cookie must never be shared by a CDN.
        response.headers.set("Cache-Control", "private, no-store, max-age=0");
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const path = request.nextUrl.pathname;

  if ((error || !data?.claims) && path.startsWith("/dashboard")) {
    const target = request.nextUrl.clone();
    target.pathname = "/login";
    target.search = "";
    target.searchParams.set("next", path);
    return NextResponse.redirect(target);
  }

  if (data?.claims && ["/login", "/signup"].includes(path)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
