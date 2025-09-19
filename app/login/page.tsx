import Link from "next/link";
import { sendMagicLink } from "./actions";

export default function LoginPage() {
  return (
    <div className="card" style={{ maxWidth: 420, margin: "3rem auto", display: "grid", gap: "1rem" }}>
      <div>
        <h2 style={{ margin: 0 }}>Sign in</h2>
        <p style={{ color: "var(--text-muted)", marginTop: "0.4rem" }}>
          We’ll email you a one-time magic link so you can pick up where you left off.
        </p>
      </div>
      <form action={sendMagicLink} style={{ display: "grid", gap: "0.75rem" }}>
        <input type="email" name="email" placeholder="you@example.com" required />
        <button type="submit">Send magic link</button>
      </form>
      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
        Check your inbox and open the link on this device.
      </p>
      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
        New here? <Link href="/signup">Create your family account</Link>
      </p>
    </div>
  );
}

