// media.js：图片和视频片段素材（两种风格共用）
//
// 素材先用 scripts/assets.mjs 整理：图片缩放后放在 assets/img/，视频片段抽成 30fps 的 JPEG 序列放在 assets/clips/<名字>/，
// 清单写在 assets/manifest.js（window.MEDIA_ASSETS）。视频在 t 时刻显示哪一帧完全由 t 算出，画面仍然是时间的纯函数；
// 截图前会等这一帧解码完成（EV.waitMedia）。
//
// 素材写法（src）：
//   'photo1'                                   一张图片（清单里的名字）
//   { clip: 'demo', from: 0, rate: 2, to: 10 } 视频片段：从片段的第 from 秒开始，以 rate 倍速播放，播到 to 秒停住（默认播到结尾）
//
// 白板：b.photo(src, { x, y, w, anchor, valign, rotate, caption, tape, border, focus, aspect, at, play, hud })
// 孔版：b.image(src, { x, y, w, h, fit, inks, frame, source, at, play })
(function () {
  const { clamp, ease } = window.EV;
  const assets = () => window.MEDIA_ASSETS || { images: {}, clips: {} };
  const ROOT = () => window.MEDIA_ROOT || 'assets/';

  // ---------- 帧同步：截图前等所有正在加载的图片解码完 ----------
  const pending = new Set();
  function track(p) { pending.add(p); p.finally(() => pending.delete(p)); }
  function setImg(el, url) {
    if (el._url === url) return;
    el._url = url;
    if (el instanceof HTMLImageElement) {
      el.src = url;
      track(el.decode().catch(() => {}));
    } else {
      track(new Promise((res) => { el.addEventListener('load', res, { once: true }); el.addEventListener('error', res, { once: true }); }));
      el.setAttribute('href', url);
    }
  }
  EV.waitMedia = () => (pending.size ? (async () => { while (pending.size) await Promise.all([...pending]); })() : undefined);

  // ---------- 素材：尺寸、t 时刻的地址 ----------
  function source(src) {
    const A = assets();
    if (typeof src === 'string') {
      const m = A.images[src];
      if (!m) throw new Error(`素材清单里没有图片 "${src}"。把图片放进项目的 assets/src/，再运行 node scripts/assets.mjs <项目>`);
      return { w: m.w, h: m.h, label: src, url: () => ROOT() + (m.file || `img/${src}.jpg`) };
    }
    const c = A.clips[src.clip];
    if (!c) throw new Error(`素材清单里没有视频片段 "${src.clip}"。把视频放进项目的 assets/src/，再运行 node scripts/assets.mjs <项目>`);
    const from = src.from || 0, rate = src.rate || 1, to = Math.min(src.to ?? Infinity, (c.frames - 1) / c.fps);
    return {
      w: c.w, h: c.h, label: '视频:' + src.clip, clip: true,
      // play：开始播放的时间；之前停在第一帧，播完停在最后一帧
      url: (t, play) => {
        const ct = clamp(from + Math.max(0, t - play) * rate, from, to);
        const i = Math.min(c.frames, Math.floor(ct * c.fps + 1e-6) + 1);
        return `${ROOT()}clips/${src.clip}/${String(i).padStart(4, '0')}.jpg`;
      },
      endAt: (play) => play + (to - from) / rate,
    };
  }
  // 视频还没播完就消失了
  function clipLint(it, gone, add) {
    if (it.clipEnd && gone < it.clipEnd - 0.3) add('warn', gone, it, `视频片段还没播完（要播到 ${it.clipEnd.toFixed(1)} 秒）就消失了：加快 rate、用 to 截短，或者晚一点再换走`);
  }

  // ---------- 白板：用胶带贴在白板上的照片 / 屏幕 ----------
  if (window.WB) {
    const { Item } = WB._;
    class Photo extends Item {
      constructor(board, src, o) {
        const S = source(src);
        const div = document.createElement('div');
        (o.hud ? board.hudHtml : board.html).appendChild(div);
        super(board, o, div);
        this.S = S;
        this.kind = '图片';
        this.isMedia = true;
        this.label = S.label;
        const w = o.w ?? 720, pad = o.border ?? 14, iw = w - pad * 2, ih = Math.round(iw / (o.aspect ?? S.w / S.h));
        const capH = o.caption ? (o.captionSize ?? 40) * 1.5 + 8 : 0;
        const h = ih + pad * 2 + capH;
        div.style.cssText = `position:absolute;box-sizing:border-box;width:${w}px;height:${h}px;padding:${pad}px;background:#fff;border-radius:3px;` +
          'box-shadow:0 14px 26px rgba(60,50,20,.18),0 2px 4px rgba(60,50,20,.14);transform-origin:50% 0;';
        const img = document.createElement('img');
        img.style.cssText = `display:block;width:${iw}px;height:${ih}px;object-fit:cover;object-position:${o.focus ?? '50% 50%'};background:#eee`;
        div.appendChild(img);
        this.img = img;
        if (o.caption) {
          const cap = document.createElement('div');
          cap.style.cssText = `height:${capH}px;display:flex;align-items:center;justify-content:center;font-family:${board.fonts.hand};font-size:${o.captionSize ?? 40}px;color:#1F2328;padding-top:6px;white-space:nowrap`;
          cap.textContent = o.caption;
          div.appendChild(cap);
        }
        // 胶带：两条半透明纸胶带斜贴在上边两角
        this.tapes = [];
        if (o.tape !== false) {
          for (const [side, rot] of [['left', -38], ['right', 38]]) {
            const tp = document.createElement('div');
            tp.style.cssText = `position:absolute;top:-16px;${side}:-34px;width:130px;height:40px;background:rgba(236,226,196,.82);box-shadow:0 1px 2px rgba(0,0,0,.08);transform:rotate(${rot}deg);`;
            div.appendChild(tp);
            this.tapes.push(tp);
          }
        }
        const x = o.x ?? 960, y = o.y ?? 540, anchor = o.anchor || 'left';
        const left = anchor === 'center' ? x - w / 2 : anchor === 'right' ? x - w : x;
        const top = o.valign === 'middle' ? y - h / 2 : o.valign === 'bottom' ? y - h : y;
        div.style.left = left + 'px';
        div.style.top = top + 'px';
        this.box = { x: left, y: top, w, h };
        this.imgBox = { x: left + pad, y: top + pad, w: iw, h: ih };
        this.rot = o.rotate ?? -1.2;
        this.dur = o.dur ?? 0.55;
        this.ease = ease.linear;
        board.add(this);
        this.play = o.play ?? this.end;
        if (S.clip) this.clipEnd = S.endAt(this.play);
      }
      draw(p) {
        // 贴上去：从上方略大处落下，胶带最后贴上
        const t = this.dur > 0 ? p * this.dur : 1e9;
        const land = ease.out(clamp(t / 0.4));
        this.baseTransform = `rotate(${this.rot}deg) translateY(${(1 - land) * -50}px) scale(${1 + (1 - land) * 0.05})`;
        this.node.style.transform = this.baseTransform;
        this._tf = null;
        this.node.style.opacity = clamp(land * 1.5);
        const tp = clamp((t - 0.35) / 0.2);
        this.tapes.forEach((e) => (e.style.opacity = tp));
      }
      update(t) {
        super.update(t);
        if (this._vis) setImg(this.img, this.S.url(t, this.play));
      }
      lint(add) {
        const gone = this.exits.length ? Math.min(...this.exits.map((x) => x.at)) : Infinity;
        clipLint(this, gone, add);
      }
    }
    WB.Board.prototype.photo = function (src, o = {}) { return new Photo(this, src, o); };
  }

  // ---------- 孔版印刷：用专色油墨套印的图片 ----------
  // inks：预设名，或每层一种油墨的数组 [{ ink, tone, gamma, amount, alpha, clean, bleed }]
  //   tone: 'dark'（暗部上墨，默认）| 'light'（亮部上墨，深色背景的截图用）| 'flat'（整块实色，做底色）
  //   gamma：>1 只让最深的地方上墨，<1 让中间调也上墨；amount：上墨浓度 0–1
  //   alpha：自定义上墨量（feColorMatrix 的第 4 行，如 '1.2 1.2 -2.2 0 0' = 黄色的地方上墨），把图里某种颜色单独分到一种油墨上
  const INK_PRESETS = {
    photo: [{ ink: 'base', tone: 'flat', amount: 0.9 }, { ink: 'main', tone: 'dark', gamma: 0.9 }],        // 照片：底色 + 暗部，像双色印刷
    screen: [{ ink: 'main', tone: 'dark', gamma: 0.85 }],                                                   // 浅色界面截图：只印暗部，字最清楚
    'screen-tint': [{ ink: 'base', tone: 'flat', amount: 0.45 }, { ink: 'main', tone: 'dark', gamma: 0.8 }], // 浅色界面 + 淡底色
    dark: [{ ink: 'main', tone: 'light', gamma: 0.9 }],                                                     // 深色界面（终端、深色图表）：亮的地方上墨
  };
  if (window.RISO) {
    const { Item, svgEl } = RISO._;
    class Print extends Item {
      constructor(b, src, o) {
        super(b, o);
        const S = source(src);
        this.S = S;
        this.kind = '图片';
        this.isMedia = true;
        this.label = S.label;
        this.enter = o.enter ?? 'print';
        const w = o.w ?? 800, h = o.h ?? Math.round((w * S.h) / S.w);
        const x = o.x ?? 110, y = o.y ?? 200;
        this.box = { x, y, w, h };
        const fit = o.fit ?? 'slice';
        const inks = typeof o.inks === 'string' ? INK_PRESETS[o.inks] : o.inks ?? INK_PRESETS.photo;
        if (!inks) throw new Error(`没有这种图片印法："${o.inks}"，可用：${Object.keys(INK_PRESETS).join('、')}，或者自己写油墨层数组`);
        this.imgs = [];
        inks.forEach((L) => {
          const g = this.part(L.ink, L.clean ?? L.tone !== 'flat');
          if (L.tone === 'flat') {
            const bl = L.bleed ?? 16;
            svgEl('rect', { x: x - bl, y: y - bl, width: w + 2 * bl, height: h + 2 * bl, opacity: L.amount ?? 1 }, g);
            return;
          }
          const fid = `duo${b.nextSeed()}`;
          const col = b.col(L.ink), [r, gg, bb] = [1, 3, 5].map((k) => parseInt(col.slice(k, k + 2), 16) / 255);
          const f = svgEl('filter', { id: fid, x: 0, y: 0, width: 1, height: 1, 'color-interpolation-filters': 'sRGB' }, b.defs);
          const lr = 0.2126, lg = 0.7152, lb = 0.0722, inv = L.tone === 'light';
          // 亮度 → 透明度：dark 模式 a = 1 - 亮度，light 模式 a = 亮度；颜色恒为油墨色
          const arow = L.alpha ?? (inv ? `${lr} ${lg} ${lb} 0 0` : `${-lr} ${-lg} ${-lb} 0 1`);
          svgEl('feColorMatrix', { type: 'matrix', values: `0 0 0 0 ${r}  0 0 0 0 ${gg}  0 0 0 0 ${bb}  ${arow}` }, f);
          const ct = svgEl('feComponentTransfer', {}, f);
          svgEl('feFuncA', { type: 'gamma', amplitude: L.amount ?? 1, exponent: L.gamma ?? 1, offset: 0 }, ct);
          this.imgs.push(svgEl('image', { x, y, width: w, height: h, preserveAspectRatio: fit === 'slice' ? 'xMidYMid slice' : 'xMidYMid meet', filter: `url(#${fid})` }, g));
        });
        // 细线框，像杂志里的图片边
        if (o.frame !== false) svgEl('rect', { x, y, width: w, height: h, fill: 'none', stroke: b.col(o.frameInk ?? 'main'), 'stroke-width': o.frameWidth ?? 3 }, this.part(o.frameInk ?? 'main', true));
        this.dur = o.dur ?? 0.7;
        this.finish();
        this.play = o.play ?? this.end;
        if (S.clip) this.clipEnd = S.endAt(this.play);
        // 来源 / 图注
        if (o.source) this.cap = b.label(o.source, { x, y: y + h + 12, size: o.sourceSize ?? 26, ink: 'main', at: this.start, dur: 0.4, annot: true });
      }
      draw(t) {
        const url = this.S.url(t, this.play);
        this.imgs.forEach((im) => setImg(im, url));
      }
      erase(at, dur) { super.erase(at, dur); if (this.cap) this.cap.erase(at, dur); return this; }
      lint(add) {
        const nxt = this.b.pages[this.page.idx + 1];
        const gone = Math.min(this.exits.length ? Math.min(...this.exits.map((x) => x.at)) : Infinity, nxt ? nxt.start : Infinity);
        clipLint(this, gone, add);
      }
    }
    RISO.Board.prototype.image = function (src, o = {}) { return new Print(this, src, o); };
    RISO.IMAGE_INKS = INK_PRESETS;
  }

  window.MEDIA = { source, setImg, INK_PRESETS };
})();
