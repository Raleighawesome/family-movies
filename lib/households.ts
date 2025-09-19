import { createClient } from "@/lib/supabase/server";

type RawHouseholdMembership = {
  id: string;
  user_id: string;
  display_name: string | null;
  household_id: string;
  households?: { name: string | null } | null;
};

type RawHouseholdMember = {
  id: string;
  display_name: string | null;
  birthday: string | null;
  user_email: string | null;
};

export type ActiveHouseholdContext = {
  user: { id: string; email?: string | null };
  membershipId: string;
  displayName: string | null;
  householdId: string;
  householdName: string | null;
};

export type HouseholdMember = {
  id: string;
  displayName: string | null;
  birthday: string | null;
  email: string | null;
};

export async function getActiveHouseholdContext(): Promise<ActiveHouseholdContext | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("household_members")
    .select("id, user_id, display_name, household_id, households(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<RawHouseholdMembership>();

  if (error || !data) return null;

  return {
    user: { id: user.id, email: user.email },
    membershipId: data.id,
    displayName: data.display_name,
    householdId: data.household_id,
    householdName: data.households?.name ?? null,
  };
}

export async function requireActiveHouseholdContext(): Promise<ActiveHouseholdContext> {
  const context = await getActiveHouseholdContext();
  if (!context) {
    throw new Error("No active household context");
  }
  return context;
}

export async function listHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("household_members")
    .select("id, display_name, birthday, user_email")
    .eq("household_id", householdId)
    .order("display_name", { ascending: true })
    .returns<RawHouseholdMember[]>();

  if (error) {
    // If the table is missing or the user has no access yet, surface an empty list.
    if ((error as { code?: string }).code === "42P01") {
      return [];
    }
    throw error;
  }

  return (data ?? []).map((member) => ({
    id: member.id,
    displayName: member.display_name,
    birthday: member.birthday,
    email: member.user_email,
  }));
}
