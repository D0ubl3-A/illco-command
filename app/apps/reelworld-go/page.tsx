"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import s from "./reelworld.module.css";
import { analyzeFrame } from "./water-detection-upgrade";
import {
  REAL_MONEY_DISABLED_REASON,
  candidateFish,
  clamp,
  constrainPointToWater,
  fightStep,
  hookSetProbability,
  makeFish,
  maxFishWeightForWater,
  reelGestureAccepted,
  regionFor,
  retrieveEffect,
  waterKindFromGeometry,
  type FightState,
  type FishInstance,
  type Handedness,
  type RetrieveMode,
  type WaterBounds,
} from "./game-engine";

type Tab = "map" | "fish" | "bag" | "license" | "profile";
type Pos = { lat: number; lon: number; speed: number };
type Point = { id: string; name: string; lat: number; lon: number; kind: "water" | "shop" };
type Catch = { id: string; species: string; rarity: string; weight: number; xp: number; coins: number; at: number; water: string; estimated: boolean };
type Player = {
  name: string;
  coins: number;
  xp: number;
  bait: Record<string, number>;
  activeBait: string;
  rod: string;
  permit: number;
  boatPermit: number;
  catches: Catch[];
  tickets: any[];
  casts: number;
  lost: number;
  lineLb: number;
  hookSize: number;
  drag: number;
  handedness: Handedness;
  mode: RetrieveMode;
  fishFinder: boolean;
};
type MotionStatus = "unknown" | "ready" | "blocked" | "unsupported";
type CameraStatus = "idle" | "requesting" | "ready" | "blocked" | "unsupported";
type MotionPermissionConstructor = typeof DeviceMotionEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

const KEY = "illco.reelworld-go.native.v2";
const LEGACY_KEY = "illco.reelworld-go.native.v1";
const LOCK_SCORE = 46;
const DEFAULT_POS: Pos = { lat: 36.1699, lon: -115.1398, speed: 0 };
const BAITS = [
  ["worms", "Nightcrawlers", "🪱", 24],
  ["minnows", "Live Minnows", "🐟", 38],
  ["corn", "Sweet Corn", "🌽", 18],
  ["spinner", "Chrome Spinner", "✨", 52],
  ["frog", "Topwater Frog", "🐸", 60],
] as const;
const initial: Player = {
  name: "Angler", coins: 500, xp: 0,
  bait: { worms: 8, minnows: 3, corn: 4, spinner: 2, frog: 1 },
  activeBait: "worms", rod: "starter", permit: 0, boatPermit: 0,
  catches: [], tickets: [], casts: 0, lost: 0,
  lineLb: 12, hookSize: 6, drag: 48, handedness: "right", mode: "shore", fishFinder: false,
};

function meters(a: Pos | Point, b: Pos | Point) {
  const r = 6371000, p1 = a.lat * Math.PI / 180, p2 = b.lat * Math.PI / 180;
  const dp = (b.lat - a.lat) * Math.PI / 180, dl = (b.lon - a.lon) * Math.PI / 180;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
function tile(lat: number, lon: number, z: number) {
  const n = 2 ** z;
  return { x: (lon + 180) / 360 * n, y: (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * n };
}
function load(): Player {
  if (typeof window === "undefined") return initial;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY) || "{}");
    return { ...initial, ...saved, bait: { ...initial.bait, ...(saved.bait || {}) }, catches: saved.catches || [] };
  } catch { return initial; }
}
function estimateWaterBounds(data: Uint8ClampedArray, width: number, height: number): WaterBounds {
  let minX = width, minY = height, maxX = 0, maxY = 0, hits = 0;
  const startY = Math.floor(height * .3);
  for (let y = startY; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
      const max = Math.max(r, g, b), min = Math.min(r, g, b), sat = max ? (max - min) / max : 0;
      const blue = b > 48 && b > r * .94 && b > g * .78 && b - r > 4;
      const teal = g > 45 && b > 42 && g > r * 1.03 && b > r * 1.02 && Math.abs(g - b) < 96;
      const dark = (r + g + b) / 3 < 105 && b >= r * .86 && g >= r * .88;
      const earthy = r >= g && g > b && r - b < 72 && sat < .48;
      if (!(blue || teal || dark || earthy)) continue;
      hits++; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
  const coverage = hits / Math.max(1, width * (height - startY));
  if (!hits) return { left: .08, top: .36, right: .92, bottom: .9, coverage: 0 };
  return { left: minX / width, top: minY / height, right: (maxX + 1) / width, bottom: (maxY + 1) / height, coverage };
}

export default function ReelWorldGo() {
  const [player, setPlayer] = useState<Player>(initial);
  const [tab, setTab] = useState<Tab>("map");
  const [pos, setPos] = useState<Pos>(DEFAULT_POS);
  const [points, setPoints] = useState<Point[]>([]);
  const [shop, setShop] = useState<Point | null>(null);
  const [camera, setCamera] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [waterScore, setWaterScore] = useState(0);
  const [scanLocked, setScanLocked] = useState(false);
  const [waterBounds, setWaterBounds] = useState<WaterBounds>({ left: .08, top: .36, right: .92, bottom: .9, coverage: 0 });
  const [phase, setPhase] = useState("idle");
  const [fish, setFish] = useState<FishInstance | null>(null);
  const [fight, setFight] = useState<FightState>({ tension: 48, stamina: 100, progress: 0, status: "fighting" });
  const [reeling, setReeling] = useState(false);
  const [jigEnergy, setJigEnergy] = useState(0);
  const [sprite, setSprite] = useState({ a: 0, f: 0, x: .5, y: .55 });
  const [toast, setToast] = useState("");
  const [ranger, setRanger] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [motionStatus, setMotionStatus] = useState<MotionStatus>("unknown");
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const scan = useRef<HTMLCanvasElement | null>(null);
  const previousLuma = useRef<Float32Array | undefined>(undefined);
  const ema = useRef(0);
  const stableFrames = useRef(0);
  const missFrames = useRef(0);
  const motionSample = useRef({ magnitude: 0, lastHookAt: 0, lastStrength: 0 });
  const hookLock = useRef(false);
  const reelPad = useRef<HTMLDivElement>(null);
  const lastReelAngle = useRef<number | null>(null);
  const reelPulse = useRef<number | null>(null);

  useEffect(() => { setPlayer(load()); setReady(true); }, []);
  useEffect(() => { if (ready) localStorage.setItem(KEY, JSON.stringify(player)); }, [player, ready]);
  const tell = useCallback((m: string) => { setToast(m); window.setTimeout(() => setToast(""), 2500); }, []);
  const buzz = (n: number | number[] = 35) => { try { navigator.vibrate?.(n); } catch {} };
  const level = Math.max(1, Math.floor(Math.sqrt(player.xp / 180)) + 1);
  const permitValid = player.permit > Date.now();
  const boatPermitValid = player.boatPermit > Date.now();
  const nearbyWater = useMemo(() => points.filter(p => p.kind === "water").sort((a, b) => meters(pos, a) - meters(pos, b))[0], [points, pos]);
  const region = regionFor(pos.lat, pos.lon);
  const waterKind = waterKindFromGeometry(waterBounds);
  const waterReady = camera && scanLocked && waterScore >= LOCK_SCORE;
  const candidates = useMemo(() => candidateFish(region, waterKind, player.activeBait, player.hookSize), [region, waterKind, player.activeBait, player.hookSize]);
  const todayCatches = player.catches.filter(c => new Date(c.at).toDateString() === new Date().toDateString()).length;
  const passportSpecies = Array.from(new Set(player.catches.map(c => c.species)));

  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(v => setPos({ lat: v.coords.latitude, lon: v.coords.longitude, speed: v.coords.speed || 0 }), () => tell("GPS unavailable — map discovery is using the demo location"), { enableHighAccuracy: true, maximumAge: 5000 });
    return () => navigator.geolocation.clearWatch(id);
  }, [tell]);

  useEffect(() => {
    const ctl = new AbortController();
    const q = `[out:json][timeout:15];(nwr(around:5000,${pos.lat},${pos.lon})[amenity=fuel];nwr(around:5000,${pos.lat},${pos.lon})[natural=water];nwr(around:5000,${pos.lat},${pos.lon})[water];);out center 80;`;
    fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: q, signal: ctl.signal }).then(r => r.json()).then(d => {
      const out: Point[] = (d.elements || []).map((e: any) => ({ id: String(e.id), name: e.tags?.name || (e.tags?.amenity === "fuel" ? "Fuel Stop Bait Shop" : "Mapped Water"), lat: e.lat || e.center?.lat, lon: e.lon || e.center?.lon, kind: e.tags?.amenity === "fuel" ? "shop" : "water" })).filter((p: Point) => p.lat && p.lon);
      setPoints(out);
    }).catch(() => {});
    return () => ctl.abort();
  }, [Math.round(pos.lat * 100) / 100, Math.round(pos.lon * 100) / 100]);

  useEffect(() => {
    if (tab !== "fish" || !camera) return;
    if (!navigator.mediaDevices?.getUserMedia) { setCameraStatus("unsupported"); tell("This browser does not expose camera capture"); return; }
    let stopped = false; setCameraStatus("requesting");
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 960 } }, audio: false }).then(st => {
      if (stopped) return st.getTracks().forEach(t => t.stop());
      stream.current = st; if (video.current) video.current.srcObject = st; setCameraStatus("ready");
    }).catch(() => { setCameraStatus("blocked"); setScanLocked(false); tell("Camera permission is required for Water Scan"); });
    return () => { stopped = true; stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; setCameraStatus("idle"); };
  }, [tab, camera, tell]);

  useEffect(() => {
    if (!camera || tab !== "fish" || cameraStatus !== "ready") return;
    const id = window.setInterval(() => {
      const v = video.current; if (!v?.videoWidth) return;
      const c = scan.current || document.createElement("canvas"); scan.current = c; c.width = 40; c.height = 28;
      const x = c.getContext("2d", { willReadFrequently: true }); if (!x) return;
      x.drawImage(v, 0, 0, 40, 28);
      const image = x.getImageData(0, 0, 40, 28);
      const analysis = analyzeFrame(image.data, 40, 28, previousLuma.current);
      previousLuma.current = analysis.luma;
      const raw = analysis.confidence * 100;
      const alpha = raw > ema.current ? .34 : .2;
      ema.current += (raw - ema.current) * alpha;
      if (!scanLocked) {
        stableFrames.current = ema.current >= LOCK_SCORE ? stableFrames.current + 1 : 0;
        if (stableFrames.current >= 3) { setScanLocked(true); missFrames.current = 0; }
      } else {
        missFrames.current = ema.current < 32 ? missFrames.current + 1 : 0;
        if (missFrames.current >= 3) { setScanLocked(false); stableFrames.current = 0; }
      }
      const score = Math.round(scanLocked ? Math.max(LOCK_SCORE, ema.current) : Math.min(100, ema.current));
      setWaterScore(score);
      const bounds = estimateWaterBounds(image.data, 40, 28);
      if (analysis.confidence >= .35) setWaterBounds(bounds.coverage ? bounds : { left: .08, top: .36, right: .92, bottom: .9, coverage: .3 });
    }, 650);
    return () => window.clearInterval(id);
  }, [camera, tab, cameraStatus, scanLocked]);

  useEffect(() => {
    if (!fish || !["bite", "fighting", "caught"].includes(phase)) return;
    let tick = 0;
    const id = window.setInterval(() => {
      tick++;
      setSprite(v => {
        const raw = phase === "bite"
          ? { x: .5 + Math.sin(tick * 1.35) * .11, y: .55 - Math.abs(Math.sin(tick * .82)) * .15 }
          : phase === "fighting"
            ? { x: .5 + Math.sin(Date.now() / 330) * .26, y: .56 + Math.cos(Date.now() / 430) * .09 }
            : { x: .5 + Math.sin(Date.now() / 390) * .07, y: .53 + Math.cos(Date.now() / 500) * .05 };
        const p = constrainPointToWater(raw.x, raw.y, waterBounds, waterKind === "container" ? .01 : .035);
        return { a: (v.a + (phase === "bite" ? 2 : 1)) % 8, f: (v.f + 1) % 4, x: p.x, y: p.y };
      });
    }, phase === "bite" ? 82 : 112);
    return () => window.clearInterval(id);
  }, [fish, phase, waterBounds, waterKind]);

  useEffect(() => {
    if (phase !== "fighting" || !fish) return;
    const fishPower = fish.rarity === "legendary" ? 1.8 : fish.rarity === "rare" ? 1.45 : fish.rarity === "uncommon" ? 1.15 : .9;
    const rodDamping = player.rod.includes("Pro") ? .58 : player.rod.includes("Carbon") ? .76 : 1;
    const id = window.setInterval(() => {
      setFight(prev => {
        const next = fightStep(prev, {
          reeling, drag: player.drag, lineLb: player.lineLb, fishWeight: fish.weight,
          fishPower, rodDamping, jolt: Math.sin(Date.now() / 470) * .7 + (Math.random() - .5) * 1.25,
        });
        if (next.status === "landed") window.setTimeout(() => catchFish(), 0);
        if (next.status === "snapped") window.setTimeout(() => lose("Line snapped — use stronger line or loosen drag"), 0);
        if (next.status === "escaped") window.setTimeout(() => lose("Fish escaped in slack line — keep some tension"), 0);
        return next;
      });
    }, 220);
    return () => window.clearInterval(id);
  }, [phase, fish, reeling, player.drag, player.lineLb, player.rod]);

  useEffect(() => {
    if (phase !== "bite") return;
    hookLock.current = false;
    const timeout = window.setTimeout(() => lose("Missed hook set — react when the bobber and vibration hit"), 4200);
    return () => window.clearTimeout(timeout);
  }, [phase]);

  useEffect(() => {
    if (!("DeviceMotionEvent" in window)) { setMotionStatus("unsupported"); return; }
    if (motionStatus !== "ready") return;
    const onMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.acceleration || event.accelerationIncludingGravity;
      if (!acceleration) return;
      const magnitude = Math.hypot(acceleration.x || 0, acceleration.y || 0, acceleration.z || 0);
      const jerk = Math.abs(magnitude - motionSample.current.magnitude);
      const rotation = Math.max(Math.abs(event.rotationRate?.alpha || 0), Math.abs(event.rotationRate?.beta || 0), Math.abs(event.rotationRate?.gamma || 0));
      motionSample.current.magnitude = magnitude;
      motionSample.current.lastStrength = Math.max(jerk, rotation / 18);
      if (phase === "waiting" && player.mode === "jig" && jerk > 2.5) setJigEnergy(clamp(jerk / 10, 0, 1));
      if (phase === "bite" && Date.now() - motionSample.current.lastHookAt > 700 && (jerk > 8.2 || rotation > 145)) {
        motionSample.current.lastHookAt = Date.now(); hook("motion", motionSample.current.lastStrength);
      }
    };
    window.addEventListener("devicemotion", onMotion, { passive: true });
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [phase, motionStatus, player.mode]);

  async function enableMotion() {
    if (motionStatus === "ready") return;
    if (!("DeviceMotionEvent" in window)) { setMotionStatus("unsupported"); return; }
    try {
      const Motion = window.DeviceMotionEvent as MotionPermissionConstructor;
      if (typeof Motion.requestPermission === "function") {
        const permission = await Motion.requestPermission();
        if (permission !== "granted") { setMotionStatus("blocked"); tell("Motion blocked — touch controls remain available"); return; }
      }
      setMotionStatus("ready"); tell("Motion controls enabled");
    } catch { setMotionStatus("blocked"); tell("Motion unavailable — touch controls remain available"); }
  }

  function startCast() {
    if (!permitValid) { setTab("license"); return tell("Activate the fictional game fishing permit before casting"); }
    if (!waterReady) return tell(`Water Scan must lock at ${LOCK_SCORE}%+ with the AR camera on`);
    if ((player.bait[player.activeBait] || 0) < 1) { setTab("bag"); return tell("You are out of that bait"); }
    if (pos.speed > 8) return tell("Fishing locks while your device appears to be in a moving vehicle");
    if (!candidates.length) return tell("No plausible fish match this water, bait and hook setup — change tackle");
    void enableMotion();
    setPlayer(p => ({ ...p, casts: p.casts + 1, bait: { ...p.bait, [p.activeBait]: p.bait[p.activeBait] - 1 } }));
    setFish(null); setFight({ tension: player.drag, stamina: 100, progress: 0, status: "fighting" }); setReeling(false); setJigEnergy(0);
    setPhase("casting"); buzz(); window.setTimeout(() => setPhase("waiting"), 700);
    const retrieve = retrieveEffect(player.mode, { speedMps: pos.speed, jigEnergy, bait: player.activeBait });
    const delay = Math.max(1300, (2400 + Math.random() * 3600) / Math.max(.45, retrieve));
    window.setTimeout(() => {
      const def = candidates[Math.floor(Math.random() * candidates.length)];
      if (!def) return;
      const f = makeFish(def, waterKind);
      setFish(f); setPhase("bite"); buzz([65, 45, 170, 55, 230]);
    }, delay);
    if (Math.random() < .12) window.setTimeout(() => inspect(), 900);
  }

  function hook(source: "tap" | "motion" = "tap", strength = 0) {
    if (phase !== "bite" || !fish || hookLock.current) return;
    hookLock.current = true;
    const probability = hookSetProbability(fish.weight, player.hookSize, strength, source);
    if (Math.random() > probability) { lose("Hook pulled free — hook size or hook-set strength was a poor match"); return; }
    setPhase("fighting"); setFight({ tension: player.drag, stamina: 100, progress: 10, status: "fighting" }); setReeling(false); buzz([45, 25, 90]);
    tell(source === "motion" ? "HOOK SET — motion detected" : "HOOK SET — manage drag, stamina and tension");
  }

  function lose(reason: string) {
    if (["lost","caught"].includes(phase)) return;
    setPhase("lost"); setReeling(false); setPlayer(p => ({ ...p, lost: p.lost + 1 })); tell(reason);
    window.setTimeout(() => { setPhase("idle"); setFish(null); setFight({ tension: player.drag, stamina: 100, progress: 0, status: "fighting" }); }, 1800);
  }

  function catchFish() {
    if (!fish || phase === "caught") return;
    const coins = Math.round(fish.weight * 8 + fish.xp / 3);
    const c: Catch = { id: crypto.randomUUID(), species: fish.species, rarity: fish.rarity, weight: fish.weight, xp: fish.xp, coins, at: Date.now(), water: waterKind, estimated: fish.estimated };
    setPlayer(p => ({ ...p, xp: p.xp + fish.xp, coins: p.coins + coins, catches: [c, ...p.catches].slice(0, 150) }));
    setPhase("caught"); setReeling(false); buzz([50, 40, 90]); tell(`${fish.species} · ${fish.weight} lb estimated · +${coins} coins`);
    window.setTimeout(() => { setPhase("idle"); setFish(null); setFight({ tension: player.drag, stamina: 100, progress: 0, status: "fighting" }); }, 2400);
  }

  function inspect() {
    if (permitValid) setRanger({ ok: true, text: "Game permit verified. Real-world regulations still apply." });
    else { const fine = 150; setPlayer(p => ({ ...p, tickets: [{ id: crypto.randomUUID(), reason: "Fishing without an active fictional game permit", fine, paid: false }, ...p.tickets] })); setRanger({ ok: false, text: "No active fictional game permit", fine }); }
  }
  function buyPermit(days: number, price: number) { if (player.coins < price) return tell("Not enough coins"); setPlayer(p => ({ ...p, coins: p.coins - price, permit: Date.now() + days * 86400000 })); tell(`${days}-day game fishing permit activated`); }
  function buyBoatPermit(days: number, price: number) { if (player.coins < price) return tell("Not enough coins"); setPlayer(p => ({ ...p, coins: p.coins - price, boatPermit: Date.now() + days * 86400000 })); tell(`${days}-day fictional boat permit activated`); }
  function buyBait(id: string, price: number) { if (!shop || meters(pos, shop) > 300) return tell("Move within 300 m of this mapped bait shop"); if (player.coins < price) return tell("Not enough coins"); setPlayer(p => ({ ...p, coins: p.coins - price, bait: { ...p.bait, [id]: (p.bait[id] || 0) + 5 } })); tell("Added 5 to your tackle bag"); }

  function reelPadPoint(clientX: number, clientY: number) {
    const box = reelPad.current?.getBoundingClientRect(); if (!box) return 0;
    return Math.atan2(clientY - (box.top + box.height / 2), clientX - (box.left + box.width / 2));
  }
  function onReelMove(e: React.PointerEvent<HTMLDivElement>) {
    if (phase !== "fighting" || lastReelAngle.current == null) return;
    const angle = reelPadPoint(e.clientX, e.clientY);
    let delta = angle - lastReelAngle.current;
    if (delta > Math.PI) delta -= Math.PI * 2; if (delta < -Math.PI) delta += Math.PI * 2;
    lastReelAngle.current = angle;
    if (reelGestureAccepted(delta, player.handedness)) {
      setReeling(true); if (reelPulse.current) window.clearTimeout(reelPulse.current); reelPulse.current = window.setTimeout(() => setReeling(false), 180);
      buzz(8);
    }
  }

  const map = tile(pos.lat, pos.lon, 15), mapPoints = points.filter(p => meters(pos, p) < 2500).slice(0, 18);
  const tensionHint = fight.tension > 88 ? "EASE OFF" : fight.tension < 18 ? "REEL IN" : "SWEET SPOT";
  const fishFinderText = candidates.length ? candidates.slice(0, 4).map(f => f.species).join(" · ") : "No confident candidates";
  return <main className={s.shell}>
    <style>{`
      @keyframes rwBobberWait{0%,100%{transform:translate(-50%,-50%) translateY(0)}50%{transform:translate(-50%,-50%) translateY(4px)}}
      @keyframes rwBobberBite{0%{transform:translate(-50%,-50%) translateY(0)}35%{transform:translate(-50%,-50%) translateY(24px) scale(.82)}70%{transform:translate(-50%,-50%) translateY(-10px) scale(1.18)}100%{transform:translate(-50%,-50%) translateY(0)}}
      @keyframes rwRipple{0%{opacity:.9;transform:translate(-50%,-50%) scale(.25)}100%{opacity:0;transform:translate(-50%,-50%) scale(2.7)}}
      .rwBobber{position:absolute;z-index:6;left:50%;top:43%;width:18px;height:31px;border-radius:9px 9px 50% 50%;background:linear-gradient(#ff4b3e 0 42%,#fff 43% 72%,#222 73%);border:2px solid #fff;box-shadow:0 6px 14px #000a;animation:rwBobberWait 1.3s ease-in-out infinite}
      .rwBobber.isBiting{animation:rwBobberBite .58s cubic-bezier(.2,.9,.2,1) infinite;box-shadow:0 0 22px #ff5b38,0 8px 18px #000c}
      .rwLine{position:absolute;z-index:5;left:50%;top:0;width:1px;height:43%;background:#eafcffaa;transform-origin:top;box-shadow:0 0 3px #fff}
      .rwLure{position:absolute;z-index:7;left:50%;top:47%;transform:translate(-50%,-50%);font-size:17px;filter:drop-shadow(0 4px 4px #000)}
      .rwBiteRipple{position:absolute;z-index:5;left:50%;top:46%;width:86px;height:34px;border:3px solid #bdf7ff;border-radius:50%;animation:rwRipple .72s ease-out infinite;pointer-events:none}
      .rwBiteRipple.second{animation-delay:.22s}
      .rwHookCue{position:absolute;z-index:12;left:50%;top:23%;transform:translateX(-50%);padding:9px 14px;border-radius:999px;background:#ff4d2eec;border:2px solid #fff;color:#fff;font-size:12px;font-weight:1000;letter-spacing:.07em;white-space:nowrap;box-shadow:0 10px 28px #0009}
      .rwBounds{position:absolute;z-index:4;border:1px dashed #7fffd4aa;background:#62ffd20a;pointer-events:none;border-radius:18px}
      .rwModes{position:absolute;z-index:14;top:171px;left:10px;right:10px;display:flex;gap:5px;overflow:auto}.rwModes button{border:1px solid #456170;background:#071a26dd;color:#a9c6d2;padding:6px 9px;border-radius:999px;font-size:9px;font-weight:900;white-space:nowrap}.rwModes button.on{border-color:#51e8ff;color:#e6fbff;background:#0b4052}
      .rwFightGrid{display:grid;grid-template-columns:1fr 1fr;gap:6px}.rwMeter{height:8px;background:#17313d;border-radius:99px;overflow:hidden}.rwMeter i{display:block;height:100%;background:linear-gradient(90deg,#13bce7,#a8ff69)}
      .rwGearRow{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:9px 0}.rwGearRow label{display:flex;flex-direction:column;gap:5px;background:#0b1d28;border:1px solid #274656;border-radius:14px;padding:9px;font-size:9px;color:#94afbd}.rwGearRow select,.rwGearRow input{width:100%;background:#07151e;color:white;border:1px solid #385666;border-radius:9px;padding:7px}
      .rwReelPad{position:absolute;z-index:18;right:14px;bottom:215px;width:92px;height:92px;border-radius:50%;border:3px solid #7feaff;background:radial-gradient(circle,#12384b 0 35%,#06151f 36% 100%);display:grid;place-items:center;touch-action:none;box-shadow:0 10px 30px #0008}.rwReelPad:after{content:'↻';font-size:34px;color:#b9f5ff;transform:scaleX(var(--dir,1))}.rwReelPad small{position:absolute;bottom:-20px;font-size:8px;font-weight:900;color:#b7d5df;white-space:nowrap}
      .rwNote{font-size:9px;color:#8da8b5;line-height:1.35}.rwDisabled{border:1px solid #77454b;background:#2a1519;color:#ffafb7;border-radius:14px;padding:10px;font-size:10px;margin-top:10px}
    `}</style>
    <header className={s.hud}><div className={s.avatar}>🎣</div><div className={s.player}><strong>{player.name}</strong><span>LEVEL {level} · {player.xp} XP · DEVICE SAVE</span><i><b style={{ width: `${Math.min(100, player.xp % 180 / 1.8)}%` }} /></i></div><div className={s.currency}><span>🪙 {player.coins}</span><span className={permitValid ? s.live : ""}>{permitValid ? "✓ GAME LICENSE" : "NO GAME LICENSE"}</span></div></header>

    {tab === "map" && <section className={s.mapScreen}><div className={s.mapViewport}><div className={s.tiles}>{[-1,0,1].flatMap(dy => [-1,0,1].map(dx => <img key={`${dx}${dy}`} alt="" src={`https://tile.openstreetmap.org/15/${Math.floor(map.x)+dx}/${Math.floor(map.y)+dy}.png`} style={{ left: (Math.floor(map.x)+dx-map.x)*256, top: (Math.floor(map.y)+dy-map.y)*256 }} />))}</div><div className={s.mapShade}/><div className={s.userPin}>▲</div>{mapPoints.map(p => { const c = tile(p.lat,p.lon,15); const x = 50+(c.x-map.x)*256/390*100, y=50+(c.y-map.y)*256/700*100; return <button key={p.id} className={`${s.mapPin} ${p.kind === "shop" ? s.shopPin : s.waterPin}`} style={{ left:`${x}%`,top:`${y}%` }} onClick={()=>p.kind === "shop" ? setShop(p) : tell(`${p.name} · ${Math.round(meters(pos,p))} m · map hint only, camera scan still required`)}>{p.kind === "shop" ? "⛽" : "💧"}</button>})}<small className={s.attribution}>© OpenStreetMap</small></div><div className={s.mapTop}><span>{nearbyWater ? `${Math.round(meters(pos,nearbyWater))} m TO MAPPED WATER` : "SCANNING AREA"}</span><button onClick={()=>setTab("fish")}>OPEN WATER SCAN</button></div><div className={s.mapBottom}><strong>{points.filter(p=>p.kind==="shop").length} mapped bait shops found</strong><span>Map proximity never bypasses camera Water Scan.</span></div></section>}

    {tab === "fish" && <section className={`${s.fishScreen} ${s[`phase_${phase}`] || ""}`}>
      {camera ? <video ref={video} className={s.camera} autoPlay muted playsInline/> : <div className={s.cameraFallback}><span>🌊</span><strong>CAMERA SCAN REQUIRED</strong></div>}
      <div className={s.vignette}/>
      {camera && <div className="rwBounds" style={{left:`${waterBounds.left*100}%`,top:`${waterBounds.top*100}%`,width:`${Math.max(.02,waterBounds.right-waterBounds.left)*100}%`,height:`${Math.max(.02,waterBounds.bottom-waterBounds.top)*100}%`}}/>}
      <div className={s.scanPill}>WATER SCAN <i><b style={{width:`${Math.min(100,waterScore)}%`}}/></i>{waterScore}% · {scanLocked?"LOCKED":"VERIFYING"}</div>
      <button className={`${s.zonePill} ${waterReady?s.zoneReady:""}`} onClick={()=>{setCamera(v=>!v);setScanLocked(false);ema.current=0;stableFrames.current=0;missFrames.current=0}}>{camera?`CAMERA ${cameraStatus.toUpperCase()}`:"START AR CAMERA"} · {waterReady?`${waterKind.toUpperCase()} READY`:"FIND WATER"}</button>
      <div className="rwModes">{(["shore","jig","troll","spinner"] as RetrieveMode[]).map(m=><button key={m} className={player.mode===m?"on":""} onClick={()=>setPlayer(p=>({...p,mode:m}))}>{m.toUpperCase()}</button>)}</div>
      {["waiting","bite","fighting"].includes(phase)&&<><div className="rwLine"/><div className={`rwBobber ${phase==="bite"?"isBiting":""}`}/><div className="rwLure">{player.activeBait==="spinner"?"✨":player.activeBait==="frog"?"🐸":"•"}</div></>}
      {phase==="bite"&&<><div className="rwBiteRipple"/><div className="rwBiteRipple second"/><div className="rwHookCue">YANK PHONE BACK · TAP FALLBACK</div></>}
      {fish && <div style={{position:"absolute",zIndex:7,left:`${sprite.x*100}%`,top:`${sprite.y*100}%`,width:180,height:110,transform:`translate(-50%,-50%) scale(${fish.visualScale*(phase==="bite"?1.08:1)}) rotate(${phase==="bite"?(sprite.a%2?12:-12):0}deg)`,backgroundImage:`url(/reelworld-go/fish-atlas.svg)`,backgroundSize:"800% 400%",backgroundPosition:`${sprite.a*100/7}% ${sprite.f*100/3}%`,filter:`hue-rotate(${fish.rarity==="rare"?90:fish.rarity==="legendary"?-80:0}deg) drop-shadow(0 12px 14px #0009)`,pointerEvents:"none"}}/>}
      {phase==="fighting"&&<div ref={reelPad} className="rwReelPad" style={{"--dir":player.handedness==="right"?-1:1} as React.CSSProperties} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);lastReelAngle.current=reelPadPoint(e.clientX,e.clientY)}} onPointerMove={onReelMove} onPointerUp={()=>{lastReelAngle.current=null;setReeling(false)}} onPointerCancel={()=>{lastReelAngle.current=null;setReeling(false)}}><small>{player.handedness==="right"?"COUNTERCLOCKWISE":"CLOCKWISE"}</small></div>}
      <div className={s.fightPanel}><div className={s.fightHead}><div><span>{phase.toUpperCase()} · {region.toUpperCase()} · {waterKind.toUpperCase()} EST.</span><p>{phase==="idle"?"Scan real water, choose tackle, then cast":phase==="waiting"?player.mode==="jig"?"Jig the phone vertically or tap JIG":player.mode==="troll"?`Trolling at ${pos.speed.toFixed(1)} m/s`:"Watch the bobber and feel for vibration…":phase==="bite"?"Fish on — set the hook now!":phase==="fighting"?`${fish?.species} · ${fish?.weight} lb estimated`:phase==="caught"?"Catch secured and saved":phase==="lost"?"The fish escaped":"Casting…"}</p></div>{fish&&<b className={s[fish.rarity]}>{fish.rarity}</b>}</div>
      {phase==="fighting"&&<><div className="rwFightGrid"><div><label><span>LINE TENSION · {tensionHint}</span><b>{Math.round(fight.tension)}%</b></label><div className={s.tension} role="meter" aria-label="Line tension" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fight.tension)}><i/><b style={{left:`${fight.tension}%`}}/></div></div><div><label><span>FISH STAMINA</span><b>{Math.round(fight.stamina)}%</b></label><div className="rwMeter"><i style={{width:`${fight.stamina}%`}}/></div></div></div><label><span>LANDING PROGRESS · {player.lineLb} LB LINE · DRAG {player.drag}%</span><b>{Math.round(fight.progress)}%</b></label><div className={s.reelProgress}><i style={{width:`${fight.progress}%`}}/></div></>}
      {phase==="waiting"&&player.mode==="jig"&&<button className={s.castButton} onPointerDown={()=>{setJigEnergy(1);buzz(12)}} onPointerUp={()=>setJigEnergy(.3)}>JIG LURE · ENERGY {Math.round(jigEnergy*100)}%</button>}
      {phase!=="waiting"&&<button className={`${s.castButton} ${phase==="bite"?s.hookButton:""}`} disabled={["casting","caught","lost"].includes(phase)|| (phase==="idle"&&!waterReady)} onClick={phase==="bite"?()=>hook("tap",0):phase==="idle"?startCast:undefined} onPointerDown={()=>phase==="fighting"&&setReeling(true)} onPointerUp={()=>phase==="fighting"&&setReeling(false)} onPointerLeave={()=>phase==="fighting"&&setReeling(false)}>{phase==="bite"?"SET HOOK · TAP FALLBACK":phase==="fighting"?"HOLD TO REEL · OR USE REEL PAD":phase==="idle"?(waterReady?"CAST LINE":`SCAN TO ${LOCK_SCORE}%+ TO CAST`):"…"}</button>}
      <small className="rwNote">Motion: {motionStatus}. Right-hand reel = counterclockwise; left-hand = clockwise. Spinner mode gets its strike bonus only with spinner tackle. Troll mode needs movement. Fish candidates and weight are estimates from coarse region, apparent water size, bait and hook—not precise ecological identification.</small></div>
    </section>}

    {tab === "bag" && <Panel icon="🎒" title="Tackle & Controls" sub="REAL GAMEPLAY GEAR"><div className={s.cardGrid}>{BAITS.map(([id,name,icon])=><button key={id} className={`${s.itemCard} ${player.activeBait===id?s.selected:""}`} onClick={()=>setPlayer(p=>({...p,activeBait:id,mode:id==="spinner"?"spinner":p.mode}))}><span>{icon}</span><div><strong>{name}</strong><small>{id==="spinner"?"Best with SPINNER retrieve":"Tap to equip"}</small></div><b>x{player.bait[id]||0}</b></button>)}</div><div className="rwGearRow"><label>LINE STRENGTH<select value={player.lineLb} onChange={e=>setPlayer(p=>({...p,lineLb:+e.target.value}))}>{[4,8,12,20,30].map(v=><option key={v} value={v}>{v} lb</option>)}</select></label><label>HOOK SIZE<select value={player.hookSize} onChange={e=>setPlayer(p=>({...p,hookSize:+e.target.value}))}>{[1,2,4,6,8,10,12].map(v=><option key={v} value={v}>#{v}</option>)}</select></label><label>DRAG<input type="range" min="10" max="90" value={player.drag} onChange={e=>setPlayer(p=>({...p,drag:+e.target.value}))}/><b>{player.drag}%</b></label><label>HANDEDNESS<select value={player.handedness} onChange={e=>setPlayer(p=>({...p,handedness:e.target.value as Handedness}))}><option value="right">Right hand</option><option value="left">Left hand</option></select></label></div><div className={s.rodCard}><span>🎣</span><div><strong>{player.rod === "starter" ? "Starter Fiberglass Rod" : player.rod}</strong><small>Stronger rods damp sudden fish surges.</small></div></div><div className={s.rodCard}><span>📡</span><div><strong>Fish Finder {player.fishFinder?"ACTIVE":"LOCKED"}</strong><small>{player.fishFinder?fishFinderText:"Unlock for 400 coins. Results are estimated candidates, not precise species identification."}</small></div>{!player.fishFinder&&<button onClick={()=>{if(player.coins<400)return tell("Not enough coins");setPlayer(p=>({...p,coins:p.coins-400,fishFinder:true}))}}>🪙 400</button>}</div></Panel>}

    {tab === "license" && <Panel icon="🪪" title="Game Permits" sub="FICTIONAL GAME SYSTEM — FOLLOW REAL LAWS"><div className={`${s.licenseCard} ${permitValid?s.activeLicense:""}`}><span>{permitValid?"ACTIVE GAME FISHING LICENSE":"NO ACTIVE GAME FISHING LICENSE"}</span><h3>{permitValid?player.name:"Fishing Game Permit"}</h3><p>{permitValid?`Valid through ${new Date(player.permit).toLocaleDateString()}`:"Gameplay credential only. It is not a real fishing license."}</p></div><div className={s.licenseOptions}>{[[1,75],[7,250],[90,900]].map(([d,p])=><button key={d} onClick={()=>buyPermit(d,p)}><div><strong>{d===90?"Season":`${d}-Day`} Game Permit</strong><small>Fictional ReelWorld credential</small></div><b>🪙 {p}</b></button>)}</div><h3 className={s.sectionTitle}>Boat permit</h3><div className={`${s.licenseCard} ${boatPermitValid?s.activeLicense:""}`}><span>{boatPermitValid?"ACTIVE GAME BOAT PERMIT":"OPTIONAL GAME BOAT PERMIT"}</span><p>{boatPermitValid?`Valid through ${new Date(player.boatPermit).toLocaleDateString()}`:"Fictional boating progression item only."}</p><button onClick={()=>buyBoatPermit(30,500)}>30 DAYS · 🪙 500</button></div><h3 className={s.sectionTitle}>Citations</h3>{player.tickets.length?player.tickets.map(t=><div className={s.ticketRow} key={t.id}><span>🎫</span><div><strong>{t.reason}</strong><small>{t.paid?"Paid":`${t.fine} coins due`}</small></div><button disabled={t.paid||player.coins<t.fine} onClick={()=>setPlayer(p=>({...p,coins:p.coins-t.fine,tickets:p.tickets.map(x=>x.id===t.id?{...x,paid:true}:x)}))}>PAY</button></div>):<p className={s.empty}>No game citations.</p>}</Panel>}

    {tab === "profile" && <Panel icon="🏆" title={player.name} sub="ANGLER PROFILE · DEVICE SAVE"><div className={s.stats}><div><b>{player.catches.length}</b><span>CAUGHT</span></div><div><b>{player.casts}</b><span>CASTS</span></div><div><b>{player.lost}</b><span>LOST</span></div><div><b>{level}</b><span>LEVEL</span></div></div><h3 className={s.sectionTitle}>Daily challenge</h3><div className={s.rodCard}><span>🎯</span><div><strong>Land 3 fish today · {Math.min(todayCatches,3)}/3</strong><small>{todayCatches>=3?"Challenge complete":"Keep fishing to complete today's challenge"}</small></div></div><h3 className={s.sectionTitle}>Passport</h3><div className={s.rodCard}><span>📘</span><div><strong>{passportSpecies.length} species logged</strong><small>{passportSpecies.join(" · ") || "Land a fish to start your passport"}</small></div></div><h3 className={s.sectionTitle}>Recent catches</h3><div className={s.catchList}>{player.catches.slice(0,12).map(c=><div key={c.id}><span>🐟</span><div><strong>{c.species}</strong><small>{c.rarity} · {c.water} · {c.estimated?"estimated context":"verified"}</small></div><b>{c.weight} lb</b></div>)}</div><div className="rwDisabled"><strong>REAL-MONEY TOURNAMENTS: DISABLED</strong><br/>{REAL_MONEY_DISABLED_REASON}<br/><br/>Casual peer-to-peer VS is separate and does not authorize cash prizes.</div><button className={s.reset} onClick={()=>{localStorage.removeItem(KEY);localStorage.removeItem(LEGACY_KEY);setPlayer(initial);tell("Device save reset")}}>RESET DEVICE SAVE</button></Panel>}

    <nav className={s.nav}>{[["map","🗺️","MAP"],["fish","🎣","FISH"],["bag","🎒","GEAR"],["license","🪪","PERMITS"],["profile","🏆","PROFILE"]].map(([id,ic,l])=><button key={id} className={tab===id?s.navActive:""} onClick={()=>setTab(id as Tab)}><span>{ic}</span><b>{l}</b></button>)}</nav>
    {shop&&<div className={s.modalShade}><div className={s.shopModal}><button className={s.close} onClick={()=>setShop(null)}>×</button><div className={s.shopTitle}><span>⛽</span><div><p>MAPPED BAIT SHOP</p><h2>{shop.name}</h2><small>{Math.round(meters(pos,shop))} m away</small></div></div>{BAITS.map(([id,name,icon,price])=><button className={s.shopItem} key={id} onClick={()=>buyBait(id,price)}><span>{icon}</span><div><strong>{name} ×5</strong><small>Game tackle supply</small></div><b>🪙 {price}</b></button>)}<h3>Rod upgrades</h3>{[["Carbon Rod",650],["Pro Tournament Rod",1800]].map(([name,price])=><button className={s.shopItem} key={name} onClick={()=>{if(meters(pos,shop)>300)return tell("Move closer to this shop");if(player.coins<+price)return tell("Not enough coins");setPlayer(p=>({...p,coins:p.coins-+price,rod:String(name)}));tell(`${name} equipped`)}}><span>🎣</span><div><strong>{name}</strong><small>Improves surge damping</small></div><b>🪙 {price}</b></button>)}</div></div>}
    {ranger&&<div className={s.modalShade}><div className={s.ranger}><span>👮‍♂️</span><p>GAME RANGER</p><h2>{ranger.ok?"Game Permit Verified":"Game Ticket Issued"}</h2><strong>{ranger.text}</strong>{ranger.fine&&<b>🪙 {ranger.fine} FINE</b>}<button onClick={()=>setRanger(null)}>CONTINUE</button><small>Fictional game enforcement only. Follow actual fishing and boating regulations.</small></div></div>}
    {toast&&<div className={s.toast}>{toast}</div>}
  </main>;
}

function Panel({icon,title,sub,children}:{icon:string;title:string;sub:string;children:React.ReactNode}) { return <section className={s.panelScreen}><div className={s.panelHero}><span>{icon}</span><div><p>{sub}</p><h2>{title}</h2></div></div>{children}</section>; }
