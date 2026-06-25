"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type LyricCue = {
  start: number;
  end: number;
  text: string;
};

type LyricMode = "censored" | "uncensored";
type VisualStyle = "studio" | "inferno" | "chrome" | "haunted" | "graffiti";
type FxIntensity = "low" | "medium" | "high";

type MasterCueData = {
  defaultMode: LyricMode;
  video: string;
  modes: Record<LyricMode, { label: string; cueCount: number; cues: LyricCue[] }>;
};

const visualStyles: Array<{ key: VisualStyle; label: string; detail: string }> = [
  { key: "studio", label: "Studio", detail: "Premium readable default" },
  { key: "inferno", label: "Inferno", detail: "Fire glow and ember hits" },
  { key: "chrome", label: "Chrome", detail: "Metal panels and lens streaks" },
  { key: "haunted", label: "Haunted", detail: "Smoke, scanlines, warped shadows" },
  { key: "graffiti", label: "Graffiti", detail: "Poster tear and paint energy" },
];

const fxIntensities: Array<{ key: FxIntensity; label: string }> = [
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
];

const fallbackVideoUrl = "https://master-lyric-deploy.vercel.app/master-lyric-video.mp4";

function readSavedValue<T extends string>(key: string, fallback: T, allowed: readonly T[]) {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key) as T | null;
  return value && allowed.includes(value) ? value : fallback;
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

export function MasterLyricControlRoom() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeCueRef = useRef<HTMLButtonElement | null>(null);
  const [cueData, setCueData] = useState<MasterCueData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState<LyricMode>(() => readSavedValue("illcoMasterLyricMode", "censored", ["censored", "uncensored"]));
  const [visualStyle, setVisualStyle] = useState<VisualStyle>(() => readSavedValue("illcoMasterLyricStyle", "studio", ["studio", "inferno", "chrome", "haunted", "graffiti"]));
  const [fxIntensity, setFxIntensity] = useState<FxIntensity>(() => readSavedValue("illcoMasterLyricFx", "medium", ["low", "medium", "high"]));
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    fetch("/data/master-lyric-cues.json")
      .then((response) => {
        if (!response.ok) throw new Error("Cue data unavailable.");
        return response.json() as Promise<MasterCueData>;
      })
      .then((data) => {
        setCueData(data);
        if (!data.modes[mode]) setMode(data.defaultMode || "censored");
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : "Could not load Master Lyric cues."));
  }, []);

  useEffect(() => {
    window.localStorage.setItem("illcoMasterLyricMode", mode);
  }, [mode]);

  useEffect(() => {
    window.localStorage.setItem("illcoMasterLyricStyle", visualStyle);
  }, [visualStyle]);

  useEffect(() => {
    window.localStorage.setItem("illcoMasterLyricFx", fxIntensity);
  }, [fxIntensity]);

  const cues = cueData?.modes[mode]?.cues || [];
  const activeCueIndex = useMemo(
    () => cues.findIndex((cue) => currentTime >= cue.start && currentTime <= cue.end),
    [cues, currentTime],
  );
  const activeCue = activeCueIndex >= 0 ? cues[activeCueIndex] : null;
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const videoUrl = cueData?.video?.startsWith("http") ? cueData.video : fallbackVideoUrl;

  useEffect(() => {
    activeCueRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeCueIndex]);

  function seekToCue(cue: LyricCue) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = cue.start;
    void video.play();
  }

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }

  return (
    <section className="masterLyricRoom" data-style={visualStyle} data-fx={fxIntensity} aria-label="Master Lyric visual control room">
      <div className="masterLyricBackdrop" aria-hidden="true"><span /><span /><span /></div>

      <div className="masterLyricPanel">
        <div className="masterLyricHeader">
          <span className="readinessPill ready">ILLCOCOMMAND module</span>
          <h2>Master Lyric Control Room</h2>
          <p>Switch lyric safety mode, preview synced cues, and change the visual personality without leaving Lyric Video Forge.</p>
        </div>

        <div className="masterLyricControlGrid">
          <article className="masterLyricControlBlock">
            <span>Lyric safety</span>
            <div className="masterLyricSegmented" role="group" aria-label="Lyric display mode">
              <button className={mode === "censored" ? "active" : ""} type="button" onClick={() => setMode("censored")}>Censored</button>
              <button className={mode === "uncensored" ? "active" : ""} type="button" onClick={() => setMode("uncensored")}>Uncensored</button>
            </div>
          </article>

          <article className="masterLyricControlBlock wide">
            <span>Visual style</span>
            <div className="masterLyricStylePicker" role="group" aria-label="Visual style presets">
              {visualStyles.map((style) => (
                <button className={visualStyle === style.key ? "active" : ""} type="button" onClick={() => setVisualStyle(style.key)} key={style.key}>
                  <strong>{style.label}</strong>
                  <small>{style.detail}</small>
                </button>
              ))}
            </div>
          </article>

          <article className="masterLyricControlBlock">
            <span>FX intensity</span>
            <div className="masterLyricSegmented" role="group" aria-label="FX intensity">
              {fxIntensities.map((fx) => (
                <button className={fxIntensity === fx.key ? "active" : ""} type="button" onClick={() => setFxIntensity(fx.key)} key={fx.key}>
                  {fx.label}
                </button>
              ))}
            </div>
          </article>
        </div>

        <div className="masterLyricNow">
          <small>{mode === "censored" ? "Censored lyric" : "Uncensored lyric"} / {visualStyle}</small>
          <strong>{activeCue?.text || (loadError ? loadError : "Press play or select a cue.")}</strong>
        </div>

        <div className="masterLyricStats">
          <span><strong>{cues.length}</strong> cues</span>
          <span><strong>{formatTime(currentTime)}</strong> current</span>
          <span><strong>{formatTime(duration)}</strong> duration</span>
        </div>

        <div className="masterLyricCueList" aria-label="Timed lyric cues">
          {cues.map((cue, index) => (
            <button
              className={`masterLyricCue ${activeCueIndex === index ? "active" : ""}`}
              type="button"
              onClick={() => seekToCue(cue)}
              ref={activeCueIndex === index ? activeCueRef : null}
              key={`${cue.start}-${cue.text}`}
            >
              <time>{formatTime(cue.start)}</time>
              <span>{cue.text}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="masterLyricStage">
        <div className="masterLyricVideoShell">
          <video
            ref={videoRef}
            controls
            playsInline
            preload="metadata"
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        </div>

        <div className="masterLyricTransport">
          <button className="button primary" type="button" onClick={togglePlayback}>{isPlaying ? "Pause master" : "Play master"}</button>
          <div className="masterLyricProgress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
          <a className="button secondary" href={videoUrl} target="_blank" rel="noreferrer">Open MP4</a>
        </div>
      </div>
    </section>
  );
}
