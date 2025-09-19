import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error("[supabase] Missing required environment variable", { name });
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function createClient() {
  const cookieStore = cookies();
  console.log("[supabase] Creating server client (server-side)", {
    hasCookieStore: Boolean(cookieStore),
  });

  const supabaseUrl = getEnvVar("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  console.log("[supabase] Environment variables loaded", {
    supabaseUrlLength: supabaseUrl.length,
    anonKeyLength: supabaseAnonKey.length,
  });

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        console.log("[supabase] Reading cookie", { name });
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          console.log("[supabase] Setting cookie", { name, hasValue: Boolean(value), options });
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          console.warn("Failed to set Supabase auth cookie", { name, error });
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          console.log("[supabase] Removing cookie", { name, options });
          cookieStore.set({ name, value: "", ...options });
        } catch (error) {
          console.warn("Failed to clear Supabase auth cookie", { name, error });
        }
      },
    },
  });
}

