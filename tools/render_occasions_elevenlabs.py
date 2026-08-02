from __future__ import annotations

import json
import math
import os
import subprocess
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = Path("dist/occasions")
OUT.mkdir(parents=True, exist_ok=True)

W, H = 960, 540
FPS = 24
SAFE = 54

OBSIDIAN = (7, 13, 11)
EMERALD = (12, 34, 28)
EMERALD_2 = (24, 62, 50)
IVORY = (246, 241, 229)
IVORY_MUTED = (211, 205, 191)
CHAMPAGNE = (210, 181, 113)
CHAMPAGNE_LIGHT = (233, 211, 160)
CARD = (24, 34, 30)
PAPER = (239, 233, 219)
INK = (18, 22, 20)
WHITE = (255, 255, 255)
MUTED = (145, 151, 146)
BURGUNDY = (96, 39, 48)

SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
SERIF_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
SANS = "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"
SANS_BOLD = "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"

NARRATION = """Every inquiry deserves an exceptional first response.

Imagine a potential client reaching out after business hours to ask whether a date is available for a celebration. Instead of waiting, they receive a refined, immediate welcome that collects the details Occasions needs: the event date, event type, guest count, approximate budget, and requested amenities.

Using only approved services and confirmed availability, the concierge can guide the prospect through relevant options, including the venue, house DJ, mirror photo booth, or throne chairs. It can then offer a private venue-tour time, send a confirmation, and follow up thoughtfully if the inquiry remains unfinished.

Kenyatta receives one organized summary containing the event details, service interests, and requested next step. The system handles repetitive intake while the owner remains fully in control of pricing, availability, recommendations, and final booking decisions.

This is a proposed workflow concept built around Occasions Banquet Hall's publicly listed services. iLLCo AI builds practical automation that preserves the personal touch while making every opportunity easier to manage."""

SCENES = [
    {
        "kicker": "Occasions Banquet Hall × iLLCo AI",
        "title": "Every inquiry deserves\nan exceptional first response.",
        "body": "A private concept for transforming new event inquiries into organized, tour-ready opportunities.",
        "accent": "Weddings • Celebrations • Corporate events",
    },
    {
        "kicker": "The moment a lead arrives",
        "title": "8:47 PM",
        "body": "A potential client asks whether October 18 is available for a 70-person birthday celebration.",
        "accent": "Respond immediately • Capture details • Preserve the personal touch",
    },
    {
        "kicker": "A concierge-style first response",
        "title": "Welcome the guest.\nCollect the essentials.",
        "body": "Date • Event type • Guest count • Budget • Requested amenities",
        "accent": "Structured. Immediate. Elegant.",
    },
    {
        "kicker": "Curated service discovery",
        "title": "Guide the conversation\nwith approved options.",
        "body": "Venue • House DJ • Mirror photo booth • Throne chairs",
        "accent": "Pricing and availability always remain under Occasions' control.",
    },
    {
        "kicker": "The next step becomes effortless",
        "title": "From interest to a\nscheduled venue tour.",
        "body": "Offer a time, send confirmation, and follow up when an inquiry is unfinished.",
        "accent": "Clear next steps without repetitive manual intake.",
    },
    {
        "kicker": "A cleaner owner handoff",
        "title": "One organized summary\nfor Kenyatta.",
        "body": "Event • Date • Budget • Service interests • Requested next step",
        "accent": "Less repetitive intake • Faster response • Consistent follow-up",
    },
    {
        "kicker": "A private concept from iLLCo AI",
        "title": "A more elegant path\nfrom inquiry to celebration.",
        "body": "A proposed workflow built around Occasions Banquet Hall's publicly listed services.",
        "accent": "Review the private implementation concept.",
    },
]


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


def text_width(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont) -> int:
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0]


def fit_font(draw: ImageDraw.ImageDraw, text: str, path: str, maximum: int, minimum: int, max_width: int) -> ImageFont.FreeTypeFont:
    longest = max(text.splitlines(), key=len)
    for size in range(maximum, minimum - 1, -1):
        candidate = font(path, size)
        if text_width(draw, longest, candidate) <= max_width:
            return candidate
    return font(path, minimum)


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    lines: list[str] = []
    for paragraph in text.splitlines():
        words = paragraph.split()
        if not words:
            lines.append("")
            continue
        current: list[str] = []
        for word in words:
            trial = " ".join(current + [word])
            if not current or text_width(draw, trial, fnt) <= max_width:
                current.append(word)
            else:
                lines.append(" ".join(current))
                current = [word]
        if current:
            lines.append(" ".join(current))
    return lines


def draw_multiline(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fnt: ImageFont.FreeTypeFont, fill: tuple[int, int, int], max_width: int, spacing: int = 8) -> int:
    x, y = xy
    for line in wrap(draw, text, fnt, max_width):
        draw.text((x, y), line, font=fnt, fill=fill)
        box = draw.textbbox((x, y), line or " ", font=fnt)
        y = box[3] + spacing
    return y


def background() -> Image.Image:
    img = Image.new("RGB", (W, H), OBSIDIAN)
    draw = ImageDraw.Draw(img)
    for y in range(H):
        t = y / (H - 1)
        color = tuple(int(OBSIDIAN[i] * (1 - t) + EMERALD[i] * t) for i in range(3))
        draw.line((0, y, W, y), fill=color)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((610, -120, 1080, 350), fill=(*EMERALD_2, 85))
    gd.ellipse((-150, 310, 320, 720), fill=(*CHAMPAGNE, 35))
    glow = glow.filter(ImageFilter.GaussianBlur(80))
    img = img.convert("RGBA")
    img.alpha_composite(glow)
    return img.convert("RGB")


def create_slide(index: int, scene: dict[str, str]) -> Path:
    img = background()
    draw = ImageDraw.Draw(img)

    draw.rectangle((SAFE, 34, W - SAFE, 37), fill=CHAMPAGNE)
    draw.text((SAFE, 52), scene["kicker"].upper(), font=font(SANS_BOLD, 14), fill=CHAMPAGNE_LIGHT)
    draw.text((W - SAFE, 51), f"{index:02d}", font=font(SANS_BOLD, 18), fill=IVORY_MUTED, anchor="ra")

    title_font = fit_font(draw, scene["title"], SERIF_BOLD, 48, 32, 650)
    y = 126
    for line in scene["title"].splitlines():
        draw.text((SAFE, y), line, font=title_font, fill=IVORY if index != 1 else CHAMPAGNE_LIGHT)
        box = draw.textbbox((SAFE, y), line, font=title_font)
        y = box[3] + 10

    y = max(y + 24, 255)
    draw_multiline(draw, (SAFE + 2, y), scene["body"], font(SANS, 22), IVORY_MUTED, 650, 9)

    panel = (690, 175, 900, 390)
    draw.rounded_rectangle(panel, radius=26, fill=CARD, outline=CHAMPAGNE, width=2)
    draw.text((718, 207), "THE EXPERIENCE", font=font(SANS_BOLD, 13), fill=CHAMPAGNE_LIGHT)
    draw_multiline(draw, (718, 252), scene["accent"], font(SANS, 17), IVORY_MUTED, 155, 8)

    draw.rounded_rectangle((SAFE, H - 68, 244, H - 38), radius=15, fill=(12, 19, 16), outline=(78, 91, 84))
    draw.text((SAFE + 14, H - 60), "PROPOSED WORKFLOW CONCEPT", font=font(SANS_BOLD, 10), fill=IVORY_MUTED)

    path = OUT / f"scene_{index:02d}.png"
    img.save(path, optimize=True)
    return path


def generate_tts() -> tuple[Path, str, str]:
    api_key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY is missing")

    voice_id = os.environ.get("AUTOTUBE_ELEVENLABS_VOICE_ID", "").strip() or "JBFqnCBsd6RMkjVDRZzb"
    model_id = "eleven_multilingual_v2"
    endpoint = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128"
    response = requests.post(
        endpoint,
        headers={"xi-api-key": api_key, "Content-Type": "application/json"},
        json={
            "text": NARRATION,
            "model_id": model_id,
            "voice_settings": {
                "stability": 0.46,
                "similarity_boost": 0.78,
                "style": 0.28,
                "use_speaker_boost": True,
                "speed": 0.96,
            },
        },
        timeout=180,
    )
    if response.status_code != 200:
        body = response.text[:800]
        raise RuntimeError(f"ElevenLabs request failed with status {response.status_code}: {body}")

    audio = OUT / "elevenlabs_narration.mp3"
    audio.write_bytes(response.content)
    return audio, voice_id, model_id


def probe_duration(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def create_video(slides: list[Path], narration: Path) -> Path:
    duration = probe_duration(narration)
    scene_duration = duration / len(slides)
    segments: list[Path] = []

    for index, slide in enumerate(slides, 1):
        segment = OUT / f"segment_{index:02d}.mp4"
        frames = max(1, int(math.ceil(scene_duration * FPS)))
        run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-loop", "1", "-i", str(slide),
            "-t", f"{scene_duration:.4f}",
            "-vf",
            f"scale={W}:{H},zoompan=z='min(zoom+0.00012,1.012)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS},"
            f"fade=t=in:st=0:d=0.35,fade=t=out:st={max(0.0, scene_duration - 0.38):.4f}:d=0.38,format=yuv420p",
            "-an", "-c:v", "libx264", "-profile:v", "baseline", "-level:v", "3.1",
            "-preset", "medium", "-crf", "21", "-bf", "0", "-refs", "1",
            "-g", str(FPS * 2), "-keyint_min", str(FPS * 2), "-sc_threshold", "0",
            "-r", str(FPS), "-pix_fmt", "yuv420p", str(segment),
        ])
        segments.append(segment)

    concat_file = OUT / "concat.txt"
    concat_file.write_text("\n".join(f"file '{item.name}'" for item in segments) + "\n", encoding="utf-8")
    visual = OUT / "visual.mp4"
    run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-f", "concat", "-safe", "0", "-i", str(concat_file),
        "-c", "copy", str(visual),
    ])

    ambient = OUT / "ambient.wav"
    run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-f", "lavfi", "-i", f"sine=frequency=110:sample_rate=44100:duration={duration:.4f}",
        "-f", "lavfi", "-i", f"sine=frequency=164.81:sample_rate=44100:duration={duration:.4f}",
        "-filter_complex",
        "[0:a]volume=0.012,lowpass=f=250[a0];[1:a]volume=0.007,lowpass=f=390[a1];"
        "[a0][a1]amix=inputs=2:duration=longest,afade=t=in:st=0:d=1.5[a]",
        "-map", "[a]", "-c:a", "pcm_s16le", str(ambient),
    ])

    output = OUT / "occasions_narrated_all_devices.mp4"
    run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", str(visual), "-i", str(narration), "-i", str(ambient),
        "-filter_complex",
        "[0:v]scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24,format=yuv420p[v];"
        "[1:a]loudnorm=I=-16:LRA=7:TP=-1.5[voice];[2:a]volume=0.20[music];"
        "[voice][music]amix=inputs=2:duration=first:dropout_transition=2[a]",
        "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-profile:v", "baseline", "-level:v", "3.0",
        "-preset", "medium", "-crf", "24", "-bf", "0", "-refs", "1",
        "-g", "48", "-keyint_min", "48", "-sc_threshold", "0",
        "-maxrate", "1200k", "-bufsize", "2400k",
        "-c:a", "aac", "-profile:a", "aac_low", "-b:a", "96k", "-ar", "44100", "-ac", "2",
        "-shortest", "-movflags", "+faststart", "-avoid_negative_ts", "make_zero", "-fflags", "+genpts",
        "-map_metadata", "-1", str(output),
    ])
    return output


def validate(output: Path, narration: Path, voice_id: str, model_id: str) -> None:
    run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-xerror",
        "-i", str(output), "-map", "0:v:0", "-map", "0:a:0", "-f", "null", "-",
    ])
    probe = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries",
            "format=format_name,duration,size,start_time,bit_rate:stream=codec_name,profile,codec_type,width,height,pix_fmt,level,r_frame_rate,avg_frame_rate,sample_rate,channels",
            "-of", "json", str(output),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    data = json.loads(probe.stdout)
    data["validation"] = {
        "status": "passed",
        "tts_provider": "ElevenLabs",
        "tts_model": model_id,
        "voice_id": voice_id,
        "narration_file": narration.name,
        "full_audio_video_decode": True,
        "codec_policy": {
            "video": "H.264 Baseline Level 3.0",
            "pixel_format": "yuv420p",
            "frame_rate": "constant 24 fps",
            "b_frames": 0,
            "audio": "AAC-LC 44.1 kHz stereo",
            "container": "MP4 faststart",
        },
    }
    (OUT / "validation.json").write_text(json.dumps(data, indent=2), encoding="utf-8")


def contact_sheet(slides: list[Path]) -> None:
    sheet = Image.new("RGB", (960, 1080), OBSIDIAN)
    for index, slide in enumerate(slides):
        image = Image.open(slide).convert("RGB").resize((480, 270), Image.Resampling.LANCZOS)
        sheet.paste(image, ((index % 2) * 480, (index // 2) * 270))
    sheet.save(OUT / "contact_sheet.png", optimize=True)


def main() -> None:
    slides = [create_slide(index, scene) for index, scene in enumerate(SCENES, 1)]
    contact_sheet(slides)
    narration, voice_id, model_id = generate_tts()
    output = create_video(slides, narration)
    validate(output, narration, voice_id, model_id)
    print(output)


if __name__ == "__main__":
    main()
