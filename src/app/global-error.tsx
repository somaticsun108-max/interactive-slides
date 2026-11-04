"use client";

/**
 * Last-resort boundary for errors thrown in the root layout. It must render its
 * own <html>/<body> and cannot rely on global CSS, so styles are inline.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f1f5f9",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          color: "#1e293b",
        }}
      >
        <div style={{ padding: 24, textAlign: "center", maxWidth: 420 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 8 }}>
            The app failed to load this page. Try again, or reload the page if the problem
            continues.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              background: "#4f46e5",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 12 }}>
              Error ID: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
