from __future__ import annotations

import html
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist" / "occasions"
SITE = ROOT / "site" / "occasions"
SITE.mkdir(parents=True, exist_ok=True)

video = DIST / "occasions_narrated_all_devices.mp4"
validation = DIST / "validation.json"
contact_sheet = DIST / "contact_sheet.png"

narrated = video.exists() and video.stat().st_size > 0

if contact_sheet.exists():
    shutil.copy2(contact_sheet, SITE / "contact_sheet.png")
if narrated:
    shutil.copy2(video, SITE / "occasions_narrated_all_devices.mp4")
if validation.exists():
    shutil.copy2(validation, SITE / "validation.json")

status_label = "Narrated ElevenLabs render is live" if narrated else "Deployment ready — ElevenLabs secret required"
status_class = "ready" if narrated else "pending"

if narrated:
    media = """
      <video controls playsinline preload="metadata" poster="contact_sheet.png">
        <source src="occasions_narrated_all_devices.mp4" type="video/mp4">
        Your browser does not support the included MP4.
      </video>
      <div class="actions">
        <a class="button" href="occasions_narrated_all_devices.mp4" download>Download universal MP4</a>
        <a class="link" href="validation.json">Open validation receipt</a>
      </div>
    """
else:
    media = """
      <div class="pending-card">
        <p>The GitHub deployment is active, but narration is intentionally blocked until the repository contains an <code>ELEVENLABS_API_KEY</code> Actions secret.</p>
        <p>No local, browser, or substitute TTS is used.</p>
      </div>
      <img class="contact-sheet" src="contact_sheet.png" alt="Occasions workflow concept scene review sheet">
    """

page = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>Occasions Banquet Hall — Private Workflow Concept</title>
  <style>
    :root {{ --obsidian:#070d0b; --emerald:#0c221c; --panel:#17231e; --gold:#d2b571; --ivory:#f6f1e5; --muted:#d3cdbf; }}
    * {{ box-sizing:border-box; }}
    body {{ margin:0; background:radial-gradient(circle at 80% 5%,#183e32 0,transparent 34%),linear-gradient(180deg,var(--obsidian),var(--emerald)); color:var(--ivory); font-family:Inter,Arial,sans-serif; min-height:100vh; }}
    main {{ width:min(1020px,calc(100% - 32px)); margin:0 auto; padding:48px 0 72px; }}
    .rule {{ height:3px; background:var(--gold); margin-bottom:34px; }}
    .eyebrow {{ color:#ead39d; font-size:12px; letter-spacing:.18em; text-transform:uppercase; font-weight:700; }}
    h1 {{ font-family:Georgia,serif; font-size:clamp(42px,7vw,78px); line-height:1.03; max-width:850px; margin:18px 0; font-weight:500; }}
    .lede {{ color:var(--muted); font-size:clamp(17px,2.4vw,23px); line-height:1.65; max-width:820px; }}
    .status {{ display:inline-flex; align-items:center; gap:9px; margin:22px 0 34px; padding:10px 14px; border-radius:999px; border:1px solid #53645b; background:#111a16; font-size:13px; }}
    .status::before {{ content:''; width:9px; height:9px; border-radius:50%; background:#e0a75d; box-shadow:0 0 16px #e0a75d; }}
    .status.ready::before {{ background:#78c99a; box-shadow:0 0 16px #78c99a; }}
    .frame {{ background:rgba(17,26,22,.9); border:1px solid #4f4633; padding:18px; border-radius:24px; box-shadow:0 30px 80px rgba(0,0,0,.35); }}
    video,.contact-sheet {{ display:block; width:100%; height:auto; border-radius:14px; background:#000; }}
    .pending-card {{ padding:24px; border:1px solid #665839; border-radius:15px; background:#121b17; color:var(--muted); line-height:1.7; margin-bottom:18px; }}
    code {{ color:#f0d69a; }}
    .actions {{ display:flex; flex-wrap:wrap; align-items:center; gap:18px; padding-top:18px; }}
    a {{ color:#ead39d; }}
    .button {{ display:inline-block; background:var(--gold); color:#101410; text-decoration:none; padding:13px 18px; border-radius:10px; font-weight:800; }}
    .grid {{ display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-top:26px; }}
    .item {{ background:#111a16; border:1px solid #35433b; padding:18px; border-radius:15px; color:var(--muted); line-height:1.55; }}
    .item strong {{ display:block; color:var(--ivory); margin-bottom:6px; }}
    footer {{ margin-top:30px; color:#969f99; font-size:13px; line-height:1.6; }}
    @media(max-width:720px) {{ .grid {{ grid-template-columns:1fr; }} main {{ padding-top:28px; }} }}
  </style>
</head>
<body>
  <main>
    <div class="rule"></div>
    <div class="eyebrow">iLLCo AI × Occasions Banquet Hall</div>
    <h1>A more elegant path from inquiry to celebration.</h1>
    <p class="lede">A private product demonstration showing how approved event details, service discovery, venue-tour scheduling, follow-up, and owner handoff can operate as one polished workflow.</p>
    <div class="status {status_class}">{html.escape(status_label)}</div>
    <section class="frame">{media}</section>
    <section class="grid">
      <div class="item"><strong>Universal playback</strong>H.264 Baseline, AAC-LC, yuv420p, constant 24 fps, no B-frames, and MP4 faststart.</div>
      <div class="item"><strong>Secure narration</strong>ElevenLabs runs only through encrypted GitHub Actions secrets. Credentials are never committed or printed.</div>
      <div class="item"><strong>Release gate</strong>The final media must pass complete audio/video decoding before it can be deployed.</div>
    </section>
    <footer>This is a proposed workflow concept. Pricing, availability, messaging, and final booking decisions remain under Occasions Banquet Hall’s control.</footer>
  </main>
</body>
</html>
"""

(SITE / "index.html").write_text(page, encoding="utf-8")
(SITE / ".nojekyll").write_text("", encoding="utf-8")

manifest = {
    "status": "ready" if narrated else "pending_elevenlabs_secret",
    "narrated_video_present": narrated,
    "codec_policy": "H.264 Baseline / AAC-LC / yuv420p / CFR 24 / no B-frames / faststart",
}
(SITE / "deployment-status.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
print(SITE)
