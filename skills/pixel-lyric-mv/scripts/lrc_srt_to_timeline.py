#!/usr/bin/env python3
"""Convert LRC/SRT to a line-level timeline skeleton.

WARNING: LRC/SRT are LINE-LEVEL. This output puts the whole line in one
pseudo-word at the line start. It is useful for scene boundaries, NOT for
word-synced type. Replace each line's `words` with ASR/tap word times before
shipping.

Usage:
  python3 lrc_srt_to_timeline.py lyrics.srt -o timeline.json
  python3 lrc_srt_to_timeline.py lyrics.lrc -o timeline.json

No third-party dependencies.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

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
        if not lines:
            continue
        time_line = next((x for x in lines if "-->" in x), None)
        if not time_line:
            continue
        a, b = [x.strip() for x in time_line.split("-->", 1)]
        start, end = parse_ts(a), parse_ts(b)
        if start is None or end is None:
            continue
        body = [x for x in lines if x != time_line and not x.isdigit()]
        text_line = " ".join(body).strip()
        if text_line:
            out.append((start, end, text_line))
    return out


def parse_lrc(text: str):
    out = []
    for raw in text.splitlines():
        stamps = re.findall(r"\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]", raw)
        if not stamps:
            continue
        content = re.sub(r"\[[^\]]*\]", "", raw).strip()
        if not content or re.match(r"^[a-zA-Z]+:", content):
            continue
        for m, s, ms in stamps:
            start = int(m) * 60 + int(s) + (int((ms or "0").ljust(3, "0")) / 1000.0)
            out.append([start, content])
    out.sort(key=lambda x: x[0])
    lines = []
    for i, (start, content) in enumerate(out):
        end = out[i + 1][0] if i + 1 < len(out) else start + 4.0
        if end <= start:
            end = start + 1.0
        lines.append((start, end, content))
    return lines


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input", type=Path)
    ap.add_argument("-o", "--out", type=Path, default=Path("timeline.json"))
    ap.add_argument("--title", default=None)
    args = ap.parse_args()

    text = args.input.read_text(encoding="utf-8", errors="replace")
    if "-->" in text:
        lines = parse_srt(text)
        kind = "SRT"
    else:
        lines = parse_lrc(text)
        kind = "LRC"

    if not lines:
        print("ERROR: no timed lines found", file=sys.stderr)
        return 1

    duration = max(end for _, end, _ in lines) + 0.5
    data = {
        "title": args.title or args.input.stem,
        "audio": "audio.mp3",
        "duration": round(duration, 3),
        "bpm": None,
        "notes": (
            f"Converted from {kind} (LINE-LEVEL ONLY). Each line is a single pseudo-word "
            "at its start; replace `words` with ASR/tap word timings before using this as a "
            "word-synced MV. LRC/SRT cannot provide word rhythm."
        ),
        "lines": [
            {
                "start": round(start, 3),
                "end": round(end, 3),
                "words": [{"t": round(start, 3), "text": content}],
            }
            for start, end, content in lines
        ],
    }
    args.out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"WARN: {kind} is line-level; wrote {len(lines)} pseudo-words to {args.out}. "
        "Replace words with ASR/tap timings before shipping.",
        file=sys.stderr,
    )
    print(f"OK: {args.out} ({len(lines)} lines, duration {duration:.2f}s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
