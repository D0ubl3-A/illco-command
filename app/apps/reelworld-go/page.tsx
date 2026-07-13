"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import s from "./reelworld.module.css";

type Tab = "map" | "fish" | "bag" | "license" | "profile";
type Pos = { lat: number; lon: number; speed: number };
type Point = { id: string; name: string; lat: number; lon: number; kind: "water" | "shop" };
type Player = { name: string; coins: number; xp: number; bait: Record<string, number>; activeBait: string; rod: string; permit: number; catches: any[]; tickets: any[]; casts: number; lost: number };

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
  const [tension, setTension] = useState(42);
  const [reeling, setReeling] = useState(false);
  const [sprite, setSprite] = useState({ a: 0, f: 0, x: 50, y: 45 });
  const [toast, setToast] = useState("");
  const [ranger, setRanger] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const scan = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => { setPlayer(load()); setReady(true); }, []);
  useEffect(() => { if (ready) localStorage.setItem(KEY, JSON.stringify(player)); }, [player, ready]);
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
    const id = setInterval(() => setSprite(v => ({ a: (v.a + 1) % 8, f: (v.f + 1) % 4, x: 50 + Math.sin(Date.now() / 430) * (phase === "fighting" ? 25 : 8), y: 44 + Math.cos(Date.now() / 520) * 8 })), 115);
    return () => clearInterval(id);
  }, [fish, phase]);

  useEffect(() => {
    if (phase !== "fighting" || !fish) return;
    const id = setInterval(() => {
      setTension(t => Math.max(0, Math.min(100, t + (reeling ? 8 : -4) + (Math.random() - .5) * 11)));
      setProgress(p => Math.max(0, Math.min(100, p + (reeling ? 3.2 : -.6))));
    }, 180);
    return () => clearInterval(id);
  }, [phase, fish, reeling]);

  useEffect(() => {
    if (phase !== "fighting") return;
    if (tension > 96 || tension < 2) lose("The line snapped");
    else if (progress >= 100) catchFish();
  }, [tension, progress, phase]);

  function startCast() {
    if (!permitValid) { setTab("license"); return tell("Buy an in-game fishing permit before casting"); }
    if (!waterReady) return tell("Move near mapped water or scan visible water with the camera");
    if ((player.bait[player.activeBait] || 0) < 1) { setTab("bag"); return tell("You are out of that bait"); }
    if (pos.speed > 8) return tell("Fishing locks while you appear to be driving");
    setPlayer(p => ({ ...p, casts: p.casts + 1, bait: { ...p.bait, [p.activeBait]: p.bait[p.activeBait] - 1 } }));
    setPhase("casting"); buzz(); setTimeout(() => setPhase("waiting"), 700);
    setTimeout(() => { const f = FISH[Math.floor(Math.random() * FISH.length)]; setFish(f); setPhase("bite"); buzz(140); }, 1900 + Math.random() * 3500);
    if (Math.random() < .16) setTimeout(() => inspect(), 900);
  }
  function hook() { if (phase !== "bite") return; setPhase("fighting"); setProgress(8); setTension(43); buzz(80); }
  function lose(reason: string) { setPhase("lost"); setPlayer(p => ({ ...p, lost: p.lost + 1 })); tell(reason); setTimeout(() => { setPhase("idle"); setFish(null); }, 1700); }
  function catchFish() {
    const [name, rarity, min, max, xp] = fish; const weight = +(min + Math.random() * (max - min)).toFixed(2); const coins = Math.round(weight * 8 + xp / 3);
    const c = { id: crypto.randomUUID(), species: name, rarity, weight, xp, coins, at: Date.now() };
    setPlayer(p => ({ ...p, xp: p.xp + xp, coins: p.coins + coins, catches: [c, ...p.catches].slice(0, 100) })); setPhase("caught"); buzz([50, 40, 90]); tell(`${name} · ${weight} lb · +${coins} coins`); setTimeout(() => { setPhase("idle"); setFish(null); setProgress(0); }, 2400);
  }
  function inspect() {
    if (permitValid) setRanger({ ok: true, text: "Permit verified. Tight lines, angler." });
    else { const fine = 150; setPlayer(p => ({ ...p, tickets: [{ id: crypto.randomUUID(), reason: "Fishing without an active game permit", fine, paid: false }, ...p.tickets] })); setRanger({ ok: false, text: "No active game permit", fine }); }
  }
  function buyPermit(days: number, price: number) { if (player.coins < price) return tell("Not enough coins"); setPlayer(p => ({ ...p, coins: p.coins - price, permit: Date.now() + days * 86400000 })); tell(`${days}-day game permit activated`); }
  function buyBait(id: string, price: number) { if (!shop || meters(pos, shop) > 300) return tell("Move within 300 m of this gas-station bait shop"); if (player.coins < price) return tell("Not enough coins"); setPlayer(p => ({ ...p, coins: p.coins - price, bait: { ...p.bait, [id]: (p.bait[id] || 0) + 5 } })); tell("Added 5 to your tackle bag"); }

  const map = tile(pos.lat, pos.lon, 15), mapPoints = points.filter(p => meters(pos, p) < 2500).slice(0, 18);
  return <main className={s.shell}>
    <header className={s.hud}><div className={s.avatar}>🎣</div><div className={s.player}><strong>{player.name}</strong><span>LEVEL {level} · {player.xp} XP</span><i><b style={{ width: `${Math.min(100, player.xp % 180 / 1.8)}%` }} /></i></div><div className={s.currency}><span>🪙 {player.coins}</span><span className={permitValid ? s.live : ""}>{permitValid ? "✓ LICENSED" : "NO LICENSE"}</span></div></header>

    {tab === "map" && <section className={s.mapScreen}><div className={s.mapViewport}><div className={s.tiles}>{[-1,0,1].flatMap(dy => [-1,0,1].map(dx => <img key={`${dx}${dy}`} alt="" src={`https://tile.openstreetmap.org/15/${Math.floor(map.x)+dx}/${Math.floor(map.y)+dy}.png`} style={{ left: (Math.floor(map.x)+dx-map.x)*256, top: (Math.floor(map.y)+dy-map.y)*256 }} />))}</div><div className={s.mapShade}/><div className={s.userPin}>▲</div>{mapPoints.map(p => { const c = tile(p.lat,p.lon,15); const x = 50+(c.x-map.x)*256/390*100, y=50+(c.y-map.y)*256/700*100; return <button key={p.id} className={`${s.mapPin} ${p.kind === "shop" ? s.shopPin : s.waterPin}`} style={{ left:`${x}%`,top:`${y}%` }} onClick={()=>p.kind === "shop" ? setShop(p) : tell(`${p.name} · ${Math.round(meters(pos,p))} m`)}>{p.kind === "shop" ? "⛽" : "💧"}</button>})}<small className={s.attribution}>© OpenStreetMap</small></div><div className={s.mapTop}><span className={waterReady?s.ready:""}>{nearbyWater ? `${Math.round(meters(pos,nearbyWater))} m TO WATER` : "SCANNING AREA"}</span><button onClick={()=>setTab("fish")}>FISH HERE</button></div><div className={s.mapBottom}><strong>{points.filter(p=>p.kind==="shop").length} gas-station bait shops found</strong><span>Every mapped fuel station becomes a bait shop. Walk close enough to buy supplies.</span></div></section>}

    {tab === "fish" && <section className={`${s.fishScreen} ${s[`phase_${phase}`] || ""}`}>{camera ? <video ref={video} className={s.camera} autoPlay muted playsInline/> : <div className={s.cameraFallback}><span>🌊</span><strong>MAP WATER FISHING MODE</strong></div>}<div className={s.vignette}/><div className={s.scanPill}>WATER SCAN <i><b style={{width:`${waterScore}%`}}/></i>{waterScore}%</div><button className={`${s.zonePill} ${waterReady?s.zoneReady:""}`} onClick={()=>setCamera(v=>!v)}>{camera?"CAMERA ON":"START AR CAMERA"} · {waterReady?"WATER READY":"FIND WATER"}</button>{fish && <div style={{position:"absolute",left:`${sprite.x}%`,top:`${sprite.y}%`,width:180,height:110,transform:"translate(-50%,-50%)",backgroundImage:`url(/reelworld-go/fish-atlas.svg)`,backgroundSize:"800% 400%",backgroundPosition:`${sprite.a*100/7}% ${sprite.f*100/3}%`,filter:`hue-rotate(${fish[1]==="rare"?90:fish[1]==="legendary"?-80:0}deg) drop-shadow(0 12px 14px #0009)`}}/>}<div className={s.fightPanel}><div className={s.fightHead}><div><span>{phase.toUpperCase()}</span><p>{phase==="idle"?"Choose your spot and cast":phase==="waiting"?"Watch the line…":phase==="bite"?"A fish is striking!":phase==="fighting"?`${fish?.[0]} is running`:phase==="caught"?"Catch secured!":phase==="lost"?"The fish escaped":"Casting…"}</p></div>{fish&&<b className={s[fish[1]]}>{fish[1]}</b>}</div>{phase==="fighting"&&<><label><span>LINE TENSION</span><b>{Math.round(tension)}%</b></label><div className={s.tension}><i/><b style={{left:`${tension}%`}}/></div><label><span>LANDING PROGRESS</span><b>{Math.round(progress)}%</b></label><div className={s.reelProgress}><i style={{width:`${progress}%`}}/></div></>}<button className={`${s.castButton} ${phase==="bite"?s.hookButton:""}`} disabled={["casting","waiting","caught","lost"].includes(phase)} onClick={phase==="bite"?hook:phase==="idle"?startCast:undefined} onPointerDown={()=>phase==="fighting"&&setReeling(true)} onPointerUp={()=>setReeling(false)} onPointerCancel={()=>setReeling(false)}>{phase==="bite"?"HOOK NOW!":phase==="fighting"?"HOLD TO REEL":phase==="waiting"?"WAIT FOR A BITE":phase==="idle"?"CAST LINE":"…"}</button></div></section>}

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
