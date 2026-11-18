/**
 * Placeholder status page for the app service.
 *
 * The public marketing page stays on the static Render site; this service only
 * exists for /login, /account, /expert and /api. Phase 2 replaces this file
 * with a redirect to the portal entry point.
 */
const card: React.CSSProperties = {
  maxWidth: 620,
  margin: "8vh auto",
  padding: 32,
  background: "#fff",
  border: "1px solid #E6EBF2",
  borderRadius: 20,
  boxShadow: "0 20px 40px -30px rgba(10,21,38,.35)",
};

const pill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 12px",
  borderRadius: 999,
  background: "#E7F7F4",
  color: "#0E8F94",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: ".08em",
  textTransform: "uppercase",
};

export default function StatusPage() {
  return (
    <main style={{ padding: "0 20px" }}>
      <div style={card}>
        <span style={pill}>Scaffold online</span>
        <h1 style={{ fontSize: 28, letterSpacing: "-.03em", margin: "16px 0 8px" }}>
          Sheetal platform API
        </h1>
        <p style={{ color: "#3D4A63", lineHeight: 1.6, margin: 0 }}>
          This service will host the customer portal, the expert portal and the WhatsApp
          webhook for Kolkata and Howrah. The public marketing page is served separately
          by the static site.
        </p>

        <h2 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: ".12em", color: "#6B7A93", margin: "28px 0 10px" }}>
          Endpoints
        </h2>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
          {[
            ["GET", "/api/health", "liveness + database round-trip"],
            ["POST", "/api/cron/dispatch", "bounded queue drain (bearer auth)"],
          ].map(([method, path, note]) => (
            <li
              key={path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 14px",
                border: "1px solid #EFF3F8",
                borderRadius: 12,
                fontSize: 14,
              }}
            >
              <code style={{ fontSize: 11, fontWeight: 800, color: "#0E8F94", background: "#E7F7F4", padding: "3px 7px", borderRadius: 6 }}>
                {method}
              </code>
              <code style={{ fontWeight: 650 }}>{path}</code>
              <span style={{ marginLeft: "auto", color: "#6B7A93", fontSize: 12.5 }}>{note}</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
