import {
  LABEL_COMMAND_EXTRA_SEAT_PRICE_CENTS,
  LABEL_COMMAND_INCLUDED_SEATS,
  LABEL_COMMAND_OWNER_PRICE_CENTS,
} from "@/lib/label-command-domain";

export const metadata = { title: "Choose your Label Command account | iLLCo AI" };

const money = (cents: number) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 0,
}).format(cents / 100);

export default async function LabelCommandOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main style={{ minHeight: "100vh", padding: "48px 20px", background: "#050a12", color: "#f8fafc", fontFamily: "Arial, sans-serif" }}>
      <section style={{ width: "min(920px, 100%)", margin: "0 auto" }}>
        <p style={{ color: "#60a5fa", fontWeight: 900, letterSpacing: ".12em" }}>ILLCO LABEL COMMAND</p>
        <h1 style={{ fontSize: "clamp(34px, 6vw, 64px)", margin: "12px 0" }}>Choose your account</h1>
        <p style={{ color: "#cbd5e1", fontSize: 19, lineHeight: 1.6 }}>
          Label owners manage a roster and team. Artists get a private identity tied only to their own catalog.
        </p>
        {error ? <p style={{ background: "#3f0d16", color: "#fecaca", padding: 14, borderRadius: 12 }}>{error}</p> : null}
        <form action="/api/label-command/onboarding" method="post">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18, margin: "28px 0" }}>
            <label style={{ border: "1px solid #2563eb", borderRadius: 18, padding: 24, background: "#08111f" }}>
              <input type="radio" name="accountType" value="label_owner" required /> <strong style={{ fontSize: 22 }}>Label owner</strong>
              <p>Manage artists, releases, distribution, rights, royalties, and team access.</p>
              <p><strong>{money(LABEL_COMMAND_OWNER_PRICE_CENTS)}</strong> base access includes the owner plus {LABEL_COMMAND_INCLUDED_SEATS - 1} team seat. Extra people are <strong>{money(LABEL_COMMAND_EXTRA_SEAT_PRICE_CENTS)}/month each</strong>—not another $50.</p>
              <input name="labelName" placeholder="Label name" style={{ width: "100%", padding: 12, boxSizing: "border-box" }} />
            </label>
            <label style={{ border: "1px solid #7c3aed", borderRadius: 18, padding: 24, background: "#100b20" }}>
              <input type="radio" name="accountType" value="artist" required /> <strong style={{ fontSize: 22 }}>Artist</strong>
              <p>Manage your own artist profile, releases, catalog, and analytics without access to another artist&apos;s records.</p>
              <p>Join a label owner&apos;s paid team seat, or keep independent solo access.</p>
              <input name="artistName" placeholder="Artist name" style={{ width: "100%", padding: 12, boxSizing: "border-box", marginBottom: 8 }} />
              <input name="genre" placeholder="Genre (optional)" style={{ width: "100%", padding: 12, boxSizing: "border-box" }} />
            </label>
          </div>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 800 }}>Your display name</label>
          <input name="displayName" required placeholder="Name shown to your team" style={{ width: "min(460px, 100%)", padding: 14, boxSizing: "border-box", marginBottom: 16 }} />
          <button type="submit" style={{ display: "block", border: 0, borderRadius: 12, padding: "15px 22px", background: "#2563eb", color: "white", fontWeight: 900, fontSize: 17 }}>
            Create my Label Command account
          </button>
        </form>
      </section>
    </main>
  );
}
