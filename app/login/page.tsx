import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="card" style={{ maxWidth: 520, margin: "3rem auto", display: "grid", gap: "1rem" }}>
      <div>
        <h2 style={{ margin: 0 }}>Basic authentication enabled</h2>
        <p style={{ color: "var(--text-muted)", marginTop: "0.4rem" }}>
          Sign in using the browser prompt with the credentials <code>admin</code> / <code>movies</code>. Once
          authenticated, you&rsquo;ll be treated as <code>eriknewby@icloud.com</code> so you can browse the existing
          household setup.
        </p>
      </div>
      <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
        If you don&rsquo;t see the prompt, refresh the page or navigate directly to any protected area (for example the
        {" "}
        <Link href="/">chat</Link>) and your browser will ask for the credentials.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <Link href="/">
          <button type="button">Return to chat</button>
        </Link>
        <Link href="/preferences">
          <button type="button" className="secondary">View preferences</button>
        </Link>
      </div>
    </div>
  );
}

