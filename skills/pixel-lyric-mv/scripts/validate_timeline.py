#!/usr/bin/env python3
"""Validate a word-synced lyric MV timeline.

Usage:
  python3 validate_timeline.py timeline.json

No third-party dependencies.
Exit 0 = valid (warnings allowed); 1 = errors.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path


def is_num(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def validate(data: dict) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    for key in ("title", "duration", "lines"):
        if key not in data:
            errors.append(f"missing top-level field: {key}")
    if errors:
        return errors, warnings

    duration = data["duration"]
    if not is_num(duration) or duration <= 0:
        errors.append("duration must be a positive number")
        return errors, warnings

    lines = data["lines"]
    if not isinstance(lines, list) or not lines:
        errors.append("lines must be a non-empty array")
        return errors, warnings

    prev_end = -1.0
    for li, line in enumerate(lines):
        where = f"lines[{li}]"
        if not isinstance(line, dict):
            errors.append(f"{where} must be an object")
            continue
        if not is_num(line.get("start")) or not is_num(line.get("end")):
            errors.append(f"{where}: start/end must be numbers")
            continue
        start, end = float(line["start"]), float(line["end"])
        if start < 0:
            errors.append(f"{where}: start < 0")
        if end <= start:
            errors.append(f"{where}: end must be > start")
        if end > duration + 1e-6:
            errors.append(f"{where}: end {end} > duration {duration}")
        if start < prev_end - 1e-6:
            errors.append(f"{where}: overlaps previous line (start {start} < prev end {prev_end})")
        prev_end = max(prev_end, end)

        words = line.get("words")
        if not isinstance(words, list) or not words:
            errors.append(f"{where}: words must be a non-empty array")
            continue

        last_t = -math.inf
        prev_t = None
        for wi, word in enumerate(words):
            wwhere = f"{where}.words[{wi}]"
            if not isinstance(word, dict):
                errors.append(f"{wwhere} must be an object")
                continue
            t = word.get("t")
            if not is_num(t):
                errors.append(f"{wwhere}: t must be a number")
                continue
            t = float(t)
            text = word.get("text")
            if not isinstance(text, str) or not text.strip():
                errors.append(f"{wwhere}: text must be a non-empty string")
            if t < start - 1e-6:
                errors.append(f"{wwhere}: t {t} is before line start {start}")
            if t < last_t - 1e-6:
                errors.append(f"{wwhere}: t {t} is not monotonic (previous {last_t})")
            if t > end + 1e-6:
                errors.append(f"{wwhere}: t {t} is after line end {end}")
            if prev_t is not None and t - prev_t > 4.0:
                warnings.append(f"{wwhere}: {t - prev_t:.2f}s gap from previous word; confirm intentional")
            if word.get("hero") and not isinstance(word["hero"], str):
                errors.append(f"{wwhere}: hero must be a string")
            if word.get("key") and not isinstance(word["key"], str):
                errors.append(f"{wwhere}: key must be a string")
            last_t = max(last_t, t)
            prev_t = t

        if last_t < start + 0.2:
            warnings.append(f"{where}: all words within first 0.2s; is the line too compressed?")

    if prev_end > duration + 1e-6:
        errors.append(f"last line ends at {prev_end}, beyond duration {duration}")

    return errors, warnings


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("timeline", type=Path)
    args = ap.parse_args()
    try:
        data = json.loads(args.timeline.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"ERROR: cannot read JSON: {e}", file=sys.stderr)
        return 1
    errors, warnings = validate(data)
    for w in warnings:
        print(f"WARN: {w}", file=sys.stderr)
    for e in errors:
        print(f"ERROR: {e}", file=sys.stderr)
    if errors:
        print(f"\n{len(errors)} error(s).", file=sys.stderr)
        return 1
    print(f"OK: {args.timeline} ({len(data['lines'])} lines, {sum(len(l.get('words', [])) for l in data['lines'])} words)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
