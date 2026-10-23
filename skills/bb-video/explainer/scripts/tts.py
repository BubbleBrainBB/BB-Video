#!/usr/bin/env python3
"""Synthesizes the narration in script.json to audio with edge-tts, and builds a word-level timeline.

Usage: python3 tts.py <project dir>

Input   <project dir>/script.json
Output  audio/lines/<id>.mp3   one audio file per line (cached: not re-synthesized if the text is unchanged)
        audio/narration.m4a    the full narration, joined together
        timeline.json / timeline.js   start and end times (seconds) of every line and every word
"""
import asyncio, hashlib, json, os, subprocess, sys
from array import array
from pathlib import Path

SR = 24000  # sample rate


def ensure_edge_tts():
    try:
        import edge_tts  # noqa: F401
        return
    except ImportError:
        pass
    # look for a nearby .venv and re-exec this script with it (only one you own: never run a .venv someone else
    # planted in a shared parent directory such as /tmp)
    here = Path.cwd().resolve()
    for d in [here, *here.parents, Path(__file__).resolve().parent]:
        py = d / ".venv" / "bin" / "python"
        if py.exists() and (d / ".venv").stat().st_uid == os.getuid() and Path(sys.prefix).resolve() != (d / ".venv").resolve():
            os.execv(str(py), [str(py), *sys.argv])
    sys.exit("edge-tts not found. Install it first: python3 -m venv .venv && .venv/bin/pip install edge-tts")


ensure_edge_tts()
import edge_tts  # noqa: E402
import edge_tts.communicate as _communicate  # noqa: E402
from edge_tts.constants import TRUSTED_CLIENT_TOKEN  # noqa: E402

# Microsoft is moving Read Aloud from speech.platform.bing.com to api.msedgeservices.com, and the old
# host now refuses many regions with a 403 (rany2/edge-tts#490, October 2026). The new host still takes
# the legacy token, so point edge-tts there. EDGE_TTS_WSS_URL overrides it once edge-tts ships a fix.
_communicate.WSS_URL = os.environ.get(
    "EDGE_TTS_WSS_URL",
    f"wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1?Ocp-Apim-Subscription-Key={TRUSTED_CLIENT_TOKEN}",
)


def decode_pcm(mp3: Path) -> array:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(mp3), "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"],
        check=True, capture_output=True,
    ).stdout
    a = array("h")
    a.frombytes(raw)
    return a


async def synth(line, cfg, out_dir: Path, sem):
    voice = line.get("voice", cfg.get("voice", "zh-CN-XiaoxiaoNeural"))
    rate = line.get("rate", cfg.get("rate", "+0%"))
    pitch = line.get("pitch", cfg.get("pitch", "+0Hz"))
    key = hashlib.sha1(f"{line['text']}|{voice}|{rate}|{pitch}".encode()).hexdigest()
    mp3, meta = out_dir / f"{line['id']}.mp3", out_dir / f"{line['id']}.json"
    if mp3.exists() and meta.exists():
        m = json.loads(meta.read_text())
        if m.get("key") == key:
            return m["words"]
    async with sem:
        for attempt in range(4):
            try:
                com = edge_tts.Communicate(line["text"], voice, rate=rate, pitch=pitch, boundary="WordBoundary")
                words, buf = [], bytearray()
                async for ch in com.stream():
                    if ch["type"] == "audio":
                        buf.extend(ch["data"])
                    elif ch["type"] == "WordBoundary":
                        s = ch["offset"] / 1e7
                        words.append({"text": ch["text"], "start": round(s, 3), "end": round(s + ch["duration"] / 1e7, 3)})
                if not buf:
                    raise RuntimeError("no audio received")
                mp3.write_bytes(bytes(buf))
                meta.write_text(json.dumps({"key": key, "words": words}, ensure_ascii=False))
                print(f"  synthesized {line['id']}: {line['text'][:24]}")
                return words
            except Exception as e:  # retry on network hiccups
                if attempt == 3:
                    raise
                print(f"  {line['id']} failed ({e}), retrying…")
                await asyncio.sleep(1.5 * (attempt + 1))


async def main(proj: Path):
    cfg = json.loads((proj / "script.json").read_text())
    lines = cfg["lines"]
    ids = [l["id"] for l in lines]
    dup = {i for i in ids if ids.count(i) > 1}
    if dup:
        sys.exit(f"duplicate id in script.json: {dup}")
    out_dir = proj / "audio" / "lines"
    out_dir.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(4)
    speak = [l for l in lines if l.get("text")]
    results = await asyncio.gather(*(synth(l, cfg, out_dir, sem) for l in speak))
    words_by_id = {l["id"]: w for l, w in zip(speak, results)}

    gap = cfg.get("gap", 0.35)
    cursor = cfg.get("lead_in", 0.6)
    track = array("h")
    timeline = []
    for l in lines:
        cursor += l.get("pause_before", 0)
        if not l.get("text"):  # pure pause: {"id": "beat", "silence": 1.2}
            d = l.get("silence", 1.0)
            timeline.append({"id": l["id"], "text": "", "silence": True, "start": round(cursor, 3), "end": round(cursor + d, 3), "words": []})
            cursor += d
            continue
        pcm = decode_pcm(out_dir / f"{l['id']}.mp3")
        words = words_by_id[l["id"]]
        audio_len = len(pcm) / SR
        speech_end = words[-1]["end"] if words else audio_len
        off = int(round(cursor * SR))
        need = off + len(pcm)
        if len(track) < need:
            track.extend([0] * (need - len(track)))
        for i, v in enumerate(pcm):  # mix in (the trailing silence of adjacent lines may overlap)
            s = track[off + i] + v
            track[off + i] = 32767 if s > 32767 else -32768 if s < -32768 else s
        timeline.append({
            "id": l["id"], "text": l["text"],
            "start": round(cursor + (words[0]["start"] if words else 0), 3),
            "end": round(cursor + speech_end, 3),
            "words": [{"text": w["text"], "start": round(cursor + w["start"], 3), "end": round(cursor + w["end"], 3)} for w in words],
        })
        cursor += speech_end + gap + l.get("pause_after", 0)

    duration = round(max(cursor - gap, len(track) / SR) + cfg.get("tail", 1.5), 3)

    # Chapters: a line with "chapter": "<chapter name>" starts a new chapter at that line; the first chapter starts at 0 s.
    # A chapter switches as soon as the previous line finishes, in sync with the camera transition between the two lines, rather than waiting for the new line to start
    chapters = []
    for i, (l, t) in enumerate(zip(lines, timeline)):
        if l.get("chapter"):
            start = 0.0 if not chapters else round(timeline[i - 1]["end"] + 0.05, 3) if i > 0 else t["start"]
            chapters.append({"title": l["chapter"], "start": start})
    # The last chapter ends when the last line finishes (the closing hold after it doesn't count as progress), so the progress bar completes exactly with the content
    spoken_end = max((t["end"] for t in timeline if not t.get("silence")), default=duration)
    for i, c in enumerate(chapters):
        c["end"] = chapters[i + 1]["start"] if i + 1 < len(chapters) else round(min(duration, spoken_end + 0.05), 3)
    track.extend([0] * (int(duration * SR) - len(track)))
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-",
         "-c:a", "aac", "-b:a", "160k", str(proj / "audio" / "narration.m4a")],
        input=track.tobytes(), check=True,
    )
    data = {"duration": duration, "lines": timeline, "chapters": chapters}
    (proj / "timeline.json").write_text(json.dumps(data, ensure_ascii=False, indent=1))
    (proj / "timeline.js").write_text("window.TIMELINE = " + json.dumps(data, ensure_ascii=False) + ";\n")
    print(f"Done: {len(timeline)} lines, total duration {duration:.1f} s" + (f", {len(chapters)} chapters" if chapters else ""))
    for c in chapters:
        print(f"  chapter {c['start']:6.2f} – {c['end']:6.2f}  {c['title']}")
    for t in timeline:
        print(f"  {t['start']:6.2f} – {t['end']:6.2f}  {t['id']:<12} {t['text'][:30]}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    asyncio.run(main(Path(sys.argv[1]).resolve()))
