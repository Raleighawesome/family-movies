import ChatShell from "@/components/chat/chat-shell";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdContext, listHouseholdMembers } from "@/lib/households";
import type { ChatHistoryRow, HouseholdFilterLimit, RecommendationMovie } from "@/types/db";

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

async function fetchChatHistory(householdId: string): Promise<ChatHistoryRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("household_chat_messages")
    .select("id, created_at, household_id, role, content, metadata")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true })
    .limit(40);

  if (error) {
    if ((error as { code?: string }).code === "42P01") {
      return [];
    }
    throw error;
  }

  return (data as ChatHistoryRow[]) ?? [];
}

function mapRecommendations(metadata: Record<string, unknown> | null): RecommendationMovie[] | undefined {
  if (!metadata) return undefined;
  const possible = (metadata as { recommendations?: unknown }).recommendations;
  if (Array.isArray(possible)) {
    return possible.filter((item): item is RecommendationMovie => {
      return !!item && typeof item === "object" && "title" in item;
    });
  }
  return undefined;
}

export default async function Page() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <section className="card" style={{ maxWidth: 420, margin: "4rem auto" }}>
        <h2 style={{ marginTop: 0 }}>Sign in required</h2>
        <p style={{ color: "var(--text-muted)" }}>
          Sign in with your email to chat with the family movie assistant and manage your filters.
        </p>
        <a href="/login">
          <button type="button">Go to login</button>
        </a>
      </section>
    );
  }

  const householdContext = await getActiveHouseholdContext();
  if (!householdContext) {
    return (
      <section className="card" style={{ maxWidth: 520, margin: "4rem auto" }}>
        <h2 style={{ marginTop: 0 }}>Finish onboarding</h2>
        <p style={{ color: "var(--text-muted)" }}>
          We couldn’t find a household for your account yet. Complete sign-up by choosing or creating a household,
          then come back to start chatting.
        </p>
      </section>
    );
  }

  const filters = await fetchFilters(householdContext.householdId);
  const members = await listHouseholdMembers(householdContext.householdId);
  const history = await fetchChatHistory(householdContext.householdId);

  const filterSummaries = filters.map((filter) => ({
    labelKey: filter.label_key,
    maxIntensity: filter.max_intensity,
    hardNo: filter.hard_no,
  }));

  const messages = history.map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
    recommendations: mapRecommendations(row.metadata ?? null),
  }));

  return (
    <ChatShell
      householdId={householdContext.householdId}
      householdName={householdContext.householdName}
      filters={filterSummaries}
      members={members}
      initialMessages={messages}
    />
  );
}
