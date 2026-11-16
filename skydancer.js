// <sky-dancer> — an embeddable skydancer widget. Drop into any page with:
//
//   <script src="https://cdn.jsdelivr.net/gh/marjanbajct2/skydancer@1/skydancer.min.js"></script>
//   <sky-dancer color="#ff3b30" accent="#ffd60a" face="cool" style="height: 500px"></sky-dancer>
//
// Every attribute is optional (defaults below). The widget is 400px tall and
// full width unless the page styles it otherwise.

(() => {
  if (customElements.get('sky-dancer')) return;  // script included twice

  const DEFAULTS = {
    color: '#ff3b30',
    accent: '#ffd60a',
    height: 0.68,     // fraction of canvas height
    girth: 64,        // px
    armLength: 0.32,  // fraction of body height
    speed: 1,
    wildness: 1,
    wind: 1,          // 0 = calm; scales pointer wind and gusts
    face: 'happy',    // happy | surprised | cool
    hair: true,
  };

  const attrName = key => key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);
  const KEYS = Object.keys(DEFAULTS);

  function parse(key, value) {
    if (value === null) return DEFAULTS[key];
    if (typeof DEFAULTS[key] === 'boolean') return value !== 'false';
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
  const GROUND = 48;      // matches the ground strip in STYLE
  const OUTLINE = '#1a1a2e';

  const STYLE = `
    :host { display: block; height: 400px; }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
      /* sky, then a hard stop into the ground strip the fan sits on */
      background: linear-gradient(#3d9bff, #c9e8ff calc(100% - 48px), #58b368 calc(100% - 48px), #3f8f50);
    }
  `;

  // Runs one dancer on a canvas, reading the live cfg object every frame.
  // Returns a function that stops it.
  function animate(canvas, cfg) {
    const ctx = canvas.getContext('2d');
    const events = new AbortController();

    // ---- canvas sizing ----

    let W = 0, H = 0;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    // ---- simulation ----
    // Everything is a chain of segments. Each segment adds a small bend to the
    // running angle (0 = straight up, positive = leaning right), so travelling
    // sine waves in the bend read as air rippling up the tube.

    function chain(x, y, a, n, segLen, bend) {
      const floor = H - GROUND;
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
      pointerWind = Math.max(-1, Math.min(1, (e.offsetX - W / 2) / (W / 2)));
    }, { signal: events.signal });
    canvas.addEventListener('pointerleave', () => { pointerWind = 0; }, { signal: events.signal });

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

      const w = cfg.wildness;
      const height = H * cfg.height;

      // start half a girth up so the round end cap stays hidden behind the fan
      const body = chain(W / 2, H - GROUND - cfg.girth / 2, 0, BODY_SEGS, height / BODY_SEGS, u =>
        w * (0.05 * Math.sin(t * 2.1 - u * 5) + 0.035 * Math.sin(t * 3.7 - u * 9 + 1.3)) * (0.3 + u) + kinkBend(u, t) + wind * 0.03);

      const shoulder = body[Math.round(BODY_SEGS * 0.66)];
      const arms = [-1, 1].map(side =>
        chain(shoulder.x, shoulder.y,
          shoulder.a + side * (1.1 + w * 0.4 * Math.sin(t * 2.6 + side)),
          ARM_SEGS, height * cfg.armLength / ARM_SEGS, (v, a) =>
            w * (0.12 * Math.sin(t * 4.3 - v * 6 + side * 2) + 0.08 * Math.sin(t * 6.1 - v * 10)) * (0.4 + v) + 0.12 * blow(a)));

      const top = body[BODY_SEGS];
      const hair = !cfg.hair ? [] : [-2, -1, 0, 1, 2].map(k =>
        chain(top.x, top.y, top.a + k * 0.3, HAIR_SEGS, cfg.girth * 0.14, (v, a) =>
          w * 0.25 * Math.sin(t * 9 - v * 4 + k * 1.7) + 0.5 * blow(a)));

      return { body, arms, hair };
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

    function drawFan(g) {
      const w = g * 1.7, h = g * 0.55;
      ctx.fillStyle = '#3a3f4b';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(W / 2 - w / 2, H - GROUND - h * 0.6, w, h, 8);
      ctx.fill();
      ctx.stroke();
    }

    function draw({ body, arms, hair }, t) {
      const g = cfg.girth;
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const strand of hair) strokeChain(strand, g * 0.1 + 4, OUTLINE);
      for (const strand of hair) strokeChain(strand, g * 0.1, cfg.accent);
      for (const arm of arms) drawTube(arm, g * 0.38, cfg.accent);
      drawTube(body, g, cfg.color);
      drawFace(body[Math.round(BODY_SEGS * 0.87)], g, t);
      drawFan(g);
    }

    // ---- loop ----

    let t = 0, last = performance.now(), raf;

    function frame(now) {
      // clamp dt so a backgrounded tab doesn't jump the animation on return
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt * cfg.speed;
      updateWind(t, dt);
      draw(simulate(t), t);
      raf = requestAnimationFrame(frame);
    }

    // only animate while on screen, so an embed scrolled out of view costs nothing
    const visibility = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf);
      if (entry.isIntersecting) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    });
    visibility.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      visibility.disconnect();
      events.abort();
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
    }

    connectedCallback() {
      this.stop = animate(this.canvas, this.cfg);
    }

    disconnectedCallback() {
      this.stop();
    }
  }

  customElements.define('sky-dancer', SkyDancer);
})();
