"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Role = "host" | "guest" | null;
type ConnectionState = "idle" | "creating" | "waiting" | "connecting" | "connected" | "failed";
type MatchState = "idle" | "countdown" | "running" | "ended";
type CatchRecord = { id?: string; species?: string; weight?: number; xp?: number; at?: number };
type SavedPlayer = { name?: string; catches?: CatchRecord[] };
type WireMessage =
  | { type: "hello"; name: string }
  | { type: "matchStart"; startAt: number; durationMs: number }
  | { type: "score"; score: number }
  | { type: "catch"; species: string; weight: number; points: number }
  | { type: "reset" };

const PLAYER_KEY = "illco.reelworld-go.native.v1";
const MATCH_KEY = "illco.reelworld-go.vs.v1";
const MATCH_DURATION = 5 * 60 * 1000;
const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

function readPlayer(): SavedPlayer {
  try { return JSON.parse(localStorage.getItem(PLAYER_KEY) || "{}"); } catch { return {}; }
}

function encodeSignal(description: RTCSessionDescriptionInit) {
  const bytes = new TextEncoder().encode(JSON.stringify(description));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeSignal(value: string): RTCSessionDescriptionInit {
  const binary = atob(value.trim());
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function scoreCatch(catchRecord: CatchRecord) {
  const weight = Number(catchRecord.weight) || 0;
  const xp = Number(catchRecord.xp) || 0;
  return Math.max(1, Math.round(weight * 10 + xp));
}

function waitForIce(pc: RTCPeerConnection) {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise<void>(resolve => {
    const timeout = window.setTimeout(done, 8000);
    function done() {
      window.clearTimeout(timeout);
      pc.removeEventListener("icegatheringstatechange", onState);
      resolve();
    }
    function onState() { if (pc.iceGatheringState === "complete") done(); }
    pc.addEventListener("icegatheringstatechange", onState);
  });
}

export function ReelWorldVsController() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>(null);
  const [connection, setConnection] = useState<ConnectionState>("idle");
  const [matchState, setMatchState] = useState<MatchState>("idle");
  const [displayName, setDisplayName] = useState("Angler");
  const [opponentName, setOpponentName] = useState("Opponent");
  const [offerCode, setOfferCode] = useState("");
  const [answerCode, setAnswerCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [hostAnswer, setHostAnswer] = useState("");
  const [localScore, setLocalScore] = useState(0);
  const [remoteScore, setRemoteScore] = useState(0);
  const [startAt, setStartAt] = useState(0);
  const [durationMs, setDurationMs] = useState(MATCH_DURATION);
  const [now, setNow] = useState(Date.now());
  const [lastCatch, setLastCatch] = useState("");
  const [error, setError] = useState("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const seenCatches = useRef<Set<string>>(new Set());
  const localScoreRef = useRef(0);
  const startAtRef = useRef(0);
  const durationRef = useRef(MATCH_DURATION);
  const roleRef = useRef<Role>(null);

  useEffect(() => {
    const player = readPlayer();
    setDisplayName(player.name || "Angler");
    try {
      const saved = JSON.parse(localStorage.getItem(MATCH_KEY) || "{}");
      if (saved?.lastOpponent) setOpponentName(saved.lastOpponent);
    } catch {}
    return () => {
      channelRef.current?.close();
      pcRef.current?.close();
    };
  }, []);

  useEffect(() => { roleRef.current = role; }, [role]);
  useEffect(() => { localScoreRef.current = localScore; }, [localScore]);
  useEffect(() => { startAtRef.current = startAt; }, [startAt]);
  useEffect(() => { durationRef.current = durationMs; }, [durationMs]);

  const send = useCallback((message: WireMessage) => {
    const channel = channelRef.current;
    if (channel?.readyState === "open") channel.send(JSON.stringify(message));
  }, []);

  const captureCatchBaseline = useCallback(() => {
    const catches = readPlayer().catches || [];
    seenCatches.current = new Set(catches.map((c, index) => String(c.id || `${c.at || 0}:${c.species || "fish"}:${index}`)));
  }, []);

  const beginMatch = useCallback((scheduledStart: number, scheduledDuration: number) => {
    captureCatchBaseline();
    setLocalScore(0);
    setRemoteScore(0);
    localScoreRef.current = 0;
    setStartAt(scheduledStart);
    setDurationMs(scheduledDuration);
    startAtRef.current = scheduledStart;
    durationRef.current = scheduledDuration;
    setMatchState(Date.now() < scheduledStart ? "countdown" : "running");
    setLastCatch("");
    try { localStorage.setItem(MATCH_KEY, JSON.stringify({ lastOpponent: opponentName, startAt: scheduledStart, durationMs: scheduledDuration })); } catch {}
  }, [captureCatchBaseline, opponentName]);

  const handleMessage = useCallback((raw: string) => {
    try {
      const message = JSON.parse(raw) as WireMessage;
      if (message.type === "hello") {
        setOpponentName(message.name || "Opponent");
        try { localStorage.setItem(MATCH_KEY, JSON.stringify({ lastOpponent: message.name || "Opponent" })); } catch {}
      }
      if (message.type === "matchStart") beginMatch(message.startAt, message.durationMs);
      if (message.type === "score") setRemoteScore(Math.max(0, Number(message.score) || 0));
      if (message.type === "catch") setLastCatch(`${opponentName}: ${message.species} ${message.weight.toFixed(2)} lb · +${message.points}`);
      if (message.type === "reset") {
        setLocalScore(0);
        setRemoteScore(0);
        setMatchState("idle");
        setStartAt(0);
      }
    } catch {}
  }, [beginMatch, opponentName]);

  const attachChannel = useCallback((channel: RTCDataChannel) => {
    channelRef.current = channel;
    channel.onopen = () => {
      setConnection("connected");
      setError("");
      channel.send(JSON.stringify({ type: "hello", name: displayName } satisfies WireMessage));
    };
    channel.onmessage = event => handleMessage(String(event.data));
    channel.onclose = () => setConnection("failed");
    channel.onerror = () => setConnection("failed");
  }, [displayName, handleMessage]);

  const makePeer = useCallback(() => {
    pcRef.current?.close();
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    pcRef.current = pc;
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setConnection("connected");
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) setConnection("failed");
    };
    return pc;
  }, []);

  const createChallenge = useCallback(async () => {
    try {
      setError("");
      setRole("host");
      setConnection("creating");
      setOfferCode("");
      setHostAnswer("");
      const pc = makePeer();
      const channel = pc.createDataChannel("reelworld-vs", { ordered: true });
      attachChannel(channel);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIce(pc);
      if (!pc.localDescription) throw new Error("Could not create challenge");
      setOfferCode(encodeSignal(pc.localDescription));
      setConnection("waiting");
    } catch (cause) {
      setConnection("failed");
      setError(cause instanceof Error ? cause.message : "Could not create challenge");
    }
  }, [attachChannel, makePeer]);

  const joinChallenge = useCallback(async () => {
    try {
      setError("");
      setRole("guest");
      setConnection("connecting");
      setAnswerCode("");
      const pc = makePeer();
      pc.ondatachannel = event => attachChannel(event.channel);
      await pc.setRemoteDescription(decodeSignal(joinCode));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForIce(pc);
      if (!pc.localDescription) throw new Error("Could not create answer");
      setAnswerCode(encodeSignal(pc.localDescription));
      setConnection("waiting");
    } catch (cause) {
      setConnection("failed");
      setError(cause instanceof Error ? cause.message : "Invalid challenge code");
    }
  }, [attachChannel, joinCode, makePeer]);

  const acceptAnswer = useCallback(async () => {
    try {
      setError("");
      setConnection("connecting");
      const pc = pcRef.current;
      if (!pc) throw new Error("Create a challenge first");
      await pc.setRemoteDescription(decodeSignal(hostAnswer));
    } catch (cause) {
      setConnection("failed");
      setError(cause instanceof Error ? cause.message : "Invalid answer code");
    }
  }, [hostAnswer]);

  const startMatch = useCallback(() => {
    if (connection !== "connected") return;
    const scheduledStart = Date.now() + 3500;
    beginMatch(scheduledStart, MATCH_DURATION);
    send({ type: "matchStart", startAt: scheduledStart, durationMs: MATCH_DURATION });
    setOpen(false);
  }, [beginMatch, connection, send]);

  useEffect(() => {
    if (!startAt) return;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current < startAt) setMatchState("countdown");
      else if (current < startAt + durationMs) setMatchState("running");
      else setMatchState("ended");
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [startAt, durationMs]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const currentStart = startAtRef.current;
      if (!currentStart) return;
      const current = Date.now();
      if (current < currentStart || current >= currentStart + durationRef.current) return;
      const catches = readPlayer().catches || [];
      let added = 0;
      for (let index = catches.length - 1; index >= 0; index -= 1) {
        const catchRecord = catches[index];
        const catchId = String(catchRecord.id || `${catchRecord.at || 0}:${catchRecord.species || "fish"}:${index}`);
        if (seenCatches.current.has(catchId)) continue;
        seenCatches.current.add(catchId);
        const points = scoreCatch(catchRecord);
        added += points;
        const species = catchRecord.species || "Fish";
        const weight = Number(catchRecord.weight) || 0;
        setLastCatch(`${displayName}: ${species} ${weight.toFixed(2)} lb · +${points}`);
        send({ type: "catch", species, weight, points });
      }
      if (added > 0) {
        const next = localScoreRef.current + added;
        localScoreRef.current = next;
        setLocalScore(next);
        send({ type: "score", score: next });
      }
    }, 450);
    return () => window.clearInterval(id);
  }, [displayName, send]);

  const secondsLeft = useMemo(() => {
    if (!startAt) return Math.round(durationMs / 1000);
    if (now < startAt) return Math.ceil((startAt - now) / 1000);
    return Math.max(0, Math.ceil((startAt + durationMs - now) / 1000));
  }, [durationMs, now, startAt]);

  const timerText = matchState === "countdown"
    ? `START ${secondsLeft}`
    : `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;
  const resultText = localScore === remoteScore ? "TIE MATCH" : localScore > remoteScore ? `${displayName.toUpperCase()} WINS` : `${opponentName.toUpperCase()} WINS`;

  const copy = useCallback(async (value: string) => {
    try { await navigator.clipboard.writeText(value); } catch {}
  }, []);

  const shareChallenge = useCallback(async () => {
    if (!offerCode) return;
    const text = `ReelWorld GO VS challenge code:\n${offerCode}`;
    try {
      if (navigator.share) await navigator.share({ title: "ReelWorld GO VS Challenge", text });
      else await copy(offerCode);
    } catch {}
  }, [copy, offerCode]);

  return <>
    <button
      type="button"
      onClick={() => setOpen(true)}
      style={{ position: "fixed", zIndex: 20060, right: 10, top: "calc(82px + env(safe-area-inset-top))", border: "1px solid #8ef3ff", borderRadius: 999, background: matchState === "running" ? "#0a684fff" : "#082635ee", color: "white", fontWeight: 1000, fontSize: 11, letterSpacing: ".08em", padding: "9px 12px", boxShadow: "0 8px 22px #0008" }}
    >⚔️ {matchState === "running" ? "VS LIVE" : "VS"}</button>

    {startAt > 0 && <div style={{ position: "fixed", zIndex: 20050, top: "calc(122px + env(safe-area-inset-top))", left: 10, right: 10, pointerEvents: "none", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "min(520px,100%)", borderRadius: 17, padding: "9px 11px", background: "#04141bea", border: "1px solid #345d6a", boxShadow: "0 12px 30px #0009", backdropFilter: "blur(12px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8 }}>
          <div><small style={{ display: "block", color: "#7ce8ff", fontSize: 8, fontWeight: 900 }}>{displayName.toUpperCase()}</small><strong style={{ fontSize: 22 }}>{localScore}</strong></div>
          <div style={{ textAlign: "center" }}><small style={{ display: "block", color: matchState === "ended" ? "#ffdc78" : "#99b7c2", fontSize: 8, fontWeight: 900 }}>{matchState === "ended" ? resultText : "VS TIMER"}</small><strong style={{ fontSize: 18 }}>{timerText}</strong></div>
          <div style={{ textAlign: "right" }}><small style={{ display: "block", color: "#ffb277", fontSize: 8, fontWeight: 900 }}>{opponentName.toUpperCase()}</small><strong style={{ fontSize: 22 }}>{remoteScore}</strong></div>
        </div>
        {lastCatch && <div style={{ marginTop: 5, textAlign: "center", color: "#cdebf4", fontSize: 9, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lastCatch}</div>}
      </div>
    </div>}

    {open && <div style={{ position: "fixed", zIndex: 20100, inset: 0, background: "#000c", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 12, backdropFilter: "blur(8px)" }}>
      <div style={{ width: "min(560px,100%)", maxHeight: "88vh", overflow: "auto", borderRadius: 25, background: "linear-gradient(160deg,#0b2634,#06121a)", border: "1px solid #3b6677", color: "white", padding: 18, boxShadow: "0 28px 70px #000" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
          <div><small style={{ color: "#6fe6ff", fontSize: 9, fontWeight: 1000, letterSpacing: ".13em" }}>REELWORLD GO</small><h2 style={{ margin: "3px 0 2px", fontSize: 27 }}>⚔️ VS Fishing</h2><p style={{ margin: 0, color: "#9db9c4", fontSize: 11 }}>Actual catches score automatically while both anglers fish.</p></div>
          <button type="button" onClick={() => setOpen(false)} style={{ width: 36, height: 36, border: 0, borderRadius: "50%", background: "#173746", color: "white", fontSize: 22 }}>×</button>
        </div>

        <div style={{ margin: "14px 0", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7 }}>
          <Stat label="LINK" value={connection === "connected" ? "READY" : connection.toUpperCase()} />
          <Stat label="MATCH" value={matchState.toUpperCase()} />
          <Stat label="FORMAT" value="5 MIN" />
        </div>

        {connection === "idle" && <div style={{ display: "grid", gap: 9 }}>
          <button type="button" onClick={createChallenge} style={primaryButton}>CREATE CHALLENGE</button>
          <div style={{ textAlign: "center", color: "#6d8994", fontSize: 9, fontWeight: 900 }}>OR JOIN A FRIEND</div>
          <textarea value={joinCode} onChange={event => setJoinCode(event.target.value)} placeholder="Paste friend's challenge code" style={codeBox} />
          <button type="button" disabled={!joinCode.trim()} onClick={joinChallenge} style={secondaryButton}>JOIN CHALLENGE</button>
        </div>}

        {role === "host" && offerCode && connection !== "connected" && <div style={{ display: "grid", gap: 9 }}>
          <p style={instruction}>1. Send this challenge code to your friend.</p>
          <textarea readOnly value={offerCode} style={codeBox} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><button type="button" onClick={() => copy(offerCode)} style={secondaryButton}>COPY</button><button type="button" onClick={shareChallenge} style={secondaryButton}>SHARE</button></div>
          <p style={instruction}>2. Your friend sends an answer code back. Paste it below.</p>
          <textarea value={hostAnswer} onChange={event => setHostAnswer(event.target.value)} placeholder="Paste friend's answer code" style={codeBox} />
          <button type="button" disabled={!hostAnswer.trim()} onClick={acceptAnswer} style={primaryButton}>CONNECT VS MATCH</button>
        </div>}

        {role === "guest" && answerCode && connection !== "connected" && <div style={{ display: "grid", gap: 9 }}>
          <p style={instruction}>Send this answer code back to the friend who created the challenge.</p>
          <textarea readOnly value={answerCode} style={codeBox} />
          <button type="button" onClick={() => copy(answerCode)} style={secondaryButton}>COPY ANSWER</button>
          <p style={instruction}>Keep this screen open. VS connects automatically after the host accepts your answer.</p>
        </div>}

        {connection === "connected" && <div style={{ display: "grid", gap: 10 }}>
          <div style={{ padding: 13, borderRadius: 16, background: "#0a332dcc", border: "1px solid #2e806d" }}><strong style={{ display: "block", color: "#8fffd3" }}>CONNECTED: {displayName} vs {opponentName}</strong><small style={{ color: "#a8c7bc" }}>Leave this connection open, close the panel, and fish normally. Each landed fish scores automatically.</small></div>
          {role === "host" && <button type="button" onClick={startMatch} style={primaryButton}>{matchState === "ended" ? "START REMATCH" : "START 5-MIN MATCH"}</button>}
          {role === "guest" && matchState === "idle" && <p style={instruction}>Waiting for the host to start the match.</p>}
          {matchState !== "idle" && <button type="button" onClick={() => setOpen(false)} style={secondaryButton}>BACK TO FISHING</button>}
        </div>}

        {error && <p style={{ marginTop: 12, padding: 10, borderRadius: 12, background: "#421b20", color: "#ffb8be", fontSize: 10, fontWeight: 800 }}>{error}</p>}
        <p style={{ margin: "14px 0 0", color: "#66838f", fontSize: 9, lineHeight: 1.45 }}>P2P casual beta. Scores come from ReelWorld catch records on each phone. This mode is not server-authoritative and is not suitable for cash/prize tournaments yet.</p>
      </div>
    </div>}
  </>;
}

const primaryButton: React.CSSProperties = { width: "100%", border: 0, borderRadius: 14, padding: "13px 14px", background: "linear-gradient(180deg,#1db6e8,#0878ad)", color: "white", fontSize: 11, fontWeight: 1000, letterSpacing: ".06em" };
const secondaryButton: React.CSSProperties = { width: "100%", border: "1px solid #416575", borderRadius: 14, padding: "12px 14px", background: "#0d2531", color: "white", fontSize: 10, fontWeight: 900, letterSpacing: ".05em" };
const codeBox: React.CSSProperties = { width: "100%", minHeight: 78, resize: "vertical", borderRadius: 13, border: "1px solid #365b6c", background: "#041219", color: "#b9efff", padding: 10, fontSize: 9, lineHeight: 1.35, fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace" };
const instruction: React.CSSProperties = { margin: "4px 0", color: "#a9c2cc", fontSize: 10, lineHeight: 1.45 };

function Stat({ label, value }: { label: string; value: string }) {
  return <div style={{ padding: "9px 7px", borderRadius: 13, background: "#091d27", border: "1px solid #213f4c", textAlign: "center" }}><small style={{ display: "block", color: "#678895", fontSize: 7, fontWeight: 900 }}>{label}</small><strong style={{ fontSize: 10 }}>{value}</strong></div>;
}
