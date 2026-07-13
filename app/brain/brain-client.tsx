"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import {
  AlertTriangle,
  Archive,
  BrainCircuit,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Database,
  Download,
  ExternalLink,
  FileJson,
  GitBranch,
  Layers3,
  ListFilter,
  Music2,
  Plus,
  Search,
  Sparkles,
  Upload,
  Workflow,
} from "lucide-react";

import { createBrainItemAction, importBrainItemsAction, updateBrainItemStatusAction } from "@/app/brain/actions";
import organic from "@/app/brain/brain-organic.module.css";
import styles from "@/app/brain/brain.module.css";
import { brainKinds, brainPriorities, brainStatuses, type BrainItem, type BrainSnapshot, type BrainStatus } from "@/lib/brain-types";

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
  const haystack = [item.title, item.summary, item.area, item.kind, item.status, item.priority, item.source, ...item.tags].join(" ").toLowerCase();
  return normalized.split(/\s+/).every((token) => haystack.includes(token));
}

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
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("all");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("open");
  const [brainJson, setBrainJson] = useState("");

  const areas = useMemo(() => [...new Set(snapshot.items.map((item) => item.area))].sort(), [snapshot.items]);

  const filteredItems = useMemo(() => {
    return snapshot.items
      .filter((item) => itemMatches(item, query))
      .filter((item) => area === "all" || item.area === area)
      .filter((item) => kind === "all" || item.kind === kind)
      .filter((item) => {
        if (status === "all") return true;
        if (status === "open") return !["done", "archived"].includes(item.status);
        return item.status === status;
      })
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.title.localeCompare(b.title));
  }, [snapshot.items, query, area, kind, status]);

  const nextItems = useMemo(
    () => snapshot.items.filter((item) => item.status === "next" || item.status === "blocked" || (item.status === "active" && item.priority === "critical")).slice(0, 8),
    [snapshot.items],
  );

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

  function exportBrain() {
    const payload = {
      exportedAt: new Date().toISOString(),
      format: "illco-brain-os-v1",
      items: snapshot.items,
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
    window.setTimeout(() => document.getElementById("memory-index")?.scrollIntoView({ behavior: "smooth", block: "start" }), 20);
  }

  async function readImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBrainJson(await file.text());
  }

  return (
    <div className={`${styles.shell} ${organic.brainShell}`}>
      <header className={`${styles.hero} ${organic.heroBrain}`}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><BrainCircuit size={16} /> PRIVATE OPERATING MEMORY</span>
          <h1>{ownerName.split(" ")[0]}&apos;s ILLCO Brain OS</h1>
          <p>One searchable neural system for iLLCo Ai, M3ntally-iLL, products, code, research, content, routines, and decisions.</p>
        </div>
        <div className={styles.heroActions}>
          <button type="button" className={styles.secondaryButton} onClick={exportBrain}>
            <Download size={17} /> Export brain
          </button>
          <a className={styles.primaryButton} href="#capture">
            <Plus size={17} /> Capture memory
          </a>
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
          <p>Each lobe is a major operating area. Select one to activate that region and open its memories below.</p>
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
                <small>{node.count} memories · {node.open} active · {node.critical} critical</small>
              </button>
            );
          })}
          <div className={organic.brainCore} title="ILLCO neural core"><BrainCircuit size={34} /></div>
        </div>
      </section>

      <section className={styles.statsGrid} aria-label="Brain OS summary">
        <article className={organic.neuralStat}><span>Total memory</span><strong>{snapshot.total}</strong><small>indexed records</small></article>
        <article className={organic.neuralStat}><span>Active</span><strong>{snapshot.active}</strong><small>in motion</small></article>
        <article className={organic.neuralStat}><span>Next</span><strong>{snapshot.next}</strong><small>queued actions</small></article>
        <article className={organic.neuralStat}><span>Blocked</span><strong>{snapshot.blocked}</strong><small>needs attention</small></article>
        <article className={organic.neuralStat}><span>Areas</span><strong>{snapshot.areas}</strong><small>connected lobes</small></article>
      </section>

      <section className={`${styles.commandPanel} ${organic.frontalLobe}`}>
        <div className={styles.commandHeading}>
          <div>
            <span className={styles.sectionLabel}><Sparkles size={14} /> FRONTAL LOBE · SEARCH + DECISION</span>
            <h2>Find anything you have built, decided, sold, studied, or planned.</h2>
          </div>
          <span className={styles.resultCount}>{filteredItems.length} results</span>
        </div>
        <label className={styles.searchBox}>
          <Search size={21} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try: lyric video, agent swarm, Friday music, lead intake, real estate..." />
        </label>
        <div className={styles.filters}>
          <label><ListFilter size={15} /><select value={area} onChange={(event) => setArea(event.target.value)}><option value="all">All lobes</option>{areas.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label><Layers3 size={15} /><select value={kind} onChange={(event) => setKind(event.target.value)}><option value="all">All memory types</option>{brainKinds.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
          <label><CircleDot size={15} /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="open">Open only</option><option value="all">All statuses</option>{brainStatuses.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
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

      <div className={styles.twoColumn}>
        <section className={`${styles.panel} ${organic.brainPanel}`}>
          <div className={styles.panelHeading}>
            <div><span className={styles.sectionLabel}>MOTOR CORTEX · EXECUTION</span><h2>What needs attention now</h2></div>
            <span>{nextItems.length} surfaced</span>
          </div>
          <div className={styles.nextList}>
            {nextItems.map((item) => {
              const Icon = statusIcon(item.status);
              return (
                <article key={item.id} className={`${styles.nextItem} ${organic.neuralConnector}`}>
                  <span className={`${styles.statusIcon} ${styles[item.status]}`}><Icon size={17} /></span>
                  <div><strong>{item.title}</strong><p>{item.area} · {titleCase(item.priority)} priority</p></div>
                  <ChevronRight size={17} />
                </article>
              );
            })}
          </div>
        </section>

        <section className={`${styles.panel} ${organic.brainPanel}`}>
          <div className={styles.panelHeading}>
            <div><span className={styles.sectionLabel}>ASSOCIATION CORTEX · CONNECTIONS</span><h2>Connected operating areas</h2></div>
            <span>{graphAreas.length} nodes</span>
          </div>
          <div className={styles.graphList}>
            {graphAreas.slice(0, 10).map((node) => {
              const Icon = areaIcon(node.name);
              return (
                <button key={node.name} type="button" onClick={() => selectBrainRegion(node.name)} className={`${styles.graphNode} ${organic.neuralConnector}`}>
                  <span><Icon size={17} /></span>
                  <div><strong>{node.name}</strong><small>{node.open} open · {node.critical} critical</small></div>
                  <b>{node.count}</b>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <section id="memory-index" className={`${styles.panel} ${organic.brainPanel}`}>
        <div className={styles.panelHeading}>
          <div><span className={styles.sectionLabel}>HIPPOCAMPUS · MEMORY INDEX</span><h2>Search results</h2></div>
          <span>{filteredItems.length} shown</span>
        </div>
        <div className={styles.memoryGrid}>
          {filteredItems.map((item) => {
            const Icon = statusIcon(item.status);
            return (
              <article key={item.id} className={`${styles.memoryCard} ${organic.memoryNeuron}`}>
                <div className={styles.cardTopline}>
                  <span className={styles.kindPill}>{titleCase(item.kind)}</span>
                  <span className={`${styles.priorityPill} ${styles[`priority_${item.priority}`]}`}>{titleCase(item.priority)}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <div className={styles.tags}>{item.tags.slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}</div>
                <div className={styles.cardMeta}>
                  <span><Icon size={14} /> {titleCase(item.status)}</span>
                  <span>{item.area}</span>
                  <span>{item.source}</span>
                </div>
                <div className={styles.cardActions}>
                  {storageMode === "database" ? (
                    <form action={updateBrainItemStatusAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <select name="status" defaultValue={item.status} aria-label={`Update ${item.title} status`}>
                        {brainStatuses.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
                      </select>
                      <button type="submit">Save</button>
                    </form>
                  ) : <span>Read only</span>}
                  {item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer">Open source <ExternalLink size={13} /></a> : null}
                </div>
              </article>
            );
          })}
        </div>
        {!filteredItems.length ? <div className={styles.emptyState}>No memories match those filters.</div> : null}
      </section>

      <section id="capture" className={styles.captureGrid}>
        <article className={`${styles.panel} ${organic.brainPanel}`}>
          <div className={styles.panelHeading}>
            <div><span className={styles.sectionLabel}>SENSORY CORTEX · CAPTURE</span><h2>Add a memory, task, decision, or project</h2></div>
            <Plus size={20} />
          </div>
          <form action={createBrainItemAction} className={styles.formGrid}>
            <label className={styles.fullField}>Title<input name="title" required placeholder="What should the brain remember?" disabled={storageMode !== "database"} /></label>
            <label>Type<select name="kind" defaultValue="task" disabled={storageMode !== "database"}>{brainKinds.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
            <label>Area<input name="area" defaultValue="Second Brain" disabled={storageMode !== "database"} /></label>
            <label>Priority<select name="priority" defaultValue="medium" disabled={storageMode !== "database"}>{brainPriorities.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
            <label>Status<select name="status" defaultValue="next" disabled={storageMode !== "database"}>{brainStatuses.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
            <label className={styles.fullField}>Summary<textarea name="summary" rows={4} placeholder="Context, desired outcome, constraints, and next step." disabled={storageMode !== "database"} /></label>
            <label className={styles.fullField}>Tags<input name="tags" placeholder="automation, music, launch" disabled={storageMode !== "database"} /></label>
            <label>Due date<input name="dueAt" type="datetime-local" disabled={storageMode !== "database"} /></label>
            <label>Source URL<input name="sourceUrl" type="url" placeholder="https://" disabled={storageMode !== "database"} /></label>
            <button className={styles.primaryButton} type="submit" disabled={storageMode !== "database"}><Plus size={16} /> Add to brain</button>
          </form>
        </article>

        <article className={`${styles.panel} ${organic.brainPanel}`}>
          <div className={styles.panelHeading}>
            <div><span className={styles.sectionLabel}>LONG-TERM MEMORY · PRIVATE IMPORT</span><h2>Load the full memory pack</h2></div>
            <Upload size={20} />
          </div>
          <p className={styles.importCopy}>Sensitive Gmail, calendar, personal, health, and infrastructure data stays outside the public codebase. Import it here after signing in.</p>
          <form action={importBrainItemsAction} className={styles.importForm}>
            <label className={styles.fileButton}><Upload size={16} /> Choose JSON file<input type="file" accept="application/json,.json" onChange={readImportFile} disabled={storageMode !== "database"} /></label>
            <textarea name="brainJson" value={brainJson} onChange={(event) => setBrainJson(event.target.value)} rows={12} placeholder='[{"title":"Memory","kind":"memory","area":"Personal"}]' disabled={storageMode !== "database"} />
            <button className={styles.primaryButton} type="submit" disabled={storageMode !== "database" || !brainJson.trim()}><FileJson size={16} /> Import private memory</button>
          </form>
        </article>
      </section>
    </div>
  );
}
