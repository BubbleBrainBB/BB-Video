#!/usr/bin/env python3
"""Plan a shotlist from project.json + lyrics.

This is a PLANNING tool. If lyrics have no word timestamps, shot boundaries
are line-level estimates. It never invents word timings for the final type.

Usage:
  python3 plan_mv.py project.json --out shotlist.json
  python3 plan_mv.py project.json --duration 12 --lyrics lyrics.txt --out shotlist.json

No third-party dependencies.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import sys
from pathlib import Path

STYLE_TOKENS = {
    "illustrated": "painterly editorial illustration, soft brush, subtle grain, cinematic light",
    "pixel": "16-bit pixel art, limited palette, crisp edges, no anti-aliasing",
    "paper": "paper cut, ink wash, letterpress, fibers, torn edge, gold and vermilion accents",
    "3d": "cinematic 3D render, volumetric light, shallow depth of field, clean materials",
    "game-ui": "illustrated game key art, clean UI framing, soft light, readable silhouette",
}
TYPE_LAYOUTS = ["left-bottom", "right-bottom", "left-top", "center-left", "bottom"]
SAFE = {
    "left-bottom": "character on the right third, clean negative space on the left and lower area",
    "right-bottom": "character on the left third, clean negative space on the right and lower area",
    "left-top": "character on the right third, clean negative space on the left and upper area",
    "center-left": "character on the right third, clean negative space on the left",
    "bottom": "character in the upper third, clean negative space along the bottom",
}
SHOTS = ["wide", "medium", "close", "insert", "type"]
TS = re.compile(r"(?:(?P<h>\d{1,2}):)?(?P<m>\d{1,2}):(?P<s>\d{2})[.,](?P<ms>\d{1,3})")


def parse_ts(s: str) -> float | None:
    m = TS.search(s)
    if not m:
        return None
    h = int(m.group("h") or 0)
    return h * 3600 + int(m.group("m")) * 60 + int(m.group("s")) + int(m.group("ms").ljust(3, "0")) / 1000.0


def parse_srt(text: str):
    out = []
    for block in re.split(r"\n\s*\n", text.strip()):
        lines = [x.strip() for x in block.splitlines() if x.strip()]
        time_line = next((x for x in lines if "-->" in x), None)
        if not time_line:
            continue
        a, b = [x.strip() for x in time_line.split("-->", 1)]
        start, end = parse_ts(a), parse_ts(b)
        body = [x for x in lines if x != time_line and not x.isdigit()]
        if start is not None and end is not None and body:
            out.append((start, end, " ".join(body)))
    return out


def parse_lrc(text: str):
    rows = []
    for raw in text.splitlines():
        stamps = re.findall(r"\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]", raw)
        if not stamps:
            continue
        content = re.sub(r"\[[^\]]*\]", "", raw).strip()
        if not content:
            continue
        for m, s, ms in stamps:
            start = int(m) * 60 + int(s) + int((ms or "0").ljust(3, "0")) / 1000.0
            rows.append((start, content))
    rows.sort(key=lambda x: x[0])
    out = []
    for i, (start, content) in enumerate(rows):
        end = rows[i + 1][0] if i + 1 < len(rows) else start + 4.0
        out.append((start, max(end, start + 1.0), content))
    return out


def read_lyrics(path: Path, duration: float):
    text = path.read_text(encoding="utf-8", errors="replace")
    if "-->" in text:
        return parse_srt(text), "line-level (SRT)"
    if re.search(r"\[\d{1,2}:\d{2}", text):
        return parse_lrc(text), "line-level (LRC)"
    lines = [x.strip() for x in text.splitlines() if x.strip()]
    if not lines:
        return [], "none"
    step = duration / len(lines)
    return [(i * step, min(duration, (i + 1) * step), line) for i, line in enumerate(lines)], "planning-estimate (plain text)"


def ffprobe_duration(path: Path) -> float | None:
    try:
        r = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
            capture_output=True, text=True, check=True,
        )
        return float(r.stdout.strip())
    except Exception:
        return None


def split_long(start: float, end: float, text: str, target: float):
    """Split at a comma/space if a line is much longer than target. Planning only."""
    if end - start <= target * 1.6:
        return [(start, end, text)]
    parts = [p.strip() for p in re.split(r"[，,、/]+", text) if p.strip()]
    if len(parts) < 2:
        return [(start, end, text)]
    # split into two halves at the nearest punctuation
    mid = len(parts) // 2
    a, b = "，".join(parts[:mid]), "，".join(parts[mid:])
    cut = start + (end - start) * (len(a) / max(1, len(a) + len(b)))
    return [(start, cut, a), (cut, end, b)]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project", type=Path)
    ap.add_argument("--out", type=Path, default=None)
    ap.add_argument("--lyrics", type=Path, default=None)
    ap.add_argument("--duration", type=float, default=None)
    ap.add_argument("--target", type=float, default=None)
    ap.add_argument("--base-seed", type=int, default=12000)
    args = ap.parse_args()

    project_path = args.project.resolve()
    project = json.loads(project_path.read_text(encoding="utf-8"))
    root = project_path.parent
    out = args.out or root / "shotlist.json"

    duration = args.duration or project.get("duration")
    if duration is None:
        song = root / project.get("song", "")
        duration = ffprobe_duration(song) if song.exists() else None
    if duration is None:
        print("ERROR: cannot determine duration; pass --duration", file=sys.stderr)
        return 1
    duration = float(duration)

    lyrics_path = args.lyrics or (root / project.get("lyrics", ""))
    if lyrics_path and lyrics_path.exists():
        lines, timing = read_lyrics(lyrics_path, duration)
    else:
        lines, timing = [], "none"
        print("WARN: no lyrics; planning an instrumental shotlist", file=sys.stderr)

    if not lines:
        step = args.target or project.get("target_scene_seconds", 2.6)
        lines = [(i * step, min(duration, (i + 1) * step), "") for i in range(max(1, math.ceil(duration / step)))]
        timing = "instrumental (no lyrics)"

    target = args.target or float(project.get("target_scene_seconds", 2.6))
    style = project.get("style", "illustrated")
    style_token = STYLE_TOKENS.get(style, STYLE_TOKENS["illustrated"])
    char = project.get("character", {}) or {}
    char_ref = char.get("ref", "character.png")
    identity = char.get("identity", "same character as reference")
    forbidden = char.get("forbidden", "do not change face, hair, eyes, outfit")
    aspect = project.get("aspect", "16:9")
    size = project.get("resolution", "1920x1080")
    seed = args.base_seed

    shots = []
    for start, end, text in lines:
        for a, b, t in split_long(start, end, text, target):
            i = len(shots)
            if not t:
                shot = SHOTS[i % len(SHOTS)]
            elif any(k in t for k in ("山", "江", "远", "站台", "风")):
                shot = "wide"
            elif any(k in t for k in ("灯", "雨", "手", "名字")):
                shot = "insert"
            elif any(k in t for k in ("我", "你", "唱", "眼")):
                shot = "medium"
            else:
                shot = "medium"
            layout = TYPE_LAYOUTS[i % len(TYPE_LAYOUTS)]
            safe = SAFE.get(layout, "clean negative space for typography")
            action = "standing, subtle motion"
            if any(k in t for k in ("走", "行", "站台")):
                action = "walking or standing, weight on the front foot"
            elif any(k in t for k in ("山", "远", "望")):
                action = "small figure, looking into the distance"
            elif any(k in t for k in ("雨", "水", "江")):
                action = "reaching into rain, eyes on the hand"
            elif any(k in t for k in ("灯", "亮")):
                action = "hand near a warm light, face lit from the side"
            elif any(k in t for k in ("我", "你")):
                action = "facing camera, calm, singing softly"
            prompt = (
                f"{style_token}, same character as reference, {identity}, {action}, "
                f"{shot} shot, scene mood: {t or 'instrumental atmosphere'}, {aspect}, "
                f"{safe}, 35-45% clean negative space for typography, "
                f"no text, no letters, no watermark, no logo, {size}"
            )
            shots.append({
                "id": f"s{i + 1:02d}",
                "start": round(a, 3),
                "end": round(b, 3),
                "lyric": t,
                "shot": shot,
                "character": action,
                "background": t or "atmospheric background",
                "type_layout": layout,
                "prompt": prompt,
                "refs": [char_ref],
                "negative": (
                    "text, letters, watermark, logo, signature, extra fingers, extra limbs, "
                    "different face, different hair color, different outfit, cropped feet, lowres"
                ),
                "size": size,
                "seed": seed + i,
                "output": f"scenes/s{i + 1:02d}.png",
                "status": "planned",
            })

    data = {
        "meta": {
            "title": project.get("title", project_path.stem),
            "style": style,
            "aspect": aspect,
            "duration": round(duration, 3),
            "timing": timing,
            "character_ref": char_ref,
            "forbidden": forbidden,
            "shots": len(shots),
            "estimated_images": int(math.ceil(len(shots) * 1.5) + 10),
            "gates": ["character_sheet", "style_frame", "batch_budget"],
            "warning": "Shot boundaries may be line-level estimates. Final type needs word-level timings.",
        },
        "shots": shots,
    }
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"OK: {out} ({len(shots)} shots, timing {timing}, estimated images {data['meta']['estimated_images']})")
    if timing.startswith("planning") or timing.startswith("line-level") or timing.startswith("instrumental"):
        print("WARN: shot boundaries use non-word timing; final type timeline must be word-level.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
