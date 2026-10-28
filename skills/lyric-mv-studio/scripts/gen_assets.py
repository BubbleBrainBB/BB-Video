#!/usr/bin/env python3
"""Dry-run asset generation: turn shotlist.json into prompts + a manifest.

This script DOES NOT call an image API. It prepares the exact prompts, refs,
seeds, sizes, and output paths. Use the `lovart-api` / `bailian-cli` skill (or
ComfyUI) for the actual billable generation, after the user confirms budget.

Usage:
  python3 gen_assets.py shotlist.json --out-dir generation
  python3 gen_assets.py shotlist.json --out-dir generation --provider lovart --model <model>

Outputs:
  generation/manifest.json
  generation/prompts/s01.prompt.txt
  generation/prompts/s01.negative.txt
  generation/commands.md
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("shotlist", type=Path)
    ap.add_argument("--out-dir", type=Path, default=Path("generation"))
    ap.add_argument("--provider", default="unspecified")
    ap.add_argument("--model", default="unspecified")
    args = ap.parse_args()

    data = json.loads(args.shotlist.read_text(encoding="utf-8"))
    shots = data.get("shots", [])
    if not shots:
        print("ERROR: no shots", file=sys.stderr)
        return 1

    out = args.out_dir
    prompts = out / "prompts"
    prompts.mkdir(parents=True, exist_ok=True)

    manifest = {
        "provider": args.provider,
        "model": args.model,
        "shotlist": str(args.shotlist),
        "dry_run": True,
        "note": (
            "No image was generated. Confirm budget/provider before billing. "
            "Use lovart-api or bailian-cli (or ComfyUI) with these prompts/refs."
        ),
        "items": [],
    }

    for s in shots:
        sid = s.get("id", "shot")
        (prompts / f"{sid}.prompt.txt").write_text(s.get("prompt", "").strip() + "\n", encoding="utf-8")
        (prompts / f"{sid}.negative.txt").write_text(s.get("negative", "").strip() + "\n", encoding="utf-8")
        manifest["items"].append({
            "id": sid,
            "start": s.get("start"),
            "end": s.get("end"),
            "lyric": s.get("lyric"),
            "prompt_file": f"prompts/{sid}.prompt.txt",
            "negative_file": f"prompts/{sid}.negative.txt",
            "refs": s.get("refs", []),
            "size": s.get("size", "1920x1080"),
            "seed": s.get("seed"),
            "output": s.get("output", f"scenes/{sid}.png"),
            "status": s.get("status", "planned"),
        })

    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    cmd = f"""# Asset generation (dry-run manifest)
# 1. Confirm budget + provider with the user.
# 2. Load the provider skill:
#    - lovart-api: generate from generation/manifest.json prompts/refs
#    - bailian-cli: ask once, then generate
#    - ComfyUI: use your workflow API
# 3. Save outputs to the manifest `output` paths, then update shotlist status/seed/model.
#
# provider: {args.provider}
# model: {args.model}
# shots: {len(manifest['items'])}
"""
    (out / "commands.md").write_text(cmd, encoding="utf-8")

    print(f"OK: {out / 'manifest.json'} ({len(manifest['items'])} prompts)")
    print("DRY RUN: no API called. Confirm provider/budget before generation.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
