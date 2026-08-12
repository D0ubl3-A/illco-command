export const metadata = {
  title: "Activate Label Command | iLLCo AI",
};

export default async function LabelCommandAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const invalid = params.error === "invalid";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "32px 18px",
        background: "#050a12",
        color: "#f8fafc",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <section
        style={{
          width: "min(560px, 100%)",
          padding: "34px",
          border: "1px solid #1d4ed8",
          borderRadius: "22px",
          background: "#08111f",
          boxShadow: "0 24px 80px rgba(0,0,0,.35)",
        }}
      >
        <p style={{ margin: 0, color: "#60a5fa", fontWeight: 800, letterSpacing: ".12em" }}>ILLCO LABEL COMMAND</p>
        <h1 style={{ margin: "12px 0 10px", fontSize: "clamp(32px, 7vw, 54px)", lineHeight: 1 }}>Activate access</h1>
        <p style={{ margin: "0 0 24px", color: "#cbd5e1", fontSize: "18px", lineHeight: 1.55 }}>
          Label Command requires an active trial or paid license. Without valid access, workspace data, syncing, and write actions remain locked.
        </p>

        {invalid ? (
          <p style={{ padding: "12px 14px", borderRadius: "12px", background: "#3f0d16", color: "#fecaca", fontWeight: 700 }}>
            That access key is invalid or expired.
          </p>
        ) : null}

        <form action="/api/label-command/access" method="post">
          <label htmlFor="licenseKey" style={{ display: "block", marginBottom: "8px", fontWeight: 800 }}>
            Trial or license key
          </label>
          <input
            id="licenseKey"
            name="licenseKey"
            required
            autoComplete="off"
            placeholder="ILLCO..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              borderRadius: "12px",
              border: "1px solid #334155",
              background: "#020617",
              color: "white",
              padding: "15px 16px",
              fontSize: "17px",
              marginBottom: "14px",
            }}
          />
          <button
            type="submit"
            style={{
              width: "100%",
              border: 0,
              borderRadius: "12px",
              padding: "15px 18px",
              background: "#2563eb",
              color: "white",
              fontWeight: 900,
              fontSize: "18px",
              cursor: "pointer",
            }}
          >
            Activate Label Command
          </button>
        </form>
      </section>
    </main>
  );
}
