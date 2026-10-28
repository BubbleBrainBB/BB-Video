#!/usr/bin/env python3
"""Extract word-level timestamps with faster-whisper.

Recommended input: a vocal stem, not the full mix.

  python3 -m demucs.separate -n htdemucs --two-stems=vocals -o stems song.mp3
  python3 word_timings.py --audio stems/htdemucs/song/vocals.wav --language zh --model small --out words.json

This script does NOT map ASR words to the lyric text. Review the output and
map by hand; singing ASR can be wrong. If it is unreliable, use the page's
word tap calibration or a hand-authored timeline instead.

Requires: pip install faster-whisper
"""
from __future__ import annotations

import argparse
import json
import sys


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--audio", required=True)
    ap.add_argument("--out", default="words.json")
    ap.add_argument("--language", default="zh")
    ap.add_argument("--model", default="small")
    ap.add_argument("--device", default="cpu")
    ap.add_argument("--compute-type", default="int8")
    ap.add_argument("--no-vad", action="store_true")
    args = ap.parse_args()

    try:
        from faster_whisper import WhisperModel
    except Exception as e:
        print(f"ERROR: faster-whisper is not installed ({e})", file=sys.stderr)
        print("  pip install faster-whisper", file=sys.stderr)
        print("  # for dense mixes, isolate vocals first with Demucs", file=sys.stderr)
        return 2

    model = WhisperModel(args.model, device=args.device, compute_type=args.compute_type)
    segments, info = model.transcribe(
        args.audio,
        language=args.language,
        word_timestamps=True,
        vad_filter=not args.no_vad,
        beam_size=5,
    )

    words = []
    segs = []
    for seg in segments:
        segs.append({"start": seg.start, "end": seg.end, "text": seg.text})
        for w in (seg.words or []):
            words.append({
                "start": round(w.start, 3),
                "end": round(w.end, 3),
                "word": w.word.strip(),
                "probability": round(getattr(w, "probability", 0.0), 3),
            })

    data = {
        "source": args.audio,
        "model": args.model,
        "language": info.language,
        "language_probability": round(getattr(info, "language_probability", 0.0), 3),
        "words": words,
        "segments": segs,
        "warning": (
            "ASR words are not lyric words. Map by text/order and correct by ear. "
            "If this output drifts or hallucinates, use a vocal stem, a larger model, "
            "or the page tap calibration; do not ship it uncorrected."
        ),
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"OK: {len(words)} words, {len(segs)} segments -> {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
