import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // This middleware now runs on nearly every route (see matcher below),
  // so a missing/misconfigured .env.local would otherwise crash every
  // single page with an unhandled exception instead of just /admin and
  // /account. Fail soft here: let public pages render normally, and
  // only block the routes that actually require a working Supabase
  // connection to enforce access control.
  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[middleware] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. " +
          "Copy .env.example to .env.local and fill in your Supabase project's URL and anon key " +
          "(Project Settings → API in the Supabase dashboard). Auth-gated routes are unprotected until then."
      );
    }
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Admin routes require a signed-in staff/admin profile. RLS is the
  // real backstop for data access — this just avoids rendering the UI
  // for people who obviously shouldn't see it.
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login?redirect=/admin", request.url));
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || !["staff", "admin"].includes(profile.role)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (request.nextUrl.pathname.startsWith("/account") && !user) {
    return NextResponse.redirect(new URL(`/login?redirect=${request.nextUrl.pathname}`, request.url));
  }

  return response;
}

export const config = {
  // Run on virtually every route so Supabase's session cookie gets
  // refreshed on each navigation — previously this only matched
  // /admin and /account, so a session could silently expire while
  // someone browsed /shop or /product/* without ever hitting a route
  // that refreshed it, logging them out unexpectedly. Static assets
  // and Next internals are excluded since they never carry a session.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)"],
};
