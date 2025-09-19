import PreferencesPanel from "@/components/preferences/preferences-panel";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdContext } from "@/lib/households";
import type { HouseholdFilterLimit } from "@/types/db";

async function fetchFilters(householdId: string): Promise<HouseholdFilterLimit[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("household_filter_limits")
    .select("label_key, max_intensity, hard_no")
    .eq("household_id", householdId)
    .order("label_key");

  if (error) {
    if ((error as { code?: string }).code === "42P01") {
      return [];
    }
    throw error;
  }

  return (data as HouseholdFilterLimit[]) ?? [];
}

export default async function PreferencesPage() {
  const user = getAuthenticatedUser();

  if (!user) {
    return (
      <section className="card" style={{ maxWidth: 420, margin: "4rem auto" }}>
        <h2 style={{ marginTop: 0 }}>Sign in to manage filters</h2>
        <p style={{ color: "var(--text-muted)" }}>
          Your household filters live in Supabase. Sign in with the shared credentials{" "}
          (<code>admin</code> / <code>movies</code>) so we can load and update them securely.
        </p>
        <a href="/login">
          <button type="button">View sign-in instructions</button>
        </a>
      </section>
    );
  }

  const context = await getActiveHouseholdContext();
  if (!context) {
    return (
      <section className="card" style={{ maxWidth: 520, margin: "4rem auto" }}>
        <h2 style={{ marginTop: 0 }}>No household found</h2>
        <p style={{ color: "var(--text-muted)" }}>
          Finish onboarding by joining or creating a household. Once that’s done, you’ll be able to configure filters here.
        </p>
      </section>
    );
  }

  const filters = await fetchFilters(context.householdId);
  const filterViews = filters.map((filter) => ({
    labelKey: filter.label_key,
    maxIntensity: filter.max_intensity,
    hardNo: filter.hard_no,
  }));

  return <PreferencesPanel filters={filterViews} householdName={context.householdName} />;
}
