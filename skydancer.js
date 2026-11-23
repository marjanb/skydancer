// <sky-dancer> — an embeddable skydancer widget. Drop into any page with:
//
//   <script src="https://cdn.jsdelivr.net/gh/marjanb/skydancer@2/skydancer.min.js"></script>
//   <sky-dancer color="#ff3b30" accent="#ffd60a" face="cool" style="height: 500px"></sky-dancer>
//
// Every attribute is optional (defaults below). The widget crops to the dancer:
// 400px tall and 1.4x as wide, plus a bit per extra dancer, unless the page styles it.

(() => {
  // There is nothing to register away from a browser. An import while a page
  // is rendered on the server should do nothing rather than throw, so a
  // framework can pull the widget in beside the markup that uses it.
  if (typeof customElements === 'undefined') return;
  if (customElements.get('sky-dancer')) return;  // script included twice

  const DEFAULTS = {
    color: '#ff3b30',
    accent: '#ffd60a',
    girth: 64,        // px at REF_HEIGHT; scales with the widget
    armLength: 0.32,  // fraction of body height
    speed: 1,
    wildness: 1,
    wind: 1,          // 0 = calm; scales pointer wind and gusts
    face: 'happy',    // happy | surprised | cool | wink | joy | sleepy | angry
    hair: true,
    count: 1,         // how many dancers stand together
    variety: false,   // give a crowd a colour and a face each, instead of one look
    paused: false,    // hold the pose; the dancer stays on show, it just stops
    pattern: 'none',  // markings on the body: none | rings | spiral
    print: '',        // words printed down the body, the way a real one carries them
    placard: '',      // words on a board staked at the dancer's feet, which hold still
    shout: '',        // what it blurts when poked, floating beside the dancer
    href: '',         // where a click on the dancer leads; empty for nowhere
    sign: '',         // words in a speech bubble by the dancer; empty for none
    bubble: 'drawn',  // drawn | box | burst
    hours: '',        // when it is worth dancing, as `9-17`; empty for always
    // The two bits of wording a reader meets rather than sees. They are in
    // English because something has to be; a page in another language can
    // say them its own way.
    linkLabel: '',    // what the link is called when the sign says nothing
    pokeLabel: '',    // what the poke button is called
  };

  const OFF = ['false', '0', 'no', 'off'];

  // `9-17` is open from nine until five, and `22-6` runs through midnight.
  // Outside them the fan is off and the dancer lies flat. Anything that is not
  // two numbers is no hours at all, so a typo leaves a dancer that works.
  function openNow(spec, at = new Date()) {
    const m = /^\s*(\d{1,2})\s*-\s*(\d{1,2})\s*$/.exec(String(spec ?? ''));
    if (!m) return true;
    const [from, to] = [+m[1], +m[2]];
    if (from > 24 || to > 24 || from === to) return true;
    // the hour it is now, with the minutes, so it closes on the hour and not
    // at some point during it
    const h = at.getHours() + at.getMinutes() / 60;
    return from < to ? h >= from && h < to : h >= from || h < to;
  }

  // What a number may be, when being outside it is worse than useless. A
  // dancer's settings can arrive from a page's own templating or from a
  // shared link, so they are not always written by someone watching the
  // result: a negative girth asked the canvas for a negative radius and threw
  // on every frame, and a girth of 100000 left nothing on screen at all.
  // Outside these a dancer is still a dancer, just a silly one.
  const LIMITS = {
    girth: [1, 400],
    armLength: [0, 3],
    speed: [0, 20],
    wildness: [0, 10],
    wind: [0, 10],
  };

  const attrName = key => key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);
  const KEYS = Object.keys(DEFAULTS);

  function parse(key, value) {
    if (value === null) return DEFAULTS[key];
    if (typeof DEFAULTS[key] === 'boolean') return !OFF.includes(value.trim().toLowerCase());
    if (typeof DEFAULTS[key] === 'number') {
      // Number, not parseFloat: height="500px" should fall back, not mean 500x the canvas
      const n = value.trim() === '' ? NaN : Number(value);
      if (!Number.isFinite(n)) return DEFAULTS[key];
      const bounds = LIMITS[key];
      return bounds ? Math.min(bounds[1], Math.max(bounds[0], n)) : n;
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

  // Three bubbles in one coordinate frame, so they hang the same way. `fit` is
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

    if (key === 'drawn') {
      path = new Path2D(BALLOON_D);
      w = 143;
      h = 78;
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
    }

    built[key] = { path, w, h, fit: spec.fit };
    return built[key];
  }
  // overshoot, so a new balloon springs past its size and settles back
  const springy = x => 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2;
  const OUTLINE = '#1a1a2e';

  // Printed words get a hand-lettered face rather than the interface one: it
  // is a sign painted on cloth, not a label. All of these ship with an OS, so
  // an embed pulls nothing down. It ends on `sans-serif` rather than
  // `cursive`: `cursive` always resolves to something, and on a machine with
  // none of these that something can be a thin script no one can read at this
  // size, where a plain sans is merely plainer.
  const PRINT_FACE = `'Skia', 'Comic Sans MS', 'Trebuchet MS', sans-serif`;

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
  const RIM_LIGHT = 0.38;
  const SHADE = 0.34;

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

  // Whether the canvas can make sense of a colour at all. Setting fillStyle to
  // something unreadable leaves the old value, so two different starting
  // points that end up agreeing means it parsed.
  function readable(css) {
    swatch.fillStyle = '#000';
    swatch.fillStyle = css;
    const first = swatch.fillStyle;
    swatch.fillStyle = '#fff';
    swatch.fillStyle = css;
    return first === swatch.fillStyle ? first : null;
  }

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

  // How much of a round cap the head keeps. A line cap can only be a
  // semicircle, so a flatter top than that has to be cut and re-edged.
  const FLAT = 0.55;

  // A face is a pairing of eyes and a mouth, so the two can be mixed freely.
  const LOOKS = {
    happy:     { eyes: 'round',  mouth: 'smile' },
    surprised: { eyes: 'round',  mouth: 'gape' },
    cool:      { eyes: 'shades', mouth: 'smirk' },
    wink:      { eyes: 'wink',   mouth: 'smile' },
    joy:       { eyes: 'arches', mouth: 'grin' },
    sleepy:    { eyes: 'shut',   mouth: 'small' },
    angry:     { eyes: 'brows',  mouth: 'frown' },
  };
  const FACES = Object.keys(LOOKS);

  // Words divided by a pipe are several phrases; a doubled pipe is a literal
  // one. The sign works through them in turn, a poke picks one at a time.
  // Each phrase is a run of anything but a pipe, with `||` allowed inside it,
  // so a doubled pipe never has to be stood in for and put back.
  function phrasesOf(raw) {
    return (String(raw ?? '').match(/(?:\|\||[^|])+/g) ?? [])
      .map(part => part.replaceAll('||', '|').trim())
      .filter(Boolean);
  }

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
      position: relative;   /* the words and the link hang off this */
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
    /* Where a click on the dancer leads. The canvas takes the click, but a
       pointer is not the only way in, so the destination is a real link that
       can be tabbed to and read out. */
    .go {
      position: absolute;
      left: 0;
      bottom: 0;
      font: inherit;
      color: inherit;
    }
    .go:not(:focus-visible) {
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    canvas.leads { cursor: pointer; }

    /* Poking is a pointer gesture, and a pointer is not the only way in. This
       is the same control as a poke, reachable by tab; a button answers Enter
       and Space by itself, so there is no key handling to get wrong. */
    .poke {
      position: absolute;
      left: 0;
      top: 0;
      font: inherit;
      color: inherit;
    }
    .poke:focus-visible {
      padding: 4px 10px;
      font-size: 13px;
      color: #fffdf6;
      background: ${OUTLINE};
      border: 0;
      border-radius: 999px;
      cursor: pointer;
    }
    .poke:not(:focus-visible) {
      width: 1px;
      height: 1px;
      padding: 0;
      border: 0;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }

    /* The sign's words, for anything that reads rather than looks: a screen
       reader, the page's own find, a translator. The canvas only paints them. */
    .said {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  `;

  // Runs one dancer on a canvas, reading the live cfg object every frame.
  // Returns a function that stops it.
  function animate(canvas, cfg) {
    const ctx = canvas.getContext('2d');
    const events = new AbortController();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');

    // A held pose has no loop running, so anything that wants the picture
    // brought up to date has to paint it itself. The page can ask for that
    // with `paused`, and the reader can ask for it through their system.
    const held = () => reduced.matches || cfg.paused;
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
      if (ready && visible && held()) render();
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    // A 2D context can be taken away -- a driver reset, or a phone short of
    // memory while the tab is in the background. Nothing says so: the dancer
    // simply stops being painted, and a held pose never paints again at all.
    // Cancelling the loss is what asks for it back, and a context comes back
    // with its size and its scale cleared, which is exactly what a resize
    // puts right.
    canvas.addEventListener('contextlost', e => e.preventDefault(), { signal: events.signal });
    canvas.addEventListener('contextrestored', resize, { signal: events.signal });

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
    // It is the pointer (-1 far left .. 1 far right, 0 when it leaves), the
    // page going by underneath, and random gusts, scaled by the wind setting
    // and smoothed.
    let pointerWind = 0, wind = 0;
    let gust = { start: 4, dur: 2, force: 0.7 };
    // The page scrolling past is wind too: the faster it goes, the harder the
    // dancer is blown along with it. Sampled per frame from the scroll
    // position rather than from scroll events, so a smooth scroll, a flick and
    // a jump all read the same, and standing still reads as nothing at all.
    const SCROLL_FULL = 3300;  // px a second for all the wind there is
    let scrolledAt = null;     // where the page was last frame
    let scrollWind = 0;

    // where the pointer is, in drawing units, for the eyes to find
    let gaze = null;

    canvas.addEventListener('pointermove', e => {
      const half = canvas.clientWidth / 2;  // offsetX is in CSS px, not drawing units
      pointerWind = Math.max(-1, Math.min(1, (e.offsetX - half) / half));
      const unit = canvas.clientHeight / REF_HEIGHT;
      gaze = unit ? { x: e.offsetX / unit, y: e.offsetY / unit } : null;
    }, { signal: events.signal });
    // Watched on the widget rather than the canvas: the link lies over the
    // canvas, so moving onto it would read as leaving, and moving from it
    // straight out would not read as leaving at all. The host's own bounds
    // are what actually matter.
    canvas.getRootNode().host.addEventListener('pointerleave', () => {
      pointerWind = 0;
      gaze = null;   // nothing to watch, so the eyes go back to wandering
    }, { signal: events.signal });

    // poking it knocks the air out: a kink now, and extra flailing that fades
    let punch = 0;

    const root = canvas.getRootNode();
    const saidText = root.querySelector('.said');
    const blurted = root.querySelector('.blurted');
    const leadsTo = root.querySelector('.go');
    const pokeButton = root.querySelector('.poke');

    // What the page can hear. A dancer is mostly decoration, but a poke is a
    // reader doing something and an arrival is a moment the page cannot see
    // for itself. Both bubble and cross a shadow boundary, so one listener on
    // the section a dancer sits in catches it however deeply it is nested.
    function tell(name, detail = null) {
      root.host.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }

    // Somewhere a link may actually go. `javascript:` is the one that matters:
    // the destination can reach this widget from a page's own templating or
    // from the customizer's shareable link, so it is not always written by
    // someone already able to run script here.
    const GOES = ['http:', 'https:', 'mailto:', 'tel:'];

    function destination() {
      const raw = String(cfg.href ?? '').trim();
      if (!raw) return '';
      try {
        const url = new URL(raw, location.href);   // so a relative path works
        return GOES.includes(url.protocol) ? url.href : '';
      } catch {
        return '';
      }
    }

    // A dancer with somewhere to go says so: the canvas takes the click, and
    // the link carries the destination for a keyboard or a screen reader.
    let aimed = null;

    function aimLink() {
      const href = destination();
      if (href === aimed) return;   // this runs every frame
      aimed = href;
      leadsTo.hidden = !href;
      canvas.classList.toggle('leads', !!href);
      if (!href) return;
      leadsTo.href = href;
    }

    // the words on the sign are what the link is pointing at, when there are
    // any; written only when they change, like the hidden copy of them
    let labelled = null;

    function labelLink(sign) {
      const label = sign || cfg.linkLabel.trim() || 'Find out more';
      if (!aimed || label === labelled) return;
      labelled = label;
      leadsTo.textContent = label;
    }

    // The destination is worked out again rather than read off the element, so
    // nothing can be slipped into it between the frame that set it and this.
    // The link opens a tab by itself; the modifiers still ride along so that
    // shift-click and the rest behave as they would anywhere, and the middle
    // button is heard too.
    function follow(e) {
      if (!destination()) return;
      leadsTo.dispatchEvent(new MouseEvent('click', {
        bubbles: true, cancelable: true, view: window, button: e.button,
        ctrlKey: e.ctrlKey, metaKey: e.metaKey,
        shiftKey: e.shiftKey, altKey: e.altKey,
      }));
    }

    canvas.addEventListener('click', follow, { signal: events.signal });
    canvas.addEventListener('auxclick', e => { if (e.button === 1) follow(e); },
                            { signal: events.signal });

    // A poke makes it blurt, and the word pops up beside it rather than going
    // into the balloon: the balloon is what the dancer is there to say, and a
    // poke should not talk over it. Each one lands somewhere else, so a few in
    // a row read as a flurry rather than one word flickering.
    const SHOUTS = 5;         // most on screen at once
    const SHOUT_LIFE = 1.15;  // seconds each one lasts
    let shouts = [];
    // Centred on the chest rather than the head: the balloon hangs by the head,
    // and a word thrown up there lands on top of what the dancer is saying.
    let lastChest = null;
    let lastTurn = 0;
    let lastShout = -1;   // which word the last poke took

    function burst(byReader) {
      // without a running loop nothing would decay the punch, so it would be
      // saved up and spent the moment the dancer came back into view
      if (held() || !visible) return;
      // A poke takes one of them, never the one it took last: a flurry of
      // pokes should be a flurry of different words.
      const choices = phrasesOf(cfg.shout);
      let said = '';   // what it blurted, which the page is told along with the poke
      if (choices.length && lastChest) {
        if (choices.length > 1) {
          let pick = lastShout;
          while (pick === lastShout) pick = Math.floor(Math.random() * choices.length);
          lastShout = pick;
        } else lastShout = 0;
        said = choices[lastShout];
        // at least a third of the way round from the last one, so two in a
        // row never land on top of each other
        lastTurn += Math.PI * (0.7 + Math.random() * 0.6);
        const reach = cfg.girth * (1.5 + Math.random());
        shouts.push({
          words: said,
          x: lastChest.x + Math.cos(lastTurn) * reach,
          y: lastChest.y + Math.sin(lastTurn) * reach * 0.7,
          at: wall,
          tilt: (Math.random() - 0.5) * 0.45,
        });
        if (shouts.length > SHOUTS) shouts.shift();
        blurted.textContent = said;
      }
      punch = 1;
      kink = { start: t, dur: 0.9, dir: Math.random() < 0.5 ? -1 : 1, mag: 0.45 };
      if (byReader) tell('poke', { shout: said });
    }

    // A reader's poke is worth telling the page about. The page's own cheer()
    // is not: it already knows that it asked.
    const poked = () => burst(true);
    canvas.addEventListener('pointerdown', poked, { signal: events.signal });
    pokeButton.addEventListener('click', poked, { signal: events.signal });

    // Only offered when a poke has something to say, and when a poke would do
    // anything at all. A dancer is decoration, and a decorative one that is
    // merely wiggled has nothing to report to a reader who cannot see it -- so
    // it stays out of the page's tab order rather than costing a stop per
    // embed for a flourish. A held pose swallows a poke, so it offers none.
    let offering = null, offeredAs = null;
    function offerPoke() {
      const worth = phrasesOf(cfg.shout).length > 0 && !held();
      const label = cfg.pokeLabel.trim() || 'Poke the dancer';
      // the wording is watched as well as the offer, or renaming the button
      // while it is already showing would not reach it
      if (worth === offering && label === offeredAs) return;
      offering = worth;
      offeredAs = label;
      pokeButton.hidden = !worth;
      if (worth) pokeButton.textContent = label;
    }

    // A page can theme the dancer in CSS rather than in attributes, which is
    // how it follows a light and a dark scheme without the embed being
    // rewritten. An attribute still wins: naming a colour outright is the
    // louder ask. Read on the events that can change it, never per frame --
    // getComputedStyle in the loop would force a style recalc every tick.
    const scheme = matchMedia('(prefers-color-scheme: dark)');
    let themed = { color: null, accent: null };

    function readTheme() {
      const host = root.host;
      const style = getComputedStyle(host);
      const pick = key => {
        if (host.hasAttribute(key)) return null;   // the tag said so outright
        const set = style.getPropertyValue(`--sky-dancer-${key}`).trim();
        return set ? readable(set) : null;
      };
      themed = { color: pick('color'), accent: pick('accent') };
    }

    // The sign works through its phrases in turn. Splitting is cached because
    // this is read every frame; a still pose has no clock to turn the page, so
    // it holds whichever phrase was up when the clock stopped.
    const DWELL = 4;   // seconds a phrase stays up
    let split = { raw: null, phrases: [] };

    function phraseNow(t) {
      const raw = String(cfg.sign ?? '');
      if (raw !== split.raw) split = { raw, phrases: phrasesOf(raw) };
      const { phrases } = split;
      if (phrases.length < 2) return phrases[0] ?? '';
      return phrases[Math.floor(Math.max(0, t) / DWELL) % phrases.length];
    }

    // The words only reach the DOM when they change: this runs every frame.
    let announced = null;
    function announce(text) {
      if (text === announced) return;
      announced = text;
      saidText.textContent = text;
      saidText.hidden = !text;
    }

    function updateWind(t, dt, since = dt) {
      if (t > gust.start + gust.dur) {
        gust = {
          start: t + 2 + Math.random() * 5,
          dur: 1.5 + Math.random() * 2,
          force: (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.6),
        };
      }
      const p = (t - gust.start) / gust.dur;
      const gustForce = p < 0 || p > 1 ? 0 : gust.force * Math.sin(Math.PI * p);
      // Down the page blows it right, up blows it left. The reading is taken
      // once a frame and eased, so it builds while the scroll runs and falls
      // away on its own when it stops.
      const now = window.scrollY;
      // per second rather than per frame: the same flick of the page has to
      // blow the same whether the screen runs at 60Hz or 120
      // Measured against the time that really passed, not the clamped step:
      // the pixels moved cover the whole of a slow frame, so dividing by the
      // clamp would read a janky frame as a gale.
      const moved = scrolledAt === null || since <= 0 ? 0 : (now - scrolledAt) / since;
      scrolledAt = now;
      const blown = Math.max(-1, Math.min(1, moved / SCROLL_FULL));
      // rises with the scroll at once, falls back slowly: a gust, not a switch
      scrollWind += (blown - scrollWind) * Math.min(1, dt * (Math.abs(blown) > Math.abs(scrollWind) ? 18 : 3));
      const together = pointerWind + gustForce + scrollWind;
      const target = Math.max(-1, Math.min(1, together)) * cfg.wind;
      wind += (target - wind) * Math.min(1, dt * 4);
    }

    // Every so often the air can't keep up and the dancer sags: it dips lower
    // in the body for a moment, then fills again. `lift` is 1 at full height.
    let sag = { start: 6, dur: 1.1, depth: 0.4, side: 1 };
    let lift = 1;
    // `slump` is the sag on its own and `filled` is how much air is in the
    // tube. A sag bows the cloth over without shortening it; air really does
    // change the length. `lift` is the two together, for how slack it all is.
    let slump = 1, filled = 1;

    // An arrival is the air going in: the tube fills from flat on the way in.
    // Null when nothing is filling or emptying, which is nearly always.
    const FILL = 0.9, EMPTY = 0.55;   // seconds
    let air = null;                   // { from, to, start, dur }
    // Where a finished breath left it, and so also what the page last asked
    // for: an arrival fills to this rather than to full, so a dancer
    // deliberately let down does not stand up again the next time it scrolls
    // into view.
    let resting = 1;

    function breathe(from, to, dur) {
      air = { from, to, start: wall, dur };
    }

    // An arrival takes the best part of a second to fill, and a page watching
    // for the dancer to be up cannot see the air going in. The telling waits
    // for the stack to empty, since a breath lands in the middle of drawing a
    // frame and a listener that poked the dancer back would reach it there.
    let arriving = false;
    function landed() {
      if (!arriving) return;
      arriving = false;
      // Not if the dancer has gone in the meantime: stop() drops the flag, so
      // a widget torn down in the same tick says nothing on its way out.
      queueMicrotask(() => { if (visible) tell('arrive'); });
    }

    // how far the air has got, 0 flat to 1 full
    function pressure() {
      if (!air) return resting;   // not 1: a dancer let down stays down
      const p = (wall - air.start) / air.dur;
      if (p >= 1) {
        resting = air.to;
        air = null;
        landed();
        return resting;
      }
      // eased, so it leaves and arrives without a jolt
      const e = p < 0 ? 0 : 0.5 - Math.cos(Math.PI * p) / 2;
      return air.from + (air.to - air.from) * e;
    }

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
      slump = p < 0 || p > 1 ? 1 : 1 - sag.depth * Math.sin(Math.PI * p);  // down and straight back up
      filled = pressure();
      lift = slump * filled;   // a half-filled tube is a slack one as well
    }

    // Whatever is part way in or out finishes at once. A held pose has no
    // frames to breathe with, so without this a dancer paused mid-fill would
    // stay half up.
    function settleAir() {
      if (!air) return;
      resting = filled = air.to;
      air = null;
      landed();
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
      const base = themed.color ?? cfg.color;
      const accent = themed.accent ?? cfg.accent;
      const plain = { color: base, accent, face: cfg.face,
                      girth: 1, arms: 1, flail: 1, hair: cfg.hair };
      if (!cfg.variety || n < 2) return plain;
      const mix = VARIETY[i % VARIETY.length];
      const turn = i * 360 / n;
      const first = Math.max(0, FACES.indexOf(cfg.face));
      return {
        color: spin(base, turn),
        accent: spin(accent, turn),
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
      const height = (H - ground() - cfg.girth * look.girth * 1.6) * k * filled;
      // A sag is a loss of pressure, not of cloth, so it bows the tube over
      // rather than shortening it: the head drops, the fabric stays. Air
      // going in or out is the other thing, and that does change the length.
      // It falls downwind, but still has to fall somewhere in dead calm.
      // one direction, never a tug-of-war: downwind, or the sag's own way in calm
      const blown = Math.abs(Math.tanh(wind * 4));
      const dir = Math.abs(wind) < 0.02 ? sag.side : Math.sign(wind);
      const falls = dir * (blown + 0.6 * (1 - blown));
      // 0.042 keeps the worst case (deepest sag, full wind) inside a right
      // angle, past which the floor clamp would eat the tube's length
      const droop = (1 - slump) * 0.042 * falls;

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

    // `grow` runs the line on past both ends, along the chain's own direction.
    // Only the bands use it, and only while clipped to the tube, so what runs
    // past is trimmed back to the silhouette instead of showing.
    function strokeChain(pts, width, style, offset = 0, grow = 0) {
      const side = p => [p.x + Math.cos(p.a) * offset, p.y + Math.sin(p.a) * offset];
      ctx.beginPath();
      if (grow) {
        const [x, y] = side(pts[0]);
        ctx.lineTo(x - Math.sin(pts[0].a) * grow, y + Math.cos(pts[0].a) * grow);
      }
      for (const p of pts) {
        // offset along the segment normal, used for the highlight/shade bands
        const [x, y] = side(p);
        ctx.lineTo(x, y);
      }
      if (grow) {
        const end = pts[pts.length - 1];
        const [x, y] = side(end);
        ctx.lineTo(x + Math.sin(end.a) * grow, y - Math.cos(end.a) * grow);
      }
      ctx.lineWidth = width;
      ctx.strokeStyle = style;
      ctx.stroke();
    }

    // The tube's own silhouette as a fillable path: along one side, round the
    // far cap, back along the other, round the near one. Clipping the bands to
    // it is what lets them run out to the domed ends instead of stopping short
    // in rounded tips of their own.
    // `flat` squashes the far cap toward the tube, to match a hand-drawn dome
    function tubePath(pts, width, flat = 1) {
      const r = width / 2;
      const first = pts[0], last = pts[pts.length - 1];
      const path = new Path2D();
      pts.forEach((p, i) => {
        const x = p.x + Math.cos(p.a) * r, y = p.y + Math.sin(p.a) * r;
        if (i) path.lineTo(x, y); else path.moveTo(x, y);
      });
      path.ellipse(last.x, last.y, r, r * flat, last.a, 0, -Math.PI, true);
      for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i];
        path.lineTo(p.x - Math.cos(p.a) * r, p.y - Math.sin(p.a) * r);
      }
      path.arc(first.x, first.y, r, first.a + Math.PI, first.a, true);
      path.closePath();
      return path;
    }

    // The flattened cap, painted rather than clipped. Clipping it meant a
    // half-plane in front of the tip, which swallowed whatever part of a
    // bowed-over body curled past that plane, outline and all.
    function fillDome(at, rx, ry, style) {
      ctx.beginPath();
      ctx.ellipse(at.x, at.y, rx, ry, at.a, 0, -Math.PI, true);
      ctx.closePath();
      ctx.fillStyle = style;
      ctx.fill();
    }

    // Words printed down the tube, the way a real one carries SALE or OPEN.
    // Each letter sits at its own point on the chain and turns with it, so the
    // line of text bends and ripples with the dancer instead of riding on top
    // as a flat label. Drawn under the shading, so it catches the same light.
    const PRINT_TOP = 0.74;    // clear of the face
    const PRINT_FOOT = 0.26;   // clear of the fan, and of a placard staked in it

    function printDown(pts, width, text, ink) {
      const n = pts.length - 1;
      const first = Math.round(n * PRINT_TOP), last = Math.round(n * PRINT_FOOT);
      const span = first - last;
      if (span < 1) return;
      // One letter per point on the chain and no more: past that they would
      // land on the same place and stack up, so the rest is simply dropped.
      const letters = [...text].filter(ch => ch !== '\n').slice(0, span + 1);
      if (!letters.length) return;

      ctx.fillStyle = ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // The letters are spread over the whole run rather than packed from the
      // top, so a short word reads down the tube instead of sitting on its
      // shoulders. Their size follows the gap between them, capped by how
      // much tube there is to print across.
      const gaps = Math.max(1, letters.length - 1);
      const step = letters.length > 1 ? span / gaps : 0;
      const segLen = pts[1] ? dist(pts[0], pts[1]) : width;
      const size = Math.min(width * 0.62, Math.max(step, 1) * segLen * 0.85);
      // heavier than the placard and the balloon: those are read close up,
      // while this has a moving, shaded tube under it to carry
      ctx.font = `900 ${size}px ${PRINT_FACE}`;

      letters.forEach((letter, i) => {
        const p = pts[Math.round(first - i * step)];
        if (!p) return;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.fillText(letter, 0, 0);
        ctx.restore();
      });
    }

    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    // Fabric markings, drawn on the bare colour so the shading goes over them
    // and they catch the same light the tube does. Clipped by the caller.
    //   rings   bands round the tube, the way a windsock is sewn
    //   spiral  one stripe winding up it, like a barber's pole
    function drawPattern(pts, width, kind, ink) {
      const n = pts.length - 1;
      ctx.strokeStyle = ink;

      if (kind === 'rings') {
        // Butt caps: a round one would add half the tube's width at each end
        // of a band, and the rings would swell into blobs that meet.
        ctx.lineCap = 'butt';
        ctx.lineWidth = width;
        for (let i = 3; i < n; i += 4) {
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
          ctx.stroke();
        }
        ctx.lineCap = 'round';
        return;
      }

      // A stripe wound round the tube: the angle climbs with the tube and the
      // offset is its sine, so it sweeps across. Only the half turned toward
      // us is drawn -- the rest is round the back -- so the path breaks every
      // time it goes behind, which is what makes it read as wound rather than
      // as a zigzag painted on the front.
      if (kind !== 'spiral') return;   // an unknown marking is no marking
      const TURNS = 3.2;
      ctx.lineWidth = width * 0.26;
      ctx.beginPath();
      let drawing = false;
      for (let i = 0; i <= n; i++) {
        const turn = (i / n) * TURNS * Math.PI * 2;
        const p = pts[i];
        if (Math.cos(turn) <= 0) { drawing = false; continue; }   // round the back
        const off = Math.sin(turn) * width * 0.5;
        const x = p.x + Math.cos(p.a) * off, y = p.y + Math.sin(p.a) * off;
        if (drawing) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        drawing = true;
      }
      ctx.stroke();
    }

    function drawTube(pts, width, color, flat = 1, pattern = 'none', ink = color, print = '') {
      const end = pts[pts.length - 1];
      const r = width / 2;
      const trimming = flat < 1;
      // A butt cap squares off both ends, so the foot would stop short of
      // where its round cap used to reach and the fan would no longer hide
      // the join. The outline is the wider of the two strokes and reached
      // furthest, so the foot is carried down by its half-width.
      const first = pts[0];
      const foot = r + 3;
      const stroke = trimming
        ? [{ x: first.x - Math.sin(first.a) * foot,
             y: first.y + Math.cos(first.a) * foot, a: first.a }, ...pts]
        : pts;
      // A round line cap can only be a semicircle, so a flatter end is drawn
      // instead of stroked: the tube stops square and the dome goes on by
      // hand, outline first and fill over it. The far end is the only one that
      // shows -- the near one stands behind the fan.
      if (trimming) ctx.lineCap = 'butt';
      strokeChain(stroke, width + 6, OUTLINE);
      strokeChain(stroke, width, color);
      if (trimming) {
        ctx.lineCap = 'round';
        fillDome(end, r + 3, r * flat + 3, OUTLINE);
        fillDome(end, r, r * flat, color);
      }

      // The bands tile the width: each covers about its own slice, overlapping
      // its neighbour only enough to leave no seam, so the steps stay crisp.
      // Tiling SPAN rather than the whole width keeps the outermost band's
      // edge just inside the silhouette, which matters most on a thin tube.
      const thickness = SPAN * width / TONES * OVERLAP;

      const tones = inks(color);
      // clipped to the tube, so each band can overrun both ends and still be
      // cut off exactly at the edge
      ctx.save();
      ctx.clip(tubePath(pts, width, flat));
      if (pattern !== 'none') drawPattern(pts, width, pattern, ink);
      if (print) printDown(pts, width, print, ink);
      for (let i = 0; i < TONES; i++) {
        const ink = tones[i];
        if (!ink) continue;  // the base colour already stands for the middle
        const offset = ((2 * i + 1) / TONES - 1) * SPAN * width * 0.5;
        strokeChain(pts, thickness, ink, offset, width);
      }
      ctx.restore();

      // less light reaches the bottom of the tube, which plants it on the ground
      if (trimming) {
        ctx.lineCap = 'butt';
        strokeChain(stroke, width, depthShade);
        ctx.lineCap = 'round';
        fillDome(end, r, r * flat, depthShade);
      } else {
        strokeChain(pts, width, depthShade);
      }
    }

    // An eye sits this far either side of the middle, on this line.
    const EYE_X = 0.2, EYE_Y = -0.1;

    // a lid drawn as a curve: `bulge` up for a smiling eye, down for a shut one
    function lid(g, side, bulge) {
      const r = g * 0.12;
      ctx.beginPath();
      ctx.arc(side * g * EYE_X, g * EYE_Y - bulge * r * 0.5, r,
              bulge > 0 ? Math.PI * 1.25 : Math.PI * 0.25,
              bulge > 0 ? Math.PI * 1.75 : Math.PI * 0.75);
      ctx.lineWidth = g * 0.05;
      ctx.strokeStyle = OUTLINE;
      ctx.stroke();
    }

    function openEye(g, side, look) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(side * g * EYE_X, g * EYE_Y, g * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = OUTLINE;
      ctx.beginPath();
      ctx.arc(side * g * EYE_X + look.x, g * EYE_Y + look.y, g * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }

    // Which way the pupils sit. With a pointer on the canvas they follow it,
    // which is the whole of looking alive; with none they wander. The head
    // turns with the tube, so the direction is taken into its own frame.
    function eyesOn(head, g, t) {
      const wander = { x: Math.sin(t * 1.3) * g * 0.03, y: 0 };
      if (!gaze) return wander;
      const dx = gaze.x - head.x, dy = gaze.y - head.y;
      const away = Math.hypot(dx, dy);
      if (away < 1) return wander;   // right on the eyes, so nowhere to look
      const reach = g * 0.05;
      return {
        x: (dx * Math.cos(head.a) + dy * Math.sin(head.a)) / away * reach,
        y: (-dx * Math.sin(head.a) + dy * Math.cos(head.a)) / away * reach,
      };
    }

    function drawEyes(g, t, kind, look) {
      if (kind === 'shades') {
        ctx.fillStyle = OUTLINE;
        ctx.beginPath();
        ctx.roundRect(-g * 0.4, -g * 0.22, g * 0.36, g * 0.22, g * 0.06);
        ctx.roundRect(g * 0.04, -g * 0.22, g * 0.36, g * 0.22, g * 0.06);
        ctx.rect(-g * 0.06, -g * 0.19, g * 0.12, g * 0.05);
        ctx.fill();
        return;
      }
      for (const side of [-1, 1]) {
        if (kind === 'arches') lid(g, side, 1);
        else if (kind === 'shut') lid(g, side, -1);
        else if (kind === 'wink' && side > 0) lid(g, side, 1);
        else openEye(g, side, look);
      }
      if (kind === 'brows') {
        // two lines slanting in toward the nose, which is the whole of a scowl
        ctx.lineWidth = g * 0.055;
        ctx.strokeStyle = OUTLINE;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(side * g * 0.34, -g * 0.32);
          ctx.lineTo(side * g * 0.08, -g * 0.2);
          ctx.stroke();
        }
      }
    }

    function drawMouth(g, kind) {
      ctx.fillStyle = OUTLINE;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = g * 0.05;
      ctx.beginPath();
      if (kind === 'gape') {
        ctx.ellipse(0, g * 0.22, g * 0.1, g * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === 'smirk') {
        ctx.arc(g * 0.05, g * 0.1, g * 0.2, 0.2, Math.PI * 0.75);
        ctx.stroke();
      } else if (kind === 'grin') {
        ctx.arc(0, g * 0.08, g * 0.3, 0, Math.PI);
        ctx.fill();
      } else if (kind === 'small') {
        ctx.ellipse(0, g * 0.2, g * 0.07, g * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === 'frown') {
        ctx.arc(0, g * 0.34, g * 0.2, Math.PI, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.arc(0, g * 0.12, g * 0.24, 0, Math.PI);
        ctx.fill();
      }
    }

    function drawFace(p, g, t, face) {
      const { eyes, mouth } = LOOKS[face] || LOOKS.happy;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      drawEyes(g, t, eyes, eyesOn(p, g, t));
      drawMouth(g, mouth);
      ctx.restore();
    }

    // The blurted words: they rise a little, swell in and fade out. Drawn over
    // everything, with a pale halo behind them so they read against the dancer
    // as easily as against the page.
    function drawShouts(girth) {
      if (!shouts.length) {
        // cleared once they have gone, or the same word blurted again would
        // not read as a change and would go unsaid
        if (blurted.textContent) blurted.textContent = '';
        return;
      }
      shouts = shouts.filter(s => wall - s.at < SHOUT_LIFE);
      const size = Math.max(girth * 0.45, H * 0.032);
      ctx.save();
      ctx.font = `800 ${size}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      for (const s of shouts) {
        const life = (wall - s.at) / SHOUT_LIFE;
        const swell = 0.7 + 0.3 * Math.min(1, life / 0.22) + life * 0.1;
        // up fast, then gone: in over the first fifth, out over the rest
        const fade = life < 0.2 ? life / 0.2 : 1 - (life - 0.2) / 0.8;
        ctx.save();
        ctx.globalAlpha = Math.max(0, fade);
        ctx.translate(s.x, s.y - life * girth * 0.8);
        ctx.rotate(s.tilt);
        ctx.scale(swell, swell);
        ctx.lineWidth = size * 0.3;
        ctx.strokeStyle = '#fffdf6';
        ctx.strokeText(s.words, 0, 0);
        ctx.fillStyle = OUTLINE;
        ctx.fillText(s.words, 0, 0);
        ctx.restore();
      }
      ctx.restore();
    }

    // A board on a stake at the dancer's feet. Everything else here moves, so
    // this is the one place words can sit and be read: it does not bob, lean
    // or drift with the tube above it.
    function drawPlacard(x, girth, text) {
      const words = text.trim();
      if (!words) return;
      // Not a floor, despite the look of it: the width cap below shrinks the
      // size again when there is a lot to say. It is a starting size, and the
      // second term is what a thin dancer's board is read at -- below a girth
      // of about 86 it is the one that wins.
      let size = Math.max(girth * 0.42, H * 0.036);
      const face = () => { ctx.font = `700 ${size}px system-ui, -apple-system, sans-serif`; };
      face();
      // narrow enough to stay on the canvas, however much it has to say
      const room = W * 0.86;
      const pad = () => size * 0.7;
      let w = ctx.measureText(words).width + pad() * 2;
      if (w > room) { size *= room / w; face(); w = ctx.measureText(words).width + pad() * 2; }
      const h = size + pad();
      // Staked in the dancer's own base and leaning out of it, rather than
      // standing on a foot of its own: the fan is the only thing on this
      // canvas that is actually planted in the ground.
      const LEAN = 0.26;                 // radians out of upright
      const root = { x, y: H - ground() - girth * 0.12 };
      const reach = girth * 1.3 + h * 0.5;
      const tip = {
        x: root.x + Math.sin(LEAN) * reach,
        y: root.y - Math.cos(LEAN) * reach,
      };

      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = OUTLINE;
      ctx.beginPath();
      ctx.moveTo(root.x, root.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();

      // the board rides the post, so it leans with it
      ctx.translate(tip.x, tip.y);
      ctx.rotate(LEAN);
      ctx.fillStyle = '#fffdf6';
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h, w, h, size * 0.28);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = OUTLINE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(words, 0, -h / 2);
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
    // for the little pop and the typing when the words change. Both are
    // arrivals rather than part of the dance, so they go by the wall clock:
    // at speed="0" the dance stands still, but words still have to appear.
    let said = null, saidAt = 0;
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
      if (placedX === null || held()) placedX = middle;
      else placedX += (middle - placedX) * Math.max(0, Math.min(1, frameDt * 6));
      const originX = placedX - side * BALLOON.cx * scale;
      // never flush with the top edge, bob and swell included
      const originY = Math.max(H * 0.012 + 8 * scale, at.y - BALLOON.tipY * scale);

      // whimsy: it bobs, tilts and breathes, and springs in when the words
      // change. A still pose gets none of it: no loop, no implied movement.
      if (text !== said) { said = text; saidAt = wall; }
      const still = held();
      const pop = still ? 1 : Math.min(1, (wall - saidAt) / 0.4);
      // the words arrive a little slower than the balloon does
      const saying = still ? 1 : Math.min(1, (wall - saidAt) / 0.55);
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
      // Typed out rather than appearing whole, so a rotating sign reads as
      // being said. The wrap is worked out on the finished words, so nothing
      // reflows as it arrives; only how much of it shows changes.
      let left = still ? Infinity : Math.ceil(saying * text.length);
      lines.forEach((line, i) => {
        if (left <= 0) return;
        const shown = left >= line.length ? line : line.slice(0, left);
        left -= line.length + 1;   // the space the wrap ate counts as a beat
        ctx.fillText(shown, 0, (i - (lines.length - 1) / 2) * step);
      });

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
        drawTube(body, girth, look.color, FLAT, cfg.pattern, look.accent,
                 String(cfg.print ?? '').trim());
        // the last drawn is the front-most, since they are sorted by girth
        lastChest = body[Math.round(BODY_SEGS * 0.55)];   // for blurted words
        drawFace(body[Math.round(BODY_SEGS * 0.87)], girth, t, look.face);
        drawFan(x, girth);
      }

      // The fattest of them sets the scale for everything drawn over the
      // group, so the board, the balloon and a blurted word agree.
      const widest = Math.max(...dancers.map(d => d.girth));

      // one board for the lot of them, in front of their feet
      drawPlacard(W / 2, widest, String(cfg.placard ?? ''));

      const sign = phraseNow(t);
      if (sign && dancers.length) {
        // one balloon for the lot of them, floating over the middle of the group
        const heads = dancers.map(d => d.body[Math.round(BODY_SEGS * 0.9)]);
        const mid = {
          x: heads.reduce((sum, h) => sum + h.x, 0) / heads.length,
          y: heads.reduce((sum, h) => sum + h.y, 0) / heads.length,
        };
        if (!drift) drift = { x: mid.x, y: mid.y };
        // ~1.5s to catch up: a drift, not a chase. A still pose has no loop to ease with.
        const ease = held() ? 1 : Math.max(0, Math.min(1, frameDt * 0.7));
        drift.x += (mid.x - drift.x) * ease;
        drift.y += (mid.y - drift.y) * ease;
        drawBubble(drift, mid, widest, sign);
      }
      // what the canvas just painted, said again for anything that can't see it
      announce(sign);
      aimLink();
      labelLink(sign);
      offerPoke();
      // last of all, so a blurted word lands over everything else
      drawShouts(widest);
    }

    // ---- loop ----

    // `t` is the dance's own clock and runs at the configured speed; `wall` is
    // plain seconds. Filling with air is a transition rather than part of the
    // dance, so it goes by the wall: at speed="0" the dance stands still, but
    // a dancer still has to finish arriving.
    let t = 0, wall = 0, last = performance.now(), raf, frameDt = 0, depthShade;

    function render() { draw(simulate(t)); }

    function frame(now) {
      // clamp dt so a backgrounded tab doesn't jump the animation on return
      const since = (now - last) / 1000;
      const dt = Math.min(since, 0.05);
      frameDt = dt;
      last = now;
      t += dt * Math.max(0, cfg.speed);  // a negative speed would stall the scheduling
      wall += dt;
      punch = Math.max(0, punch - dt * 0.7);
      // ResizeObserver misses a move to a screen with a different pixel density
      if ((window.devicePixelRatio || 1) !== lastDpr) resize();
      updateWind(t, dt, since);
      updateLift(t);
      render();
      raf = requestAnimationFrame(frame);
    }

    function start() {
      cancelAnimationFrame(raf);
      // Whatever stopped the loop -- going off screen, a held pose -- the page
      // went on scrolling without it. Measuring from where it last looked
      // would make all of that one gust on the frame it comes back.
      scrolledAt = null;
      if (!visible) return;
      // Held either because the page asked or because the reader did. Either
      // way there is no loop, so the pose is drawn once and left.
      if (held()) {
        punch = 0;  // nothing will decay it while the pose is held
        shouts = [];    // nor any clock to fade a blurted word out with
        blurted.textContent = '';   // which is what would have cleared this
        settleAir();    // no frames to breathe with, so finish it now
        updateLift(t);  // or the pose could be stuck mid-sag
        return render();
      }
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    // only animate while on screen, so an embed scrolled out of view costs nothing
    const visibility = new IntersectionObserver(([entry]) => {
      const coming = entry.isIntersecting && !visible;
      visible = entry.isIntersecting;
      // A held pose has no clock to fill by, so it just stands there. One
      // already part way in or out carries on from where it stopped: starting
      // over would snap it flat.
      if (coming && !held()) {
        // Air already moving is this arrival, whichever way it is going.
        // Otherwise it fills -- unless it is meant to be lying flat, which is
        // nothing to wait for and was a breath that changed nothing.
        if (!air && resting > 0) breathe(0, resting, FILL);
        arriving = !!air;
      }
      // Nothing moving means it has settled already, so the arrival is now. A
      // breath still going says so itself when it lands. Asked before start(),
      // which is where a held pose finishes one, or that would be told twice.
      const settled = coming && !arriving;
      start();
      if (settled) tell('arrive');
    });
    visibility.observe(canvas);
    reduced.addEventListener('change', start, { signal: events.signal });
    scheme.addEventListener('change', () => { readTheme(); redrawStill(); },
                            { signal: events.signal });
    // Most pages swap themes by putting a class or a data-theme on <html>
    // rather than by the colour-scheme query, so watch for that as well --
    // otherwise the dancer keeps the colours it read at startup.
    const themeWatch = new MutationObserver(() => { readTheme(); redrawStill(); });
    themeWatch.observe(document.documentElement,
                       { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
    readTheme();
    ready = true;

    // a held pose has no loop to pick a change up, so it gets poked
    function redrawStill() { if (ready && visible && held()) render(); }

    return {
      // only a held pose needs poking; a running loop picks changes up itself
      redraw: redrawStill,
      // Let the air out, or put it back.
      pump(to) {
        if (held()) {   // no frames to breathe with, so it lands at once
          air = null;
          // Whatever was breathing has just landed, arrival included. Without
          // this an arrival interrupted off screen and then pumped while held
          // -- the hours tick does it every minute -- would be left pending
          // with no breath to ever finish it, and never told at all.
          landed();
          resting = to;
          updateLift(t);
          return render();
        }
        // Asking for what it is already doing is not a breath. It matters
        // off screen, where there is no loop to finish one: a pointless
        // breath would sit there unfinished, and an arrival only fills when
        // nothing else is breathing, so the dancer would come back already
        // standing. The hours ask for the same thing every minute.
        if (to === (air ? air.to : resting)) return;
        breathe(pressure(), to, to ? FILL : EMPTY);
      },
      // starting or stopping is the one change that has to reach the loop
      hold: start,
      // a colour attribute coming or going changes whether the page's own
      // theme gets a say, so the answer has to be looked up again
      rereadTheme: readTheme,
      cheer: burst,
      stop() {
        visible = false;  // a late redraw() must not paint a detached canvas
        cancelAnimationFrame(raf);
        observer.disconnect();
        visibility.disconnect();
        themeWatch.disconnect();
        events.abort();
      },
    };
  }

  class SkyDancer extends HTMLElement {
    static observedAttributes = KEYS.map(attrName);

    constructor() {
      super();
      this.cfg = Object.fromEntries(KEYS.map(key => [key, parse(key, this.getAttribute(attrName(key)))]));
      this.clock = null;   // the minute hand for `hours`, when it has any
      this.kept = false;   // whether hours were the thing holding it down
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `<style>${STYLE}</style>`
        // The canvas is decoration, so assistive tech is told to skip it. What
        // it paints that is actually content -- the words on the sign -- gets a
        // real element of its own.
        + `<canvas aria-hidden="true"></canvas>`
        + `<p class="said" hidden></p>`
        // A blurted word is painted and then gone, so it needs saying as well
        // as showing. Polite, because it is an aside, not the point.
        + `<p class="said blurted" aria-live="polite"></p>`
        // A new tab, so a click never takes the reader off the page the dancer
        // is advertising. noopener keeps the opened page from reaching back
        // through window.opener.
        + `<a class="go" target="_blank" rel="noopener noreferrer" hidden></a>`
        // The poke a pointer gives it, for anything that is not a pointer.
        + `<button class="poke" type="button" hidden></button>`;
      this.canvas = root.querySelector('canvas');
    }

    attributeChangedCallback(name, _old, value) {
      const key = KEYS.find(k => attrName(k) === name);
      this.cfg[key] = parse(key, value);
      if (key === 'count' && this.isConnected) this.syncCount();
      // reading the theme forces a style recalc, and only these two can change
      // what it resolves to
      if (key === 'color' || key === 'accent') this.anim?.rereadTheme();
      if (key === 'paused') this.anim?.hold();
      if (key === 'hours') this.keepHours();
      this.anim?.redraw();
    }

    // the host grows sideways with the crowd; a constructor may not touch attributes
    syncCount() {
      this.style.setProperty('--count', Math.max(1, Math.min(MAX_COUNT, Math.round(this.cfg.count) || 1)));
    }

    // the page decides when a dancer is on show
    hide() { this.hidden = true; }
    show() { this.hidden = false; }

    // Set it off: the same burst a poke gives it, for a page with something to
    // celebrate. A still pose has no loop to carry it, so it stays still.
    cheer() { this.anim?.cheer(); }

    // The other half of that: a dancer can flop when something goes wrong and
    // stand back up when it comes right. It stays on show either way -- this
    // is a mood, not hide() and show().
    deflate() { this.anim?.pump(0); }
    inflate() { this.anim?.pump(1); }

    // Opening hours, for the shop front this is really a sign for: the air
    // goes out at closing time and back in when it opens. A page may still
    // call deflate() or inflate() in between, but the next look at the clock
    // puts it back where the hours say, within the minute.
    keepHours() {
      clearInterval(this.clock);
      this.clock = null;
      // An attribute can be set before the element is in a page, and a
      // timer started then would outlive it: nothing would clear it, and it
      // would hold the element from being collected.
      if (!this.isConnected) return;
      if (!this.cfg.hours) {
        // Taking the hours away gives the dancer back, rather than leaving it
        // flat with nothing left to open it again -- but only when there were
        // hours holding it down. On a first look there is nothing to undo, and
        // a breath started here would rob the dancer of its arrival: the fill
        // only runs when nothing else is already breathing.
        if (this.kept) this.anim?.pump(1);
        this.kept = false;
        return;
      }
      this.kept = true;
      const check = () => this.anim?.pump(openNow(this.cfg.hours) ? 1 : 0);
      check();
      // a minute is close enough for a thing that changes twice a day
      this.clock = setInterval(check, 60000);
    }

    connectedCallback() {
      this.syncCount();
      this.anim = animate(this.canvas, this.cfg);
      this.keepHours();
    }

    disconnectedCallback() {
      clearInterval(this.clock);
      this.clock = null;
      this.anim.stop();
      this.anim = null;   // the optional calls above cope, and nothing is held
    }
  }

  customElements.define('sky-dancer', SkyDancer);
})();
