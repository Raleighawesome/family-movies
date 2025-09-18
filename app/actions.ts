"use server";

import { createClient } from "@/lib/supabase/server";

export async function logWatch(movieId: string) {
  const supabase = createClient();

  // Get session and household membership (for beta, we’ll assume the user’s first household)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  // Fetch a household the user belongs to
  const { data: hm, error: hmErr } = await supabase
    .from("household_members")
    .select("household_id,id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (hmErr || !hm) return { ok: false, error: "No household membership found" };

  // Call the RPC (RLS will enforce membership)
  const { data, error } = await supabase.rpc("log_movie_watch", {
    p_household_id: hm.household_id,
    p_movie_id: movieId,
    p_member_ids: [hm.id] // log current member by default
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

