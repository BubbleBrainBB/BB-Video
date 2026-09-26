// core.js：时间驱动的合成运行时
// 约定：画面是时间的纯函数。window.renderFrame(t) 给定秒数 t 画出那一帧，
// 不依赖 requestAnimationFrame / Date.now / 未设种子的 Math.random。
// 渲染器（scripts/render.mjs）逐帧调用它截图；直接用浏览器打开则进入预览播放器。
(function () {
  Error.stackTraceLimit = 40;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, p) => a + (b - a) * p;

  const ease = {
    linear: (p) => p,
    in: (p) => p * p * p,
    out: (p) => 1 - Math.pow(1 - p, 3),
    outQuart: (p) => 1 - Math.pow(1 - p, 4),
    inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    inOutSine: (p) => -(Math.cos(Math.PI * p) - 1) / 2,
    outBack: (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
    // 模拟手写：起笔、收笔稍慢，中段匀速
    pen: (p) => 0.25 * p + 0.75 * (0.5 - 0.5 * Math.cos(Math.PI * p)),
  };

  function hashStr(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  // mulberry32：可复现的随机数
  function rng(seed) {
    let a = (typeof seed === 'string' ? hashStr(seed) : seed) >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 0→1 的进度，t 在 [start, start+dur] 之间插值
  function progress(t, start, dur, e = ease.out) {
    if (dur <= 0) return t >= start ? 1 : 0;
    return e(clamp((t - start) / dur));
  }

  // ---------- 时间轴（来自 scripts/tts.py 生成的 timeline.js）----------
  const PUNCT = /[\s，。、？！；：“”‘’（）《》「」【】—…·,.?!;:'"()\[\]\-]/g;
  const norm = (s) => s.replace(PUNCT, '').toLowerCase();

  function timeline(data) {
    data = data || { duration: 10, lines: [] };
    const byId = new Map(data.lines.map((l) => [l.id, l]));
    const T = (id) => {
      const l = byId.get(id);
      if (!l) throw new Error(`timeline：找不到台词 id "${id}"（请检查 script.json 并重新运行 tts.py）`);
      return l;
    };
    // 在一句台词里定位某个词/短语，返回 [开始时间, 结束时间]
    function locate(id, phrase, nth = 0) {
      const l = T(id);
      const target = norm(phrase);
      const words = l.words || [];
      if (words.length) {
        let concat = '';
        const owner = [];
        words.forEach((w, i) => { const n = norm(w.text); concat += n; for (let k = 0; k < n.length; k++) owner.push(i); });
        let idx = -1, from = 0;
        for (let k = 0; k <= nth; k++) { idx = concat.indexOf(target, from); if (idx < 0) break; from = idx + 1; }
        if (idx >= 0) {
          const a = words[owner[idx]], b = words[owner[idx + target.length - 1]];
          return [a.start, b.end];
        }
      }
      // 退化：按字符位置在整句时长里估算
      const full = norm(l.text);
      const i = full.indexOf(target);
      if (i < 0) {
        console.warn(`timeline：在 "${id}" 里找不到 "${phrase}"，改用句首时间`);
        return [l.start, l.end];
      }
      const d = l.end - l.start;
      return [l.start + (d * i) / full.length, l.start + (d * (i + target.length)) / full.length];
    }
    T.start = (id) => T(id).start;
    T.end = (id) => T(id).end;
    T.word = (id, phrase, nth) => locate(id, phrase, nth)[0];
    T.wordEnd = (id, phrase, nth) => locate(id, phrase, nth)[1];
    T.at = (id, frac) => lerp(T(id).start, T(id).end, frac);
    T.lines = data.lines;
    T.chapters = data.chapters || [];
    T.duration = data.duration;
    T.current = (t) => data.lines.find((l) => t >= l.start && t < l.end) || null;
    return T;
  }

  // ---------- 合成入口 ----------
  // EV.composition({ build: async ({T}) => scene, width, height, fps, duration, audio })
  // scene 需要有 render(t)。build 在字体加载完成之后运行，可以放心测量文字尺寸。
  function composition(opts) {
    const width = opts.width || 1920, height = opts.height || 1080, fps = opts.fps || 30;
    const T = timeline(window.TIMELINE);
    const stage = document.getElementById('stage');
    stage.style.width = width + 'px';
    stage.style.height = height + 'px';
    let scene = null;

    window.__composition = { width, height, fps, duration: opts.duration || T.duration };
    window.renderFrame = (t) => { if (scene) scene.render(t); };
    window.__ready = (async () => {
      const loaded = () => [...document.fonts].filter((f) => f.status === 'loaded').length;
      const before = loaded();
      scene = await opts.build({ T, stage, width, height, fps });
      // 网络字体是"用到哪个字才下载哪个字"：先把整条视频用到的所有字一次性加载好，
      // 如果期间有新字体到位，就重新排版一次，保证文字宽度按最终字体测量
      await settleFonts(stage.textContent + T.lines.map((l) => l.text || '').join(''));
      if (loaded() !== before) {
        stage.innerHTML = '';
        scene = await opts.build({ T, stage, width, height, fps });
      }
      window.__fontInfo = fontInfo();
      window.__composition.duration = opts.duration || scene.duration || T.duration;
      scene.render(0);
      return window.__composition;
    })();
    window.__lint = () => (scene && scene.lint ? scene.lint() : []);
    window.__snapshot = () => (scene && scene.snapshot ? scene.snapshot() : null);
    window.__ready.catch((e) => showError(e));
    if (!window.__RENDER__) window.__ready.then(() => player(stage, opts.audio, window.__composition));
  }

  // 加载所有声明过的字体里、这些文字用得到的分片；没网或没字体时最多等 12 秒，然后用备用字体继续
  async function settleFonts(text) {
    const fams = [...new Set([...document.fonts].map((f) => f.family.replace(/^["']|["']$/g, '')))];
    const all = Promise.all(fams.map((f) => document.fonts.load(`40px "${f}"`, text + '0123456789').catch(() => {})));
    await Promise.race([all.then(() => document.fonts.ready), new Promise((r) => setTimeout(r, 12000))]);
  }
  // 每个声明过的字体最后是否可用（本机或网络）；不可用时画面用的是备用字体
  function fontInfo() {
    const by = {};
    for (const f of document.fonts) {
      const k = f.family.replace(/^["']|["']$/g, '');
      if (/^KaTeX/.test(k)) continue;
      by[k] = by[k] || { family: k, ok: false, tried: false };
      if (f.status === 'loaded') by[k].ok = true;
      if (f.status !== 'unloaded') by[k].tried = true;
    }
    return Object.values(by).filter((x) => x.tried);
  }

  function showError(e) {
    console.error(e);
    const d = document.createElement('pre');
    d.style.cssText = 'position:fixed;left:0;top:0;right:0;background:#b00020;color:#fff;padding:16px;font:14px Menlo,monospace;z-index:99;white-space:pre-wrap';
    d.textContent = '合成出错：' + (e && e.stack || e);
    document.body.appendChild(d);
  }

  // ---------- 预览播放器（只在浏览器里直接打开时出现）----------
  function player(stage, audioSrc, comp) {
    document.body.classList.add('ev-preview');
    const bar = document.createElement('div');
    bar.className = 'ev-bar';
    bar.innerHTML = `<button data-k="play">播放</button><input type="range" min="0" step="0.01"><span class="ev-time"></span><span class="ev-hint">空格 播放/暂停 · ←/→ ±1秒 · ,/. 逐帧</span>`;
    document.body.appendChild(bar);
    const btn = bar.querySelector('button'), range = bar.querySelector('input'), label = bar.querySelector('.ev-time');
    const issues = window.__lint();
    if (issues.length) {
      const errs = issues.filter((i) => i.level === 'error').length;
      const badge = document.createElement('span');
      badge.className = 'ev-issues';
      badge.textContent = `自动检查：${errs} 个错误，${issues.length - errs} 个提醒（点击跳到第一个，详情见控制台）`;
      badge.style.cssText = `color:${errs ? '#ff6b6b' : '#f0b429'};cursor:pointer`;
      badge.onclick = () => seek(issues[0].t);
      bar.appendChild(badge);
      console.table(issues);
    }
    range.max = comp.duration;
    const audio = audioSrc ? new Audio(audioSrc) : null;
    let t = Number(new URLSearchParams(location.search).get('t')) || 0;
    let playing = false, wall0 = 0, t0 = 0;

    const fit = () => {
      const s = Math.min(window.innerWidth / comp.width, (window.innerHeight - 56) / comp.height);
      stage.style.transform = `scale(${s})`;
      stage.parentElement.style.height = comp.height * s + 'px';
      stage.parentElement.style.width = comp.width * s + 'px';
    };
    if (!stage.parentElement.classList.contains('ev-frame')) {
      const wrap = document.createElement('div');
      wrap.className = 'ev-frame';
      stage.parentElement.insertBefore(wrap, stage);
      wrap.appendChild(stage);
    }
    window.addEventListener('resize', fit); fit();

    const show = () => {
      window.renderFrame(t);
      range.value = t;
      label.textContent = `${t.toFixed(2)} / ${comp.duration.toFixed(2)} 秒`;
    };
    const play = () => {
      if (t >= comp.duration - 0.01) t = 0;
      playing = true; wall0 = performance.now(); t0 = t; btn.textContent = '暂停';
      if (audio) { audio.currentTime = t; audio.play().catch(() => {}); }
      requestAnimationFrame(tick);
    };
    const pause = () => { playing = false; btn.textContent = '播放'; if (audio) audio.pause(); };
    const seek = (x) => { t = clamp(x, 0, comp.duration); if (playing) { pause(); play(); } else show(); };
    function tick() {
      if (!playing) return;
      t = t0 + (performance.now() - wall0) / 1000;
      if (t >= comp.duration) { t = comp.duration; show(); pause(); return; }
      show();
      requestAnimationFrame(tick);
    }
    btn.onclick = () => (playing ? pause() : play());
    range.oninput = () => seek(Number(range.value));
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
      if (e.key === 'ArrowRight') seek(t + 1);
      if (e.key === 'ArrowLeft') seek(t - 1);
      if (e.key === '.') seek(t + 1 / comp.fps);
      if (e.key === ',') seek(t - 1 / comp.fps);
    });
    show();
  }

  window.EV = { clamp, lerp, ease, rng, hashStr, progress, timeline, composition };
})();
