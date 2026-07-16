"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import styles from "./page.module.css";

type SourceStatus = "live" | "manual" | "demo" | "disconnected" | "syncing" | "error";
type Track = {
  id: string;
  title: string;
  artist: string;
  duration: string;
  source: SourceStatus;
};

type Artist = {
  name: string;
  genre: string;
  source: SourceStatus;
  status: string;
};

const sourceLabels: Record<SourceStatus, string> = {
  live: "Live data",
  manual: "Manual record",
  demo: "Demo preview",
  disconnected: "Not connected",
  syncing: "Syncing",
  error: "Connection error",
};

const tracks: Track[] = [
  { id: "gods-hitman", title: "God's Hitman", artist: "M3ntally-iLL", duration: "3:18", source: "manual" },
  { id: "got-you-back", title: "Got You Back", artist: "M3ntally-iLL", duration: "3:04", source: "manual" },
  { id: "neon-mercy", title: "Neon Mercy", artist: "Nova Saint", duration: "2:47", source: "demo" },
  { id: "after-dark", title: "After Dark", artist: "Sable", duration: "2:58", source: "demo" },
];

const artists: Artist[] = [
  { name: "M3ntally-iLL", genre: "Horrorcore / Hip-Hop", source: "manual", status: "Active" },
  { name: "Nova Saint", genre: "Alt R&B", source: "demo", status: "Preview artist" },
  { name: "Kairo V", genre: "Melodic Rap", source: "demo", status: "Preview artist" },
  { name: "Sable", genre: "Dark Pop", source: "demo", status: "Preview artist" },
];

const navigation = [
  { label: "Music", items: ["Dashboard", "Artists", "Catalog", "Releases", "Distribution", "Rights & splits"] },
  { label: "Growth", items: ["Analytics", "Campaigns", "Social", "Content", "Audience"] },
  { label: "Business", items: ["Royalties", "Expenses", "Merch", "Store"] },
  { label: "Studio", items: ["Writers Workshop", "Artwork", "Video tools", "Media library"] },
  { label: "Operations", items: ["Tasks", "Automations", "Integrations", "Team", "Settings"] },
];

const integrations = [
  { name: "Spotify", status: "disconnected" as SourceStatus, detail: "Connect for streams and listeners" },
  { name: "Apple Music", status: "disconnected" as SourceStatus, detail: "Connect for catalog analytics" },
  { name: "YouTube", status: "disconnected" as SourceStatus, detail: "Connect for video performance" },
  { name: "Stripe", status: "disconnected" as SourceStatus, detail: "Connect for billing and merch" },
];

function SourceBadge({ status }: { status: SourceStatus }) {
  return <span className={`${styles.sourceBadge} ${styles[`source_${status}`]}`}>{sourceLabels[status]}</span>;
}

export function LabelCommandClient() {
  const [demoMode, setDemoMode] = useState(false);
  const [activeTrackId, setActiveTrackId] = useState(tracks[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("Workspace loaded with source transparency enabled.");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const activeTrack = tracks.find((track) => track.id === activeTrackId) ?? tracks[0];
  const visibleArtists = useMemo(
    () => artists.filter((artist) => demoMode || artist.source !== "demo"),
    [demoMode],
  );
  const visibleTracks = useMemo(
    () => tracks.filter((track) => demoMode || track.source !== "demo"),
    [demoMode],
  );
  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    const artistMatches = visibleArtists
      .filter((artist) => `${artist.name} ${artist.genre}`.toLowerCase().includes(query))
      .map((artist) => ({ type: "Artist", label: artist.name }));
    const trackMatches = visibleTracks
      .filter((track) => `${track.title} ${track.artist}`.toLowerCase().includes(query))
      .map((track) => ({ type: "Track", label: `${track.title} — ${track.artist}` }));
    return [...artistMatches, ...trackMatches].slice(0, 6);
  }, [search, visibleArtists, visibleTracks]);

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

  function selectTrack(track: Track) {
    setActiveTrackId(track.id);
    setIsPlaying(true);
    setNotice(`Previewing ${track.title} by ${track.artist}. Audio-file connection is still required.`);
  }

  function runAction(action: string) {
    setNotice(`${action} opened in guided setup mode. No record was changed without confirmation.`);
  }

  return (
    <main id="main-content" className={styles.shell}>
      <section className={styles.trustBanner} aria-label="Data status">
        <div>
          <strong>Source transparency is active.</strong>
          <span>Live, manual, demo, and disconnected records are never mixed.</span>
        </div>
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={demoMode}
            onChange={(event) => {
              setDemoMode(event.target.checked);
              setNotice(event.target.checked ? "Demo preview records are visible." : "Demo preview records are hidden.");
            }}
          />
          <span>Show demo records</span>
        </label>
      </section>

      <header className={styles.commandHeader}>
        <div className={styles.brandBlock}>
          <span className={styles.brandMark} aria-hidden="true">iLL</span>
          <div>
            <p>iLLCoAI</p>
            <h1>Label Command</h1>
          </div>
        </div>

        <div className={styles.searchWrap}>
          <label htmlFor="label-command-search" className={styles.srOnly}>Search artists, tracks, releases, and campaigns</label>
          <input
            ref={searchRef}
            id="label-command-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search artists, tracks, releases, campaigns…"
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
          <button className={styles.secondaryButton} onClick={() => setMobileNavOpen((value) => !value)} aria-expanded={mobileNavOpen}>
            Workspaces
          </button>
          <button className={styles.primaryButton} onClick={() => runAction("New release")}>New release</button>
        </div>
      </header>

      <div className={styles.workspaceGrid}>
        <aside className={`${styles.sidebar} ${mobileNavOpen ? styles.sidebarOpen : ""}`} aria-label="Label workspaces">
          {navigation.map((group) => (
            <details key={group.label} open={group.label === "Music"}>
              <summary>{group.label}</summary>
              <nav>
                {group.items.map((item) => (
                  <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-").replaceAll("&", "and")}`} onClick={() => setMobileNavOpen(false)}>
                    {item}
                  </a>
                ))}
              </nav>
            </details>
          ))}
          <div className={styles.healthCard}>
            <div>
              <span className={styles.healthDot} aria-hidden="true" />
              <strong>Setup required</strong>
            </div>
            <p>Interface online. Database and provider health must be verified separately.</p>
          </div>
        </aside>

        <div className={styles.content}>
          <section className={styles.hero} id="dashboard">
            <div>
              <p className={styles.eyebrow}>LABEL OPERATING SYSTEM · SOURCE CONTROLLED</p>
              <h2>Own the masters.<br />Run the movement.</h2>
              <p className={styles.heroCopy}>One workspace for artists, releases, rights, campaigns, money, and decisions—with no fabricated analytics.</p>
              <div className={styles.buttonRow}>
                <button className={styles.primaryButton} onClick={() => runAction("Release builder")}>Launch a release</button>
                <button className={styles.secondaryButton} onClick={() => runAction("Label Copilot")}>Ask Label Copilot</button>
              </div>
            </div>
            <div className={styles.heroStatus}>
              <div><span>Authorized artists</span><strong>1</strong><SourceBadge status="manual" /></div>
              <div><span>Live metric sources</span><strong>0</strong><SourceBadge status="disconnected" /></div>
              <div><span>Saved workspace records</span><strong>0</strong><SourceBadge status="disconnected" /></div>
            </div>
          </section>

          <div className={styles.notice} role="status" aria-live="polite">{notice}</div>

          <section className={styles.section} aria-labelledby="attention-heading">
            <div className={styles.sectionHeading}>
              <div><p className={styles.eyebrow}>ACTION CENTER</p><h2 id="attention-heading">What needs attention</h2></div>
              <span className={styles.countBadge}>4 setup items</span>
            </div>
            <div className={styles.actionGrid}>
              {[
                ["Connect analytics", "No streaming source is connected."],
                ["Verify database", "Persistence has not been confirmed."],
                ["Configure storage", "Master-audio upload needs a storage provider."],
                ["Review billing", "Plan price and entitlements need server verification."],
              ].map(([title, detail]) => (
                <button key={title} className={styles.actionCard} onClick={() => runAction(title)}>
                  <span className={styles.warningIcon} aria-hidden="true">!</span>
                  <span><strong>{title}</strong><small>{detail}</small></span>
                  <span aria-hidden="true">→</span>
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
              <article key={label} className={styles.metricCard}>
                <div><span>{label}</span><SourceBadge status="disconnected" /></div>
                <strong>{value}</strong>
                <p>{detail}</p>
              </article>
            ))}
          </section>

          <section className={styles.twoColumn}>
            <article className={styles.panel} id="artists">
              <div className={styles.sectionHeading}>
                <div><p className={styles.eyebrow}>ROSTER</p><h2>Authorized artists</h2></div>
                <button className={styles.textButton} onClick={() => runAction("Artist invitation")}>Invite artist</button>
              </div>
              <div className={styles.list}>
                {visibleArtists.map((artist) => (
                  <button key={artist.name} className={styles.listRow} onClick={() => setNotice(`Artist selected: ${artist.name}`)}>
                    <span className={styles.avatar}>{artist.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
                    <span><strong>{artist.name}</strong><small>{artist.genre} · {artist.status}</small></span>
                    <SourceBadge status={artist.source} />
                  </button>
                ))}
              </div>
            </article>

            <article className={styles.panel} id="integrations">
              <div className={styles.sectionHeading}>
                <div><p className={styles.eyebrow}>CONNECTIONS</p><h2>Integration health</h2></div>
                <button className={styles.textButton} onClick={() => runAction("Integration center")}>Open center</button>
              </div>
              <div className={styles.list}>
                {integrations.map((integration) => (
                  <button key={integration.name} className={styles.integrationRow} onClick={() => runAction(`${integration.name} connection`)}>
                    <span><strong>{integration.name}</strong><small>{integration.detail}</small></span>
                    <SourceBadge status={integration.status} />
                  </button>
                ))}
              </div>
            </article>
          </section>

          <section className={styles.twoColumn}>
            <article className={styles.panel} id="releases">
              <div className={styles.sectionHeading}>
                <div><p className={styles.eyebrow}>RELEASE PIPELINE</p><h2>What ships next</h2></div>
                <button className={styles.textButton} onClick={() => runAction("Release planner")}>Open planner</button>
              </div>
              <div className={styles.releaseList}>
                <button onClick={() => setNotice("Got You Back release record selected.")}>
                  <span><strong>Got You Back</strong><small>M3ntally-iLL · Target July 17</small></span>
                  <span className={styles.stageBadge}>Needs metadata</span>
                  <SourceBadge status="manual" />
                </button>
                {demoMode && (
                  <button onClick={() => setNotice("Demo release selected. No live record was opened.")}>
                    <span><strong>Neon Mercy</strong><small>Nova Saint · Preview only</small></span>
                    <span className={styles.stageBadge}>Demo campaign</span>
                    <SourceBadge status="demo" />
                  </button>
                )}
              </div>
            </article>

            <article className={styles.panel} id="catalog">
              <div className={styles.sectionHeading}>
                <div><p className={styles.eyebrow}>CATALOG</p><h2>Playable records</h2></div>
                <SourceBadge status="manual" />
              </div>
              <div className={styles.trackList}>
                {visibleTracks.map((track) => (
                  <button key={track.id} className={activeTrackId === track.id ? styles.activeTrack : ""} onClick={() => selectTrack(track)}>
                    <span aria-hidden="true">{activeTrackId === track.id && isPlaying ? "Ⅱ" : "▶"}</span>
                    <span><strong>{track.title}</strong><small>{track.artist}</small></span>
                    <SourceBadge status={track.source} />
                    <time>{track.duration}</time>
                  </button>
                ))}
              </div>
            </article>
          </section>

          <section className={styles.copilot} id="automations">
            <div>
              <p className={styles.eyebrow}>LABEL COPILOT · APPROVAL REQUIRED</p>
              <h2>Use records. Never invent results.</h2>
              <p>Copilot answers must name the record source, mark estimates, respect user roles, and show a preview before changing data.</p>
            </div>
            <div className={styles.promptButtons}>
              {["Check release risks", "Find missing metadata", "Build a campaign plan", "Explain royalty status"].map((prompt) => (
                <button key={prompt} onClick={() => runAction(prompt)}>{prompt}</button>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className={styles.playerDock} aria-label="Global music player">
        <div className={styles.playerArtwork} aria-hidden="true">{activeTrack.title.slice(0, 2).toUpperCase()}</div>
        <div className={styles.playerTrack}>
          <strong>{activeTrack.title}</strong>
          <span>{activeTrack.artist}</span>
        </div>
        <button className={styles.playerButton} onClick={() => setIsPlaying((value) => !value)} aria-label={isPlaying ? "Pause preview" : "Play preview"}>
          {isPlaying ? "Ⅱ" : "▶"}
        </button>
        <div className={styles.progressWrap}>
          <span>{isPlaying ? "0:12" : "0:00"}</span>
          <progress max="100" value={isPlaying ? 7 : 0}>Preview progress</progress>
          <span>{activeTrack.duration}</span>
        </div>
        <SourceBadge status={activeTrack.source} />
        <span className={styles.previewLabel}>Preview player · audio storage not connected</span>
      </section>
    </main>
  );
}
