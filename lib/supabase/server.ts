import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Read-only Supabase client for Server Components.
 *
 * Cookie set/remove throws explicitly. Server Components cannot mutate cookies
 * (see Next.js docs: cookies.set is restricted to Server Functions / Route Handlers).
 * Silently swallowing the call would let session refresh quietly stop working.
 *
 * For mutations, use the action/route-handler factory or middleware factory.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          throw new Error(
            "Cannot set cookies from a Server Component. Use a Server Action, Route Handler, or middleware.",
          );
        },
      },
    },
  );
}

/**
 * Action / Route Handler client. Cookie writes succeed.
 * Use inside `'use server'` functions or `app/api/.../route.ts`.
 */
export async function createActionClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );
}
