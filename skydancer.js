// <sky-dancer> — an embeddable skydancer widget. Drop into any page with:
//
//   <script src="https://cdn.jsdelivr.net/gh/marjanb/skydancer@2/skydancer.min.js"></script>
//   <sky-dancer color="#ff3b30" accent="#ffd60a" face="cool" style="height: 500px"></sky-dancer>
//
// Every attribute is optional (defaults below). The widget crops to the dancer:
// 400px tall and 1.4x as wide, plus a bit per extra dancer, unless the page styles it.

(() => {
  if (customElements.get('sky-dancer')) return;  // script included twice

  const DEFAULTS = {
    color: '#ff3b30',
    accent: '#ffd60a',
    girth: 64,        // px at REF_HEIGHT; scales with the widget
    armLength: 0.32,  // fraction of body height
    speed: 1,
    wildness: 1,
    wind: 1,          // 0 = calm; scales pointer wind and gusts
    face: 'happy',    // happy | surprised | cool
    hair: true,
    count: 1,         // how many dancers stand together
    variety: false,   // give a crowd a colour and a face each, instead of one look
    sign: '',         // words in a speech bubble by the dancer; empty for none
    bubble: 'drawn',  // drawn | box | burst
    closable: true,   // a dismiss button on the balloon; false leaves it to the page
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
  // Width per unit of height: the dancer's own span, measured at the wildest
  // wind, so the embed is a box around it rather than the whole page width.
  const CROP_RATIO = 1.4;  // measured: the widest gust reaches 0.663 of the height either side
  const MAX_COUNT = 6;
  // gap between dancers, in widget heights: they stand shoulder to shoulder,
  // so a crowd clusters instead of each one claiming a full box
  const SPACING = 0.55;
  // a crowd looks like a crowd when they aren't all the same size
  const SIZES = [1, 0.84, 0.94, 0.8, 0.9, 0.87];

  // A hand-drawn speech balloon's silhouette: the oval sits up and to one
  // side, its tail trailing down to the tip at (tipX, tipY) below.
  const BALLOON_D = 'M104.827 4.058C119.434 7.047 128.457 11.168 135.253 18.022C139.087 21.887 140.893 25.185 141.484 29.474C143.457 43.803 125.467 59.372 99.3 65.944C89.6 68.369 82.917 69.188 73.076 69.188C65.04 69.158 61.421 68.82 53.678 67.352C48.236 66.361 47.848 66.252 47.567 65.565C47.436 65.228 47.179 64.969 47.035 64.977C46.866 64.986 44.982 66.218 43.379 67.396C42.205 68.244 41.048 68.984 40.823 69.108C40.339 69.366 39.043 70.231 32.563 74.508C29.897 76.254 27.636 77.743 27.542 77.811C27.433 77.865 28.475 76.268 29.843 74.238C31.21 72.221 32.726 69.207 31.902 67.42C30.668 64.93 29.818 61.117 29.827 59.781L30.18 57.187L27.123 54.302C22.688 49.725 20.771 46.173 20.236 41.8C19.305 34.44 23.563 25.807 31.148 19.658C37.126 14.835 43.189 11.676 52.014 8.714C62.869 5.077 75.108 3.723 94.141 3.947C100.147 4.033 101.529 4.004 101.05 3.721C100.091 3.185 100.908 3.269 104.827 4.058Z';
  // tipX/tipY: where the tail ends, so the balloon can be hung off it
  const BALLOON = { cx: 81, cy: 37, rx: 58, ry: 31, tipX: 27.4, tipY: 77.9 };

  // Five bubbles in one coordinate frame, so they hang the same way. `fit` is
  // how much of the oval the words may use; a spiky one has less room.
  const BUBBLES = {
    drawn: { fit: 1 },  // the hand-drawn one
    box: { fit: 0.96, r: a => (Math.abs(Math.cos(a)) ** 5 + Math.abs(Math.sin(a)) ** 5) ** -0.2 },
    burst: { fit: 0.74, spikes: 15 },
  };

  const built = {};

  // one closed contour: round the body, out to the tail's point, and back,
  // so the stroke never crosses itself
  function bubble(name) {
    const key = Object.hasOwn(BUBBLES, name) ? name : 'drawn';  // not 'constructor'
    if (built[key]) return built[key];

    const { cx, cy, rx, ry, tipX, tipY } = BALLOON;
    const spec = BUBBLES[key];
    let path, w, h;

    // where the dismiss button sits: on the outline, up and to the right
    const RIM = -0.7;
    let rim;

    if (key === 'drawn') {
      path = new Path2D(BALLOON_D);
      w = 143;
      h = 78;
      rim = { x: 132, y: 14 };
    } else {
      const toward = Math.atan2(tipY - cy, tipX - cx);
      const gap = 0.3;
      const steps = spec.spikes ? spec.spikes * 2 : 150;
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const a = toward + gap + (2 * Math.PI - 2 * gap) * (i / steps);
        const r = spec.spikes ? (i % 2 ? 1.22 : 0.86) : spec.r(a);
        pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
      }
      pts.push([tipX, tipY]);

      path = new Path2D();
      pts.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
      path.closePath();
      w = Math.max(...pts.map(q => q[0])) + 2;
      h = Math.max(...pts.map(q => q[1])) + 2;
      // a spiky outline has no single edge, so sit the button between its points
      const edge = spec.spikes ? 1 : spec.r(RIM);
      rim = { x: cx + Math.cos(RIM) * rx * edge, y: cy + Math.sin(RIM) * ry * edge };
    }

    built[key] = { path, w, h, rim, fit: spec.fit };
    return built[key];
  }
  // overshoot, so a new balloon springs past its size and settles back
  const springy = x => 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2;
  const OUTLINE = '#1a1a2e';

  // A tube is stepped across its width in flat bands, u running from -1 at the
  // left edge to 1 at the right: brightest at the lit edge, bare base colour
  // through the middle, deepest at the shaded one. Stepping it rather than
  // ramping it is what keeps the dancer reading as a drawing.
  const TONES = 5;           // bands of colour across a tube; keep it odd,
                             // so the middle one falls bare on the base colour
  const SPAN = 0.96;         // how much of the width they cover, edge to edge
  const OVERLAP = 1.06;      // a little, so no seam shows between neighbours

  // Both zones are painted in the tube's own colour rather than in white and
  // black. A wash of white or black only drains a fill towards grey; swinging
  // the hue instead -- warm into the light, cool into the shade -- and taking
  // the saturation up on the way is what makes a flat colour look lively.
  const WARM = 50;           // hue the lit edge leans toward
  const COOL = 265;          // hue the shaded side leans toward
  const RIM_LIGHT = 0.55;
  const SHADE = 0.5;

  // Whatever colour string the page handed us, the canvas resolves it. Reading
  // a 1x1 fill back is the one answer that does not depend on how the browser
  // chooses to serialise a colour -- fillStyle alone can come back as oklch()
  // or color(), which no amount of string picking parses safely.
  const swatch = Object.assign(document.createElement('canvas'), { width: 1, height: 1 })
    .getContext('2d', { willReadFrequently: true });
  const inkCache = new Map();

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // the short way round the wheel, so a red leans into orange, not into green
  const lean = (h, target, amount) =>
    (h + (((target - h + 540) % 360) - 180) * amount + 360) % 360;

  function hsl(css) {
    swatch.clearRect(0, 0, 1, 1);
    swatch.fillStyle = '#000';   // a colour the browser can't read leaves this
    swatch.fillStyle = css;
    swatch.fillRect(0, 0, 1, 1);
    const [r, g, b] = [...swatch.getImageData(0, 0, 1, 1).data].map(v => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), span = max - min;
    const l = (max + min) / 2;
    if (!span) return { h: 0, s: 0, l: l * 100 };
    const h = max === r ? (g - b) / span + (g < b ? 6 : 0)
            : max === g ? (b - r) / span + 2
            : (r - g) / span + 4;
    return { h: h * 60, s: span / (1 - Math.abs(2 * l - 1)) * 100, l: l * 100 };
  }

  const FACES = ['happy', 'surprised', 'cool'];

  // What a varied crowd differs by, beyond its turn round the hue wheel. The
  // first line is all ones, so the first dancer is exactly what the page asked
  // for and the rest fan out from it.
  const VARIETY = [
    { girth: 1,    arms: 1,    flail: 1,    hair: true  },
    { girth: 1.24, arms: 0.78, flail: 0.84, hair: true  },
    { girth: 0.82, arms: 1.26, flail: 1.2,  hair: false },
    { girth: 1.12, arms: 0.9,  flail: 1.06, hair: true  },
    { girth: 0.88, arms: 1.14, flail: 0.9,  hair: false },
    { girth: 1.3,  arms: 1.04, flail: 1.22, hair: true  },
  ];
  const FATTEST = Math.max(...VARIETY.map(v => v.girth));
  const spinCache = new Map();

  // the same colour walked round the wheel, for telling a crowd apart
  function spin(css, deg) {
    if (!deg) return css;
    const key = `${css}|${deg}`;
    let out = spinCache.get(key);
    if (!out) {
      const { h, s, l } = hsl(css);
      out = `hsl(${(h + deg) % 360} ${s}% ${l}%)`;
      if (spinCache.size > 64) spinCache.clear();
      spinCache.set(key, out);
    }
    return out;
  }

  // the two inks a tube of this colour is lit and shaded with
  function inks(css) {
    let ink = inkCache.get(css);
    if (!ink) {
      const { h, s, l } = hsl(css);
      // A grey has no hue of its own to lean, so it takes the light's outright
      // -- warm into the lit edge, cool into the shade, which is what keeps a
      // grey tube from going flat without turning it into a colour.
      const hue = (target, amount) => s < 5 ? target : lean(h, target, amount);
      // the lit edge never comes out darker than the tube, nor the shade lighter
      const rim = `${hue(WARM, 0.3)} ${clamp(s * 1.2 + 18, 0, 100)}%`
                + ` ${Math.min(100, l + 15)}%`;
      const shade = `${hue(COOL, 0.28)} ${clamp(s * 1.15 + 10, 0, 100)}%`
                  + ` ${Math.max(0, l - 24)}%`;
      // One ink per band. How far a band sits from the middle is how strongly
      // its ink is laid on, so the steps walk out from the base colour to the
      // lit edge one way and to the shaded one the other.
      ink = [];
      for (let i = 0; i < TONES; i++) {
        const p = (2 * i + 1) / TONES - 1;   // -1 at the lit edge, 1 at the shaded
        const a = Math.abs(p);
        ink.push(a < 1e-6 ? null
          : `hsl(${p < 0 ? rim : shade} / ${((p < 0 ? RIM_LIGHT : SHADE) * a).toFixed(3)})`);
      }
      // a colour picker being dragged hands us a new colour every frame, so
      // the cache is there to spare the repeats, not to remember every shade
      if (inkCache.size > 64) inkCache.clear();
      inkCache.set(css, ink);
    }
    return ink;
  }

  // The shadow gathering at the foot of the picture is contact shadow, not
  // tube shading, so it keeps its own number -- a flat illustration still
  // wants its subject planted on the ground.
  const GROUNDED = 0.14;

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
      /* no backdrop of its own: it stands on whatever the page puts behind it */
    }
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

    // the thickest tube on stage, as a multiple of the configured girth: the
    // room left for a fan and the margin a tube is held inside both key off it
    const fattest = () => (cfg.variety && count() > 1 ? FATTEST : 1);

    // height of the strip below the fan's base line: the ground, or just enough to show the whole fan
    const ground = () => Math.ceil(cfg.girth * fattest() * 0.25);

    // The tube is held inside the canvas the way the ground already holds its
    // feet: a wild gust presses it against the edge instead of running past it,
    // so nothing is ever cut off, whatever the settings.
    function chain(x, y, a, n, segLen, bend) {
      const floor = H - ground();
      const edge = cfg.girth * fattest() * 0.62 + 8;  // half the tube, plus its outline
      // The lid takes no allowance for the fattest tube. The tallest dancer's
      // head already sits just under it, and widening it there would press the
      // crown down onto the hair instead of letting it stand up.
      const lid = cfg.girth * 0.62 + 8;
      const pts = [{ x, y, a }];
      for (let i = 1; i <= n; i++) {
        a += bend(i / n, a);
        x = Math.min(W - edge, Math.max(edge, x + Math.sin(a) * segLen));
        y = Math.min(floor, Math.max(lid, y - Math.cos(a) * segLen));
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
    let sag = { start: 6, dur: 1.1, depth: 0.4, side: 1 };
    let lift = 1;

    function updateLift(t) {
      if (t > sag.start + sag.dur) {
        sag = {
          start: t + 5 + Math.random() * 9,
          dur: 0.9 + Math.random() * 0.8,
          depth: 0.25 + Math.random() * 0.3,
          side: Math.random() < 0.5 ? -1 : 1,  // in calm it falls either way
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
      return Array.from({ length: n }, (_, i) => {
        const look = lookOf(i, n);
        const x = W / 2 + (i - (n - 1) / 2) * gap;
        return { ...dancerAt(t + i * 3.7, x, SIZES[i % SIZES.length], look), look };
      }).sort((a, b) => a.girth - b.girth);
    }

    // One crowd, one palette: the colours the page chose stay on the first
    // dancer and the rest are walked evenly round the wheel, so a line-up
    // reads as a set rather than as several unrelated widgets. Faces rotate
    // from the chosen one for the same reason.
    function lookOf(i, n) {
      const plain = { color: cfg.color, accent: cfg.accent, face: cfg.face,
                      girth: 1, arms: 1, flail: 1, hair: cfg.hair };
      if (!cfg.variety || n < 2) return plain;
      const mix = VARIETY[i % VARIETY.length];
      const turn = i * 360 / n;
      const first = Math.max(0, FACES.indexOf(cfg.face));
      return {
        color: spin(cfg.color, turn),
        accent: spin(cfg.accent, turn),
        face: FACES[(first + i) % FACES.length],
        girth: mix.girth,
        arms: mix.arms,
        flail: mix.flail,
        // a page that asked for no hair gets none, however mixed the crowd
        hair: cfg.hair && mix.hair,
      };
    }

    // one dancer, `k` times the configured size, standing at x
    function dancerAt(t, x, k, look) {
      // a sagging dancer loses some of its snap
      const limp = 0.55 + 0.45 * lift;
      const w = cfg.wildness * (1 + punch * 2.5) * limp * look.flail;
      const girth = cfg.girth * look.girth * k;
      // cap so tall settings in short widgets don't poke out of the top
      // as tall as the box allows, less room for its rounded head and hair
      const height = (H - ground() - cfg.girth * look.girth * 1.6) * k;
      // The fabric is the same length whatever the pressure, so a sag bows the
      // tube over rather than shortening it: the head drops, the cloth stays.
      // It falls downwind, but still has to fall somewhere in dead calm.
      // one direction, never a tug-of-war: downwind, or the sag's own way in calm
      const blown = Math.abs(Math.tanh(wind * 4));
      const dir = Math.abs(wind) < 0.02 ? sag.side : Math.sign(wind);
      const falls = dir * (blown + 0.6 * (1 - blown));
      // 0.042 keeps the worst case (deepest sag, full wind) inside a right
      // angle, past which the floor clamp would eat the tube's length
      const droop = (1 - lift) * 0.042 * falls;

      // start half a girth up so the round end cap stays hidden behind the fan
      const body = chain(x, H - ground() - girth / 2, 0, BODY_SEGS, height / BODY_SEGS, u =>
        w * (0.05 * Math.sin(t * 2.1 - u * 5) + 0.035 * Math.sin(t * 3.7 - u * 9 + 1.3)) * (0.3 + u) + kinkBend(u, t) * limp * look.flail + wind * 0.03 + droop);

      const shoulder = body[Math.round(BODY_SEGS * 0.66)];
      const arms = [-1, 1].map(side =>
        chain(shoulder.x, shoulder.y,
          shoulder.a + side * (1.1 + w * 0.4 * Math.sin(t * 2.6 + side)),
          ARM_SEGS, height * cfg.armLength * look.arms / ARM_SEGS, (v, a) =>
            w * (0.12 * Math.sin(t * 4.3 - v * 6 + side * 2) + 0.08 * Math.sin(t * 6.1 - v * 10)) * (0.4 + v) + 0.12 * blow(a)));

      const top = body[BODY_SEGS];
      const hair = !look.hair ? [] : [-2, -1, 0, 1, 2].map(j =>
        chain(top.x, top.y, top.a + j * 0.3, HAIR_SEGS, girth * 0.14, (v, a) =>
          w * 0.25 * Math.sin(t * 9 - v * 4 + j * 1.7) + 0.5 * blow(a)));

      return { body, arms, hair, girth, x, t };
    }

    // ---- drawing ----

    function strokeChain(pts, width, style, offset = 0, reach = 0) {
      ctx.beginPath();
      for (const p of pts) {
        // offset along the segment normal, used for the highlight/shade bands
        ctx.lineTo(p.x + Math.cos(p.a) * offset, p.y + Math.sin(p.a) * offset);
      }
      if (reach) {
        // Carry a band on past the last point so its own round cap lands on
        // the tube's domed end. Without this the dome keeps the flat base
        // colour and the shading stops at a visible straight edge.
        const end = pts[pts.length - 1];
        ctx.lineTo(end.x + Math.cos(end.a) * offset + Math.sin(end.a) * reach,
                   end.y + Math.sin(end.a) * offset - Math.cos(end.a) * reach);
      }
      ctx.lineWidth = width;
      ctx.strokeStyle = style;
      ctx.stroke();
    }

    function drawTube(pts, width, color) {
      strokeChain(pts, width + 6, OUTLINE);
      strokeChain(pts, width, color);

      // The bands tile the width: each covers about its own slice, overlapping
      // its neighbour only enough to leave no seam, so the steps stay crisp. Tiling SPAN rather than the
      // whole width keeps the outermost band's edge just inside the
      // silhouette, which matters most on a thin tube.
      const thickness = SPAN * width / TONES * OVERLAP;
      // how far a band at that offset has to run past the end to reach the
      // dome, inset enough that its round cap stays inside the silhouette
      const dome = width * 0.5 - thickness * 0.35;
      const reach = offset =>
        Math.max(0, Math.sqrt(Math.max(0, dome * dome - offset * offset)) - thickness * 0.5);

      const tones = inks(color);
      for (let i = 0; i < TONES; i++) {
        const ink = tones[i];
        if (!ink) continue;  // the base colour already stands for the middle
        const offset = ((2 * i + 1) / TONES - 1) * SPAN * width * 0.5;
        strokeChain(pts, thickness, ink, offset, reach(offset));
      }

      // less light reaches the bottom of the tube, which plants it on the ground
      strokeChain(pts, width, depthShade);
    }

    function drawFace(p, g, t, face) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      ctx.fillStyle = OUTLINE;

      if (face === 'cool') {
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
      if (face === 'surprised') {
        ctx.ellipse(0, g * 0.22, g * 0.1, g * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (face === 'cool') {
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

    // A comic speech balloon that floats beside the head. It eases toward the
    // head rather than tracking it, so the words drift instead of thrashing.
    // The tail follows the same eased position, so it lags a little when the
    // balloon is gliding across to the dancer's other side.
    let drift = null;
    let said = null, saidAt = 0;  // for the little pop when the words change
    let sided = 1, placedX = null;  // which side the balloon sits on, and where it got to

    function drawBubble(at, speakFrom, girth, text) {
      const shape = bubble(cfg.bubble);

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
        widest * 0.71 / (BALLOON.rx * shape.fit),
        lines.length * step * 0.71 / (BALLOON.ry * shape.fit),
        H * 0.0017,  // never so small it reads as a speck
      );

      // and shrinks, text and all, rather than overrunning the canvas or
      // blowing the hand-drawn outline up into a thick black band
      const cap = Math.min(W * 0.4 / shape.w, H * 0.0024);
      if (scale > cap) {
        const f = cap / scale;
        scale = cap;
        size *= f;
        step = size * 1.2;
        fit();
      }

      const bw = (shape.w + 2.5) * scale, bh = shape.h * scale;  // + the stroke

      // It keeps the side it is on until that side truly runs out of room, so
      // a dancer wandering across doesn't make it hop back and forth.
      const fitsRight = speakFrom.x + girth * 0.5 + bw < W;
      const fitsLeft = speakFrom.x - girth * 0.5 - bw > 0;
      if (sided > 0 && !fitsRight && fitsLeft) sided = -1;
      else if (sided < 0 && !fitsLeft && fitsRight) sided = 1;
      const side = sided;

      // hang the balloon so its tail ends at the dancer
      const tipX = at.x + side * girth * 0.45;
      const room = bw * 1.05;  // the balloon swells as it springs in and breathes
      const wanted = side > 0
        ? Math.max(0, Math.min(W - room, tipX - BALLOON.tipX * scale))
        : Math.max(room, Math.min(W, tipX + BALLOON.tipX * scale));

      // Glide the balloon's own middle, not the corner the shape hangs off:
      // that corner swaps sides with the mirror, and easing it would still
      // leave the balloon itself jumping the width of its oval.
      const middle = wanted + side * BALLOON.cx * scale;
      if (placedX === null || reduced.matches) placedX = middle;
      else placedX += (middle - placedX) * Math.max(0, Math.min(1, frameDt * 6));
      const originX = placedX - side * BALLOON.cx * scale;
      // never flush with the top edge, bob and swell included
      const originY = Math.max(H * 0.012 + 8 * scale, at.y - BALLOON.tipY * scale);

      // whimsy: it bobs, tilts and breathes, and springs in when the words
      // change. A still pose gets none of it: no loop, no implied movement.
      if (text !== said) { said = text; saidAt = t; }
      const still = reduced.matches;
      const pop = still ? 1 : Math.min(1, (t - saidAt) / 0.4);
      const swell = still ? 1
        : (pop < 1 ? 0.5 + 0.5 * springy(pop) : 1) * (1 + Math.sin(t * 2.3) * 0.02);
      const bob = still ? 0 : Math.sin(t * 1.7) * 5 * scale;
      const tilt = still ? 0 : Math.sin(t * 1.1 + 1) * 0.05;

      // everything hangs off the oval's middle, so the lot bobs together
      const ax = originX + side * BALLOON.cx * scale;
      const ay = originY + BALLOON.cy * scale + bob;

      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(tilt);
      ctx.scale(swell, swell);

      ctx.save();
      ctx.scale(side * scale, scale);
      ctx.translate(-BALLOON.cx, -BALLOON.cy);
      // the path is the balloon's silhouette, so the outline is a stroke:
      // one even thickness all the way round, tail included
      ctx.fillStyle = '#fffdf6';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 3.5;
      ctx.fill(shape.path);
      ctx.stroke(shape.path);
      ctx.restore();

      // the words ride along, but never mirrored with the balloon
      ctx.fillStyle = OUTLINE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      lines.forEach((line, i) => ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * step));

      if (cfg.closable) {
        // a dismiss button on the rim, always at the visual top right
        const bx = side * (shape.rim.x - BALLOON.cx) * scale;
        const by = (shape.rim.y - BALLOON.cy) * scale;
        const r = 13 * scale;

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

        // the button moved with the balloon, so the hit region has to follow it
        const cos = Math.cos(tilt), sin = Math.sin(tilt);
        closeAt = {
          x: ax + (bx * cos - by * sin) * swell,
          y: ay + (bx * sin + by * cos) * swell,
          r: r * swell * 1.4,  // a little slack for fingers
        };
      }

      ctx.restore();
    }

    function draw(dancers) {
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // one gradient for every tube this frame: it lives in canvas space, so
      // it darkens whatever part of a tube happens to hang low
      const floor = H - ground();
      depthShade = ctx.createLinearGradient(0, floor, 0, floor - H * 0.55);
      depthShade.addColorStop(0, `rgba(0,0,0,${GROUNDED})`);
      depthShade.addColorStop(1, 'rgba(0,0,0,0)');

      for (const { body, arms, hair, girth, x, t, look } of dancers) {
        for (const strand of hair) strokeChain(strand, girth * 0.1 + 4, OUTLINE);
        for (const strand of hair) strokeChain(strand, girth * 0.1, look.accent);
        for (const arm of arms) drawTube(arm, girth * 0.38, look.accent);
        drawTube(body, girth, look.color);
        drawFace(body[Math.round(BODY_SEGS * 0.87)], girth, t, look.face);
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

    let t = 0, last = performance.now(), raf, frameDt = 0, depthShade;

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
