import Link from "next/link";
export const metadata = { title: "Join Family Movie Night" };

export default function SignupPage() {
  return (
    <div className="card" style={{ maxWidth: 520, margin: "3.5rem auto", padding: "2rem", display: "grid", gap: "1.75rem" }}>
      <div style={{ display: "grid", gap: "0.6rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ fontSize: "1.5rem" }} role="img" aria-hidden>
            ✨
          </span>
          <p style={{ margin: 0, fontSize: "0.85rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            Welcome
          </p>
        </div>
        <h1 style={{ margin: 0 }}>Preview mode</h1>
        <p style={{ color: "var(--text-muted)", margin: 0 }}>
          Email-based sign-up is temporarily disabled while basic authentication is active. Use the shared credentials
          {" "}
          <code>admin</code> / <code>movies</code> to explore the existing household as <code>eriknewby@icloud.com</code>.
        </p>
      </div>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <Link href="/login">
          <button type="button">View sign-in instructions</button>
        </Link>
        <Link href="/">
          <button type="button" className="secondary">Return to chat</button>
        </Link>
      </div>
    </div>
  );
}
