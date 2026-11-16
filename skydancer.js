// <sky-dancer> — an embeddable skydancer widget. Drop into any page with:
//
//   <script src="https://cdn.jsdelivr.net/gh/marjanb/skydancer@1/skydancer.min.js"></script>
//   <sky-dancer color="#ff3b30" accent="#ffd60a" face="cool" style="height: 500px"></sky-dancer>
//
// Every attribute is optional (defaults below). The widget crops to the dancer:
// 400px tall and 1.5x as wide, plus a bit per extra dancer, unless the page styles it.

(() => {
  if (customElements.get('sky-dancer')) return;  // script included twice

  const DEFAULTS = {
    color: '#ff3b30',
    accent: '#ffd60a',
    height: 0.8,      // fraction of canvas height
    girth: 64,        // px at REF_HEIGHT; scales with the widget
    armLength: 0.32,  // fraction of body height
    speed: 1,
    wildness: 1,
    wind: 1,          // 0 = calm; scales pointer wind and gusts
    face: 'happy',    // happy | surprised | cool
    hair: true,
    background: true, // false = transparent, no sky or ground
    night: false,     // dark sky, dancer lit by a spotlight
    nightColor: '#1b2748',  // the night sky at the horizon; the rest is shaded from it
    glowColor: '#ffecaa',   // the spotlight the dancer stands in at night
    glow: 1,                // how strong that spotlight is; 0 for none
    count: 1,         // how many dancers stand together
    sign: '',         // words in a speech bubble by the dancer; empty for none
    closable: true,   // a dismiss button on the balloon; false leaves it to the page
  };

  const OFF = ['false', '0', 'no', 'off'];

  function toRgb(hex) {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!m) return null;
    const d = m[1].length === 3 ? [...m[1]].map(c => c + c).join('') : m[1];
    const n = parseInt(d, 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }

  // one hex colour, dimmed by `f`, for shading the night sky out of a single value
  function shade(hex, f) {
    const c = toRgb(hex);
    return c && `rgb(${c.map(v => Math.round(v * f)).join(',')})`;
  }

  const attrName = key => key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);
  const KEYS = Object.keys(DEFAULTS);

  function parse(key, value) {
    if (value === null) return DEFAULTS[key];
    if (typeof DEFAULTS[key] === 'boolean') return !OFF.includes(value.trim().toLowerCase());
    if (typeof DEFAULTS[key] === 'number') {
      // Number, not parseFloat: height="500px" should fall back, not mean 500x the canvas
      const n = value.trim() === '' ? NaN : Number(value);
      return Number.isFinite(n) ? n : DEFAULTS[key];
    }
    return value;
  }

  const BODY_SEGS = 28;
  const ARM_SEGS = 12;
  const HAIR_SEGS = 6;
  // Everything is drawn in units of a REF_HEIGHT-tall widget and scaled to the
  // real height, so the dancer keeps its proportions at any size.
  const REF_HEIGHT = 1000;
  const GROUND = 48;      // matches the ground strip in STYLE; without a background the fan sits at the bottom edge
  // Width per unit of height: the dancer's own span, measured at the wildest
  // wind, so the embed is a box around it rather than the whole page width.
  const CROP_RATIO = 1.5;
  const MAX_COUNT = 6;
  // gap between dancers, in widget heights: they stand shoulder to shoulder,
  // so a crowd clusters instead of each one claiming a full box
  const SPACING = 0.55;
  // a crowd looks like a crowd when they aren't all the same size
  const SIZES = [1, 0.84, 0.94, 0.8, 0.9, 0.87];

  // A hand-drawn speech balloon: the oval sits up and to one side, its tail
  // trailing down to the tip at (0, h) in these coordinates.
  const BALLOON_D = 'M83.0872 0.1106C82.8615 0.1657 80.5781 0.3624 78.012 0.5331C66.0555 1.3519 63.1793 1.6902 57.6526 2.9589C48.0088 5.1309 39.4645 8.6552 32.7263 13.1957C28.2715 16.1848 25.197 18.8667 22.8568 21.8282C17.9228 27.977 15.6101 33.7305 15.6377 39.738C15.6653 45.6903 17.6678 50.4842 23.5497 56.5481C25.0189 57.8507 26.3083 59.0039 26.3958 59.1647C26.6316 59.5845 30.8484 68.922 29.9785 71.3791C27.9345 74.3446 24.3618 79.7595 24.0773 80.3007C23.7927 80.8558 23.9011 81.3707 24.3477 81.5329C24.8077 81.7083 25.1328 81.5596 26.4596 80.5576C27.894 79.4612 31.8463 76.7529 35.7176 74.2218C37.3555 73.1519 39.3995 71.8255 40.2515 71.2571C41.1043 70.7019 42.5203 69.8069 43.3273 69.3254L44.8448 68.5248L46.6456 69.2214C60.5592 74.2201 77.0263 74.9102 92.3933 72.0039C108.325 68.9855 120.761 63.853 131.165 56.0132C136.099 52.2622 140.977 46.4224 143.121 41.6268C148.507 29.6394 143.685 18.1311 129.755 9.6706C122.085 5.0164 108.353 1.4346 93.6909 0.2486C90.3632 -0.0031 84.1023 -0.0894 83.0872 0.1106ZM104.827 4.0582C119.434 7.0472 128.457 11.1682 135.253 18.022C139.087 21.8868 140.893 25.1854 141.484 29.4742C143.457 43.8025 125.467 59.3724 99.3004 65.9436C89.5997 68.369 82.9166 69.1875 73.0764 69.1875C65.0405 69.1582 61.4208 68.8195 53.6778 67.3516C48.2362 66.3609 47.8484 66.2515 47.5672 65.5654C47.4364 65.2279 47.1794 64.969 47.0347 64.9768C46.8663 64.9861 44.9825 66.2181 43.3786 67.396C42.2045 68.2439 41.0477 68.9843 40.8233 69.1084C40.3387 69.3661 39.0428 70.2308 32.5627 74.5078C29.8966 76.2537 27.6359 77.7432 27.5416 77.8111C27.4332 77.8648 28.4755 76.2685 29.8428 74.2379C31.2102 72.2207 32.7264 69.207 31.9023 67.4204C30.668 64.9303 29.8179 61.1166 29.8274 59.7808L30.1804 57.1873L27.1227 54.3016C22.6879 49.7252 20.7715 46.1735 20.2356 41.8002C19.305 34.4395 23.5633 25.8071 31.1477 19.6583C37.1259 14.8351 43.1886 11.676 52.0138 8.7144C62.8691 5.0772 75.1082 3.7229 94.1407 3.947C100.147 4.0332 101.529 4.0042 101.05 3.7215C100.091 3.1854 100.908 3.2687 104.827 4.0582Z';
  // tipX/tipY: where the tail ends, so the balloon can be hung off it
  const BALLOON = { w: 146, h: 82, cx: 81, cy: 37, rx: 60, ry: 32, tipX: 24.7, tipY: 81.6 };
  let balloonPath = null, balloonFill = null;
  const OUTLINE = '#1a1a2e';

  const STYLE = `
    /* width follows height, so the embed crops to the dancer */
    :host {
      display: inline-block;
      vertical-align: middle;
      height: 400px;
      aspect-ratio: calc(${CROP_RATIO} + (var(--count, 1) - 1) * ${SPACING});
    }
    :host([hidden]) { display: none; }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
      /* sky, then a hard stop into the ground strip the fan sits on */
      background: linear-gradient(#3d9bff, #c9e8ff ${100 - GROUND / REF_HEIGHT * 100}%, #58b368 ${100 - GROUND / REF_HEIGHT * 100}%, #3f8f50);
    }
    canvas.night {
      background: linear-gradient(var(--night-top), var(--night-sky) ${100 - GROUND / REF_HEIGHT * 100}%, var(--night-ground) ${100 - GROUND / REF_HEIGHT * 100}%, var(--night-deep));
    }
    /* last, so transparent wins over night */
    canvas.bare { background: none; }
  `;

  // Runs one dancer on a canvas, reading the live cfg object every frame.
  // Returns a function that stops it.
  function animate(canvas, cfg) {
    const ctx = canvas.getContext('2d');
    const events = new AbortController();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let ready = false, visible = false, lastDpr = 0;

    // ---- canvas sizing ----

    let W = 0, H = 0;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const scale = canvas.clientHeight / REF_HEIGHT;
      if (!scale) return;  // not laid out yet
      W = canvas.clientWidth / scale;
      H = REF_HEIGHT;
      lastDpr = dpr;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      // a still pose has no loop to redraw it after a resize
      if (ready && visible && reduced.matches) render();
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    // ---- simulation ----
    // Everything is a chain of segments. Each segment adds a small bend to the
    // running angle (0 = straight up, positive = leaning right), so travelling
    // sine waves in the bend read as air rippling up the tube.

    const count = () => Math.max(1, Math.min(MAX_COUNT, Math.round(cfg.count) || 1));

    // height of the strip below the fan's base line: the ground, or just enough to show the whole fan
    const ground = () => cfg.background ? GROUND : Math.ceil(cfg.girth * 0.25);

    function chain(x, y, a, n, segLen, bend) {
      const floor = H - ground();
      const pts = [{ x, y, a }];
      for (let i = 1; i <= n; i++) {
        a += bend(i / n, a);
        x += Math.sin(a) * segLen;
        y = Math.min(y - Math.cos(a) * segLen, floor);
        pts.push({ x, y, a });
      }
      return pts;
    }

    // A kink is the tube losing pressure and folding over; the fold travels up
    // and out of the top as the air refills.
    let kink = { start: 2, dur: 1.5, dir: 1, mag: 0.4 };

    function kinkBend(u, t) {
      const p = (t - kink.start) / kink.dur;
      if (p < 0 || p > 1) return 0;
      const centre = 0.2 + 0.8 * p;
      return kink.dir * kink.mag * cfg.wildness * Math.sin(Math.PI * p) * Math.exp(-(((u - centre) / 0.08) ** 2));
    }

    // Wind is one signed number: negative blows left, positive blows right.
    // It is the pointer (-1 far left .. 1 far right, 0 when it leaves) plus
    // random gusts, scaled by the wind setting and smoothed.
    let pointerWind = 0, wind = 0;
    let gust = { start: 4, dur: 2, force: 0.7 };

    canvas.addEventListener('pointermove', e => {
      const half = canvas.clientWidth / 2;  // offsetX is in CSS px, not drawing units
      pointerWind = Math.max(-1, Math.min(1, (e.offsetX - half) / half));
    }, { signal: events.signal });
    canvas.addEventListener('pointerleave', () => { pointerWind = 0; }, { signal: events.signal });

    // poking it knocks the air out: a kink now, and extra flailing that fades
    let punch = 0;
    let closeAt = null;  // the balloon's dismiss button, in drawing units

    canvas.addEventListener('pointerdown', e => {
      const unit = canvas.clientHeight / REF_HEIGHT;
      if (closeAt && unit && e.button === 0) {  // a right-click shouldn't dismiss it
        const dx = e.offsetX / unit - closeAt.x, dy = e.offsetY / unit - closeAt.y;
        if (dx * dx + dy * dy <= closeAt.r * closeAt.r) {
          const host = canvas.getRootNode().host;
          // the page can take the dismissal over with preventDefault
          if (host.dispatchEvent(new CustomEvent('close', { bubbles: true, cancelable: true }))) {
            host.hidden = true;  // the loop stops with it
          }
          return;
        }
      }
      if (reduced.matches) return;  // nothing would decay the punch without a loop
      punch = 1;
      kink = { start: t, dur: 0.9, dir: Math.random() < 0.5 ? -1 : 1, mag: 0.45 };
    }, { signal: events.signal });

    function updateWind(t, dt) {
      if (t > gust.start + gust.dur) {
        gust = {
          start: t + 2 + Math.random() * 5,
          dur: 1.5 + Math.random() * 2,
          force: (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.6),
        };
      }
      const p = (t - gust.start) / gust.dur;
      const gustForce = p < 0 || p > 1 ? 0 : gust.force * Math.sin(Math.PI * p);
      const target = Math.max(-1, Math.min(1, pointerWind + gustForce)) * cfg.wind;
      wind += (target - wind) * Math.min(1, dt * 4);
    }

    // Every so often the air can't keep up and the dancer sags: it dips lower
    // in the body for a moment, then fills again. `lift` is 1 at full height.
    let sag = { start: 6, dur: 1.1, depth: 0.4 };
    let lift = 1;

    function updateLift(t) {
      if (t > sag.start + sag.dur) {
        sag = {
          start: t + 5 + Math.random() * 9,
          dur: 0.9 + Math.random() * 0.8,
          depth: 0.25 + Math.random() * 0.3,
        };
      }
      const p = (t - sag.start) / sag.dur;
      lift = p < 0 || p > 1 ? 1 : 1 - sag.depth * Math.sin(Math.PI * p);  // down and straight back up
    }

    // bend that swings a loose chain (arm, hair) round to point downwind
    function blow(a) {
      return Math.abs(wind) * Math.sin(Math.sign(wind) * 1.4 - a);
    }

    function simulate(t) {
      if (t > kink.start + kink.dur) {
        kink = {
          start: t + 1 + Math.random() * 3,
          dur: 1.2 + Math.random(),
          dir: Math.random() < 0.5 ? -1 : 1,
          mag: 0.25 + Math.random() * 0.25,
        };
      }

      const n = count();
      const gap = SPACING * H;
      // smallest first, so they read as standing further back
      return Array.from({ length: n }, (_, i) =>
        dancerAt(t + i * 3.7, W / 2 + (i - (n - 1) / 2) * gap, SIZES[i % SIZES.length]))
        .sort((a, b) => a.girth - b.girth);
    }

    // one dancer, `k` times the configured size, standing at x
    function dancerAt(t, x, k) {
      // a sagging dancer loses some of its snap
      const limp = 0.55 + 0.45 * lift;
      const w = cfg.wildness * (1 + punch * 2.5) * limp;
      const girth = cfg.girth * k;
      // cap so tall settings in short widgets don't poke out of the top
      const height = Math.min(H * cfg.height, H - ground() - cfg.girth) * k;
      // The fabric is the same length whatever the pressure, so a sag bows the
      // tube over rather than shortening it: the head drops, the cloth stays.
      // It falls downwind, but still has to fall somewhere in dead calm.
      const blown = Math.tanh(wind * 4);
      const falls = blown + 0.6 * (1 - Math.abs(blown));
      // 0.042 keeps the worst case (deepest sag, full wind) inside a right
      // angle, past which the floor clamp would eat the tube's length
      const droop = (1 - lift) * 0.042 * falls;

      // start half a girth up so the round end cap stays hidden behind the fan
      const body = chain(x, H - ground() - girth / 2, 0, BODY_SEGS, height / BODY_SEGS, u =>
        w * (0.05 * Math.sin(t * 2.1 - u * 5) + 0.035 * Math.sin(t * 3.7 - u * 9 + 1.3)) * (0.3 + u) + kinkBend(u, t) * limp + wind * 0.03 + droop);

      const shoulder = body[Math.round(BODY_SEGS * 0.66)];
      const arms = [-1, 1].map(side =>
        chain(shoulder.x, shoulder.y,
          shoulder.a + side * (1.1 + w * 0.4 * Math.sin(t * 2.6 + side)),
          ARM_SEGS, height * cfg.armLength / ARM_SEGS, (v, a) =>
            w * (0.12 * Math.sin(t * 4.3 - v * 6 + side * 2) + 0.08 * Math.sin(t * 6.1 - v * 10)) * (0.4 + v) + 0.12 * blow(a)));

      const top = body[BODY_SEGS];
      const hair = !cfg.hair ? [] : [-2, -1, 0, 1, 2].map(j =>
        chain(top.x, top.y, top.a + j * 0.3, HAIR_SEGS, girth * 0.14, (v, a) =>
          w * 0.25 * Math.sin(t * 9 - v * 4 + j * 1.7) + 0.5 * blow(a)));

      return { body, arms, hair, girth, x, t };
    }

    // ---- drawing ----

    function strokeChain(pts, width, style, offset = 0) {
      ctx.beginPath();
      for (const p of pts) {
        // offset along the segment normal, used for the highlight/shade bands
        ctx.lineTo(p.x + Math.cos(p.a) * offset, p.y + Math.sin(p.a) * offset);
      }
      ctx.lineWidth = width;
      ctx.strokeStyle = style;
      ctx.stroke();
    }

    function drawTube(pts, width, color) {
      strokeChain(pts, width + 6, OUTLINE);
      strokeChain(pts, width, color);
      strokeChain(pts, width * 0.18, 'rgba(255,255,255,.3)', -width * 0.25);
      strokeChain(pts, width * 0.25, 'rgba(0,0,0,.12)', width * 0.3);
    }

    function drawFace(p, g, t) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      ctx.fillStyle = OUTLINE;

      if (cfg.face === 'cool') {
        ctx.beginPath();
        ctx.roundRect(-g * 0.4, -g * 0.22, g * 0.36, g * 0.22, g * 0.06);
        ctx.roundRect(g * 0.04, -g * 0.22, g * 0.36, g * 0.22, g * 0.06);
        ctx.rect(-g * 0.06, -g * 0.19, g * 0.12, g * 0.05);
        ctx.fill();
      } else {
        const look = Math.sin(t * 1.3) * g * 0.03;
        for (const side of [-1, 1]) {
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(side * g * 0.2, -g * 0.1, g * 0.13, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = OUTLINE;
          ctx.beginPath();
          ctx.arc(side * g * 0.2 + look, -g * 0.1, g * 0.06, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.beginPath();
      if (cfg.face === 'surprised') {
        ctx.ellipse(0, g * 0.22, g * 0.1, g * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (cfg.face === 'cool') {
        ctx.arc(g * 0.05, g * 0.1, g * 0.2, 0.2, Math.PI * 0.75);
        ctx.lineWidth = g * 0.05;
        ctx.strokeStyle = OUTLINE;
        ctx.stroke();
      } else {
        ctx.arc(0, g * 0.12, g * 0.24, 0, Math.PI);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawFan(x, g) {
      const w = g * 1.7, h = g * 0.55;
      ctx.fillStyle = '#3a3f4b';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, H - ground() - h * 0.6, w, h, 8);
      ctx.fill();
      ctx.stroke();
    }

    function drawGlow(x, g) {
      const strength = Math.max(0, Math.min(2, cfg.glow));
      if (!strength) return;
      const base = H - ground(), r = H * 0.75;
      const lit = (toRgb(cfg.glowColor) || toRgb(DEFAULTS.glowColor)).join(',');
      const glow = ctx.createRadialGradient(x, base, g * 0.5, x, base, r);
      glow.addColorStop(0, `rgba(${lit},${0.3 * strength})`);
      glow.addColorStop(1, `rgba(${lit},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(x - r, base - r, r * 2, r * 2);
    }

    // the sky lives in CSS but the truth is in cfg, so mirror it onto the canvas
    let litBy = '';

    function syncLook() {
      canvas.classList.toggle('night', !!cfg.night);
      canvas.classList.toggle('bare', !cfg.background);

      // every frame runs through here, so only touch style when the colour moves
      const base = shade(cfg.nightColor, 1) ? cfg.nightColor : DEFAULTS.nightColor;
      if (base === litBy) return;
      litBy = base;
      for (const [name, f] of [['top', 0.35], ['sky', 1], ['ground', 0.62], ['deep', 0.42]]) {
        canvas.style.setProperty(`--night-${name}`, shade(base, f));
      }
    }

    // A comic speech balloon that floats beside the head. It eases toward the
    // head rather than tracking it, so the words drift instead of thrashing;
    // only the tail keeps up with where the dancer actually is.
    let drift = null;

    function drawBubble(at, speakFrom, girth, text) {
      balloonPath ??= new Path2D(BALLOON_D);
      // the path's second subpath is its inner edge: filling that covers the
      // oval AND the hollow of the tail, which an ellipse alone would miss
      balloonFill ??= new Path2D(BALLOON_D.slice(BALLOON_D.indexOf('M', 1)));

      let size = H * 0.05;
      const fit = () => { ctx.font = `700 ${size}px system-ui, -apple-system, sans-serif`; };
      fit();

      // wrap, so a long message fills the balloon instead of stretching it
      const words = text.split(/\s+/).filter(Boolean);
      const wrap = max => {
        const lines = [];
        let line = '';
        for (const word of words) {
          const next = line ? `${line} ${word}` : word;
          if (line && ctx.measureText(next).width > max) { lines.push(line); line = word; }
          else line = next;
        }
        if (line) lines.push(line);
        return lines;
      };

      const lines = wrap(H * 0.3);
      const widest = Math.max(...lines.map(l => ctx.measureText(l).width));
      let step = size * 1.2;

      // the balloon scales to its text: an oval holds a box about sqrt(2) smaller
      let scale = Math.max(
        widest * 0.71 / BALLOON.rx,
        lines.length * step * 0.71 / BALLOON.ry,
        H * 0.0017,  // never so small it reads as a speck
      );

      // and shrinks, text and all, rather than overrunning the canvas or
      // blowing the hand-drawn outline up into a thick black band
      const cap = Math.min(W * 0.4 / BALLOON.w, H * 0.0024);
      if (scale > cap) {
        const f = cap / scale;
        scale = cap;
        size *= f;
        step = size * 1.2;
        fit();
      }

      const bw = BALLOON.w * scale, bh = BALLOON.h * scale;
      // hang the balloon so its tail ends at the dancer
      const side = speakFrom.x + girth * 0.5 + bw < W ? 1 : -1;
      const tipX = at.x + side * girth * 0.45;
      const originX = side > 0
        ? Math.max(0, Math.min(W - bw, tipX - BALLOON.tipX * scale))
        : Math.max(bw, Math.min(W, tipX + BALLOON.tipX * scale));
      const originY = Math.max(H * 0.012, at.y - BALLOON.tipY * scale);  // never flush with the top edge

      ctx.save();
      ctx.translate(originX, originY);
      ctx.scale(side * scale, scale);
      ctx.fillStyle = '#fffdf6';
      ctx.fill(balloonFill);
      ctx.fillStyle = OUTLINE;
      ctx.fill(balloonPath);
      ctx.restore();

      // text last and untransformed, so a mirrored balloon doesn't mirror the words
      ctx.fillStyle = OUTLINE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tx = originX + side * BALLOON.cx * scale, ty = originY + BALLOON.cy * scale;
      lines.forEach((line, i) => ctx.fillText(line, tx, ty + (i - (lines.length - 1) / 2) * step));

      if (!cfg.closable) return;

      // a dismiss button on the rim, always at the visual top right
      const rim = side > 0 ? 138 : 42;
      const bx = originX + side * rim * scale, by = originY + 14 * scale;
      const r = 13 * scale;
      closeAt = { x: bx, y: by, r: r * 1.4 };  // a little slack for fingers

      ctx.lineWidth = Math.max(1.5, 3 * scale);
      ctx.strokeStyle = OUTLINE;
      ctx.fillStyle = '#fffdf6';
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const arm = r * 0.42;
      ctx.beginPath();
      ctx.moveTo(bx - arm, by - arm);
      ctx.lineTo(bx + arm, by + arm);
      ctx.moveTo(bx + arm, by - arm);
      ctx.lineTo(bx - arm, by + arm);
      ctx.stroke();
    }

    function draw(dancers) {
      syncLook();
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (cfg.night) for (const d of dancers) drawGlow(d.x, d.girth);

      for (const { body, arms, hair, girth, x, t } of dancers) {
        for (const strand of hair) strokeChain(strand, girth * 0.1 + 4, OUTLINE);
        for (const strand of hair) strokeChain(strand, girth * 0.1, cfg.accent);
        for (const arm of arms) drawTube(arm, girth * 0.38, cfg.accent);
        drawTube(body, girth, cfg.color);
        drawFace(body[Math.round(BODY_SEGS * 0.87)], girth, t);
        drawFan(x, girth);
      }

      const sign = String(cfg.sign ?? '').trim();
      closeAt = null;
      if (sign && dancers.length) {
        // one balloon for the lot of them, floating over the middle of the group
        const heads = dancers.map(d => d.body[Math.round(BODY_SEGS * 0.9)]);
        const mid = {
          x: heads.reduce((sum, h) => sum + h.x, 0) / heads.length,
          y: heads.reduce((sum, h) => sum + h.y, 0) / heads.length,
        };
        if (!drift) drift = { x: mid.x, y: mid.y };
        // ~1.5s to catch up: a drift, not a chase. A still pose has no loop to ease with.
        const ease = reduced.matches ? 1 : Math.max(0, Math.min(1, frameDt * 0.7));
        drift.x += (mid.x - drift.x) * ease;
        drift.y += (mid.y - drift.y) * ease;
        drawBubble(drift, mid, Math.max(...dancers.map(d => d.girth)), sign);
      }
    }

    // ---- loop ----

    let t = 0, last = performance.now(), raf, frameDt = 0;

    function render() { draw(simulate(t)); }

    function frame(now) {
      // clamp dt so a backgrounded tab doesn't jump the animation on return
      const dt = Math.min((now - last) / 1000, 0.05);
      frameDt = dt;
      last = now;
      t += dt * Math.max(0, cfg.speed);  // a negative speed would stall the scheduling
      punch = Math.max(0, punch - dt * 0.7);
      // ResizeObserver misses a move to a screen with a different pixel density
      if ((window.devicePixelRatio || 1) !== lastDpr) resize();
      updateWind(t, dt);
      updateLift(t);
      render();
      raf = requestAnimationFrame(frame);
    }

    function start() {
      cancelAnimationFrame(raf);
      if (!visible) return;
      if (reduced.matches) {
        punch = 0;  // nothing will decay it while the pose is held
        updateLift(t);  // or the pose could be stuck mid-sag
        return render();
      }
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    // only animate while on screen, so an embed scrolled out of view costs nothing
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });
    syncLook();  // before the first frame, so the right sky is up from the start
    visibility.observe(canvas);
    reduced.addEventListener('change', start, { signal: events.signal });
    ready = true;

    return {
      // only the still pose needs poking; the loop picks changes up on its own
      redraw() { if (ready && visible && reduced.matches) render(); },
      stop() {
        visible = false;  // a late redraw() must not paint a detached canvas
        cancelAnimationFrame(raf);
        observer.disconnect();
        visibility.disconnect();
        events.abort();
      },
    };
  }

  class SkyDancer extends HTMLElement {
    static observedAttributes = KEYS.map(attrName);

    constructor() {
      super();
      this.cfg = Object.fromEntries(KEYS.map(key => [key, parse(key, this.getAttribute(attrName(key)))]));
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `<style>${STYLE}</style><canvas></canvas>`;
      this.canvas = root.querySelector('canvas');
    }

    attributeChangedCallback(name, _old, value) {
      const key = KEYS.find(k => attrName(k) === name);
      this.cfg[key] = parse(key, value);
      if (key === 'count' && this.isConnected) this.syncCount();
      this.anim?.redraw();
    }

    // the host grows sideways with the crowd; a constructor may not touch attributes
    syncCount() {
      this.style.setProperty('--count', Math.max(1, Math.min(MAX_COUNT, Math.round(this.cfg.count) || 1)));
    }

    // the page decides when a dancer is on show
    hide() { this.hidden = true; }
    show() { this.hidden = false; }

    connectedCallback() {
      this.syncCount();
      this.anim = animate(this.canvas, this.cfg);
    }

    disconnectedCallback() {
      this.anim.stop();
    }
  }

  customElements.define('sky-dancer', SkyDancer);
})();
