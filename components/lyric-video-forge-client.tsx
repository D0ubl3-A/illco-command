"use client";

import { useState } from "react";

import { MasterLyricControlRoom } from "@/components/master-lyric-control-room";

type ForgeAction = "brief" | "transcribe" | "image-plan" | "full-run";

type AdEarningEstimate = {
  imageCreditReward: number;
  editCreditReward: number;
  grossPotentialCredits: number;
  netCreditGain: number;
  canEarnWithAds: boolean;
  earnedAdCredits: number;
};

type ForgeResponse = {
  brief: string;
  usedAgentSdk: boolean;
  transcription?: {
    status?: string;
    detail?: string;
    transcript?: {
      text?: string;
      words?: Array<{ word: string; start: number; end: number }>;
    };
  } | null;
  images?: {
    status: string;
    selectedImageCount: number;
    estimatedImageCredits: number;
    estimatedEditCredits: number;
    characterReferenceReceived: boolean;
  };
  modelDefaults?: {
    agent: string;
    image: string;
    realtimeTranscription: string;
    wordTimestampFallback: string;
  };
  credits?: {
    estimatedCost: number;
    adEarning?: AdEarningEstimate | null;
  };
  validation?: {
    errors?: string[];
    warnings?: string[];
  };
};

const imageCreditsFromCount = (count: number) => 2 + count * 5;
const editCreditsFromCount = (count: number) => count * 3;
const fullRunCreditsFromCounts = (imageCount: number, editCount: number) =>
  4 + imageCreditsFromCount(imageCount) + editCount * 3 + 8;

export function LyricVideoForgeClient() {
  const [artist, setArtist] = useState("M3ntally-iLL");
  const [songTitle, setSongTitle] = useState("Dead Silent Drops");
  const [audioPath, setAudioPath] = useState("");
  const [visualDirection, setVisualDirection] = useState("Normal M3ntally-iLL, attitude-forward, dark grade, no holy/devil concept.");
  const [lyricIssues, setLyricIssues] = useState("Fix timing drift, preserve word spacing, avoid wrong ASR lyrics, and use strict intentional rhyme coloring only.");
  const [imageCount, setImageCount] = useState(4);
  const [editCount, setEditCount] = useState(0);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [characterReference, setCharacterReference] = useState<File | null>(null);
  const [lyricsApproved, setLyricsApproved] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [brief, setBrief] = useState("");
  const [status, setStatus] = useState("Upload audio/video + character reference");
  const [creditCost, setCreditCost] = useState(1);
  const [modelLine, setModelLine] = useState("Agent: gpt-5-nano / Realtime: gpt-4o-transcribe / Word timing: whisper-1 / Images: gpt-image-1");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("Ready to sync lyrics");
  const [adEarning, setAdEarning] = useState<AdEarningEstimate | null>(null);

  const progressForAction: Record<ForgeAction, number> = {
    brief: 20,
    transcribe: 35,
    "image-plan": 65,
    "full-run": 85,
  };

  const progressLabels: Record<ForgeAction, string> = {
    brief: "Creating production brief",
    transcribe: "Running transcription pass",
    "image-plan": "Building image pass",
    "full-run": "Assembling full run plan",
  };

  function buildFormData(action: ForgeAction) {
    const form = new FormData();
    form.set("artist", artist);
    form.set("songTitle", songTitle);
    form.set("audioPath", audioPath);
    form.set("visualDirection", visualDirection);
    form.set("lyricIssues", lyricIssues);
    form.set("timingStatus", "OpenAI word-timestamp transcription first, Groq whisper-large-v3 fallback, user-approved lyrics required before render");
    form.set("requestedAction", action);
    form.set("imageCount", String(imageCount));
    form.set("editCount", String(editCount));
    form.set("lyricsApproved", String(lyricsApproved));
    if (audioFile) form.set("audio", audioFile);
    if (characterReference) form.set("characterReference", characterReference);
    return form;
  }

  async function callForge(action: ForgeAction) {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setProgress(progressForAction[action]);
    setProgressLabel(progressLabels[action]);
    setStatus(action === "transcribe" ? "Transcribing with OpenAI first; Groq fallback enabled..." : "Running Agent SDK production pass...");
    setAdEarning(null);

    try {
      const response = await fetch("/api/lyric-video-forge", {
        method: "POST",
        body: buildFormData(action),
      });

      const data = (await response.json()) as ForgeResponse;

      if (!response.ok) {
        setStatus(`Request failed (${response.status}). ${data.brief || "Please retry."}`);
        setBrief(data.brief || "Request failed.");
        setProgress(20);
        setProgressLabel("Request failed. Retry when ready.");
        return;
      }

      if (data.validation?.errors?.length) {
        setStatus(`Blocked: ${data.validation.errors.join(" ")}`);
        setBrief(data.brief || "Request blocked by validation.");
        setProgress(22);
        setProgressLabel("Validation blocked.");
        return;
      }

      setBrief(data.brief || "No brief returned.");
      setCreditCost(data.credits?.estimatedCost || 1);
      setAdEarning(data.credits?.adEarning || null);
      if (data.modelDefaults) {
        setModelLine(`Agent: ${data.modelDefaults.agent} / Realtime: ${data.modelDefaults.realtimeTranscription} / Word timing: ${data.modelDefaults.wordTimestampFallback} / Images: ${data.modelDefaults.image}`);
      }
      if (data.transcription?.transcript?.text) {
        setTranscriptText(data.transcription.transcript.text);
        setLyricsApproved(false);
        setStatus("Transcript ready. Confirm lyrics before images/render.");
        setProgress(75);
        setProgressLabel("Transcription complete. Review lyrics.");
        return;
      }
      if (data.transcription?.detail) {
        setStatus(data.transcription.detail);
        setProgress(80);
        setProgressLabel("Transcription step finished.");
        return;
      }

      const warning = data.validation?.warnings?.[0];
      setStatus(
        warning
          ? `Review warning: ${warning}`
          : data.usedAgentSdk
            ? "Agent SDK brief generated"
            : "Fallback brief generated; add OPENAI_API_KEY for live Agent SDK.",
      );
      setProgress(100);
      setProgressLabel("Action complete.");
    } catch {
      setStatus("Network error while contacting the Forge API.");
      setProgress(12);
      setProgressLabel("Network failure.");
    } finally {
      setIsLoading(false);
    }
  }

  const imageCredits = imageCreditsFromCount(imageCount);
  const editCredits = editCreditsFromCount(editCount);
  const fullRunEstimatedCost = fullRunCreditsFromCounts(imageCount, editCount);
  const adEarningCopy = adEarning
    ? adEarning.canEarnWithAds
      ? `Profitable: +${adEarning.earnedAdCredits} net reward credits (images: ${adEarning.imageCreditReward}, edits: ${adEarning.editCreditReward}, net: +${adEarning.netCreditGain})`
      : `Not profitable for ads: images=${adEarning.imageCreditReward} + edits=${adEarning.editCreditReward} = ${adEarning.grossPotentialCredits} potential, net: ${adEarning.netCreditGain}`
    : "Ad-payout estimate will appear after run.";
  const regulatedCreditCopy = `Regulated credit model: ${imageCredits} image credits + ${editCredits} edit credits = ${fullRunEstimatedCost} max spend on full run`;
  const chatgptOrigin =
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_APP_BASE_URL || "https://www.illcoai.tech"
      : window.location.origin;
  const chatgptMcpUrl = `${chatgptOrigin}/api/chatgpt/lyric-video-forge/mcp`;
  const chatgptSseUrl = `${chatgptOrigin}/api/chatgpt/lyric-video-forge/sse`;
  const chatgptWidgetUrl = `${chatgptOrigin}/api/chatgpt/lyric-video-forge/widget`;
  const chatgptSetupImage = `${chatgptOrigin}/images/lyric-video-forge-credits.png`;

  return (
    <section className="panel companionsPagePanel" id="forge">
      <div className="panelHeader">
        <div>
          <h2>Forge A Lyric Video Run</h2>
          <p>Upload audio, upload a character reference, transcribe first, approve the lyrics, then generate the selected number of visuals and dissolve them.</p>
        </div>
        <span className="readinessPill ready">{status}</span>
      </div>

      <div className="bigoStrategyHero lyricForgeCreditHero">
        <img src="/images/lyric-video-forge-credits.png" alt="Lyric Video Forge dedicated thumbnail" />
        <div>
          <span className="readinessPill ready">Credit system</span>
          <h3>Lyric Video Forge Credits</h3>
          <p>Credits meter transcription, Agent SDK planning, image generation, edit passes, and full render-plan runs.</p>
          <div className="heroProofBadges">
            <span><strong>{creditCost}</strong> credits current action</span>
            <span><strong>{imageCredits}</strong> image credits selected</span>
            <span><strong>{editCredits}</strong> edit-pass credits selected</span>
            <span><strong>{fullRunEstimatedCost}</strong> full-run credits estimate</span>
            <span>{regulatedCreditCopy}</span>
            <span>{adEarningCopy}</span>
            <span><strong>{modelLine}</strong></span>
          </div>
        </div>
      </div>

      <div className="bigoStrategyHero lyricForgeMcpHero">
        <div>
          <span className="readinessPill ready">ChatGPT App endpoints</span>
          <h3>Connect this Forge</h3>
          <div className="heroProofBadges lyricForgeEndpointBadges">
            <span><strong>MCP</strong> {chatgptMcpUrl}</span>
            <span><strong>SSE</strong> {chatgptSseUrl}</span>
            <span><strong>Widget</strong> {chatgptWidgetUrl}</span>
          </div>
        </div>
        <div className="bigoStrategyCommandCard lyricForgeCommandCard">
          <span>Setup image for ChatGPT</span>
          <img src={chatgptSetupImage} alt="Lyric Video Forge ChatGPT setup image" />
          <strong>Setup endpoints</strong>
          <a className="button secondary lyricForgeQuickAction" href={chatgptMcpUrl} target="_blank" rel="noreferrer">Open MCP bootstrap</a>
          <a className="button secondary lyricForgeQuickAction" href={chatgptWidgetUrl} target="_blank" rel="noreferrer">Open widget</a>
          <a className="button secondary lyricForgeQuickAction" href={chatgptSseUrl} target="_blank" rel="noreferrer">Open SSE endpoint</a>
        </div>
      </div>

      <MasterLyricControlRoom />

      <div className="bigoStrategyGrid">
        <label className="panel bigoStrategyStep">
          <span>Audio or video upload required</span>
          <input type="file" accept="audio/*,video/mp4,.mp3,.wav,.m4a,.mp4" onChange={(event) => setAudioFile(event.target.files?.[0] || null)} />
          <p>{audioFile ? audioFile.name : "Upload audio or MP4 video before transcription."}</p>
        </label>
        <label className="panel bigoStrategyStep">
          <span>Character reference required</span>
          <input type="file" accept="image/*" onChange={(event) => setCharacterReference(event.target.files?.[0] || null)} />
          <p>{characterReference ? characterReference.name : "Upload the artist/character reference before image generation."}</p>
        </label>
        <label className="panel bigoStrategyStep">
          <span>Generated image count</span>
          <input type="range" min="1" max="12" value={imageCount} onChange={(event) => setImageCount(Number(event.target.value))} />
          <p>{imageCount} images selected. The app will dissolve between them.</p>
        </label>
        <label className="panel bigoStrategyStep">
          <span>Expected edit passes</span>
          <input type="range" min="0" max="20" value={editCount} onChange={(event) => setEditCount(Number(event.target.value))} />
          <p>{editCount} edits selected. Edit pass count affects full-run credit burn.</p>
        </label>
      </div>

      <div className="bigoStrategyGrid">
        <label className="panel bigoStrategyStep">
          <span>Artist</span>
          <input value={artist} onChange={(event) => setArtist(event.target.value)} />
        </label>
        <label className="panel bigoStrategyStep">
          <span>Song</span>
          <input value={songTitle} onChange={(event) => setSongTitle(event.target.value)} />
        </label>
        <label className="panel bigoStrategyStep">
          <span>Fallback local audio path</span>
          <input value={audioPath} onChange={(event) => setAudioPath(event.target.value)} placeholder="Optional local audio path if available" />
        </label>
      </div>

      <label className="companionsPageHelperPrompt">
        <span>Visual direction</span>
        <textarea value={visualDirection} onChange={(event) => setVisualDirection(event.target.value)} rows={3} />
      </label>

      <label className="companionsPageHelperPrompt">
        <span>Known issues to fix</span>
        <textarea value={lyricIssues} onChange={(event) => setLyricIssues(event.target.value)} rows={4} />
      </label>

      <div className="forgeProgressWrap" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label="Forge action progress">
        <span className="forgeProgressLabel">{progressLabel}</span>
        <div className="forgeProgressTrack" />
        <div className="forgeProgressFill" style={{ width: `${Math.round(progress)}%` }} />
      </div>

      <div className="bigoStrategyActions lyricForgeActions">
        <button className="button primary lyricForgePrimaryAction" type="button" onClick={() => callForge("transcribe")} disabled={!audioFile || isLoading}>
          1. Transcribe Lyrics - 4 Credits
        </button>
        <button className="button secondary lyricForgePrimaryAction" type="button" onClick={() => callForge("image-plan")} disabled={!lyricsApproved || !characterReference || isLoading}>
          2. Plan {imageCount} Images + Dissolve - {imageCredits} Credits
        </button>
        <button className="button secondary lyricForgePrimaryAction" type="button" onClick={() => callForge("full-run")} disabled={!lyricsApproved || !audioFile || !characterReference || isLoading}>
          3. Full Run Plan - {fullRunEstimatedCost} Credits
        </button>
      </div>

      {isLoading ? <p className="companionsPageHelperPrompt">Processing request...</p> : null}

      {transcriptText ? (
        <article className="companionsPageHelperPrompt">
          <span>Lyrics confirmation gate</span>
          <textarea value={transcriptText} onChange={(event) => { setTranscriptText(event.target.value); setLyricsApproved(false); }} rows={10} />
          <button className="button primary" type="button" onClick={() => { setLyricsApproved(true); setStatus("Lyrics approved. Image generation/render planning unlocked."); }}>
            Confirm Lyrics Are Correct
          </button>
        </article>
      ) : null}

      {brief ? (
        <article className="companionsPageHelperPrompt">
          <span>Agent output</span>
          <pre>{brief}</pre>
        </article>
      ) : null}
    </section>
  );
}
