import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  CHURCH_DASHBOARD_PATH,
  isChurchAppPath,
  legacyChurchRedirect,
} from "@/lib/apps/church-routes";
import { isBackofficeAppPath } from "@/lib/apps/backoffice-routes";
import { resolveSessionRequiresPasswordChange } from "@/lib/auth/fetch-session-password-gate";
import { UPDATE_PASSWORD_PATH } from "@/lib/auth/temp-password-flow";
import {
  isOrgAppPath,
  isOrgPathPrefixAllowed,
  isOrgPortalHost,
  ORG_ROUTE_PREFIX,
} from "@/lib/org/host";
import { getSupabaseEnv, supabaseClientOptions } from "./config";

function hasSupabaseSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(({ name }) => name.includes("-auth-token"));
}

function isLegacyChurchProtectedPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  return (
    path.startsWith("/dashboard") ||
    path.startsWith("/members") ||
    path.startsWith("/ministerios") ||
    path.startsWith("/finances") ||
    path.startsWith("/eventos") ||
    path.startsWith("/comunicacion") ||
    path.startsWith("/settings") ||
    path.startsWith("/network") ||
    path.startsWith("/reports")
  );
}

function isChurchProtectedPath(pathname: string): boolean {
  if (isLegacyChurchProtectedPath(pathname)) return true;
  if (!isChurchAppPath(pathname)) return false;
  const suffix = pathname.slice("/apps/church".length);
  return suffix.length > 0;
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const orgHost = isOrgPortalHost(request.headers.get("host"));
  const orgPath = isOrgAppPath(pathname);
  const churchAppPath = isChurchAppPath(pathname);
  const backofficeAppPath = isBackofficeAppPath(pathname);

  const legacyRedirect = legacyChurchRedirect(pathname);
  if (legacyRedirect && !orgHost && !orgPath) {
    const url = request.nextUrl.clone();
    const [redirectPath, redirectSearch = ""] = legacyRedirect.split("?");
    url.pathname = redirectPath;
    // Preserve ?id=… and other query params from the original request.
    if (redirectSearch) {
      url.search = redirectSearch.startsWith("?")
        ? redirectSearch.slice(1)
        : redirectSearch;
    }
    return NextResponse.redirect(url);
  }

  if (orgHost && !orgPath && !pathname.startsWith("/auth") && !churchAppPath) {
    const url = request.nextUrl.clone();
    if (pathname === "/" || pathname === "/login" || pathname.startsWith("/login/")) {
      url.pathname =
        pathname === "/" || pathname === "/login"
          ? `${ORG_ROUTE_PREFIX}/dashboard`
          : `${ORG_ROUTE_PREFIX}${pathname}`;
      return NextResponse.redirect(url);
    }
    if (isLegacyChurchProtectedPath(pathname) || churchAppPath) {
      const url = request.nextUrl.clone();
      url.pathname = `${ORG_ROUTE_PREFIX}/dashboard`;
      return NextResponse.redirect(url);
    }
  }

  if (
    !isOrgPathPrefixAllowed(request.headers.get("host")) &&
    orgPath &&
    pathname !== `${ORG_ROUTE_PREFIX}/login`
  ) {
    const url = request.nextUrl.clone();
    url.pathname = CHURCH_DASHBOARD_PATH;
    return NextResponse.redirect(url);
  }

  const loginPath = orgPath ? `${ORG_ROUTE_PREFIX}/login` : "/login";
  if (pathname.startsWith(loginPath) && !hasSupabaseSessionCookie(request)) {
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
    pathname === `${ORG_ROUTE_PREFIX}/login` ||
    pathname.startsWith("/auth");

  const isUpdatePasswordRoute = pathname === UPDATE_PASSWORD_PATH;

  const isProtected =
    isChurchProtectedPath(pathname) ||
    backofficeAppPath ||
    (orgPath && pathname !== `${ORG_ROUTE_PREFIX}/login`);

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = orgPath ? `${ORG_ROUTE_PREFIX}/login` : "/login";
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
      url.pathname = CHURCH_DASHBOARD_PATH;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (user && isAuthRoute && !isUpdatePasswordRoute) {
    if (pathname !== `${ORG_ROUTE_PREFIX}/login`) {
      const url = request.nextUrl.clone();
      url.pathname =
        orgPath || orgHost ? `${ORG_ROUTE_PREFIX}/dashboard` : CHURCH_DASHBOARD_PATH;
      return NextResponse.redirect(url);
    }
  }

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    if (orgHost) {
      url.pathname = `${ORG_ROUTE_PREFIX}/dashboard`;
    } else {
      url.pathname = user ? CHURCH_DASHBOARD_PATH : "/login";
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
