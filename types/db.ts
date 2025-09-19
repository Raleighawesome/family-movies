export type CatalogRow = {
  id: string;
  title: string;
  release_year: number | null;
  runtime_minutes: number | null;
  mpaa_rating: string | null;
  synopsis: string | null;
  poster_url: string | null;
  content_labels: { key: string; intensity: number; notes?: string | null }[];
  providers: { service: string; link?: string | null; last_checked_at?: string }[];
};

export type HouseholdFilterLimit = {
  household_id: string | null;
  label_key: string;
  hard_no: boolean;
  max_intensity: number;
};

export type ChatHistoryRow = {
  id: string;
  created_at: string;
  household_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: Record<string, unknown> | null;
};

export type HouseholdMemberRow = {
  id: string;
  household_id: string;
  display_name: string | null;
  birthday: string | null;
  user_email: string | null;
};

export type RecommendationLink = { label: string; url: string };

export type RecommendationMovie = {
  movieId: string;
  title: string;
  overview?: string | null;
  posterUrl?: string | null;
  releaseYear?: number | null;
  runtimeMinutes?: number | null;
  mpaaRating?: string | null;
  links?: RecommendationLink[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  pending?: boolean;
  recommendations?: RecommendationMovie[];
};
