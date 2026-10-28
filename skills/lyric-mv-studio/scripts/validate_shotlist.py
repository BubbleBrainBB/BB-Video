#!/usr/bin/env python3
"""Validate a shotlist (and optionally a project manifest).

Usage:
  python3 validate_shotlist.py shotlist.json
  python3 validate_shotlist.py shotlist.json --project project.json

No third-party dependencies.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path


def is_num(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("shotlist", type=Path)
    ap.add_argument("--project", type=Path, default=None)
    args = ap.parse_args()

    try:
        data = json.loads(args.shotlist.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"ERROR: cannot read shotlist: {e}", file=sys.stderr)
        return 1

    errors = []
    warnings = []
    meta = data.get("meta", {}) or {}
    shots = data.get("shots")
    if not isinstance(shots, list) or not shots:
        print("ERROR: shots must be a non-empty array", file=sys.stderr)
        return 1

    duration = meta.get("duration")
    if duration is not None and (not is_num(duration) or duration <= 0):
        errors.append("meta.duration must be a positive number")
    if duration is None:
        duration = max((s.get("end", 0) for s in shots if is_num(s.get("end"))), default=0)
        warnings.append("meta.duration missing; using last shot end")

    ids = set()
    outputs = set()
    prev_end = 0.0
    for i, s in enumerate(shots):
        where = f"shots[{i}]"
        if not isinstance(s, dict):
            errors.append(f"{where} must be an object")
            continue
        sid = s.get("id")
        if not sid:
            errors.append(f"{where}: missing id")
        elif sid in ids:
            errors.append(f"{where}: duplicate id {sid}")
        ids.add(sid)

        start, end = s.get("start"), s.get("end")
        if not is_num(start) or not is_num(end):
            errors.append(f"{where}: start/end must be numbers")
            continue
        if start < 0:
            errors.append(f"{where}: start < 0")
        if end <= start:
            errors.append(f"{where}: end <= start")
        if start < prev_end - 1e-6:
            errors.append(f"{where}: overlaps previous shot ({start} < {prev_end})")
        if is_num(duration) and end > duration + 0.001:
            errors.append(f"{where}: end {end} > duration {duration}")
        if end - start > 4.0:
            warnings.append(f"{where}: shot is {end - start:.2f}s; consider splitting")
        prev_end = max(prev_end, end)

        for key in ("lyric", "shot", "character", "background", "type_layout", "prompt", "negative", "output"):
            v = s.get(key)
            if key in ("lyric",) and isinstance(v, str) and not v.strip() and meta.get("timing", "").startswith("instrumental"):
                continue
            if not isinstance(v, str) or not v.strip():
                errors.append(f"{where}: missing/empty {key}")

        refs = s.get("refs")
        if not isinstance(refs, list) or not refs:
            errors.append(f"{where}: refs must be a non-empty array (character reference)")
        if not s.get("seed"):
            warnings.append(f"{where}: no seed; record the seed for reproducibility")

        out = s.get("output")
        if out in outputs:
            errors.append(f"{where}: duplicate output {out}")
        outputs.add(out)
        prompt = s.get("prompt", "") or ""
        if "no text" not in prompt.lower():
            warnings.append(f"{where}: prompt does not say 'no text'; image models may add text")
        if not s.get("status"):
            warnings.append(f"{where}: status missing; expected planned/generated/approved")

    if len(shots) > 40:
        warnings.append(f"{len(shots)} shots; 45s usually needs 15–25; check for over-cutting")
    if not meta.get("character_ref"):
        warnings.append("meta.character_ref missing")
    if not meta.get("style"):
        warnings.append("meta.style missing")
    if not meta.get("gates"):
        warnings.append("meta.gates missing; add character_sheet/style_frame/batch_budget")

    if args.project:
        try:
            project = json.loads(args.project.read_text(encoding="utf-8"))
            char = (project.get("character") or {}).get("ref")
            if char and meta.get("character_ref") and char != meta["character_ref"]:
                warnings.append(f"project character ref {char!r} != shotlist ref {meta['character_ref']!r}")
        except Exception as e:
            warnings.append(f"cannot read project: {e}")

    for w in warnings:
        print(f"WARN: {w}", file=sys.stderr)
    for e in errors:
        print(f"ERROR: {e}", file=sys.stderr)
    if errors:
        print(f"\n{len(errors)} error(s).", file=sys.stderr)
        return 1
    print(f"OK: {args.shotlist} ({len(shots)} shots, duration {duration}s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
