import { createClient } from "@/lib/supabase/server";
import type { CatalogRow } from "@/types/db";
import { logWatch } from "./actions";

function MovieCard({ m }: { m: CatalogRow }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "120px 1fr",
      gap: 12,
      padding: 12,
      border: "1px solid #e5e5e5",
      borderRadius: 12
    }}>
      <div style={{ width: 120, height: 180, background: "#f6f6f6", borderRadius: 8, overflow: "hidden" }}>
        {m.poster_url ? <img src={m.poster_url} alt={m.title} style={{ width: "100%", height: "100%", objectFit: "cover" }}/> : null}
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <h3 style={{ margin: 0 }}>{m.title}</h3>
          <span style={{ color: "#666" }}>{m.release_year ?? ""}</span>
          {m.mpaa_rating ? <span style={{ fontSize: 12, background: "#eee", padding: "2px 6px", borderRadius: 6 }}>{m.mpaa_rating}</span> : null}
          {m.runtime_minutes ? <span style={{ fontSize: 12, color: "#666" }}>{m.runtime_minutes} min</span> : null}
        </div>
        {m.content_labels?.length ? (
          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {m.content_labels.slice(0, 6).map((l, i) => (
              <span key={i} style={{ fontSize: 11, background: "#f2f2f2", padding: "2px 6px", borderRadius: 6 }}>
                {l.key}:{l.intensity}
              </span>
            ))}
          </div>
        ) : null}
        {m.providers?.length ? (
          <div style={{ marginTop: 8, fontSize: 12 }}>
            Where to watch: {m.providers.map((p, i) => (
              <a key={i} href={p.link ?? "#"} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>
                {p.service}
              </a>
            ))}
          </div>
        ) : null}
        <form action={async () => { "use server"; await logWatch(m.id); }}>
          <button type="submit" style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, fontWeight: 600 }}>
            Log watched
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function Page() {
  const supabase = createClient();

  // Require auth to see catalog (Option A)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div>
        <p><strong>Sign in required.</strong> <a href="/login">Go to login</a></p>
      </div>
    );
  }

  // Pull a small page of catalog rows
  const { data, error } = await supabase
    .from("v_movie_catalog")
    .select("*")
    .limit(24);

  if (error) return <p style={{ color: "crimson" }}>Error: {error.message}</p>;
  const rows = (data as unknown as CatalogRow[]) ?? [];

  if (!rows.length) return <p>No movies yet. Add a few via your ingestion job.</p>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {rows.map((m) => <MovieCard key={m.id} m={m} />)}
    </div>
  );
}

