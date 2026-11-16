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

// hide() and show() are the widget's API; the stage stays put either way
hideButton.addEventListener('click', () => {
  dancer.hide();
  restore.hidden = false;
});
// the balloon's own close button hides it too
dancer.addEventListener('close', () => { restore.hidden = false; });
restore.addEventListener('click', () => {
  dancer.show();
  restore.hidden = true;
});
const inputs = [...document.querySelectorAll('#controls [data-key]')];

// settings persist across reloads; storage can be blocked (private mode), so never let it throw
const STORAGE_KEY = 'skydancer';
let saved = {};

try {
  saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
} catch {}

function save() {
  try {
    const state = Object.fromEntries(inputs.map(el => [el.dataset.key, readInput(el)]));
    Object.assign(state, { size: dancerSize.value, spot });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function readInput(el) {
  if (el.type === 'checkbox') return el.checked;
  if (el.type === 'range') return +el.value;
  return el.value;
}

function writeInput(el, value) {
  if (el.type === 'checkbox') el.checked = value;
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

function apply(el) {
  dancer.setAttribute(el.dataset.key, String(readInput(el)));
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
    .filter(input => !(input.dataset.key === 'closable' && input.checked))
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
      button.textContent = 'Press Ctrl/Cmd+C to copy';
    }
    setTimeout(() => { button.textContent = label; }, 1500);
  });
}

wireCopy(copyScript, embedScript, 'Copy script');
wireCopy(copyTag, embedTag, 'Copy tag');

// data-key is the attribute name ("arm-length"); the widget's cfg is camelCase
const cfgKey = key => key.replace(/-(\w)/g, (_, c) => c.toUpperCase());
const OFF = ['false', '0', 'no', 'off'];  // the same values the widget treats as off

if (saved.size) dancerSize.value = saved.size;
if (saved.spot) Object.assign(spot, saved.spot);
placeDancer();

for (const el of inputs) {
  const key = el.dataset.key;
  writeInput(el, key in saved ? saved[key] : DEFAULTS[cfgKey(key)]);
  // the input clamps stale saved values, so apply what it shows, not what was saved
  apply(el);
  el.addEventListener('input', () => { apply(el); save(); });
}

// a value the control can't hold would land on a clamped slider or an empty
// select, so fall back the way the widget itself does
function usable(el, value) {
  if (value === null) return false;
  if (el.type === 'range') return value.trim() !== '' && Number.isFinite(Number(value));
  if (el.tagName === 'SELECT') return [...el.options].some(o => o.value === value);
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

// typing a hex drives the colour picker next to it; #abc and a missing # are fine
const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

function parseHex(value) {
  const m = HEX.exec(value.trim());
  if (!m) return null;
  const d = m[1];
  return `#${d.length === 3 ? [...d].map(x => x + x).join('') : d}`.toLowerCase();
}

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

document.getElementById('randomize').addEventListener('click', () => {
  for (const el of inputs) {
    if (el.type === 'checkbox') el.checked = Math.random() < 0.7;
    else if (el.type === 'range') el.value = +el.min + Math.random() * (el.max - el.min);
    else if (el.type === 'color') el.value = `#${Math.floor(Math.random() * 0x1000000).toString(16).padStart(6, '0')}`;
    else if (el.tagName === 'SELECT') el.selectedIndex = Math.floor(Math.random() * el.options.length);
    // anything else (the sign's free text) is left alone
    apply(el);
  }
  save();
});
