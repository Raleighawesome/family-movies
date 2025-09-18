export const metadata = { title: "Family Movies (Beta)" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}>
        <main style={{ maxWidth: 980, margin: "2rem auto", padding: "0 1rem" }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>Family Movies (Beta)</h1>
            <nav style={{ display: "flex", gap: 12 }}>
              <a href="/">Catalog</a>
              <a href="/login">Login</a>
            </nav>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}

