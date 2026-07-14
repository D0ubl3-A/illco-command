"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import s from "./reelworld.module.css";

type Tab = "map" | "fish" | "bag" | "license" | "profile";
type Pos = { lat: number; lon: number; speed: number };
type Point = { id: string; name: string; lat: number; lon: number; kind: "water" | "shop" };
type Player = { name: string; coins: number; xp: number; bait: Record<string, number>; activeBait: string; rod: string; permit: number; catches: any[]; tickets: any[]; casts: number; lost: number };
type MotionStatus = "unknown" | "ready" | "blocked" | "unsupported";
type MotionPermissionConstructor = typeof DeviceMotionEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

const KEY = "illco.reelworld-go.native.v1";
const DEFAULT_POS: Pos = { lat: 36.1699, lon: -115.1398, speed: 0 };
const BAITS = [
  ["worms", "Nightcrawlers", "🪱", 24], ["minnows", "Live Minnows", "🐟", 38], ["corn", "Sweet Corn", "🌽", 18], ["spinner", "Chrome Spinner", "✨", 52], ["frog", "Topwater Frog", "🐸", 60],
] as const;
const FISH = [
  ["Bluegill", "common", .3, 2.1, 28], ["Channel Catfish", "uncommon", 2, 19, 62], ["Largemouth Bass", "uncommon", 1.2, 12.5, 75], ["Rainbow Trout", "rare", .8, 15, 125], ["Northern Pike", "rare", 4, 38, 180], ["Golden Carp", "legendary", 7, 48, 350],
] as const;
const initial: Player = { name: "Angler", coins: 500, xp: 0, bait: { worms: 8, minnows: 3, corn: 4, spinner: 2, frog: 1 }, activeBait: "worms", rod: "starter", permit: 0, catches: [], tickets: [], casts: 0, lost: 0 };

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
  try { return { ...initial, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return initial; }
}
function clamp(value: number, min = 0, max = 100) { return Math.max(min, Math.min(max, value)); }

export default function ReelWorldGo() {
  const [player, setPlayer] = useState<Player>(initial);
  const [tab, setTab] = useState<Tab>("map");
  const [pos, setPos] = useState<Pos>(DEFAULT_POS);
  const [points, setPoints] = useState<Point[]>([]);
  const [shop, setShop] = useState<Point | null>(null);
  const [camera, setCamera] = useState(false);
  const [waterScore, setWaterScore] = useState(0);
  const [phase, setPhase] = useState("idle");
  const [fish, setFish] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [tension, setTension] = useState(48);
  const [reeling, setReeling] = useState(false);
  const [sprite, setSprite] = useState({ a: 0, f: 0, x: 50, y: 45 });
  const [toast, setToast] = useState("");
  const [ranger, setRanger] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [motionStatus, setMotionStatus] = useState<MotionStatus>("unknown");
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const scan = useRef<HTMLCanvasElement | null>(null);
  const tensionRef = useRef(48);
  const snapDangerSince = useRef<number | null>(null);
  const slackDangerSince = useRef<number | null>(null);
  const motionSample = useRef({ magnitude: 0, lastHookAt: 0 });
  const hookLock = useRef(false);

  useEffect(() => { setPlayer(load()); setReady(true); }, []);
  useEffect(() => { if (ready) localStorage.setItem(KEY, JSON.stringify(player)); }, [player, ready]);
  useEffect(() => { tensionRef.current = tension; }, [tension]);
  const tell = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(""), 2300); }, []);
  const buzz = (n: number | number[] = 35) => navigator.vibrate?.(n);
  const level = Math.max(1, Math.floor(Math.sqrt(player.xp / 180)) + 1);
  const permitValid = player.permit > Date.now();
  const nearbyWater = useMemo(() => points.filter(p => p.kind === "water").sort((a, b) => meters(pos, a) - meters(pos, b))[0], [points, pos]);
  const waterReady = waterScore > 42 || (!!nearbyWater && meters(pos, nearbyWater) < 350);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(v => setPos({ lat: v.coords.latitude, lon: v.coords.longitude, speed: v.coords.speed || 0 }), () => tell("Using demo location until GPS is allowed"), { enableHighAccuracy: true, maximumAge: 5000 });
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
    let stopped = false;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 960 } }, audio: false }).then(st => {
      if (stopped) return st.getTracks().forEach(t => t.stop());
      stream.current = st; if (video.current) video.current.srcObject = st;
    }).catch(() => tell("Camera permission is needed for AR water scanning"));
    return () => { stopped = true; stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; };
  }, [tab, camera, tell]);

  useEffect(() => {
    if (!camera || tab !== "fish") return;
    const id = setInterval(() => {
      const v = video.current; if (!v?.videoWidth) return;
      const c = scan.current || document.createElement("canvas"); scan.current = c; c.width = 40; c.height = 28;
      const x = c.getContext("2d", { willReadFrequently: true }); if (!x) return;
      x.drawImage(v, 0, 0, 40, 28); const d = x.getImageData(0, 0, 40, 28).data; let hits = 0;
      for (let i = 0; i < d.length; i += 16) if (d[i + 2] > d[i] * .92 && d[i + 2] > d[i + 1] * .82 && d[i + 2] > 55) hits++;
      setWaterScore(Math.round(hits / (d.length / 16) * 100));
    }, 650);
    return () => clearInterval(id);
  }, [camera, tab]);

  useEffect(() => {
    if (!fish || !["bite", "fighting", "caught"].includes(phase)) return;
    let tick = 0;
    const id = setInterval(() => {
      tick += 1;
      setSprite(v => {
        if (phase === "bite") return { a: (v.a + 2) % 8, f: (v.f + 1) % 4, x: 50 + Math.sin(tick * 1.35) * 10, y: 48 - Math.abs(Math.sin(tick * .82)) * 17 };
        if (phase === "fighting") return { a: (v.a + 1) % 8, f: (v.f + 1) % 4, x: 50 + Math.sin(Date.now() / 330) * 27, y: 45 + Math.cos(Date.now() / 430) * 9 };
        return { a: (v.a + 1) % 8, f: (v.f + 1) % 4, x: 50 + Math.sin(Date.now() / 390) * 7, y: 41 + Math.cos(Date.now() / 500) * 5 };
      });
    }, phase === "bite" ? 82 : 112);
    return () => clearInterval(id);
  }, [fish, phase]);

  useEffect(() => {
    if (phase !== "fighting" || !fish) return;
    const fishPower = fish[1] === "legendary" ? 1.8 : fish[1] === "rare" ? 1.45 : fish[1] === "uncommon" ? 1.15 : .9;
    const rodDamping = player.rod.includes("Pro") ? .58 : player.rod.includes("Carbon") ? .76 : 1;
    const id = setInterval(() => {
      const now = Date.now();
      setTension(t => {
        const reelForce = reeling ? 1.75 : -1.85;
        const fishWave = Math.sin(now / 470) * 1.25 * fishPower * rodDamping;
        const fishJolt = (Math.random() - .5) * 2.1 * fishPower * rodDamping;
        const softCentering = (52 - t) * .045;
        return clamp(t + reelForce + fishWave + fishJolt + softCentering);
      });
      setProgress(p => {
        const currentTension = tensionRef.current;
        const inSweetSpot = currentTension >= 18 && currentTension <= 88;
        const gain = reeling ? (inSweetSpot ? 2.65 : .72) : -.18;
        return clamp(p + gain - fishPower * .035);
      });
    }, 220);
    return () => clearInterval(id);
  }, [phase, fish, reeling, player.rod]);

  useEffect(() => {
    if (phase !== "fighting") {
      snapDangerSince.current = null;
      slackDangerSince.current = null;
      return;
    }
    if (progress >= 100) { catchFish(); return; }
    const now = Date.now();
    if (tension >= 98) {
      snapDangerSince.current ??= now;
      if (now - snapDangerSince.current > 1350) lose("Line snapped — ease off the reel when tension turns red");
    } else snapDangerSince.current = null;
    if (tension <= 3) {
      slackDangerSince.current ??= now;
      if (now - slackDangerSince.current > 3000) lose("The fish shook the hook — keep a little tension on the line");
    } else slackDangerSince.current = null;
  }, [tension, progress, phase]);

  useEffect(() => {
    if (phase !== "bite") return;
    hookLock.current = false;
    const timeout = window.setTimeout(() => lose("Missed the bite — yank the phone back when the line jumps"), 4200);
    return () => window.clearTimeout(timeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== "bite" || motionStatus !== "ready") return;
    const armedAt = Date.now() + 250;
    const onMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.acceleration || event.accelerationIncludingGravity;
      if (!acceleration) return;
      const magnitude = Math.hypot(acceleration.x || 0, acceleration.y || 0, acceleration.z || 0);
      const jerk = Math.abs(magnitude - motionSample.current.magnitude);
      const rotation = Math.max(Math.abs(event.rotationRate?.alpha || 0), Math.abs(event.rotationRate?.beta || 0), Math.abs(event.rotationRate?.gamma || 0));
      const now = Date.now();
      motionSample.current.magnitude = magnitude;
      if (now < armedAt || now - motionSample.current.lastHookAt < 700) return;
      if (jerk > 8.2 || rotation > 145) {
        motionSample.current.lastHookAt = now;
        hook("motion");
      }
    };
    window.addEventListener("devicemotion", onMotion, { passive: true });
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [phase, motionStatus]);

  async function enableMotion() {
    if (motionStatus === "ready" || motionStatus === "blocked" || motionStatus === "unsupported") return;
    if (!("DeviceMotionEvent" in window)) { setMotionStatus("unsupported"); return; }
    try {
      const Motion = window.DeviceMotionEvent as MotionPermissionConstructor;
      if (typeof Motion.requestPermission === "function") {
        const permission = await Motion.requestPermission();
        if (permission !== "granted") { setMotionStatus("blocked"); tell("Motion access blocked — tap HOOK NOW as a fallback"); return; }
      }
      setMotionStatus("ready");
      tell("Motion hook enabled — yank the phone back when the fish bites");
    } catch {
      setMotionStatus("blocked");
      tell("Motion hook unavailable — tap HOOK NOW as a fallback");
    }
  }

  function startCast() {
    if (!permitValid) { setTab("license"); return tell("Buy an in-game fishing permit before casting"); }
    if (!waterReady) return tell("Move near mapped water or scan visible water with the camera");
    if ((player.bait[player.activeBait] || 0) < 1) { setTab("bag"); return tell("You are out of that bait"); }
    if (pos.speed > 8) return tell("Fishing locks while you appear to be driving");
    void enableMotion();
    setPlayer(p => ({ ...p, casts: p.casts + 1, bait: { ...p.bait, [p.activeBait]: p.bait[p.activeBait] - 1 } }));
    setFish(null); setProgress(0); setTension(48); setReeling(false);
    setPhase("casting"); buzz(); setTimeout(() => setPhase("waiting"), 700);
    setTimeout(() => { const f = FISH[Math.floor(Math.random() * FISH.length)]; setFish(f); setPhase("bite"); buzz([65, 45, 170, 55, 230]); }, 2100 + Math.random() * 3600);
    if (Math.random() < .16) setTimeout(() => inspect(), 900);
  }
  function hook(source: "tap" | "motion" = "tap") {
    if (phase !== "bite" || hookLock.current) return;
    hookLock.current = true;
    setPhase("fighting"); setProgress(10); setTension(48); setReeling(false); buzz([45, 25, 90]);
    tell(source === "motion" ? "HOOK SET — perfect phone yank!" : "HOOK SET — hold and release to manage tension");
  }
  function lose(reason: string) { setPhase("lost"); setReeling(false); setPlayer(p => ({ ...p, lost: p.lost + 1 })); tell(reason); setTimeout(() => { setPhase("idle"); setFish(null); setProgress(0); setTension(48); }, 1800); }
  function catchFish() {
    const [name, rarity, min, max, xp] = fish; const weight = +(min + Math.random() * (max - min)).toFixed(2); const coins = Math.round(weight * 8 + xp / 3);
    const c = { id: crypto.randomUUID(), species: name, rarity, weight, xp, coins, at: Date.now() };
    setPlayer(p => ({ ...p, xp: p.xp + xp, coins: p.coins + coins, catches: [c, ...p.catches].slice(0, 100) })); setPhase("caught"); setReeling(false); buzz([50, 40, 90]); tell(`${name} · ${weight} lb · +${coins} coins`); setTimeout(() => { setPhase("idle"); setFish(null); setProgress(0); setTension(48); }, 2400);
  }
  function inspect() {
    if (permitValid) setRanger({ ok: true, text: "Permit verified. Tight lines, angler." });
    else { const fine = 150; setPlayer(p => ({ ...p, tickets: [{ id: crypto.randomUUID(), reason: "Fishing without an active game permit", fine, paid: false }, ...p.tickets] })); setRanger({ ok: false, text: "No active game permit", fine }); }
  }
  function buyPermit(days: number, price: number) { if (player.coins < price) return tell("Not enough coins"); setPlayer(p => ({ ...p, coins: p.coins - price, permit: Date.now() + days * 86400000 })); tell(`${days}-day game permit activated`); }
  function buyBait(id: string, price: number) { if (!shop || meters(pos, shop) > 300) return tell("Move within 300 m of this gas-station bait shop"); if (player.coins < price) return tell("Not enough coins"); setPlayer(p => ({ ...p, coins: p.coins - price, bait: { ...p.bait, [id]: (p.bait[id] || 0) + 5 } })); tell("Added 5 to your tackle bag"); }

  const map = tile(pos.lat, pos.lon, 15), mapPoints = points.filter(p => meters(pos, p) < 2500).slice(0, 18);
  const tensionHint = tension > 88 ? "EASE OFF" : tension < 18 ? "REEL IN" : "SWEET SPOT";
  return <main className={s.shell}>
    <style>{`
      @keyframes rwBobberWait{0%,100%{transform:translate(-50%,-50%) translateY(0)}50%{transform:translate(-50%,-50%) translateY(4px)}}
      @keyframes rwBobberBite{0%{transform:translate(-50%,-50%) translateY(0) scale(1)}20%{transform:translate(-50%,-50%) translateY(25px) scale(.8)}42%{transform:translate(-50%,-50%) translateY(-12px) scale(1.25)}65%{transform:translate(-50%,-50%) translateY(18px) scale(.9)}100%{transform:translate(-50%,-50%) translateY(0) scale(1)}}
      @keyframes rwRipple{0%{opacity:.9;transform:translate(-50%,-50%) scale(.25)}100%{opacity:0;transform:translate(-50%,-50%) scale(2.7)}}
      @keyframes rwHookCue{0%,100%{transform:translateX(-50%) scale(1);filter:brightness(1)}50%{transform:translateX(-50%) scale(1.08);filter:brightness(1.35)}}
      .rwBobber{position:absolute;z-index:6;left:50%;top:43%;width:18px;height:31px;border-radius:9px 9px 50% 50%;background:linear-gradient(#ff4b3e 0 42%,#fff 43% 72%,#222 73%);border:2px solid #fff;box-shadow:0 6px 14px #000a;animation:rwBobberWait 1.3s ease-in-out infinite}
      .rwBobber.isBiting{animation:rwBobberBite .58s cubic-bezier(.2,.9,.2,1) infinite;box-shadow:0 0 22px #ff5b38,0 8px 18px #000c}
      .rwBiteRipple{position:absolute;z-index:5;left:50%;top:46%;width:86px;height:34px;border:3px solid #bdf7ff;border-radius:50%;animation:rwRipple .72s ease-out infinite;pointer-events:none}
      .rwBiteRipple.second{animation-delay:.22s}
      .rwHookCue{position:absolute;z-index:12;left:50%;top:24%;transform:translateX(-50%);padding:10px 16px;border-radius:999px;background:#ff4d2eec;border:2px solid #fff;color:#fff;font-size:13px;font-weight:1000;letter-spacing:.08em;white-space:nowrap;box-shadow:0 10px 28px #0009,0 0 28px #ff5b38aa;animation:rwHookCue .5s ease-in-out infinite;pointer-events:none}
      .rwMotionNote{display:block;margin-top:5px;color:#9edff0;font-size:9px;font-weight:800;letter-spacing:.04em}
    `}</style>
    <header className={s.hud}><div className={s.avatar}>🎣</div><div className={s.player}><strong>{player.name}</strong><span>LEVEL {level} · {player.xp} XP</span><i><b style={{ width: `${Math.min(100, player.xp % 180 / 1.8)}%` }} /></i></div><div className={s.currency}><span>🪙 {player.coins}</span><span className={permitValid ? s.live : ""}>{permitValid ? "✓ LICENSED" : "NO LICENSE"}</span></div></header>

    {tab === "map" && <section className={s.mapScreen}><div className={s.mapViewport}><div className={s.tiles}>{[-1,0,1].flatMap(dy => [-1,0,1].map(dx => <img key={`${dx}${dy}`} alt="" src={`https://tile.openstreetmap.org/15/${Math.floor(map.x)+dx}/${Math.floor(map.y)+dy}.png`} style={{ left: (Math.floor(map.x)+dx-map.x)*256, top: (Math.floor(map.y)+dy-map.y)*256 }} />))}</div><div className={s.mapShade}/><div className={s.userPin}>▲</div>{mapPoints.map(p => { const c = tile(p.lat,p.lon,15); const x = 50+(c.x-map.x)*256/390*100, y=50+(c.y-map.y)*256/700*100; return <button key={p.id} className={`${s.mapPin} ${p.kind === "shop" ? s.shopPin : s.waterPin}`} style={{ left:`${x}%`,top:`${y}%` }} onClick={()=>p.kind === "shop" ? setShop(p) : tell(`${p.name} · ${Math.round(meters(pos,p))} m`)}>{p.kind === "shop" ? "⛽" : "💧"}</button>})}<small className={s.attribution}>© OpenStreetMap</small></div><div className={s.mapTop}><span className={waterReady?s.ready:""}>{nearbyWater ? `${Math.round(meters(pos,nearbyWater))} m TO WATER` : "SCANNING AREA"}</span><button onClick={()=>setTab("fish")}>FISH HERE</button></div><div className={s.mapBottom}><strong>{points.filter(p=>p.kind==="shop").length} gas-station bait shops found</strong><span>Every mapped fuel station becomes a bait shop. Walk close enough to buy supplies.</span></div></section>}

    {tab === "fish" && <section className={`${s.fishScreen} ${s[`phase_${phase}`] || ""}`}>{camera ? <video ref={video} className={s.camera} autoPlay muted playsInline/> : <div className={s.cameraFallback}><span>🌊</span><strong>MAP WATER FISHING MODE</strong></div>}<div className={s.vignette}/><div className={s.scanPill}>WATER SCAN <i><b style={{width:`${waterScore}%`}}/></i>{waterScore}%</div><button className={`${s.zonePill} ${waterReady?s.zoneReady:""}`} onClick={()=>setCamera(v=>!v)}>{camera?"CAMERA ON":"START AR CAMERA"} · {waterReady?"WATER READY":"FIND WATER"}</button>{["waiting","bite"].includes(phase)&&<div className={`rwBobber ${phase==="bite"?"isBiting":""}`}/>} {phase==="bite"&&<><div className="rwBiteRipple"/><div className="rwBiteRipple second"/><div className="rwHookCue">YANK PHONE BACK</div></>}{fish && <div style={{position:"absolute",zIndex:7,left:`${sprite.x}%`,top:`${sprite.y}%`,width:phase==="bite"?205:180,height:phase==="bite"?125:110,transform:`translate(-50%,-50%) scale(${phase==="bite"?1.12:1}) rotate(${phase==="bite"?(sprite.a%2?12:-12):0}deg)`,transition:"width 120ms,height 120ms",backgroundImage:`url(/reelworld-go/fish-atlas.svg)`,backgroundSize:"800% 400%",backgroundPosition:`${sprite.a*100/7}% ${sprite.f*100/3}%`,filter:`hue-rotate(${fish[1]==="rare"?90:fish[1]==="legendary"?-80:0}deg) drop-shadow(0 12px 14px #0009)`}}/>}<div className={s.fightPanel}><div className={s.fightHead}><div><span>{phase.toUpperCase()}</span><p>{phase==="idle"?"Choose your spot and cast":phase==="waiting"?"Watch the bobber and feel for vibration…":phase==="bite"?"Fish on — yank the phone back now!":phase==="fighting"?`${fish?.[0]} is running`:phase==="caught"?"Catch secured!":phase==="lost"?"The fish escaped":"Casting…"}</p>{phase==="bite"&&<small className="rwMotionNote">{motionStatus==="ready"?"PHONE MOTION ARMED · TAP BUTTON ALSO WORKS":motionStatus==="blocked"?"MOTION BLOCKED · TAP TO SET HOOK":"ENABLE MOTION WHEN PROMPTED · TAP FALLBACK AVAILABLE"}</small>}</div>{fish&&<b className={s[fish[1]]}>{fish[1]}</b>}</div>{phase==="fighting"&&<><label><span>LINE TENSION · {tensionHint}</span><b>{Math.round(tension)}%</b></label><div className={s.tension}><i/><b style={{left:`${tension}%`}}/></div><label><span>LANDING PROGRESS</span><b>{Math.round(progress)}%</b></label><div className={s.reelProgress}><i style={{width:`${progress}%`}}/></div></>}<button className={`${s.castButton} ${phase==="bite"?s.hookButton:""}`} disabled={["casting","waiting","caught","lost"].includes(phase)} onClick={phase==="bite"?()=>hook("tap"):phase==="idle"?startCast:undefined} onPointerDown={()=>phase==="fighting"&&setReeling(true)} onPointerUp={()=>setReeling(false)} onPointerLeave={()=>setReeling(false)} onPointerCancel={()=>setReeling(false)}>{phase==="bite"?"YANK PHONE BACK · TAP FALLBACK":phase==="fighting"?"HOLD TO REEL · RELEASE TO EASE":phase==="waiting"?"WAIT FOR A BITE":phase==="idle"?"CAST LINE":"…"}</button></div></section>}

    {tab === "bag" && <Panel icon="🎒" title="Tackle Bag" sub="SELECT BAIT AND EQUIPMENT"><div className={s.cardGrid}>{BAITS.map(([id,name,icon])=><button key={id} className={`${s.itemCard} ${player.activeBait===id?s.selected:""}`} onClick={()=>setPlayer(p=>({...p,activeBait:id}))}><span>{icon}</span><div><strong>{name}</strong><small>Tap to equip</small></div><b>x{player.bait[id]||0}</b></button>)}</div><div className={s.rodCard}><span>🎣</span><div><strong>{player.rod === "starter" ? "Starter Fiberglass Rod" : player.rod}</strong><small>Upgrade rods at nearby bait shops</small></div></div></Panel>}
    {tab === "license" && <Panel icon="🪪" title="Fishing License" sub="IN-GAME PERMIT SYSTEM"><div className={`${s.licenseCard} ${permitValid?s.activeLicense:""}`}><span>{permitValid?"ACTIVE GAME LICENSE":"NO ACTIVE LICENSE"}</span><h3>{permitValid?player.name:"Permit Required"}</h3><p>{permitValid?`Valid through ${new Date(player.permit).toLocaleDateString()}`:"This fictional permit controls gameplay only. Follow real local fishing laws."}</p></div><div className={s.licenseOptions}>{[[1,75],[7,250],[90,900]].map(([d,p])=><button key={d} onClick={()=>buyPermit(d,p)}><div><strong>{d===90?"Season":`${d}-Day`} Permit</strong><small>All ReelWorld GO waters</small></div><b>🪙 {p}</b></button>)}</div><h3 className={s.sectionTitle}>Citations</h3>{player.tickets.length?player.tickets.map(t=><div className={s.ticketRow} key={t.id}><span>🎫</span><div><strong>{t.reason}</strong><small>{t.paid?"Paid":`${t.fine} coins due`}</small></div><button disabled={t.paid||player.coins<t.fine} onClick={()=>setPlayer(p=>({...p,coins:p.coins-t.fine,tickets:p.tickets.map(x=>x.id===t.id?{...x,paid:true}:x)}))}>PAY</button></div>):<p className={s.empty}>No citations.</p>}</Panel>}
    {tab === "profile" && <Panel icon="🏆" title={player.name} sub="ANGLER PROFILE"><div className={s.stats}><div><b>{player.catches.length}</b><span>CAUGHT</span></div><div><b>{player.casts}</b><span>CASTS</span></div><div><b>{player.lost}</b><span>LOST</span></div><div><b>{level}</b><span>LEVEL</span></div></div><h3 className={s.sectionTitle}>Recent catches</h3><div className={s.catchList}>{player.catches.slice(0,12).map(c=><div key={c.id}><span>🐟</span><div><strong>{c.species}</strong><small>{c.rarity}</small></div><b>{c.weight} lb</b></div>)}</div><button className={s.reset} onClick={()=>{localStorage.removeItem(KEY);setPlayer(initial);tell("Player save reset")}}>RESET SAVE</button></Panel>}

    <nav className={s.nav}>{[["map","🗺️","MAP"],["fish","🎣","FISH"],["bag","🎒","GEAR"],["license","🪪","LICENSE"],["profile","🏆","PROFILE"]].map(([id,ic,l])=><button key={id} className={tab===id?s.navActive:""} onClick={()=>setTab(id as Tab)}><span>{ic}</span><b>{l}</b></button>)}</nav>
    {shop&&<div className={s.modalShade}><div className={s.shopModal}><button className={s.close} onClick={()=>setShop(null)}>×</button><div className={s.shopTitle}><span>⛽</span><div><p>GAS STATION · BAIT SHOP</p><h2>{shop.name}</h2><small>{Math.round(meters(pos,shop))} m away</small></div></div>{BAITS.map(([id,name,icon,price])=><button className={s.shopItem} key={id} onClick={()=>buyBait(id,price)}><span>{icon}</span><div><strong>{name} ×5</strong><small>Local bait supply</small></div><b>🪙 {price}</b></button>)}<h3>Rod upgrades</h3>{[["Carbon Rod",650],["Pro Tournament Rod",1800]].map(([name,price])=><button className={s.shopItem} key={name} onClick={()=>{if(meters(pos,shop)>300)return tell("Move closer to this shop");if(player.coins<+price)return tell("Not enough coins");setPlayer(p=>({...p,coins:p.coins-+price,rod:String(name)}));tell(`${name} equipped`)}}><span>🎣</span><div><strong>{name}</strong><small>Better tension control</small></div><b>🪙 {price}</b></button>)}</div></div>}
    {ranger&&<div className={s.modalShade}><div className={s.ranger}><span>👮‍♂️</span><p>RANGER INSPECTION</p><h2>{ranger.ok?"License Verified":"Ticket Issued"}</h2><strong>{ranger.text}</strong>{ranger.fine&&<b>🪙 {ranger.fine} FINE</b>}<button onClick={()=>setRanger(null)}>CONTINUE</button><small>Game enforcement only. Real regulations still apply.</small></div></div>}
    {toast&&<div className={s.toast}>{toast}</div>}
  </main>;
}

function Panel({icon,title,sub,children}:{icon:string;title:string;sub:string;children:React.ReactNode}) { return <section className={s.panelScreen}><div className={s.panelHero}><span>{icon}</span><div><p>{sub}</p><h2>{title}</h2></div></div>{children}</section>; }
