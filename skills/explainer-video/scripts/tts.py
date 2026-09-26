#!/usr/bin/env python3
"""用 edge-tts 把 script.json 的旁白合成为音频，并生成逐词时间轴。

用法：python3 tts.py <项目目录>

输入  <项目目录>/script.json
输出  audio/lines/<id>.mp3   每句单独的音频（带缓存，文字没变就不重新合成）
      audio/narration.m4a    拼好的整条旁白
      timeline.json / timeline.js   每句、每个词的开始和结束时间（秒）
"""
import asyncio, hashlib, json, os, subprocess, sys
from array import array
from pathlib import Path

SR = 24000  # 采样率


def ensure_edge_tts():
    try:
        import edge_tts  # noqa: F401
        return
    except ImportError:
        pass
    # 找附近的 .venv 重新执行自己
    here = Path.cwd().resolve()
    for d in [here, *here.parents, Path(__file__).resolve().parent]:
        py = d / ".venv" / "bin" / "python"
        if py.exists() and Path(sys.prefix).resolve() != (d / ".venv").resolve():
            os.execv(str(py), [str(py), *sys.argv])
    sys.exit("找不到 edge-tts。请先安装：python3 -m venv .venv && .venv/bin/pip install edge-tts")


ensure_edge_tts()
import edge_tts  # noqa: E402


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
                    raise RuntimeError("没有收到音频")
                mp3.write_bytes(bytes(buf))
                meta.write_text(json.dumps({"key": key, "words": words}, ensure_ascii=False))
                print(f"  合成 {line['id']}：{line['text'][:24]}")
                return words
            except Exception as e:  # 网络抖动时重试
                if attempt == 3:
                    raise
                print(f"  {line['id']} 失败（{e}），重试…")
                await asyncio.sleep(1.5 * (attempt + 1))


async def main(proj: Path):
    cfg = json.loads((proj / "script.json").read_text())
    lines = cfg["lines"]
    ids = [l["id"] for l in lines]
    dup = {i for i in ids if ids.count(i) > 1}
    if dup:
        sys.exit(f"script.json 里 id 重复：{dup}")
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
        if not l.get("text"):  # 纯停顿：{"id": "beat", "silence": 1.2}
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
        for i, v in enumerate(pcm):  # 叠加（相邻句的尾部静音可能重叠）
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

    # 章节：某句台词带 "chapter": "章节名"，表示新的一章从这句开始；第一章从 0 秒算起。
    # 章节在"上一句话说完"时就切换，和两句之间的镜头转场同步，而不是等新的一句开口
    chapters = []
    for i, (l, t) in enumerate(zip(lines, timeline)):
        if l.get("chapter"):
            start = 0.0 if not chapters else round(timeline[i - 1]["end"] + 0.05, 3) if i > 0 else t["start"]
            chapters.append({"title": l["chapter"], "start": start})
    # 最后一章在最后一句话说完时结束（之后的收尾停留不算进度），进度条正好和内容一起走完
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
    print(f"完成：{len(timeline)} 句，总时长 {duration:.1f} 秒" + (f"，{len(chapters)} 个章节" if chapters else ""))
    for c in chapters:
        print(f"  章节 {c['start']:6.2f} – {c['end']:6.2f}  {c['title']}")
    for t in timeline:
        print(f"  {t['start']:6.2f} – {t['end']:6.2f}  {t['id']:<12} {t['text'][:30]}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    asyncio.run(main(Path(sys.argv[1]).resolve()))
