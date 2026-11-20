// Vice Key Art Studio — canvas renderer.
// Draws the full poster: graded photo panels, role tags, the giant striped
// chrome title, neon script subtitle, press strip, film billing block, gold
// seal and barcode. Everything is drawn with Canvas 2D and local fonts, so
// the same document always renders pixel-identical output.

import { gradeById, applyGrade } from './grades.js';

// Deterministic PRNG so grain and barcodes never change between renders.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashText(text) {
  let h = 2166136261;
  const s = String(text || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function panelBox(panel, W, H) {
  if (panel.poly) {
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    for (const [px, py] of panel.poly) {
      minX = Math.min(minX, px); maxX = Math.max(maxX, px);
      minY = Math.min(minY, py); maxY = Math.max(maxY, py);
    }
    return { x: minX * W, y: minY * H, w: (maxX - minX) * W, h: (maxY - minY) * H };
  }
  return { x: panel.x * W, y: panel.y * H, w: panel.w * W, h: panel.h * H };
}

function tracePath(ctx, panel, W, H, inset) {
  ctx.beginPath();
  if (panel.poly) {
    // Inset polygons toward their centroid so gutters stay even.
    let cx = 0, cy = 0;
    for (const [px, py] of panel.poly) { cx += px; cy += py; }
    cx = (cx / panel.poly.length) * W;
    cy = (cy / panel.poly.length) * H;
    panel.poly.forEach(([px, py], i) => {
      let x = px * W, y = py * H;
      const dx = cx - x, dy = cy - y;
      const len = Math.hypot(dx, dy) || 1;
      x += (dx / len) * inset;
      y += (dy / len) * inset;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
  } else {
    const b = panelBox(panel, W, H);
    ctx.rect(b.x + inset, b.y + inset, Math.max(1, b.w - inset * 2), Math.max(1, b.h - inset * 2));
  }
}

// Render one photo into an offscreen canvas at the requested pixel size,
// cover-cropped around its focus point, with the grade baked in.
function renderPhoto(photo, pw, ph, view, grade, darken) {
  const img = photo.img;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const cap = 1100;
  const scaleDown = Math.min(1, cap / Math.max(pw, ph));
  const cw = Math.max(2, Math.round(pw * scaleDown));
  const ch = Math.max(2, Math.round(ph * scaleDown));
  const off = document.createElement('canvas');
  off.width = cw;
  off.height = ch;
  const octx = off.getContext('2d', { willReadFrequently: true });

  const zoom = view.zoom || 1;
  const base = Math.max(cw / iw, ch / ih) * zoom;
  const dw = iw * base;
  const dh = ih * base;
  const focus = photo.focus || { x: 0.5, y: 0.38 };
  let ox = cw / 2 - focus.x * dw + (view.pan.x || 0) * cw;
  let oy = ch / 2 - focus.y * dh + (view.pan.y || 0) * ch;
  ox = Math.min(0, Math.max(cw - dw, ox));
  oy = Math.min(0, Math.max(ch - dh, oy));

  octx.save();
  if (view.flip) {
    // Mirror around the panel centre so the crop window stays put.
    octx.translate(cw / 2, 0);
    octx.scale(-1, 1);
    octx.translate(-cw / 2, 0);
  }
  octx.drawImage(img, ox, oy, dw, dh);
  octx.restore();

  const imageData = octx.getImageData(0, 0, cw, ch);
  applyGrade(imageData, grade);
  octx.putImageData(imageData, 0, 0);
  if (darken) {
    octx.fillStyle = 'rgba(5,8,20,0.52)';
    octx.fillRect(0, 0, cw, ch);
  }
  return off;
}

function drawPanel(ctx, panel, view, photo, W, H, grade, gutter) {
  const box = panelBox(panel, W, H);

  if (panel.polaroid) {
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const pad = Math.min(box.w, box.h) * 0.055;
    const foot = Math.min(box.w, box.h) * 0.16;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(((panel.angle || 0) * Math.PI) / 180);
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = Math.min(W, H) * 0.02;
    ctx.shadowOffsetY = Math.min(W, H) * 0.008;
    ctx.fillStyle = '#f7f3e8';
    ctx.fillRect(-box.w / 2 - pad, -box.h / 2 - pad, box.w + pad * 2, box.h + pad * 2 + foot);
    ctx.shadowColor = 'transparent';
    const img = renderPhoto(photo, box.w, box.h, view, grade, false);
    ctx.drawImage(img, -box.w / 2, -box.h / 2, box.w, box.h);
    // Caption inked on the polaroid foot.
    ctx.fillStyle = '#23202a';
    ctx.font = `700 ${Math.max(9, foot * 0.52)}px Anton, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(view.tag || '').toUpperCase(), 0, box.h / 2 + foot * 0.52, box.w * 0.94);
    ctx.restore();
    return;
  }

  if (panel.pop) {
    // The hero photo spills above its frame; the frame keeps sides + base.
    const spill = box.h * 0.34;
    const tall = { x: box.x, y: box.y - spill, w: box.w, h: box.h + spill };
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = Math.min(W, H) * 0.025;
    const img = renderPhoto(photo, tall.w, tall.h, view, grade, false);
    ctx.drawImage(img, tall.x, tall.y, tall.w, tall.h);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = '#f5f1e6';
    ctx.lineWidth = Math.max(3, gutter * 1.15);
    ctx.beginPath();
    ctx.moveTo(box.x, box.y + spill * 0.4);
    ctx.lineTo(box.x, box.y + box.h);
    ctx.lineTo(box.x + box.w, box.y + box.h);
    ctx.lineTo(box.x + box.w, box.y + spill * 0.4);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.save();
  tracePath(ctx, panel, W, H, gutter / 2);
  ctx.clip();
  const img = renderPhoto(photo, box.w, box.h, view, grade, !!panel.backdrop);
  ctx.drawImage(img, box.x, box.y, box.w, box.h);
  ctx.restore();

  // Frame line around poly panels (rects get their gutter from the bg).
  if (panel.poly) {
    ctx.save();
    tracePath(ctx, panel, W, H, gutter / 2);
    ctx.strokeStyle = '#f5f1e6';
    ctx.lineWidth = Math.max(2, gutter * 0.8);
    ctx.stroke();
    ctx.restore();
  }
}

function drawTag(ctx, panel, view, W, H, unit, stripTop) {
  if (panel.polaroid || !view.tag) return;
  const box = panelBox(panel, W, H);
  const label = String(view.tag).toUpperCase();
  const fs = Math.max(10, unit * 0.021);
  ctx.save();
  ctx.font = `700 ${fs}px Anton, sans-serif`;
  const tw = ctx.measureText(label).width;
  const padX = fs * 0.55;
  const chipW = tw + padX * 2 + fs * 0.5;
  const chipH = fs * 1.62;
  const x = box.x + unit * 0.012;
  // Panels that run into the bottom furniture put their tag at the top
  // edge instead, so the press strip and billing never swallow it.
  const hitsFurniture = box.y + box.h > stripTop - unit * 0.004;
  const y = hitsFurniture
    ? box.y + unit * 0.012
    : box.y + box.h - chipH - unit * 0.012;
  ctx.fillStyle = 'rgba(8,10,22,0.78)';
  ctx.fillRect(x, y, chipW, chipH);
  ctx.fillStyle = '#ffcf3f';
  ctx.fillRect(x, y, fs * 0.32, chipH);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + fs * 0.5 + padX * 0.4, y + chipH / 2 + fs * 0.05);
  ctx.restore();
}

// Giant retro chrome title: silver-blue gradient bands with thin horizontal
// stripes cut through the letterforms, dark outline, hard drop shadow.
function drawChromeTitle(ctx, text, cx, topY, maxWidth, unit) {
  const label = String(text || '').toUpperCase().trim() || 'VICE CITY';
  let size = unit * 0.148;
  ctx.save();
  const setFont = () => { ctx.font = `400 ${size}px Anton, sans-serif`; };
  setFont();
  while (ctx.measureText(label).width > maxWidth && size > 12) {
    size *= 0.94;
    setFont();
  }
  const tw = ctx.measureText(label).width;
  const th = size * 1.04;

  const off = document.createElement('canvas');
  off.width = Math.ceil(tw + size * 0.3);
  off.height = Math.ceil(th + size * 0.24);
  const o = off.getContext('2d');
  o.font = ctx.font;
  o.textAlign = 'center';
  o.textBaseline = 'middle';
  o.fillStyle = '#ffffff';
  o.fillText(label, off.width / 2, off.height / 2);
  o.globalCompositeOperation = 'source-in';
  const grad = o.createLinearGradient(0, 0, 0, off.height);
  grad.addColorStop(0, '#fbfdfe');
  grad.addColorStop(0.22, '#a9c3de');
  grad.addColorStop(0.42, '#eef5fc');
  grad.addColorStop(0.52, '#54749c');
  grad.addColorStop(0.63, '#dcebf8');
  grad.addColorStop(0.82, '#7e9cc0');
  grad.addColorStop(1, '#2b3c5c');
  o.fillStyle = grad;
  o.fillRect(0, 0, off.width, off.height);
  o.globalCompositeOperation = 'source-atop';
  o.fillStyle = 'rgba(12,18,36,0.20)';
  const stripeGap = Math.max(3, size / 8.5);
  for (let y = stripeGap * 0.4; y < off.height; y += stripeGap) {
    o.fillRect(0, y, off.width, Math.max(1, size / 26));
  }
  const sheen = o.createLinearGradient(0, 0, 0, off.height * 0.4);
  sheen.addColorStop(0, 'rgba(255,255,255,0.5)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  o.fillStyle = sheen;
  o.fillRect(0, 0, off.width, off.height * 0.4);

  // Outline pass on the main canvas, then the chrome face on top.
  ctx.font = o.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#0d1526';
  ctx.lineWidth = size * 0.085;
  ctx.shadowColor = 'rgba(4,6,16,0.55)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = size * 0.045;
  ctx.shadowOffsetY = size * 0.06;
  ctx.strokeText(label, cx, topY + th / 2);
  ctx.shadowColor = 'transparent';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.drawImage(off, cx - off.width / 2, topY + th / 2 - off.height / 2);
  ctx.restore();
  return th;
}

function drawSubtitle(ctx, text, cx, y, unit) {
  const label = String(text || '').trim();
  if (!label) return 0;
  let size = unit * 0.052;
  ctx.save();
  const setFont = () => { ctx.font = `400 ${size}px Pacifico, cursive`; };
  setFont();
  while (ctx.measureText(label).width > unit * 0.86 && size > 10) {
    size *= 0.94;
    setFont();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = size * 0.85;
  ctx.fillStyle = '#ff77b7';
  ctx.fillText(label, cx, y);
  ctx.fillText(label, cx, y);
  ctx.shadowColor = '#22d3ee';
  ctx.shadowBlur = size * 0.4;
  ctx.fillStyle = '#ffe3f1';
  ctx.fillText(label, cx, y);
  ctx.restore();
  return size * 1.3;
}

function drawStar(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawPressStrip(ctx, doc, W, y, h, unit) {
  ctx.save();
  ctx.fillStyle = 'rgba(6,8,18,0.82)';
  ctx.fillRect(0, y, W, h);
  ctx.fillStyle = '#ffcf3f';
  ctx.fillRect(0, y, W, Math.max(2, unit * 0.004));
  const cy = y + h / 2;
  const starR = h * 0.26;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, unit * 0.035 + i * starR * 2.35, cy, starR, '#ffcf3f');
  }
  const quote = String(doc.quote || '');
  ctx.font = `italic 600 ${Math.max(10, h * 0.34)}px Georgia, serif`;
  ctx.fillStyle = '#f5f1e6';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const qx = unit * 0.035 + 5 * starR * 2.35 + unit * 0.02;
  ctx.fillText(quote, qx, cy, W * 0.55);
  ctx.font = `400 ${Math.max(10, h * 0.4)}px Anton, sans-serif`;
  ctx.fillStyle = '#7ee7f9';
  ctx.textAlign = 'right';
  ctx.fillText(String(doc.gazette || '').toUpperCase(), W - unit * 0.03, cy, W * 0.3);
  ctx.restore();
}

function drawBilling(ctx, text, W, H, unit) {
  const lines = String(text || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 3);
  if (!lines.length) return;
  const fs = Math.max(7, unit * 0.0135);
  ctx.save();
  ctx.font = `400 ${fs}px Anton, sans-serif`;
  ctx.fillStyle = 'rgba(238,240,248,0.88)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  try { ctx.letterSpacing = `${Math.max(1, fs * 0.18)}px`; } catch { /* older engines */ }
  lines.forEach((line, i) => {
    const y = H - unit * 0.012 - (lines.length - 1 - i) * fs * 1.5;
    ctx.fillText(line.toUpperCase(), W / 2, y, W * 0.62);
  });
  ctx.restore();
}

function drawSeal(ctx, cx, cy, r) {
  ctx.save();
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.15, cx, cy, r);
  grad.addColorStop(0, '#ffe98a');
  grad.addColorStop(0.55, '#e9b83c');
  grad.addColorStop(1, '#9a7414');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = r * 0.07;
  ctx.strokeStyle = '#6e5410';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
  ctx.lineWidth = r * 0.035;
  ctx.strokeStyle = 'rgba(110,84,16,0.85)';
  ctx.stroke();
  // Circular legend text.
  const legend = 'EST. 2026 • LEONIDA • VICE KEY ART • ';
  ctx.fillStyle = '#5d470c';
  ctx.font = `400 ${r * 0.21}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const ringR = r * 0.88;
  for (let i = 0; i < legend.length; i++) {
    const a = (i / legend.length) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * ringR, cy + Math.sin(a) * ringR);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(legend[i], 0, 0);
    ctx.restore();
  }
  drawStar(ctx, cx, cy + r * 0.05, r * 0.3, '#7a5c10');
  ctx.restore();
}

function drawBarcode(ctx, doc, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#f7f5ee';
  const pad = h * 0.12;
  ctx.fillRect(x, y, w, h);
  const rng = mulberry32(hashText(doc.caption + '|' + doc.gazette));
  ctx.fillStyle = '#14161c';
  let bx = x + pad;
  const barTop = y + pad * 0.8;
  const barH = h * 0.58;
  while (bx < x + w - pad - 2) {
    const bw = 1 + Math.floor(rng() * 3.4);
    if (rng() > 0.32) ctx.fillRect(bx, barTop, bw, barH);
    bx += bw + 1 + Math.floor(rng() * 2.4);
  }
  let digits = '';
  for (let i = 0; i < 12; i++) digits += Math.floor(rng() * 10);
  ctx.font = `400 ${Math.max(7, h * 0.2)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(digits.split('').join(' '), x + w / 2, y + h - pad * 0.35);
  ctx.restore();
}

function applyFinishes(ctx, W, H, finishes, unit) {
  if (finishes.vignette) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(2,3,10,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  if (finishes.halftone) {
    const step = Math.max(7, unit * 0.011);
    ctx.save();
    ctx.fillStyle = 'rgba(10,10,18,0.16)';
    for (let yy = step / 2; yy < H; yy += step) {
      for (let xx = step / 2; xx < W; xx += step) {
        ctx.beginPath();
        ctx.arc(xx, yy, step * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  if (finishes.grain) {
    const n = 180;
    const noise = document.createElement('canvas');
    noise.width = n;
    noise.height = n;
    const nctx = noise.getContext('2d');
    const img = nctx.createImageData(n, n);
    const rng = mulberry32(20261120);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(rng() * 255);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 26;
    }
    nctx.putImageData(img, 0, 0);
    ctx.save();
    const pattern = ctx.createPattern(noise, 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

// Full poster render. doc = { geom, panels, caption, subtitle, gazette,
// quote, billing, gradeId, finishes }; photos = resolved library entries.
export function renderCover(ctx, W, H, doc, photos) {
  const unit = Math.min(W, H);
  const grade = gradeById(doc.gradeId);
  const gutter = Math.max(4, unit * 0.008);

  ctx.save();
  ctx.fillStyle = '#f5f1e6';
  ctx.fillRect(0, 0, W, H);

  doc.geom.forEach((panel, i) => {
    const view = doc.panels[i];
    if (!view) return;
    const photo = photos[view.photo] || photos[0];
    if (!photo || !photo.img) return;
    drawPanel(ctx, panel, view, photo, W, H, grade, gutter);
  });

  applyFinishes(ctx, W, H, doc.finishes, unit);

  // Bottom furniture geometry, shared with the tag placement above.
  const billingH = unit * 0.055;
  const stripH = Math.max(26, unit * 0.052);
  const stripY = H - billingH - stripH;

  doc.geom.forEach((panel, i) => {
    const view = doc.panels[i];
    if (view) drawTag(ctx, panel, view, W, H, unit, stripY);
  });

  // Title block overlaps the panels, GTA key-art style.
  const titleTop = H * 0.055;
  const titleH = drawChromeTitle(ctx, doc.caption, W / 2, titleTop, W * 0.94, unit);
  drawSubtitle(ctx, doc.subtitle, W / 2, titleTop + titleH + unit * 0.045, unit);

  drawPressStrip(ctx, doc, W, stripY, stripH, unit);
  drawBilling(ctx, doc.billing, W, H, unit);

  const sealR = unit * 0.062;
  drawSeal(ctx, W - sealR - unit * 0.02, stripY - sealR * 0.92, sealR);
  const bcW = unit * 0.17;
  const bcH = unit * 0.052;
  drawBarcode(ctx, doc, unit * 0.018, stripY - bcH - unit * 0.012, bcW, bcH);

  ctx.restore();
}
