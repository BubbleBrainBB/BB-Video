#!/usr/bin/env python3
"""Build a contact sheet for character/style QA.

Usage:
  python3 contact_sheet.py scenes/*.png --out preview/contact.png --cols 4
  python3 contact_sheet.py character/poses/*.png --out preview/poses.png --cols 4

Requires Pillow.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except Exception as e:
    print(f"ERROR: Pillow required ({e})", file=sys.stderr)
    raise SystemExit(2)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("images", nargs="+", type=Path)
    ap.add_argument("--out", type=Path, default=Path("preview/contact.png"))
    ap.add_argument("--cols", type=int, default=4)
    ap.add_argument("--thumb", type=int, default=360)
    ap.add_argument("--label", action="store_true", default=True)
    args = ap.parse_args()

    files = [p for p in args.images if p.exists()]
    missing = [str(p) for p in args.images if not p.exists()]
    if missing:
        print(f"WARN: missing {len(missing)} image(s): {missing[:4]}", file=sys.stderr)
    if not files:
        print("ERROR: no images", file=sys.stderr)
        return 1

    cols = max(1, args.cols)
    rows = (len(files) + cols - 1) // cols
    pad, label_h = 12, 26
    cell = args.thumb
    W = cols * cell + (cols + 1) * pad
    H = rows * (cell + label_h) + (rows + 1) * pad
    sheet = Image.new("RGB", (W, H), (18, 16, 14))
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.load_default()
    except Exception:
        font = None

    for i, p in enumerate(files):
        r, c = divmod(i, cols)
        x = pad + c * (cell + pad)
        y = pad + r * (cell + label_h + pad)
        try:
            im = Image.open(p).convert("RGB")
        except Exception as e:
            print(f"WARN: cannot open {p}: {e}", file=sys.stderr)
            continue
        im.thumbnail((cell, cell), Image.LANCZOS)
        ox = x + (cell - im.width) // 2
        oy = y + (cell - im.height) // 2
        sheet.paste(im, (ox, oy))
        if args.label:
            label = p.name[:42]
            draw.text((x, y + cell + 5), label, fill=(210, 200, 185), font=font)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.out)
    print(f"OK: {args.out} ({len(files)} images, {W}x{H})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
