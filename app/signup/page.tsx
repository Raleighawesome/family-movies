import Link from "next/link";
import SignupForm from "./signup-form";

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
        <h1 style={{ margin: 0 }}>Create your family hub</h1>
        <p style={{ color: "var(--text-muted)", margin: 0 }}>
          We’ll email you a secure magic link. Before we do, tell us a bit about who’s watching so we can curate picks
          that feel just right.
        </p>
      </div>
      <SignupForm />
      <p style={{ margin: 0, textAlign: "center", fontSize: "0.9rem", color: "var(--text-muted)" }}>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}
