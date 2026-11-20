// Vice Key Art Studio — editor wiring.
// Owns the document state (serializable, undoable), the photo library
// (samples + local uploads, never sent anywhere), the 4-step editor UI,
// canvas interactions, PNG export, and the ?shot= screenshot modes.

import { LAYOUTS, layoutById, ROLE_TAGS } from './layouts.js';
import { GRADES } from './grades.js';
import { computeFocus } from './focus.js';
import { renderCover } from './render.js';

const SAMPLES = [
  { id: 'boss', name: 'The Boss', src: 'samples/boss.jpg' },
  { id: 'driver', name: 'The Driver', src: 'samples/driver.jpg' },
  { id: 'friends', name: 'The Crew', src: 'samples/friends.jpg' },
  { id: 'redhead', name: 'The Insider', src: 'samples/redhead.jpg' },
  { id: 'boulevard', name: 'Boulevard', src: 'samples/boulevard.jpg' },
  { id: 'pier', name: 'The Pier', src: 'samples/pier.jpg' },
];
const MAX_UPLOADS = 8;
const EXPORT_SIZES = [[1080, 1080], [1080, 1350], [1920, 1080]];

const params = new URLSearchParams(location.search);
const shotMode = params.get('shot');

const library = []; // { id, name, img, focus, custom }
let state = null;
let undoStack = [];
let redoStack = [];
let selectedPanel = 0;
let selectedPhoto = 0;

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const sctx = stage.getContext('2d');

function defaultPanel(i, photoCount) {
  return {
    photo: photoCount ? i % photoCount : 0,
    tag: ROLE_TAGS[i % ROLE_TAGS.length],
    pan: { x: 0, y: 0 },
    zoom: 1,
    flip: false,
  };
}

function freshState() {
  return {
    caption: 'VICE CITY',
    subtitle: 'welcome back to Leonida',
    gazette: 'LEONIDA GAZETTE',
    quote: '\u201CA sun-soaked fever dream.\u201D',
    billing: 'VICE KEY ART STUDIO PRESENTS A LEONIDA PICTURES PRODUCTION\nSTARRING THE BOSS THE DRIVER THE GETAWAY MUSIC BY PALM CITY SOUND SYSTEM\nEDITED ON THE BOULEVARD PRINTED IN VICE CITY EST. 2026',
    layoutId: 'keyart-wide',
    gradeId: 'sunset-drive',
    finishes: { halftone: false, grain: true, vignette: true },
    panels: [],
  };
}

// Keep panel views aligned with the active layout, preserving edits by index.
function syncPanels() {
  const geom = layoutById(state.layoutId).build();
  const next = geom.map((_, i) => {
    const prev = state.panels[i];
    if (prev) {
      prev.photo = Math.min(prev.photo, Math.max(0, library.length - 1));
      return prev;
    }
    return defaultPanel(i, library.length);
  });
  state.panels = next;
  if (selectedPanel >= next.length) selectedPanel = 0;
  return geom;
}

function doc() {
  const geom = layoutById(state.layoutId).build();
  return {
    geom,
    panels: state.panels,
    caption: state.caption,
    subtitle: state.subtitle,
    gazette: state.gazette,
    quote: state.quote,
    billing: state.billing,
    gradeId: state.gradeId,
    finishes: state.finishes,
  };
}

let rafPending = false;
function render() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    renderCover(sctx, stage.width, stage.height, doc(), library);
  });
}

function snapshot() {
  return JSON.stringify(state);
}

function commit() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  updateHistoryButtons();
}

function restore(json) {
  state = JSON.parse(json);
  syncPanels();
  syncControls();
  render();
}

function updateHistoryButtons() {
  $('undoBtn').disabled = undoStack.length === 0;
  $('redoBtn').disabled = redoStack.length === 0;
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  updateHistoryButtons();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  updateHistoryButtons();
}

// ---------- photo library ----------

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function addSample(def) {
  const img = await loadImage(def.src);
  library.push({ id: def.id, name: def.name, img, focus: computeFocus(img), custom: false });
}

async function addUpload(file) {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  const name = file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'My photo';
  library.push({ id: 'up-' + Date.now() + '-' + library.length, name, img, focus: computeFocus(img), custom: true });
}

function uploadCount() {
  return library.filter((p) => p.custom).length;
}

// ---------- controls ----------

function buildPhotoGrid() {
  const grid = $('photoGrid');
  grid.innerHTML = '';
  library.forEach((photo, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'photo-thumb' + (i === selectedPhoto ? ' selected' : '');
    const img = document.createElement('img');
    img.src = photo.img.src;
    img.alt = photo.name;
    const label = document.createElement('span');
    label.textContent = photo.name;
    btn.append(img, label);
    btn.addEventListener('click', () => {
      selectedPhoto = i;
      if (state.panels[selectedPanel]) {
        commit();
        state.panels[selectedPanel].photo = i;
      }
      buildPhotoGrid();
      buildPanelEditor();
      render();
    });
    grid.append(btn);
  });
  $('photoCount').textContent = `${library.length} photos in the cast — ${uploadCount()} of ${MAX_UPLOADS} uploads used.`;
  const sel = $('panelPhoto');
  sel.innerHTML = '';
  library.forEach((photo, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = photo.name;
    sel.append(opt);
  });
}

function buildChoiceGrid(el, items, current, onPick) {
  el.innerHTML = '';
  items.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = item.name;
    btn.className = item.id === current ? 'selected' : '';
    btn.addEventListener('click', () => onPick(item.id));
    el.append(btn);
  });
}

function buildLayoutGrid() {
  buildChoiceGrid($('layoutGrid'), LAYOUTS, state.layoutId, (id) => {
    if (id === state.layoutId) return;
    commit();
    state.layoutId = id;
    syncPanels();
    buildLayoutGrid();
    buildPanelEditor();
    render();
  });
}

function buildGradeGrid() {
  buildChoiceGrid($('gradeGrid'), GRADES, state.gradeId, (id) => {
    if (id === state.gradeId) return;
    commit();
    state.gradeId = id;
    buildGradeGrid();
    render();
  });
}

function buildPanelEditor() {
  const view = state.panels[selectedPanel];
  $('panelLabel').textContent = `Panel ${selectedPanel + 1} of ${state.panels.length}`;
  if (!view) return;
  $('panelTag').value = view.tag;
  $('panelPhoto').value = String(view.photo);
  $('panelZoom').value = String(view.zoom);
  $('zoomVal').textContent = `${view.zoom.toFixed(2)}×`;
}

function syncControls() {
  $('inCaption').value = state.caption;
  $('inSubtitle').value = state.subtitle;
  $('inGazette').value = state.gazette;
  $('inQuote').value = state.quote;
  $('inBilling').value = state.billing;
  $('finHalftone').checked = !!state.finishes.halftone;
  $('finGrain').checked = !!state.finishes.grain;
  $('finVignette').checked = !!state.finishes.vignette;
  buildPhotoGrid();
  buildLayoutGrid();
  buildGradeGrid();
  buildPanelEditor();
}

function wireControls() {
  document.querySelectorAll('.step-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.step-tab').forEach((t) => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.step').forEach((s) => s.classList.toggle('active', s.id === 'step-' + tab.dataset.step));
    });
  });

  $('uploadBtn').addEventListener('click', () => $('fileInput').click());
  $('fileInput').addEventListener('change', async (ev) => {
    const files = Array.from(ev.target.files || []);
    for (const file of files) {
      if (uploadCount() >= MAX_UPLOADS) break;
      try { await addUpload(file); } catch { /* unreadable file: skip */ }
    }
    ev.target.value = '';
    commit();
    syncPanels();
    buildPhotoGrid();
    buildPanelEditor();
    render();
  });

  $('applyAllBtn').addEventListener('click', () => {
    commit();
    state.panels.forEach((p) => { p.photo = selectedPhoto; });
    buildPanelEditor();
    render();
  });

  const textBind = (id, key) => {
    const el = $(id);
    el.addEventListener('input', () => { state[key] = el.value; render(); });
    el.addEventListener('change', () => commit());
  };
  textBind('inCaption', 'caption');
  textBind('inSubtitle', 'subtitle');
  textBind('inGazette', 'gazette');
  textBind('inQuote', 'quote');
  textBind('inBilling', 'billing');

  const finBind = (id, key) => {
    $(id).addEventListener('change', (ev) => {
      commit();
      state.finishes[key] = ev.target.checked;
      render();
    });
  };
  finBind('finHalftone', 'halftone');
  finBind('finGrain', 'grain');
  finBind('finVignette', 'vignette');

  $('panelTag').addEventListener('input', (ev) => {
    const view = state.panels[selectedPanel];
    if (view) { view.tag = ev.target.value; render(); }
  });
  $('panelTag').addEventListener('change', () => commit());
  $('panelPhoto').addEventListener('change', (ev) => {
    const view = state.panels[selectedPanel];
    if (!view) return;
    commit();
    view.photo = Number(ev.target.value);
    selectedPhoto = view.photo;
    buildPhotoGrid();
    render();
  });
  $('panelZoom').addEventListener('input', (ev) => {
    const view = state.panels[selectedPanel];
    if (!view) return;
    view.zoom = Number(ev.target.value);
    $('zoomVal').textContent = `${view.zoom.toFixed(2)}×`;
    render();
  });
  $('panelZoom').addEventListener('change', () => commit());
  $('panelFlip').addEventListener('click', () => {
    const view = state.panels[selectedPanel];
    if (!view) return;
    commit();
    view.flip = !view.flip;
    render();
  });
  $('panelReset').addEventListener('click', () => {
    const view = state.panels[selectedPanel];
    if (!view) return;
    commit();
    view.pan = { x: 0, y: 0 };
    view.zoom = 1;
    view.flip = false;
    buildPanelEditor();
    render();
  });

  $('undoBtn').addEventListener('click', undo);
  $('redoBtn').addEventListener('click', redo);
  document.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z' && !ev.shiftKey) { ev.preventDefault(); undo(); }
    if ((ev.ctrlKey || ev.metaKey) && (ev.key.toLowerCase() === 'y' || (ev.key.toLowerCase() === 'z' && ev.shiftKey))) { ev.preventDefault(); redo(); }
  });

  document.querySelectorAll('.export-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [w, h] = btn.dataset.size.split('x').map(Number);
      exportPng(w, h);
    });
  });
  $('exportAll').addEventListener('click', async () => {
    for (const [w, h] of EXPORT_SIZES) {
      exportPng(w, h);
      await new Promise((r) => setTimeout(r, 350));
    }
  });
}

function exportPng(w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  renderCover(off.getContext('2d'), w, h, doc(), library);
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-key-art-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}

// ---------- canvas interaction ----------

function panelAt(px, py) {
  const geom = layoutById(state.layoutId).build();
  const nx = px / stage.width;
  const ny = py / stage.height;
  for (let i = geom.length - 1; i >= 0; i--) {
    const p = geom[i];
    if (p.poly) {
      let inside = false;
      for (let a = 0, b = p.poly.length - 1; a < p.poly.length; b = a++) {
        const [ax, ay] = p.poly[a];
        const [bx, by] = p.poly[b];
        if ((ay > ny) !== (by > ny) && nx < ((bx - ax) * (ny - ay)) / (by - ay) + ax) inside = !inside;
      }
      if (inside) return i;
    } else if (nx >= p.x && nx <= p.x + p.w && ny >= p.y && ny <= p.y + p.h) {
      return i;
    }
  }
  return -1;
}

function wireStage() {
  let drag = null;
  const pos = (ev) => {
    const rect = stage.getBoundingClientRect();
    return {
      x: ((ev.clientX - rect.left) / rect.width) * stage.width,
      y: ((ev.clientY - rect.top) / rect.height) * stage.height,
    };
  };
  stage.addEventListener('pointerdown', (ev) => {
    const p = pos(ev);
    const idx = panelAt(p.x, p.y);
    if (idx < 0) return;
    if (idx !== selectedPanel) {
      selectedPanel = idx;
      buildPanelEditor();
    }
    drag = { idx, lastX: p.x, lastY: p.y, moved: false };
    stage.setPointerCapture(ev.pointerId);
  });
  stage.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const p = pos(ev);
    const view = state.panels[drag.idx];
    if (!view) return;
    const dx = (p.x - drag.lastX) / stage.width;
    const dy = (p.y - drag.lastY) / stage.height;
    if (Math.abs(dx) + Math.abs(dy) > 0.0005) drag.moved = true;
    view.pan.x = Math.max(-0.6, Math.min(0.6, view.pan.x + dx));
    view.pan.y = Math.max(-0.6, Math.min(0.6, view.pan.y + dy));
    drag.lastX = p.x;
    drag.lastY = p.y;
    render();
  });
  stage.addEventListener('pointerup', () => {
    if (drag && drag.moved) commit();
    drag = null;
  });
  stage.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const p = pos(ev);
    const idx = panelAt(p.x, p.y);
    if (idx < 0) return;
    selectedPanel = idx;
    const view = state.panels[idx];
    if (!view) return;
    view.zoom = Math.max(1, Math.min(3, view.zoom * (ev.deltaY < 0 ? 1.07 : 0.93)));
    buildPanelEditor();
    render();
  }, { passive: false });
  stage.addEventListener('dblclick', (ev) => {
    const p = pos(ev);
    const idx = panelAt(p.x, p.y);
    if (idx < 0) return;
    commit();
    const view = state.panels[idx];
    view.pan = { x: 0, y: 0 };
    view.zoom = 1;
    view.flip = false;
    selectedPanel = idx;
    buildPanelEditor();
    render();
  });
}

// ---------- boot ----------

async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load('400 60px Anton'),
      document.fonts.load('400 40px Pacifico'),
      document.fonts.ready,
    ]);
  } catch { /* fall back to system fonts */ }
}

async function boot() {
  state = freshState();

  const wanted = params.get('photo');
  if (shotMode) {
    // Load the requested sample first so screenshot modes are fast.
    const def = SAMPLES.find((s) => s.id === wanted) || SAMPLES[0];
    await addSample(def);
    for (const other of SAMPLES) {
      if (other.id !== def.id) {
        try { await addSample(other); } catch { /* keep booting */ }
      }
    }
  } else {
    for (const def of SAMPLES) {
      try { await addSample(def); } catch { /* keep booting */ }
    }
  }

  const captionParam = params.get('caption');
  if (captionParam) state.caption = captionParam.toUpperCase();

  syncPanels();

  if (shotMode === 'cover') {
    document.body.classList.add('cover-mode');
    stage.width = window.innerWidth;
    stage.height = window.innerHeight;
    const idx = library.findIndex((p) => p.id === wanted);
    const use = idx >= 0 ? idx : 0;
    state.panels.forEach((p) => { p.photo = use; });
    // An ensemble of the whole cast reads better full-bleed: cycle photos.
    state.panels.forEach((p, i) => { p.photo = i % library.length; });
    if (params.get('photo')) state.panels[2] = Object.assign(state.panels[2] || {}, { photo: use });
    await ensureFonts();
    renderCover(sctx, stage.width, stage.height, doc(), library);
    document.body.dataset.ready = '1';
    return;
  }

  if (shotMode === 'editor') {
    const idx = library.findIndex((p) => p.id === wanted);
    if (idx >= 0) {
      selectedPhoto = idx;
      state.panels.forEach((p) => { p.photo = idx; });
    }
  }

  wireControls();
  wireStage();
  syncControls();
  updateHistoryButtons();
  await ensureFonts();
  renderCover(sctx, stage.width, stage.height, doc(), library);
  document.body.dataset.ready = '1';
}

boot();
