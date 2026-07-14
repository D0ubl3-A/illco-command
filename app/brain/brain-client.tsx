"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Archive,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Command,
  Database,
  Download,
  ExternalLink,
  FileJson,
  Gauge,
  GitBranch,
  History,
  Layers3,
  Link2,
  ListFilter,
  Music2,
  Network,
  Pencil,
  Pin,
  Plus,
  Search,
  Sparkles,
  Target,
  Upload,
  Workflow,
  X,
} from "lucide-react";

import {
  createBrainItemAction,
  createBrainLinkAction,
  importBrainItemsAction,
  toggleBrainPinAction,
  updateBrainItemAction,
  updateBrainItemStatusAction,
} from "@/app/brain/actions";
import depth from "@/app/brain/brain-depth.module.css";
import organic from "@/app/brain/brain-organic.module.css";
import styles from "@/app/brain/brain.module.css";
import {
  brainKinds,
  brainPriorities,
  brainRelationTypes,
  brainStatuses,
  type BrainCommandResult,
  type BrainItem,
  type BrainSnapshot,
  type BrainStatus,
} from "@/lib/brain-types";

function titleCase(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function priorityRank(priority: BrainItem["priority"]) {
  return { critical: 0, high: 1, medium: 2, low: 3 }[priority];
}

function statusIcon(status: BrainStatus) {
  if (status === "done") return CheckCircle2;
  if (status === "blocked") return AlertTriangle;
  if (status === "archived") return Archive;
  if (status === "waiting") return Clock3;
  return CircleDot;
}

function areaIcon(area: string) {
  if (/music/i.test(area)) return Music2;
  if (/business|product|marketing|real estate/i.test(area)) return BriefcaseBusiness;
  if (/engineering|system|operation|second brain/i.test(area)) return Workflow;
  return Layers3;
}

function itemMatches(item: BrainItem, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = [
    item.title,
    item.summary,
    item.area,
    item.kind,
    item.status,
    item.priority,
    item.nextAction || "",
    item.source,
    ...item.tags,
  ].join(" ").toLowerCase();
  return normalized.split(/\s+/).every((token) => haystack.includes(token));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function dateInputValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

const emptyBrief = {
  focusIds: [] as string[],
  overdueIds: [] as string[],
  dueSoonIds: [] as string[],
  staleIds: [] as string[],
  recentlyUpdatedIds: [] as string[],
  completionRate: 0,
};

export function BrainClient({
  ownerName,
  storageMode,
  storageMessage,
  snapshot,
}: {
  ownerName: string;
  storageMode: "database" | "read-only";
  storageMessage: string;
  snapshot: BrainSnapshot;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("all");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("open");
  const [brainJson, setBrainJson] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [commandText, setCommandText] = useState("focus");
  const [commandBusy, setCommandBusy] = useState(false);
  const [commandResult, setCommandResult] = useState<BrainCommandResult | null>(null);
  const [commandFilterIds, setCommandFilterIds] = useState<string[]>([]);

  const links = snapshot.links || [];
  const events = snapshot.events || [];
  const brief = snapshot.brief || emptyBrief;
  const itemMap = useMemo(() => new Map(snapshot.items.map((item) => [item.id, item])), [snapshot.items]);
  const areas = useMemo(() => [...new Set(snapshot.items.map((item) => item.area))].sort(), [snapshot.items]);

  const filteredItems = useMemo(() => {
    return snapshot.items
      .filter((item) => !commandFilterIds.length || commandFilterIds.includes(item.id))
      .filter((item) => itemMatches(item, query))
      .filter((item) => area === "all" || item.area === area)
      .filter((item) => kind === "all" || item.kind === kind)
      .filter((item) => {
        if (status === "all") return true;
        if (status === "open") return !["done", "archived"].includes(item.status);
        return item.status === status;
      })
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || priorityRank(a.priority) - priorityRank(b.priority) || a.title.localeCompare(b.title));
  }, [snapshot.items, commandFilterIds, query, area, kind, status]);

  const graphAreas = useMemo(
    () =>
      areas
        .map((areaName) => {
          const items = snapshot.items.filter((item) => item.area === areaName);
          return {
            name: areaName,
            count: items.length,
            critical: items.filter((item) => item.priority === "critical").length,
            open: items.filter((item) => !["done", "archived"].includes(item.status)).length,
          };
        })
        .sort((a, b) => b.count - a.count),
    [areas, snapshot.items],
  );

  const brainRegions = graphAreas.slice(0, 8);
  const focusItems = brief.focusIds.map((id) => itemMap.get(id)).filter(Boolean) as BrainItem[];
  const overdueItems = brief.overdueIds.map((id) => itemMap.get(id)).filter(Boolean) as BrainItem[];
  const dueSoonItems = brief.dueSoonIds.map((id) => itemMap.get(id)).filter(Boolean) as BrainItem[];
  const staleItems = brief.staleIds.map((id) => itemMap.get(id)).filter(Boolean) as BrainItem[];
  const selectedItem = selectedId ? itemMap.get(selectedId) || null : null;
  const selectedLinks = selectedItem
    ? links.filter((link) => link.fromItemId === selectedItem.id || link.toItemId === selectedItem.id)
    : [];
  const selectedEvents = selectedItem ? events.filter((event) => event.itemId === selectedItem.id).slice(0, 12) : [];
  const visibleRelationships = links.slice(0, 12);
  const visibleEvents = events.slice(0, 12);

  function exportBrain() {
    const payload = {
      exportedAt: new Date().toISOString(),
      format: "illco-brain-os-v2",
      items: snapshot.items,
      links,
      events,
      brief,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `illco-brain-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function selectBrainRegion(areaName: string) {
    setArea(areaName);
    setStatus("open");
    setCommandFilterIds([]);
    window.setTimeout(() => document.getElementById("memory-index")?.scrollIntoView({ behavior: "smooth", block: "start" }), 20);
  }

  function openMemory(itemId: string) {
    setSelectedId(itemId);
    window.setTimeout(() => document.getElementById("memory-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }), 20);
  }

  function showIds(ids: string[]) {
    setCommandFilterIds(ids);
    setArea("all");
    setKind("all");
    setStatus("all");
    setQuery("");
    window.setTimeout(() => document.getElementById("memory-index")?.scrollIntoView({ behavior: "smooth", block: "start" }), 20);
  }

  function resetFilters() {
    setCommandFilterIds([]);
    setQuery("");
    setArea("all");
    setKind("all");
    setStatus("open");
    setCommandResult(null);
  }

  async function runCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!commandText.trim() || commandBusy) return;
    setCommandBusy(true);
    try {
      const response = await fetch("/api/brain/command", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ command: commandText }),
      });
      const payload = (await response.json()) as BrainCommandResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Brain command failed.");
      setCommandResult(payload);
      showIds(payload.itemIds);
      if (payload.mutation !== "none") router.refresh();
    } catch (error) {
      setCommandResult({
        command: commandText,
        mutation: "none",
        itemIds: [],
        message: error instanceof Error ? error.message : "Brain command failed.",
      });
    } finally {
      setCommandBusy(false);
    }
  }

  async function readImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBrainJson(await file.text());
  }

  return (
    <div className={`${styles.shell} ${organic.brainShell} ${depth.deepShell}`}>
      <header className={`${styles.hero} ${organic.heroBrain}`}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><BrainCircuit size={16} /> PRIVATE OPERATING INTELLIGENCE</span>
          <h1>{ownerName.split(" ")[0]}&apos;s ILLCO Brain OS</h1>
          <p>A linked operating brain for projects, decisions, music, products, research, execution, and institutional memory.</p>
        </div>
        <div className={styles.heroActions}>
          <button type="button" className={styles.secondaryButton} onClick={exportBrain}><Download size={17} /> Export brain</button>
          <a className={styles.primaryButton} href="#capture"><Plus size={17} /> Capture memory</a>
        </div>
      </header>

      <section className={`${styles.storageBanner} ${storageMode === "database" ? styles.storageReady : styles.storageWarning}`}>
        <Database size={18} />
        <div>
          <strong>{storageMode === "database" ? "Private database active" : "Read-only bootstrap mode"}</strong>
          <span>{storageMessage}</span>
        </div>
      </section>

      <section className={organic.brainStage} aria-label="Interactive operating brain map">
        <div className={organic.brainStageHeader}>
          <div>
            <span className={styles.sectionLabel}><BrainCircuit size={14} /> NEURAL MAP</span>
            <h2>Your work is organized like a living brain.</h2>
          </div>
          <p>Select a lobe to isolate that operating area and open its active memories.</p>
        </div>
        <div className={organic.brainDiagram}>
          {brainRegions.map((node, index) => {
            const Icon = areaIcon(node.name);
            return (
              <button
                key={node.name}
                type="button"
                onClick={() => selectBrainRegion(node.name)}
                className={`${organic.brainLobe} ${organic[`brainLobe${index + 1}`]} ${area === node.name ? organic.activeLobe : ""}`}
              >
                <span><Icon size={17} /></span>
                <strong>{node.name}</strong>
                <small>{node.count} memories · {node.open} open · {node.critical} critical</small>
              </button>
            );
          })}
          <div className={organic.brainCore} title="ILLCO neural core"><BrainCircuit size={34} /></div>
        </div>
      </section>

      <section className={depth.executiveGrid} aria-label="Executive brain briefing">
        <article className={depth.healthCard}>
          <div className={depth.healthRing} style={{ "--health": `${snapshot.healthScore ?? 0}%` } as React.CSSProperties}>
            <Gauge size={23} />
            <strong>{snapshot.healthScore ?? 0}</strong>
          </div>
          <div><span>Brain health</span><p>Weighted by blockers, overdue work, stale memory, completion, and connections.</p></div>
        </article>
        <button type="button" onClick={() => showIds(brief.focusIds)} className={depth.briefCard}><Target size={19} /><span>Focus now</span><strong>{brief.focusIds.length}</strong><small>highest-impact memories</small></button>
        <button type="button" onClick={() => showIds(brief.overdueIds)} className={depth.briefCard}><AlertTriangle size={19} /><span>Overdue</span><strong>{snapshot.overdue ?? 0}</strong><small>past due and still open</small></button>
        <button type="button" onClick={() => showIds(brief.dueSoonIds)} className={depth.briefCard}><CalendarClock size={19} /><span>Due soon</span><strong>{snapshot.dueSoon ?? 0}</strong><small>within seven days</small></button>
        <button type="button" onClick={() => showIds(brief.staleIds)} className={depth.briefCard}><History size={19} /><span>Needs review</span><strong>{snapshot.stale ?? 0}</strong><small>unchanged for 14+ days</small></button>
      </section>

      <section className={`${styles.commandPanel} ${organic.frontalLobe} ${depth.commandConsole}`}>
        <div className={styles.commandHeading}>
          <div>
            <span className={styles.sectionLabel}><Command size={14} /> PREFRONTAL CORTEX · COMMAND CONSOLE</span>
            <h2>Ask, filter, create, complete, pin, or connect memories.</h2>
          </div>
          <span className={styles.resultCount}>Deterministic commands</span>
        </div>
        <form onSubmit={runCommand} className={depth.commandForm}>
          <label className={styles.searchBox}>
            <Command size={21} />
            <input value={commandText} onChange={(event) => setCommandText(event.target.value)} placeholder="focus · overdue · find: lyric video · create task: Launch page | priority=high" />
          </label>
          <button className={styles.primaryButton} type="submit" disabled={commandBusy || storageMode !== "database"}>{commandBusy ? "Thinking…" : "Run command"}</button>
        </form>
        <div className={depth.commandShortcuts}>
          {["focus", "blocked", "overdue", "stale", "help"].map((command) => (
            <button key={command} type="button" onClick={() => setCommandText(command)}>{command}</button>
          ))}
        </div>
        {commandResult ? (
          <div className={depth.commandResult}>
            <BrainCircuit size={17} />
            <div><strong>{commandResult.message}</strong><small>{commandResult.itemIds.length} memories selected · {commandResult.mutation}</small></div>
            <button type="button" onClick={() => setCommandResult(null)} aria-label="Dismiss command result"><X size={16} /></button>
          </div>
        ) : null}
      </section>

      <section className={styles.statsGrid} aria-label="Brain OS summary">
        <article className={organic.neuralStat}><span>Total memory</span><strong>{snapshot.total}</strong><small>indexed records</small></article>
        <article className={organic.neuralStat}><span>Completion</span><strong>{brief.completionRate}%</strong><small>finished records</small></article>
        <article className={organic.neuralStat}><span>Connections</span><strong>{links.length}</strong><small>{snapshot.connectedItems ?? 0} linked memories</small></article>
        <article className={organic.neuralStat}><span>Blocked</span><strong>{snapshot.blocked}</strong><small>needs intervention</small></article>
        <article className={organic.neuralStat}><span>Areas</span><strong>{snapshot.areas}</strong><small>connected lobes</small></article>
      </section>

      <section className={`${styles.commandPanel} ${depth.searchCortex}`}>
        <div className={styles.commandHeading}>
          <div><span className={styles.sectionLabel}><Search size={14} /> FRONTAL LOBE · SEARCH + FILTER</span><h2>Find anything you built, decided, sold, studied, or planned.</h2></div>
          <span className={styles.resultCount}>{filteredItems.length} results</span>
        </div>
        <label className={styles.searchBox}><Search size={21} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try: lyric video, agent swarm, Friday music, lead intake, real estate..." /></label>
        <div className={styles.filters}>
          <label><ListFilter size={15} /><select value={area} onChange={(event) => setArea(event.target.value)}><option value="all">All lobes</option>{areas.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label><Layers3 size={15} /><select value={kind} onChange={(event) => setKind(event.target.value)}><option value="all">All memory types</option>{brainKinds.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
          <label><CircleDot size={15} /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="open">Open only</option><option value="all">All statuses</option>{brainStatuses.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
          {(commandFilterIds.length || query || area !== "all" || kind !== "all" || status !== "open") ? <button type="button" className={depth.clearButton} onClick={resetFilters}>Clear filters</button> : null}
        </div>
      </section>

      <section className={styles.sourceGrid}>
        {snapshot.sources.map((source) => {
          const Icon = source.name === "GitHub" ? GitBranch : source.name === "Private import" ? FileJson : Database;
          return (
            <article key={source.name} className={`${styles.sourceCard} ${organic.synapseCard}`}>
              <span className={styles.sourceIcon}><Icon size={20} /></span>
              <div><strong>{source.name}</strong><p>{source.detail}</p></div>
              <span className={styles.sourceCount}>{source.itemCount}</span>
            </article>
          );
        })}
      </section>

      <section className={depth.intelligenceGrid}>
        <article className={`${styles.panel} ${organic.brainPanel}`}>
          <div className={styles.panelHeading}><div><span className={styles.sectionLabel}>MOTOR CORTEX · DAILY FOCUS</span><h2>Highest-impact work</h2></div><span>{focusItems.length} surfaced</span></div>
          <div className={styles.nextList}>
            {focusItems.map((item) => {
              const Icon = statusIcon(item.status);
              return (
                <button key={item.id} type="button" onClick={() => openMemory(item.id)} className={`${styles.nextItem} ${organic.neuralConnector}`}>
                  <span className={`${styles.statusIcon} ${styles[item.status]}`}><Icon size={17} /></span>
                  <div><strong>{item.title}</strong><p>{item.nextAction || `${item.area} · ${titleCase(item.priority)} priority`}</p></div>
                  <ChevronRight size={17} />
                </button>
              );
            })}
          </div>
        </article>

        <article className={`${styles.panel} ${organic.brainPanel}`}>
          <div className={styles.panelHeading}><div><span className={styles.sectionLabel}><Network size={14} /> ASSOCIATION CORTEX</span><h2>Relationship network</h2></div><span>{links.length} links</span></div>
          <div className={depth.relationshipList}>
            {visibleRelationships.length ? visibleRelationships.map((link) => {
              const from = itemMap.get(link.fromItemId);
              const to = itemMap.get(link.toItemId);
              return (
                <button key={link.id} type="button" onClick={() => from && openMemory(from.id)}>
                  <span className={depth.linkStrength}>{link.strength}</span>
                  <div><strong>{from?.title || "Missing memory"}</strong><small>{titleCase(link.relationType)}</small><strong>{to?.title || "Missing memory"}</strong></div>
                  <Link2 size={16} />
                </button>
              );
            }) : <p className={depth.mutedState}>No relationships yet. Connect memories in the detail panel or command console.</p>}
          </div>
        </article>

        <article className={`${styles.panel} ${organic.brainPanel}`}>
          <div className={styles.panelHeading}><div><span className={styles.sectionLabel}><Activity size={14} /> TEMPORAL LOBE</span><h2>Activity timeline</h2></div><span>{events.length} events</span></div>
          <div className={depth.timeline}>
            {visibleEvents.length ? visibleEvents.map((event) => (
              <button key={event.id} type="button" onClick={() => event.itemId && openMemory(event.itemId)} disabled={!event.itemId}>
                <span></span><div><strong>{titleCase(event.eventType)}</strong><p>{event.detail}</p><small>{formatDateTime(event.createdAt)}</small></div>
              </button>
            )) : <p className={depth.mutedState}>Activity appears here as memories are created, edited, linked, pinned, and completed.</p>}
          </div>
        </article>
      </section>

      <section id="memory-index" className={`${styles.panel} ${organic.brainPanel}`}>
        <div className={styles.panelHeading}>
          <div><span className={styles.sectionLabel}>HIPPOCAMPUS · MEMORY INDEX</span><h2>Search results</h2></div>
          <span>{filteredItems.length} shown</span>
        </div>
        <div className={styles.memoryGrid}>
          {filteredItems.map((item) => {
            const Icon = statusIcon(item.status);
            const progress = item.progress ?? 0;
            return (
              <article key={item.id} className={`${styles.memoryCard} ${organic.memoryNeuron} ${selectedId === item.id ? depth.selectedMemory : ""}`}>
                <div className={styles.cardTopline}>
                  <span className={styles.kindPill}>{titleCase(item.kind)}</span>
                  <div className={depth.cardFlags}>{item.pinned ? <Pin size={14} /> : null}<span className={`${styles.priorityPill} ${styles[`priority_${item.priority}`]}`}>{titleCase(item.priority)}</span></div>
                </div>
                <button type="button" className={depth.memoryTitleButton} onClick={() => openMemory(item.id)}><h3>{item.title}</h3></button>
                <p>{item.summary}</p>
                {item.nextAction ? <div className={depth.nextAction}><Target size={14} /><span>{item.nextAction}</span></div> : null}
                <div className={depth.progressWrap}><div><span>Progress</span><strong>{progress}%</strong></div><div className={depth.progressTrack}><span style={{ width: `${progress}%` }} /></div></div>
                <div className={styles.tags}>{item.tags.slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}</div>
                <div className={styles.cardMeta}><span><Icon size={14} /> {titleCase(item.status)}</span><span>{item.area}</span><span>{item.dueAt ? `Due ${formatDate(item.dueAt)}` : item.source}</span></div>
                <div className={styles.cardActions}>
                  {storageMode === "database" ? (
                    <>
                      <form action={updateBrainItemStatusAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <select name="status" defaultValue={item.status} aria-label={`Update ${item.title} status`}>{brainStatuses.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select>
                        <button type="submit">Save</button>
                      </form>
                      <form action={toggleBrainPinAction}>
                        <input type="hidden" name="id" value={item.id} /><input type="hidden" name="pinned" value={item.pinned ? "false" : "true"} />
                        <button type="submit" aria-label={item.pinned ? `Unpin ${item.title}` : `Pin ${item.title}`}><Pin size={13} /></button>
                      </form>
                    </>
                  ) : <span>Read only</span>}
                  <button type="button" onClick={() => openMemory(item.id)}><Pencil size={13} /> Details</button>
                  {item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer">Source <ExternalLink size={13} /></a> : null}
                </div>
              </article>
            );
          })}
        </div>
        {!filteredItems.length ? <div className={styles.emptyState}>No memories match those filters.</div> : null}
      </section>

      {selectedItem ? (
        <section id="memory-detail" className={`${styles.panel} ${organic.brainPanel} ${depth.detailPanel}`}>
          <div className={styles.panelHeading}>
            <div><span className={styles.sectionLabel}>WORKING MEMORY · DETAIL VIEW</span><h2>{selectedItem.title}</h2></div>
            <button type="button" className={depth.closeButton} onClick={() => setSelectedId(null)} aria-label="Close memory detail"><X size={18} /></button>
          </div>
          <div className={depth.detailGrid}>
            <form action={updateBrainItemAction} className={depth.editForm}>
              <input type="hidden" name="id" value={selectedItem.id} />
              <label className={depth.fullField}>Title<input name="title" defaultValue={selectedItem.title} required disabled={storageMode !== "database"} /></label>
              <label>Type<select name="kind" defaultValue={selectedItem.kind} disabled={storageMode !== "database"}>{brainKinds.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
              <label>Area<input name="area" defaultValue={selectedItem.area} disabled={storageMode !== "database"} /></label>
              <label>Status<select name="status" defaultValue={selectedItem.status} disabled={storageMode !== "database"}>{brainStatuses.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
              <label>Priority<select name="priority" defaultValue={selectedItem.priority} disabled={storageMode !== "database"}>{brainPriorities.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
              <label>Progress<input name="progress" type="number" min="0" max="100" defaultValue={selectedItem.progress ?? 0} disabled={storageMode !== "database"} /></label>
              <label className={depth.checkField}><input name="pinned" type="checkbox" defaultChecked={Boolean(selectedItem.pinned)} disabled={storageMode !== "database"} /> Pin to executive focus</label>
              <label className={depth.fullField}>Summary<textarea name="summary" rows={5} defaultValue={selectedItem.summary} disabled={storageMode !== "database"} /></label>
              <label className={depth.fullField}>Next action<input name="nextAction" defaultValue={selectedItem.nextAction || ""} placeholder="The single next physical action" disabled={storageMode !== "database"} /></label>
              <label className={depth.fullField}>Tags<input name="tags" defaultValue={selectedItem.tags.join(", ")} disabled={storageMode !== "database"} /></label>
              <label>Due date<input name="dueAt" type="datetime-local" defaultValue={dateInputValue(selectedItem.dueAt)} disabled={storageMode !== "database"} /></label>
              <label>Review date<input name="reviewAt" type="datetime-local" defaultValue={dateInputValue(selectedItem.reviewAt)} disabled={storageMode !== "database"} /></label>
              <label className={depth.fullField}>Source URL<input name="sourceUrl" type="url" defaultValue={selectedItem.sourceUrl || ""} disabled={storageMode !== "database"} /></label>
              <button className={styles.primaryButton} type="submit" disabled={storageMode !== "database"}><Pencil size={16} /> Save memory</button>
            </form>

            <div className={depth.detailSide}>
              <section>
                <h3><Link2 size={17} /> Connections</h3>
                <div className={depth.connectionChips}>
                  {selectedLinks.length ? selectedLinks.map((link) => {
                    const otherId = link.fromItemId === selectedItem.id ? link.toItemId : link.fromItemId;
                    const other = itemMap.get(otherId);
                    return <button key={link.id} type="button" onClick={() => other && openMemory(other.id)}><span>{titleCase(link.relationType)}</span><strong>{other?.title || "Missing memory"}</strong></button>;
                  }) : <p>No connections yet.</p>}
                </div>
                <form action={createBrainLinkAction} className={depth.linkForm}>
                  <input type="hidden" name="fromItemId" value={selectedItem.id} />
                  <label>Connect to<select name="toItemId" defaultValue="" required disabled={storageMode !== "database"}><option value="" disabled>Select memory</option>{snapshot.items.filter((item) => item.id !== selectedItem.id).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
                  <label>Relationship<select name="relationType" defaultValue="related_to" disabled={storageMode !== "database"}>{brainRelationTypes.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
                  <label>Strength<input name="strength" type="number" min="1" max="5" defaultValue="3" disabled={storageMode !== "database"} /></label>
                  <label>Note<input name="note" placeholder="Why these memories are connected" disabled={storageMode !== "database"} /></label>
                  <button className={styles.secondaryButton} type="submit" disabled={storageMode !== "database"}><Link2 size={15} /> Create link</button>
                </form>
              </section>

              <section>
                <h3><Activity size={17} /> Memory history</h3>
                <div className={depth.miniTimeline}>
                  {selectedEvents.length ? selectedEvents.map((event) => <article key={event.id}><span></span><div><strong>{titleCase(event.eventType)}</strong><p>{event.detail}</p><small>{formatDateTime(event.createdAt)}</small></div></article>) : <p>No recorded changes yet.</p>}
                </div>
              </section>
            </div>
          </div>
        </section>
      ) : null}

      <section id="capture" className={styles.captureGrid}>
        <article className={`${styles.panel} ${organic.brainPanel}`}>
          <div className={styles.panelHeading}><div><span className={styles.sectionLabel}>SENSORY CORTEX · CAPTURE</span><h2>Add a memory, task, decision, or project</h2></div><Plus size={20} /></div>
          <form action={createBrainItemAction} className={styles.formGrid}>
            <label className={styles.fullField}>Title<input name="title" required placeholder="What should the brain remember?" disabled={storageMode !== "database"} /></label>
            <label>Type<select name="kind" defaultValue="task" disabled={storageMode !== "database"}>{brainKinds.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
            <label>Area<input name="area" defaultValue="Second Brain" disabled={storageMode !== "database"} /></label>
            <label>Priority<select name="priority" defaultValue="medium" disabled={storageMode !== "database"}>{brainPriorities.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
            <label>Status<select name="status" defaultValue="next" disabled={storageMode !== "database"}>{brainStatuses.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
            <label>Progress<input name="progress" type="number" min="0" max="100" defaultValue="0" disabled={storageMode !== "database"} /></label>
            <label className={depth.checkField}><input name="pinned" type="checkbox" disabled={storageMode !== "database"} /> Pin to focus</label>
            <label className={styles.fullField}>Summary<textarea name="summary" rows={4} placeholder="Context, desired outcome, constraints, and next step." disabled={storageMode !== "database"} /></label>
            <label className={styles.fullField}>Next action<input name="nextAction" placeholder="What should happen next?" disabled={storageMode !== "database"} /></label>
            <label className={styles.fullField}>Tags<input name="tags" placeholder="automation, music, launch" disabled={storageMode !== "database"} /></label>
            <label>Due date<input name="dueAt" type="datetime-local" disabled={storageMode !== "database"} /></label>
            <label>Review date<input name="reviewAt" type="datetime-local" disabled={storageMode !== "database"} /></label>
            <label className={styles.fullField}>Source URL<input name="sourceUrl" type="url" placeholder="https://" disabled={storageMode !== "database"} /></label>
            <button className={styles.primaryButton} type="submit" disabled={storageMode !== "database"}><Plus size={16} /> Add to brain</button>
          </form>
        </article>

        <article className={`${styles.panel} ${organic.brainPanel}`}>
          <div className={styles.panelHeading}><div><span className={styles.sectionLabel}>LONG-TERM MEMORY · PRIVATE IMPORT</span><h2>Load the full memory pack</h2></div><Upload size={20} /></div>
          <p className={styles.importCopy}>Sensitive Gmail, calendar, personal, health, and infrastructure data stays outside the public codebase. Import it here after signing in.</p>
          <form action={importBrainItemsAction} className={styles.importForm}>
            <label className={styles.fileButton}><Upload size={16} /> Choose JSON file<input type="file" accept="application/json,.json" onChange={readImportFile} disabled={storageMode !== "database"} /></label>
            <textarea name="brainJson" value={brainJson} onChange={(event) => setBrainJson(event.target.value)} rows={12} placeholder='[{"title":"Memory","kind":"memory","area":"Personal"}]' disabled={storageMode !== "database"} />
            <button className={styles.primaryButton} type="submit" disabled={storageMode !== "database" || !brainJson.trim()}><FileJson size={16} /> Import private memory</button>
          </form>
        </article>
      </section>

      {(overdueItems.length || dueSoonItems.length || staleItems.length) ? (
        <footer className={depth.reviewFooter}>
          <strong>Review pulse:</strong>
          <span>{overdueItems.length} overdue</span><span>{dueSoonItems.length} due soon</span><span>{staleItems.length} stale</span>
        </footer>
      ) : null}
    </div>
  );
}
