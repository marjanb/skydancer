// Control panel for the customizer page: each input drives the matching
// attribute on the <sky-dancer> widget.
const dancer = document.getElementById('dancer');
const restore = document.getElementById('restore');
const dancerSize = document.getElementById('dancer-size');
const stage = document.getElementById('stage');
const hideButton = document.getElementById('hide');

// the dancer shows at the size you'd embed it, wherever you drag it
const dancerHeight = () => Math.min(1200, Math.max(80, +dancerSize.value || 400));
const spot = { x: null, y: null };

function placeDancer() {
  dancer.style.height = `${dancerHeight()}px`;
  const area = stage.getBoundingClientRect();
  const box = dancer.getBoundingClientRect();
  if (spot.x === null) {  // first sight of it: stand it in the middle
    spot.x = Math.round((area.width - box.width) / 2);
    spot.y = Math.round((area.height - box.height) / 2);
  }
  // it can hang off the edges, but never so far that there's nothing left to grab
  const KEEP = 60;
  spot.x = Math.round(Math.min(area.width - KEEP, Math.max(KEEP - box.width, spot.x)));
  spot.y = Math.round(Math.min(area.height - KEEP, Math.max(KEEP - box.height, spot.y)));
  dancer.style.left = `${spot.x}px`;
  dancer.style.top = `${spot.y}px`;
}

dancer.addEventListener('pointerdown', e => {
  const held = dancer.getBoundingClientRect();
  const grabX = e.clientX - held.left, grabY = e.clientY - held.top;

  const move = ev => {
    const area = stage.getBoundingClientRect();
    spot.x = ev.clientX - area.left - grabX;
    spot.y = ev.clientY - area.top - grabY;
    placeDancer();
  };
  const drop = () => {
    removeEventListener('pointermove', move);
    removeEventListener('pointerup', drop);
    removeEventListener('pointercancel', drop);  // a touch can be taken away mid-drag
    save();
  };
  addEventListener('pointermove', move);
  addEventListener('pointerup', drop);
  addEventListener('pointercancel', drop);
});

addEventListener('resize', placeDancer);

dancerSize.addEventListener('input', () => {
  placeDancer();
  if (inputs.length) apply(inputs[0]);  // the snippet carries the height
  save();
});

// nothing on the stage bar should talk about a dancer that isn't there
const stageHint = document.getElementById('stage-hint');

function showStageBar(visible) {
  hideButton.hidden = !visible;
  stageHint.hidden = !visible;
  restore.hidden = visible;
}

// hide() and show() are the widget's API; the stage stays put either way
hideButton.addEventListener('click', () => {
  dancer.hide();
  showStageBar(false);
});
restore.addEventListener('click', () => {
  dancer.show();
  showStageBar(true);
});
const inputs = [...document.querySelectorAll('#controls [data-key]')];

// settings persist across reloads; storage can be blocked (private mode), so never let it throw
const STORAGE_KEY = 'skydancer';
let saved = {};

try {
  saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
} catch {}

// A link carries the same settings the storage does, so a dancer can be sent
// to someone instead of only kept. A colour loses its leading # on the way
// out and gets it back on the way in, to spare the link a pair of %23s.
const shareLink = document.getElementById('share-link');
const copyLink = document.getElementById('copy-link');

function readShared() {
  const params = new URLSearchParams(location.hash.slice(1));
  if (![...params].length) return null;
  const out = {};
  for (const [key, value] of params) out[key] = value;
  return out;
}

const shared = readShared();
if (shared) saved = { ...saved, ...shared };

function snapshot() {
  const state = Object.fromEntries(inputs.map(el => [el.dataset.key, readInput(el)]));
  return Object.assign(state, { size: dancerSize.value, spot: { ...spot } });
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot()));
  } catch {}
  writeShareLink();
  remember();
}

// --- stepping back ---

// How far back you can go. A handful: this is a toy to fiddle with, not a
// document, and anything more wants a list rather than a button.
const STEPS = 5;
const past = [], ahead = [];
const undoButton = document.getElementById('undo');
const redoButton = document.getElementById('redo');
let before = null;    // between bursts, the state as it stands; during one,
                      // the state it started from
let settling = 0;
let stepping = false; // true while undo is putting a state back

// File whatever a burst changed. Called when one settles, and again before a
// step either way, so a drag is never skipped over by stepping during the wait.
function fileBurst() {
  clearTimeout(settling);
  const settled = JSON.stringify(snapshot());
  if (before === null || settled === before) { before = settled; return false; }
  past.push(before);
  if (past.length > STEPS) past.shift();
  ahead.length = 0;   // a new change is a new branch; there is no going forward
  before = settled;
  return true;
}

// A slider drag is one change, not sixty, so a burst is only filed once it
// stops coming.
function remember() {
  if (stepping) return;
  clearTimeout(settling);
  settling = setTimeout(() => { if (fileBurst()) syncSteps(); }, 350);
}

function syncSteps() {
  undoButton.disabled = !past.length;
  undoButton.title = past.length
    ? `Step back (${past.length} of ${STEPS})`
    : 'Nothing to step back to';
  redoButton.disabled = !ahead.length;
  redoButton.title = ahead.length
    ? `Step forward (${ahead.length})`
    : 'Nothing to step forward to';
}

function putBack(state) {
  dancer.show();
  showStageBar(true);
  dancerSize.value = state.size ?? dancerSize.defaultValue;
  Object.assign(spot, state.spot && typeof state.spot === 'object'
    ? state.spot : { x: null, y: null });
  for (const el of inputs) {
    const key = el.dataset.key;
    const fallback = DEFAULTS[cfgKey(key)];
    const value = key in state ? state[key] : fallback;
    writeInput(el, usable(el, value) ? value : fallback);
    apply(el);
  }
  // after the controls, never before: the spot is clamped against the dancer's
  // size, so measuring it first would clamp against the size being replaced
  placeDancer();
  syncVariety();
}

// Stepping either way is the same move: take a state off one stack, put the
// one being left onto the other, and wear it.
function step(from, to) {
  fileBurst();   // a drag still inside its wait is a step of its own
  const was = from.pop();
  if (!was) return syncSteps();   // filing that burst may have changed them
  to.push(before);
  if (to.length > STEPS) to.shift();
  stepping = true;
  putBack(JSON.parse(was));
  before = was;
  stepping = false;
  save();
  syncSteps();
}

undoButton.addEventListener('click', () => step(past, ahead));
redoButton.addEventListener('click', () => step(ahead, past));

// Nobody reaches for a button to undo. Left alone while words in a field are
// being edited, where the browser's own undo is the one that is wanted.
addEventListener('keydown', e => {
  if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
  const at = document.activeElement;
  if (at && /^(INPUT|TEXTAREA)$/.test(at.tagName)
      && !['range', 'color', 'checkbox'].includes(at.type)) return;
  fileBurst();   // so a drag still settling counts as somewhere to step back to
  const [from, to] = e.shiftKey ? [ahead, past] : [past, ahead];
  if (!from.length) { syncSteps(); return; }   // leave the browser's own undo alone
  e.preventDefault();
  step(from, to);
});

let addressBar = 0, shownHash = null;

function writeShareLink() {
  const params = new URLSearchParams();
  for (const el of inputs) {
    const value = readInput(el);
    params.set(el.dataset.key, el.type === 'color' ? String(value).replace('#', '') : value);
  }
  params.set('size', dancerSize.value);
  const hash = `#${params}`;
  // href rather than origin + pathname: on a file:// page the origin is the
  // string "null", which would make the link unusable
  shareLink.value = location.href.split('#')[0] + hash;

  // The address bar follows along, without stacking up history entries. A
  // browser throttles replaceState and starts throwing once a colour drag
  // outruns it, so it waits for the dragging to stop.
  if (hash === shownHash) return;
  shownHash = hash;
  clearTimeout(addressBar);
  addressBar = setTimeout(() => {
    try { history.replaceState(null, '', hash); } catch {}
  }, 250);
}

// typing a hex drives the colour picker next to it; #abc and a missing # are fine
const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

function parseHex(value) {
  const m = HEX.exec(String(value).trim());
  if (!m) return null;
  const d = m[1];
  return `#${d.length === 3 ? [...d].map(x => x + x).join('') : d}`.toLowerCase();
}

function readInput(el) {
  if (el.type === 'checkbox') return el.checked;
  if (el.type === 'range') return +el.value;
  return el.value;
}

function writeInput(el, value) {
  // a link gives everything back as a string, storage as its own type
  if (el.type === 'checkbox') el.checked = value === true || value === 'true';
  else if (el.type === 'color') el.value = parseHex(value);
  else el.value = value;
}

// @2 follows the newest v2.x.x tag; jsDelivr generates the .min.js on the fly
const CDN_URL = 'https://cdn.jsdelivr.net/gh/marjanb/skydancer@2/skydancer.min.js';
const embedScript = document.getElementById('embed-script');
const embedTag = document.getElementById('embed-tag');

// a throwaway element reports the widget's own defaults, for attributes a
// pasted tag leaves out
const DEFAULTS = document.createElement('sky-dancer').cfg;

const escapeHtml = s => s.replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
const escapeAttr = s => escapeHtml(String(s)).replace(/"/g, '&quot;');
const copyScript = document.getElementById('copy-script');
const copyTag = document.getElementById('copy-tag');

// readout next to each slider
const pct = v => `${Math.round(v * 100)}%`;
const FORMATS = { height: pct, 'arm-length': pct, girth: String, count: String };

// a lone dancer has nothing to differ from, so the toggle is only live
// once there is a crowd
const variety = document.querySelector('[data-key="variety"]');
const countInput = document.querySelector('[data-key="count"]');

function syncVariety() {
  variety.disabled = +countInput.value < 2;
  variety.closest('label').classList.toggle('off', variety.disabled);
}

function apply(el) {
  dancer.setAttribute(el.dataset.key, String(readInput(el)));
  if (el === countInput) syncVariety();
  const readout = el.closest('label').querySelector('output');
  if (readout) readout.value = (FORMATS[el.dataset.key] || (v => `${v.toFixed(2)}×`))(readInput(el));
  // don't yank the text out from under someone mid-type
  const hexField = el.closest('.swatch')?.querySelector('.hex');
  if (hexField && document.activeElement !== hexField) hexField.value = el.value.toUpperCase();
  if (el.type === 'range') el.style.setProperty('--fill', `${(el.value - el.min) / (el.max - el.min) * 100}%`);
  const attrs = inputs
    // leave out anything already at the widget's own default
    .filter(input => !(input.dataset.key === 'count' && +input.value === 1))
    .filter(input => !(input.dataset.key === 'sign' && !input.value.trim()))
    .filter(input => !(input.dataset.key === 'href' && !input.value.trim()))
    .filter(input => !(['print', 'placard', 'shout', 'hours'].includes(input.dataset.key)
                       && !input.value.trim()))
    .filter(input => !(input.dataset.key === 'variety' && !input.checked))
    .map(input => `${input.dataset.key}="${escapeAttr(readInput(input))}"`).join(' ');
  embedScript.value = `<script src="${CDN_URL}"></script>`;
  // don't rewrite the box someone is typing or pasting into
  if (document.activeElement !== embedTag) {
    embedTag.value = `<sky-dancer ${attrs} style="height: ${dancerHeight()}px"></sky-dancer>`;
  }
}

function wireCopy(button, field, label) {
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(field.value);
      button.textContent = 'Copied!';
    } catch {
      // clipboard can be blocked (e.g. some file:// setups); leave it selected for Ctrl/Cmd+C
      field.select();
      button.textContent = 'Press Ctrl/Cmd+C';
    }
    setTimeout(() => { button.textContent = label; }, 1500);
  });
}

wireCopy(copyScript, embedScript, 'Copy');
wireCopy(copyTag, embedTag, 'Copy');
wireCopy(copyLink, shareLink, 'Copy');

// data-key is the attribute name ("arm-length"); the widget's cfg is camelCase
const cfgKey = key => key.replace(/-(\w)/g, (_, c) => c.toUpperCase());
const OFF = ['false', '0', 'no', 'off'];  // the same values the widget treats as off

if (saved.size) dancerSize.value = saved.size;
if (saved.spot && typeof saved.spot === 'object') Object.assign(spot, saved.spot);
placeDancer();

for (const el of inputs) {
  const key = el.dataset.key;
  const fallback = DEFAULTS[cfgKey(key)];
  const stored = shelved(el) || !(key in saved) ? fallback : saved[key];
  // A link can carry anything at all. A value the control can't hold would
  // land on a clamped slider, an empty select or a black colour and then be
  // saved as if it had been chosen, so it goes back to the default instead.
  writeInput(el, usable(el, stored) ? stored : fallback);
  // a slider still clamps what it does accept, so apply what it shows
  apply(el);
  el.addEventListener('input', () => { apply(el); save(); });
}
syncVariety();
writeShareLink();
before = JSON.stringify(snapshot());   // where the first undo should land

// a value the control can't hold would land on a clamped slider or an empty
// select, so fall back the way the widget itself does
// the schemes the widget will actually follow; anything else is not a link
const GOES = ['http:', 'https:', 'mailto:', 'tel:'];

function linkable(text) {
  if (!text.trim()) return true;   // no link at all is a fine answer
  try {
    return GOES.includes(new URL(text.trim(), location.href).protocol);
  } catch {
    return false;
  }
}

// A control that has been put away takes its default and nothing else: a
// value saved, shared or randomised into it could not be undone by hand.
// Declared, not assigned, because the restore loop above runs before this.
function shelved(el) { return !!el.closest('[hidden]'); }

function usable(el, value) {
  if (value === null || value === undefined) return false;
  const text = String(value);
  // a shared link carries this one, so it must not seed a javascript: URL
  // into the field and from there into someone's embed tag
  if (el.type === 'url') return linkable(text);
  if (el.type === 'range') return text.trim() !== '' && Number.isFinite(Number(text));
  if (el.type === 'color') return parseHex(text) !== null;
  if (el.tagName === 'SELECT') return [...el.options].some(o => o.value === text);
  return true;
}

// pasting a tag back loads the settings it carries; anything it leaves out
// goes back to the widget's default, so a paste lands somewhere predictable
embedTag.addEventListener('input', () => {
  const tag = new DOMParser().parseFromString(embedTag.value, 'text/html').querySelector('sky-dancer');
  if (!tag) return;  // still typing, or not a tag at all
  for (const el of inputs) {
    const value = tag.getAttribute(el.dataset.key);
    const fallback = DEFAULTS[cfgKey(el.dataset.key)];
    if (el.type === 'checkbox') el.checked = value === null ? fallback : !OFF.includes(value.trim().toLowerCase());
    else el.value = usable(el, value) ? value : fallback;
    apply(el);
  }
  save();
});

for (const field of document.querySelectorAll('.hex')) {
  const picker = field.closest('.swatch').querySelector('input[type="color"]');
  field.addEventListener('input', () => {
    const value = parseHex(field.value);
    if (!value) return;  // still typing, or not a colour
    picker.value = value;
    apply(picker);
    save();
  });
  // whatever is left in the box when focus goes, snap it back to the real colour
  field.addEventListener('blur', () => { field.value = picker.value.toUpperCase(); });
}

// Everything back to the widget's own defaults, including the size, where the
// dancer stands and the link, so there is a way home from a surprise or from a
// link that carried something odd.
document.getElementById('reset').addEventListener('click', () => {
  // a hidden dancer comes back first: it has no size to be centred by
  // while it is hidden, and "the default dancer" is one you can see
  dancer.show();
  showStageBar(true);
  dancerSize.value = dancerSize.defaultValue;   // the value the markup carries
  spot.x = spot.y = null;   // placeDancer stands it in the middle again
  placeDancer();
  for (const el of inputs) {
    writeInput(el, DEFAULTS[cfgKey(el.dataset.key)]);
    apply(el);              // the first of these carries the height too
  }
  syncVariety();
  save();
});

// Four dancers worth embedding, for a page you have just landed on. Each one
// is a whole look: putBack fills anything a preset leaves out from the
// widget's own defaults, so none of them inherit the last one's leftovers.
const PRESETS = {
  yard: {
    color: '#e8452c', accent: '#ffd60a', girth: 95, 'arm-length': 0.3,
    speed: 1.35, wildness: 1.5, wind: 0.8, face: 'happy', hair: true,
    print: 'SALE', placard: 'Test drive today', shout: 'Honk!|What a deal|Drive it away',
  },
  shop: {
    color: '#2bb673', accent: '#ffd60a', girth: 68, 'arm-length': 0.28,
    speed: 0.9, wildness: 0.55, wind: 0.25, face: 'happy', hair: true,
    sign: 'Come in', bubble: 'drawn', placard: 'Open till 8',
  },
  party: {
    color: '#7d3cff', accent: '#00e0c6', girth: 82, 'arm-length': 0.42,
    speed: 1.9, wildness: 2, wind: 1.1, face: 'joy', hair: true,
    pattern: 'spiral', sign: 'Woo!', bubble: 'burst', shout: 'Yeah!|Woo|Party',
  },
  night: {
    color: '#2d2a55', accent: '#ff2d78', girth: 74, 'arm-length': 0.34,
    speed: 0.75, wildness: 0.7, wind: 0.35, face: 'cool', hair: false,
    pattern: 'rings', placard: 'Open late', sign: 'Still open',
  },
};

for (const chip of document.querySelectorAll('[data-preset]')) {
  chip.addEventListener('click', () => {
    // Where it stands and how big it is are yours, not the preset's, so they
    // are carried across rather than reset with everything else.
    putBack({ ...PRESETS[chip.dataset.preset], size: dancerSize.value, spot: { ...spot } });
    save();
  });
}

document.getElementById('randomize').addEventListener('click', () => {
  for (const el of inputs) {
    // count comes before variety in the DOM, so its apply() has already
    // settled whether the toggle is live by the time we get here. Only that
    // one is ever disabled, so only that one is held back.
    if (shelved(el)) continue;   // out of sight, so leave it at its default
    if (el.type === 'checkbox') {
      el.checked = Math.random() < 0.7 && !(el === variety && variety.disabled);
    }
    else if (el.type === 'range') el.value = +el.min + Math.random() * (el.max - el.min);
    else if (el.type === 'color') el.value = `#${Math.floor(Math.random() * 0x1000000).toString(16).padStart(6, '0')}`;
    else if (el.tagName === 'SELECT') el.selectedIndex = Math.floor(Math.random() * el.options.length);
    // anything else (the sign's free text) is left alone
    apply(el);
  }
  save();
});
