import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Catalog pages are now cached (see lib/supabase/public.ts — every
 * public catalog read is tagged "catalog" and cached for up to 5
 * minutes). That's a big win for normal traffic, but it means an
 * admin toggling a product live in /admin/products would otherwise
 * have to wait out the cache window before it actually appears on
 * the storefront. This endpoint lets the admin UI purge the catalog
 * cache immediately after a write, so publish/unpublish actions are
 * visible right away without giving up the caching benefit day to day.
 *
 * Auth is re-checked here independently of the client-side Supabase
 * call that made the actual write — never trust that a request only
 * reaches this route because the UI happened to render for the right
 * person.
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["staff", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  revalidateTag("catalog");
  return NextResponse.json({ revalidated: true });
}
