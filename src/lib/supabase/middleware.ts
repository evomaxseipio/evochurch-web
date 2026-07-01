import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveSessionRequiresPasswordChange } from "@/lib/auth/fetch-session-password-gate";
import { UPDATE_PASSWORD_PATH } from "@/lib/auth/temp-password-flow";
import { getSupabaseEnv, supabaseClientOptions } from "./config";

function hasSupabaseSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(({ name }) => name.includes("-auth-token"));
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Visitantes anónimos al login: sin round-trip a Supabase Auth.
  if (pathname.startsWith("/login") && !hasSupabaseSessionCookie(request)) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    ...supabaseClientOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/auth");

  const isUpdatePasswordRoute = pathname === UPDATE_PASSWORD_PATH;

  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/members") ||
    pathname.startsWith("/ministerios") ||
    pathname.startsWith("/finances") ||
    pathname.startsWith("/eventos") ||
    pathname.startsWith("/comunicacion") ||
    pathname.startsWith("/settings");

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (isProtected || isUpdatePasswordRoute || isAuthRoute)) {
    const mustChangePassword = await resolveSessionRequiresPasswordChange(
      supabase,
      user,
    );

    if (mustChangePassword && (isProtected || (isAuthRoute && !isUpdatePasswordRoute))) {
      const url = request.nextUrl.clone();
      url.pathname = UPDATE_PASSWORD_PATH;
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (!mustChangePassword && isUpdatePasswordRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (user && isAuthRoute && !isUpdatePasswordRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/dashboard" : "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
