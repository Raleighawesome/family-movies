"use server";

import { createClient } from "@/lib/supabase/server";

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { ok: false, error: "Email required" };

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/auth/callback`
    }
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

