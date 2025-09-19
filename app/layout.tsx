import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/auth/server";
import "./globals.css";

export const metadata = { title: "Family Movies" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = getAuthenticatedUser();

  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="app-header">
            <Link href="/" className="app-brand">
              <span role="img" aria-hidden>
                🍿
              </span>
              Family Movie Night
            </Link>
            <nav className="app-nav">
              <Link href="/">Chat</Link>
              <Link href="/preferences">Preferences</Link>
              {user ? (
                <span className="badge">{user.email ?? "Signed in"}</span>
              ) : (
                <>
                  <Link href="/login">Sign in</Link>
                  <Link href="/signup">Sign up</Link>
                </>
              )}
            </nav>
          </header>
          <main className="app-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
