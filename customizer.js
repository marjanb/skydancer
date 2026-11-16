// Control panel for the customizer page: each input drives the matching
// attribute on the <sky-dancer> widget.
const dancer = document.getElementById('dancer');
const inputs = [...document.querySelectorAll('#controls [data-key]')];

// settings persist across reloads; storage can be blocked (private mode), so never let it throw
const STORAGE_KEY = 'skydancer';
let saved = {};

try {
  saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
} catch {}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(inputs.map(el => [el.dataset.key, readInput(el)]))));
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

// @1 follows the newest v1.x.x tag; jsDelivr generates the .min.js on the fly
const CDN_URL = 'https://cdn.jsdelivr.net/gh/marjanbajct2/skydancer@1/skydancer.min.js';
const embedCode = document.getElementById('embed-code');
const copyButton = document.getElementById('copy-embed');

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
    .filter(input => !(input.dataset.key === 'background' && input.checked))
    .filter(input => !(input.dataset.key === 'night' && !input.checked))
    .filter(input => !(input.dataset.key === 'count' && +input.value === 1))
    .filter(input => !(/^(night|glow)-color$/.test(input.dataset.key) && !document.querySelector('[data-key="night"]').checked))
    .map(input => `${input.dataset.key}="${readInput(input)}"`).join(' ');
  embedCode.value = `<script src="${CDN_URL}"></script>\n<sky-dancer ${attrs} style="height: 500px"></sky-dancer>`;
}

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(embedCode.value);
    copyButton.textContent = 'Copied!';
  } catch {
    // clipboard can be blocked (e.g. some file:// setups); leave it selected for Ctrl/Cmd+C
    embedCode.select();
    copyButton.textContent = 'Press Ctrl/Cmd+C to copy';
  }
  setTimeout(() => { copyButton.textContent = 'Copy embed code'; }, 1500);
});

// data-key is the attribute name ("arm-length"); the widget's cfg is camelCase
const cfgKey = key => key.replace(/-(\w)/g, (_, c) => c.toUpperCase());

for (const el of inputs) {
  const key = el.dataset.key;
  writeInput(el, key in saved ? saved[key] : dancer.cfg[cfgKey(key)]);
  // the input clamps stale saved values, so apply what it shows, not what was saved
  apply(el);
  el.addEventListener('input', () => { apply(el); save(); });
}

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
    else el.selectedIndex = Math.floor(Math.random() * el.options.length);
    apply(el);
  }
  save();
});
