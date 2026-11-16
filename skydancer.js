// <sky-dancer> — an embeddable skydancer widget. Drop into any page with:
//
//   <script src="https://cdn.jsdelivr.net/gh/marjanbajct2/skydancer@1/skydancer.min.js"></script>
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
    count: 1,         // how many dancers share the ground
  };

  const OFF = ['false', '0', 'no', 'off'];

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
  const OUTLINE = '#1a1a2e';

  const STYLE = `
    /* width follows height, so the embed crops to the dancer */
    :host {
      display: inline-block;
      vertical-align: middle;
      height: 400px;
      aspect-ratio: calc(${CROP_RATIO} + (var(--count, 1) - 1) * ${SPACING});
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
      /* sky, then a hard stop into the ground strip the fan sits on */
      background: linear-gradient(#3d9bff, #c9e8ff ${100 - GROUND / REF_HEIGHT * 100}%, #58b368 ${100 - GROUND / REF_HEIGHT * 100}%, #3f8f50);
    }
    canvas.night {
      background: linear-gradient(#070b1c, #1b2748 ${100 - GROUND / REF_HEIGHT * 100}%, #16301f ${100 - GROUND / REF_HEIGHT * 100}%, #0c1c12);
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
    canvas.addEventListener('pointerdown', () => {
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
      const w = cfg.wildness * (1 + punch * 2.5);
      const girth = cfg.girth * k;
      // cap so tall settings in short widgets don't poke out of the top
      const height = Math.min(H * cfg.height, H - ground() - cfg.girth) * k;

      // start half a girth up so the round end cap stays hidden behind the fan
      const body = chain(x, H - ground() - girth / 2, 0, BODY_SEGS, height / BODY_SEGS, u =>
        w * (0.05 * Math.sin(t * 2.1 - u * 5) + 0.035 * Math.sin(t * 3.7 - u * 9 + 1.3)) * (0.3 + u) + kinkBend(u, t) + wind * 0.03);

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
      const base = H - ground(), r = H * 0.75;
      const glow = ctx.createRadialGradient(x, base, g * 0.5, x, base, r);
      glow.addColorStop(0, 'rgba(255,236,170,.30)');
      glow.addColorStop(1, 'rgba(255,236,170,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - r, base - r, r * 2, r * 2);
    }

    // the sky lives in CSS but the truth is in cfg, so mirror it onto the canvas
    function syncLook() {
      canvas.classList.toggle('night', !!cfg.night);
      canvas.classList.toggle('bare', !cfg.background);
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
    }

    // ---- loop ----

    let t = 0, last = performance.now(), raf;

    function render() { draw(simulate(t)); }

    function frame(now) {
      // clamp dt so a backgrounded tab doesn't jump the animation on return
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt * Math.max(0, cfg.speed);  // a negative speed would stall the scheduling
      punch = Math.max(0, punch - dt * 0.7);
      // ResizeObserver misses a move to a screen with a different pixel density
      if ((window.devicePixelRatio || 1) !== lastDpr) resize();
      updateWind(t, dt);
      render();
      raf = requestAnimationFrame(frame);
    }

    function start() {
      cancelAnimationFrame(raf);
      if (!visible) return;
      if (reduced.matches) {
        punch = 0;  // nothing will decay it while the pose is held
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
