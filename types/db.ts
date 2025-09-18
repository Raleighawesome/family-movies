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

