"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import styles from "./page.module.css";

type SourceStatus = "live" | "manual" | "demo" | "disconnected" | "syncing" | "error";
type WorkspaceState = "loading" | "ready" | "signed-out" | "setup-required" | "error";
type Track = {
  id: string;
  title: string;
  artist: string;
  duration: string;
  source: SourceStatus;
};
type Artist = {
  id: string;
  name: string;
  genre: string;
  sourceStatus: SourceStatus;
  status: string;
};
type Release = {
  id: string;
  artistId: string | null;
  artistName: string | null;
  title: string;
  releaseType: "single" | "ep" | "album";
  stage: string;
  targetDate: string | null;
  explicit: boolean;
  notes: string;
  sourceStatus: SourceStatus;
};
type Workspace = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  role: string;
};
type WorkspacePayload = {
  ok: boolean;
  authenticated: boolean;
  databaseReady: boolean;
  detail?: string;
  error?: string;
  accountUrl?: string;
  onboardingRequired?: boolean;
  onboardingUrl?: string;
  workspace?: Workspace;
  artists?: Artist[];
  releases?: Release[];
};
type HealthPayload = {
  status: "ready" | "setup-required";
  ready: boolean;
  checks: Record<string, { status: string }>;
};

const sourceLabels: Record<SourceStatus, string> = {
  live: "Live data",
  manual: "Manual record",
  demo: "Demo preview",
  disconnected: "Not connected",
  syncing: "Syncing",
  error: "Connection error",
};

const previewTracks: Track[] = [
  { id: "demo-neon-mercy", title: "Neon Mercy", artist: "Nova Saint", duration: "2:47", source: "demo" },
  { id: "demo-after-dark", title: "After Dark", artist: "Sable", duration: "2:58", source: "demo" },
];

const previewArtists: Artist[] = [
  { id: "demo-nova", name: "Nova Saint", genre: "Alt R&B", sourceStatus: "demo", status: "Preview artist" },
  { id: "demo-kairo", name: "Kairo V", genre: "Melodic Rap", sourceStatus: "demo", status: "Preview artist" },
  { id: "demo-sable", name: "Sable", genre: "Dark Pop", sourceStatus: "demo", status: "Preview artist" },
];

const navigation = [
  { label: "Music", items: ["Dashboard", "Artists", "Catalog", "Releases", "Distribution", "Rights & splits"] },
  { label: "Growth", items: ["Analytics", "Campaigns", "Social", "Content", "Audience"] },
  { label: "Business", items: ["Royalties", "Expenses", "Merch", "Store"] },
  { label: "Studio", items: ["Writers Workshop", "Artwork", "Video tools", "Media library"] },
  { label: "Operations", items: ["Tasks", "Automations", "Integrations", "Team", "Settings"] },
];

const integrations = [
  { name: "Spotify", key: "analytics", detail: "Connect for streams and listeners" },
  { name: "Apple Music", key: "analytics", detail: "Connect for catalog analytics" },
  { name: "YouTube", key: "analytics", detail: "Connect for video performance" },
  { name: "Stripe", key: "billing", detail: "Connect for billing and merch" },
];

const releaseStages = [
  "draft",
  "needs_information",
  "ready_for_review",
  "under_review",
  "approved",
  "scheduled",
  "delivered",
  "processing",
  "live",
  "rejected",
  "correction_required",
  "takedown_requested",
] as const;

function stageTitle(stage: string) {
  return stage
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function SourceBadge({ status }: { status: SourceStatus }) {
  return <span className={`${styles.sourceBadge} ${styles[`source_${status}`]}`}>{sourceLabels[status]}</span>;
}

export function LabelCommandClient() {
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>("loading");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [activeTrackId, setActiveTrackId] = useState(previewTracks[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("Loading your authorized label workspace…");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showArtistForm, setShowArtistForm] = useState(false);
  const [showReleaseForm, setShowReleaseForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const loadWorkspace = useCallback(async () => {
    setWorkspaceState("loading");
    try {
      const [workspaceResponse, healthResponse] = await Promise.all([
        fetch("/api/label-command/workspace", { cache: "no-store" }),
        fetch("/api/label-command/health", { cache: "no-store" }),
      ]);
      const workspacePayload = (await workspaceResponse.json()) as WorkspacePayload;
      const healthPayload = (await healthResponse.json()) as HealthPayload;
      setHealth(healthPayload);

      if (!workspacePayload.databaseReady) {
        setWorkspaceState("setup-required");
        setNotice(workspacePayload.detail || workspacePayload.error || "Database setup is required before records can be saved.");
        return;
      }
      if (!workspacePayload.authenticated) {
        setWorkspaceState("signed-out");
        setNotice("Sign in to create a private label workspace and save releases.");
        return;
      }
      if (workspacePayload.onboardingRequired) {
        window.location.assign(workspacePayload.onboardingUrl || "/label-command/onboarding");
        return;
      }
      if (!workspacePayload.ok || !workspacePayload.workspace) {
        setWorkspaceState("error");
        setNotice(workspacePayload.error || "The label workspace could not be loaded.");
        return;
      }

      setWorkspace(workspacePayload.workspace);
      setArtists(workspacePayload.artists || []);
      setReleases(workspacePayload.releases || []);
      setWorkspaceState("ready");
      setNotice(`${workspacePayload.workspace.name} loaded. Changes are saved to your account.`);
    } catch {
      setWorkspaceState("error");
      setNotice("The label workspace could not be reached. No local data was presented as saved data.");
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const visibleArtists = useMemo(
    () => [...artists, ...(demoMode ? previewArtists : [])],
    [artists, demoMode],
  );
  const visibleTracks = useMemo(() => (demoMode ? previewTracks : []), [demoMode]);
  const activeTrack = visibleTracks.find((track) => track.id === activeTrackId) || visibleTracks[0] || null;
  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    const artistMatches = visibleArtists
      .filter((artist) => `${artist.name} ${artist.genre}`.toLowerCase().includes(query))
      .map((artist) => ({ type: artist.sourceStatus === "demo" ? "Demo artist" : "Artist", label: artist.name }));
    const releaseMatches = releases
      .filter((release) => `${release.title} ${release.artistName || ""}`.toLowerCase().includes(query))
      .map((release) => ({ type: "Release", label: `${release.title}${release.artistName ? ` — ${release.artistName}` : ""}` }));
    const trackMatches = visibleTracks
      .filter((track) => `${track.title} ${track.artist}`.toLowerCase().includes(query))
      .map((track) => ({ type: "Demo track", label: `${track.title} — ${track.artist}` }));
    return [...artistMatches, ...releaseMatches, ...trackMatches].slice(0, 8);
  }, [search, visibleArtists, visibleTracks, releases]);

  const savedRecordCount = artists.length + releases.length;
  const attentionCount = releases.filter((release) => ["needs_information", "rejected", "correction_required"].includes(release.stage)).length;
  const databaseOnline = workspaceState === "ready";
  const healthCheck = (key: string): SourceStatus => (health?.checks?.[key]?.status === "ok" ? "live" : "disconnected");

  function requireReady(action: string) {
    if (workspaceState === "ready" && workspace) return true;
    if (workspaceState === "signed-out") {
      setNotice(`${action} requires an account. Open Account to sign in.`);
    } else if (workspaceState === "setup-required") {
      setNotice(`${action} requires the database connection shown in setup status.`);
    } else {
      setNotice(`${action} is unavailable until the workspace is ready.`);
    }
    return false;
  }

  function runAction(action: string) {
    setNotice(`${action} is in guided setup. Nothing is sent or changed without an explicit confirmation.`);
  }

  function selectTrack(track: Track) {
    setActiveTrackId(track.id);
    setIsPlaying(true);
    setNotice(`Playing demo preview: ${track.title} by ${track.artist}. This is not a live catalog metric or uploaded master.`);
  }

  async function createArtist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace || !requireReady("Artist creation")) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true);
    try {
      const response = await fetch("/api/label-command/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          name: data.get("name"),
          genre: data.get("genre"),
          status: data.get("status"),
        }),
      });
      const payload = (await response.json()) as { ok: boolean; artist?: Artist; error?: string };
      if (!response.ok || !payload.artist) throw new Error(payload.error || "Artist creation failed.");
      setArtists((current) => [...current, payload.artist as Artist].sort((a, b) => a.name.localeCompare(b.name)));
      setNotice(`${payload.artist.name} was saved to ${workspace.name}.`);
      form.reset();
      setShowArtistForm(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Artist creation failed.");
    } finally {
      setSaving(false);
    }
  }

  async function createRelease(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace || !requireReady("Release creation")) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const artistId = String(data.get("artistId") || "");
    setSaving(true);
    try {
      const response = await fetch("/api/label-command/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          title: data.get("title"),
          artistId: artistId || null,
          releaseType: data.get("releaseType"),
          stage: "draft",
          targetDate: data.get("targetDate") || null,
          explicit: data.get("explicit") === "on",
          notes: data.get("notes"),
        }),
      });
      const payload = (await response.json()) as { ok: boolean; release?: Release; error?: string };
      if (!response.ok || !payload.release) throw new Error(payload.error || "Release creation failed.");
      const artist = artists.find((entry) => entry.id === payload.release?.artistId);
      const release = { ...payload.release, artistName: artist?.name || null } as Release;
      setReleases((current) => [release, ...current]);
      setNotice(`${release.title} was saved as a draft.`);
      form.reset();
      setShowReleaseForm(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Release creation failed.");
    } finally {
      setSaving(false);
    }
  }

  async function updateReleaseStage(release: Release, stage: string) {
    if (!workspace || !requireReady("Release update")) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/label-command/releases/${release.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id, stage }),
      });
      const payload = (await response.json()) as { ok: boolean; release?: Release; error?: string };
      if (!response.ok || !payload.release) throw new Error(payload.error || "Release update failed.");
      setReleases((current) => current.map((entry) => (entry.id === release.id ? { ...entry, ...payload.release } : entry)));
      setNotice(`${release.title} moved to ${stageTitle(stage)}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Release update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveRelease(release: Release) {
    if (!workspace || !requireReady("Release archive")) return;
    if (!window.confirm(`Archive ${release.title}? It will be retained in the audit history.`)) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/label-command/releases/${release.id}?workspaceId=${encodeURIComponent(workspace.id)}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Release archive failed.");
      setReleases((current) => current.filter((entry) => entry.id !== release.id));
      setNotice(`${release.title} was archived and preserved in audit history.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Release archive failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main id="main-content" className={styles.shell}>
      <section className={styles.trustBanner} aria-label="Data status">
        <div>
          <strong>Source transparency is active.</strong>
          <span>Saved, demo, live, and disconnected information are never mixed.</span>
        </div>
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={demoMode}
            onChange={(event) => {
              setDemoMode(event.target.checked);
              setIsPlaying(false);
              setNotice(event.target.checked ? "Demo previews are visible and explicitly labeled." : "Demo previews are hidden.");
            }}
          />
          <span>Show demo previews</span>
        </label>
      </section>

      <header className={styles.commandHeader}>
        <div className={styles.brandBlock}>
          <span className={styles.brandMark} aria-hidden="true">iLL</span>
          <div>
            <p>{workspace?.name || "iLLCoAI"}</p>
            <h1>Label Command</h1>
          </div>
        </div>

        <div className={styles.searchWrap}>
          <label htmlFor="label-command-search" className={styles.srOnly}>Search artists, releases, and demo tracks</label>
          <input
            ref={searchRef}
            id="label-command-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search authorized artists and releases…"
          />
          <kbd>Ctrl/⌘ K</kbd>
          {search && (
            <div className={styles.searchPanel} role="status">
              {searchResults.length ? searchResults.map((result) => (
                <button key={`${result.type}-${result.label}`} onClick={() => setNotice(`${result.type} selected: ${result.label}`)}>
                  <span>{result.type}</span>
                  <strong>{result.label}</strong>
                </button>
              )) : <p>No matching authorized records.</p>}
            </div>
          )}
        </div>

        <div className={styles.headerActions}>
          <button className={styles.secondaryButton} onClick={() => setMobileNavOpen((value) => !value)} aria-expanded={mobileNavOpen}>Workspaces</button>
          {workspaceState === "signed-out" ? (
            <a className={styles.primaryButton} href="/account">Sign in</a>
          ) : (
            <button
              className={styles.primaryButton}
              disabled={saving}
              onClick={() => {
                if (requireReady("New release")) setShowReleaseForm((value) => !value);
              }}
            >
              New release
            </button>
          )}
        </div>
      </header>

      <div className={styles.workspaceGrid}>
        <aside className={`${styles.sidebar} ${mobileNavOpen ? styles.sidebarOpen : ""}`} aria-label="Label workspaces">
          {navigation.map((group) => (
            <details key={group.label} open={group.label === "Music"}>
              <summary>{group.label}</summary>
              <nav>
                {group.items.map((item) => (
                  <button key={item} type="button" onClick={() => { setMobileNavOpen(false); runAction(item); }}>{item}</button>
                ))}
              </nav>
            </details>
          ))}
          <div className={styles.healthCard}>
            <div>
              <span className={`${styles.healthDot} ${databaseOnline ? styles.healthDotReady : ""}`} aria-hidden="true" />
              <strong>{workspaceState === "ready" ? "Workspace connected" : workspaceState === "loading" ? "Checking services" : "Setup required"}</strong>
            </div>
            <p>{workspaceState === "ready" ? `${workspace?.role || "Member"} access · records persist to the account database.` : notice}</p>
          </div>
        </aside>

        <div className={styles.content}>
          <section className={styles.hero} id="dashboard">
            <div>
              <p className={styles.eyebrow}>LABEL OPERATING SYSTEM · ACCOUNT ISOLATED</p>
              <h2>Own the masters.<br />Run the movement.</h2>
              <p className={styles.heroCopy}>Artists, releases, rights, campaigns, money, and decisions—with persistent records, role checks, and no fabricated analytics.</p>
              <div className={styles.buttonRow}>
                <button className={styles.primaryButton} disabled={saving} onClick={() => { if (requireReady("Release builder")) setShowReleaseForm(true); }}>Launch a release</button>
                <button className={styles.secondaryButton} onClick={() => runAction("Label Copilot")}>Ask Label Copilot</button>
              </div>
            </div>
            <div className={styles.heroStatus}>
              <div><span>Saved artists</span><strong>{workspaceState === "ready" ? artists.length : "—"}</strong><SourceBadge status={workspaceState === "ready" ? "manual" : "disconnected"} /></div>
              <div><span>Live metric sources</span><strong>{healthCheck("analytics") === "live" ? "1+" : "0"}</strong><SourceBadge status={healthCheck("analytics")} /></div>
              <div><span>Saved workspace records</span><strong>{workspaceState === "ready" ? savedRecordCount : "—"}</strong><SourceBadge status={workspaceState === "ready" ? "manual" : "disconnected"} /></div>
            </div>
          </section>

          <div className={styles.notice} role="status" aria-live="polite">{saving ? "Saving confirmed change…" : notice}</div>

          {showReleaseForm && workspaceState === "ready" && (
            <form className={styles.inlineForm} onSubmit={createRelease}>
              <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>NEW RELEASE</p><h2>Save a release draft</h2></div><button type="button" className={styles.textButton} onClick={() => setShowReleaseForm(false)}>Close</button></div>
              <div className={styles.formGrid}>
                <label><span>Release title</span><input name="title" maxLength={180} required /></label>
                <label><span>Artist</span><select name="artistId" defaultValue=""><option value="">Unassigned</option>{artists.map((artist) => <option key={artist.id} value={artist.id}>{artist.name}</option>)}</select></label>
                <label><span>Release type</span><select name="releaseType" defaultValue="single"><option value="single">Single</option><option value="ep">EP</option><option value="album">Album</option></select></label>
                <label><span>Target date</span><input type="date" name="targetDate" /></label>
                <label className={styles.fullField}><span>Internal notes</span><textarea name="notes" rows={3} maxLength={5000} /></label>
                <label className={styles.checkboxField}><input type="checkbox" name="explicit" /><span>Explicit content</span></label>
              </div>
              <div className={styles.formActions}><button type="button" className={styles.secondaryButton} onClick={() => setShowReleaseForm(false)}>Cancel</button><button className={styles.primaryButton} disabled={saving}>Save draft</button></div>
            </form>
          )}

          {showArtistForm && workspaceState === "ready" && (
            <form className={styles.inlineForm} onSubmit={createArtist}>
              <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>ROSTER</p><h2>Add an authorized artist</h2></div><button type="button" className={styles.textButton} onClick={() => setShowArtistForm(false)}>Close</button></div>
              <div className={styles.formGrid}>
                <label><span>Artist name</span><input name="name" maxLength={120} required /></label>
                <label><span>Genre</span><input name="genre" maxLength={120} /></label>
                <label><span>Status</span><select name="status" defaultValue="active"><option value="active">Active</option><option value="development">Development</option><option value="paused">Paused</option></select></label>
              </div>
              <div className={styles.formActions}><button type="button" className={styles.secondaryButton} onClick={() => setShowArtistForm(false)}>Cancel</button><button className={styles.primaryButton} disabled={saving}>Save artist</button></div>
            </form>
          )}

          <section className={styles.section} aria-labelledby="attention-heading">
            <div className={styles.sectionHeading}>
              <div><p className={styles.eyebrow}>ACTION CENTER</p><h2 id="attention-heading">What needs attention</h2></div>
              <span className={styles.countBadge}>{attentionCount + (health?.ready ? 0 : 1)} active items</span>
            </div>
            <div className={styles.actionGrid}>
              {[
                ["Connect analytics", healthCheck("analytics") === "live" ? "Analytics configuration detected." : "No verified analytics source is connected."],
                ["Database", workspaceState === "ready" ? "Persistent account storage is available." : "Persistent account storage needs setup or sign-in."],
                ["Configure storage", healthCheck("mediaStorage") === "live" ? "Media storage configuration detected." : "Master-audio upload needs a storage provider."],
                ["Review billing", healthCheck("billing") === "live" ? "Billing configuration detected." : "Billing and entitlements need server configuration."],
              ].map(([title, detail]) => (
                <button key={title} className={styles.actionCard} onClick={() => runAction(title)}>
                  <span className={styles.warningIcon} aria-hidden="true">!</span><span><strong>{title}</strong><small>{detail}</small></span><span aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.metricGrid} id="analytics" aria-label="Verified analytics summary">
            {[
              ["Total streams", "—", "Connect a verified provider"],
              ["Monthly listeners", "—", "Connect a verified provider"],
              ["Catalog saves", "—", "Connect a verified provider"],
              ["Finalized royalties", "—", "Import a verified statement"],
            ].map(([label, value, detail]) => (
              <article key={label} className={styles.metricCard}><div><span>{label}</span><SourceBadge status="disconnected" /></div><strong>{value}</strong><p>{detail}</p></article>
            ))}
          </section>

          <section className={styles.twoColumn}>
            <article className={styles.panel} id="artists">
              <div className={styles.sectionHeading}>
                <div><p className={styles.eyebrow}>ROSTER</p><h2>Authorized artists</h2></div>
                <button className={styles.textButton} onClick={() => { if (requireReady("Artist creation")) setShowArtistForm(true); }}>Add artist</button>
              </div>
              <div className={styles.list}>
                {visibleArtists.length ? visibleArtists.map((artist) => (
                  <button key={artist.id} className={styles.listRow} onClick={() => setNotice(`${artist.sourceStatus === "demo" ? "Demo preview" : "Saved artist"}: ${artist.name}`)}>
                    <span className={styles.avatar}>{artist.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
                    <span><strong>{artist.name}</strong><small>{artist.genre || "Genre not set"} · {artist.status}</small></span>
                    <SourceBadge status={artist.sourceStatus} />
                  </button>
                )) : <div className={styles.emptyState}><strong>No saved artists yet.</strong><p>Add an artist or enable demo previews to inspect the interface.</p></div>}
              </div>
            </article>

            <article className={styles.panel} id="integrations">
              <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>CONNECTIONS</p><h2>Integration health</h2></div><button className={styles.textButton} onClick={() => runAction("Integration center")}>Open center</button></div>
              <div className={styles.list}>
                {integrations.map((integration) => {
                  const status = healthCheck(integration.key);
                  return <button key={integration.name} className={styles.integrationRow} onClick={() => runAction(`${integration.name} connection`)}><span><strong>{integration.name}</strong><small>{integration.detail}</small></span><SourceBadge status={status} /></button>;
                })}
              </div>
            </article>
          </section>

          <section className={styles.twoColumn}>
            <article className={styles.panel} id="releases">
              <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>RELEASE PIPELINE</p><h2>Saved releases</h2></div><button className={styles.textButton} onClick={() => { if (requireReady("Release creation")) setShowReleaseForm(true); }}>Add release</button></div>
              <div className={styles.releaseList}>
                {releases.length ? releases.map((release) => (
                  <div className={styles.releaseRecord} key={release.id}>
                    <span><strong>{release.title}</strong><small>{release.artistName || "Artist unassigned"} · {release.releaseType.toUpperCase()} · {release.targetDate || "No target date"}</small></span>
                    <select aria-label={`Stage for ${release.title}`} value={release.stage} disabled={saving} onChange={(event) => void updateReleaseStage(release, event.target.value)}>{releaseStages.map((stage) => <option key={stage} value={stage}>{stageTitle(stage)}</option>)}</select>
                    <SourceBadge status={release.sourceStatus} />
                    <button className={styles.dangerButton} disabled={saving} onClick={() => void archiveRelease(release)}>Archive</button>
                  </div>
                )) : <div className={styles.emptyState}><strong>No releases saved.</strong><p>Create a draft to activate the release pipeline.</p></div>}
              </div>
            </article>

            <article className={styles.panel} id="catalog">
              <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>CATALOG</p><h2>Audio previews</h2></div><SourceBadge status={demoMode ? "demo" : "disconnected"} /></div>
              <div className={styles.trackList}>
                {visibleTracks.length ? visibleTracks.map((track) => (
                  <button key={track.id} className={activeTrack?.id === track.id ? styles.activeTrack : ""} onClick={() => selectTrack(track)}><span aria-hidden="true">{activeTrack?.id === track.id && isPlaying ? "Ⅱ" : "▶"}</span><span><strong>{track.title}</strong><small>{track.artist}</small></span><SourceBadge status={track.source} /><time>{track.duration}</time></button>
                )) : <div className={styles.emptyState}><strong>No audio is being presented as uploaded.</strong><p>Connect media storage or enable clearly labeled demo previews.</p></div>}
              </div>
            </article>
          </section>

          <section className={styles.copilot} id="automations">
            <div><p className={styles.eyebrow}>LABEL COPILOT · APPROVAL REQUIRED</p><h2>Use records. Never invent results.</h2><p>Copilot answers must identify their record source, mark estimates, respect user roles, and preview every write before it changes data.</p></div>
            <div className={styles.promptButtons}>{["Check release risks", "Find missing metadata", "Build a campaign plan", "Explain royalty status"].map((prompt) => <button key={prompt} onClick={() => runAction(prompt)}>{prompt}</button>)}</div>
          </section>
        </div>
      </div>

      {activeTrack && demoMode && (
        <section className={styles.playerDock} aria-label="Global demo music player">
          <div className={styles.playerArtwork} aria-hidden="true">{activeTrack.title.slice(0, 2).toUpperCase()}</div>
          <div className={styles.playerTrack}><strong>{activeTrack.title}</strong><span>{activeTrack.artist}</span></div>
          <button className={styles.playerButton} onClick={() => setIsPlaying((value) => !value)} aria-label={isPlaying ? "Pause demo preview" : "Play demo preview"}>{isPlaying ? "Ⅱ" : "▶"}</button>
          <div className={styles.progressWrap}><span>{isPlaying ? "0:12" : "0:00"}</span><progress max="100" value={isPlaying ? 7 : 0}>Demo preview progress</progress><span>{activeTrack.duration}</span></div>
          <SourceBadge status="demo" /><span className={styles.previewLabel}>Demo preview · not an uploaded master</span>
        </section>
      )}
    </main>
  );
}
