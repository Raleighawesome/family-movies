import { sendMagicLink } from "./actions";

export default function LoginPage() {
  return (
    <div style={{ maxWidth: 420 }}>
      <h2>Sign in</h2>
      <p>We’ll email you a one-time magic link.</p>
      <form action={sendMagicLink} style={{ display: "grid", gap: 12, marginTop: 12 }}>
        <input type="email" name="email" placeholder="you@example.com" required
               style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}/>
        <button type="submit" style={{ padding: "10px 14px", borderRadius: 8, fontWeight: 600 }}>
          Send magic link
        </button>
      </form>
      <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
        Check your inbox and open the link on this device.
      </p>
    </div>
  );
}

