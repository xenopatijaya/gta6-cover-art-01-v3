// Vice Key Art Studio — face-aware focus detection.
// A small deterministic heuristic: the photo is downscaled to a tiny probe
// canvas, every probe pixel is scored for skin-tone likelihood plus local
// edge energy, and the weighted centroid of the strongest region becomes
// the default crop focus for that photo. No network, no ML model, and the
// same photo always yields the same focus point.

function skinScore(r, g, b) {
  // Classic RGB skin cluster rules, softened into a 0..1 score.
  if (r < 60 || g < 30 || b < 12) return 0;
  if (!(r > g && g >= b)) return 0;
  const spread = r - b;
  if (spread < 14 || spread > 120) return 0;
  const warmth = Math.min(1, (r - g) / 60);
  const depth = Math.min(1, spread / 70);
  return Math.min(1, 0.35 + 0.35 * warmth + 0.3 * depth);
}

export function computeFocus(img) {
  const fallback = { x: 0.5, y: 0.38 };
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return fallback;

  const pw = 56;
  const ph = Math.max(20, Math.min(56, Math.round((pw * ih) / iw)));
  const probe = document.createElement('canvas');
  probe.width = pw;
  probe.height = ph;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  pctx.drawImage(img, 0, 0, pw, ph);
  let data;
  try {
    data = pctx.getImageData(0, 0, pw, ph).data;
  } catch {
    return fallback;
  }

  const scores = new Float32Array(pw * ph);
  let total = 0;
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const i = (y * pw + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      let edge = 0;
      if (x + 1 < pw) {
        const j = i + 4;
        edge += Math.abs(r - data[j]) + Math.abs(g - data[j + 1]) + Math.abs(b - data[j + 2]);
      }
      if (y + 1 < ph) {
        const j = i + pw * 4;
        edge += Math.abs(r - data[j]) + Math.abs(g - data[j + 1]) + Math.abs(b - data[j + 2]);
      }
      const skin = skinScore(r, g, b);
      // Faces live in the upper two thirds; weight them gently upward.
      const prior = 1.2 - 0.45 * (y / ph);
      const s = (skin * 2.4 + Math.min(1, edge / 260) * 0.7) * prior;
      scores[y * pw + x] = s;
      total += s;
    }
  }
  if (total <= 0.001) return fallback;

  // Centroid of the top-scoring region only, so one face wins over clutter.
  const sorted = Array.from(scores).sort((a, b) => b - a);
  const cutoff = sorted[Math.floor(sorted.length * 0.12)] || 0;
  let sx = 0;
  let sy = 0;
  let sw = 0;
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const s = scores[y * pw + x];
      if (s < cutoff) continue;
      sx += (x + 0.5) * s;
      sy += (y + 0.5) * s;
      sw += s;
    }
  }
  if (sw <= 0) return fallback;
  const fx = Math.min(0.85, Math.max(0.15, sx / sw / pw));
  const fy = Math.min(0.8, Math.max(0.12, sy / sw / ph));
  return { x: fx, y: fy };
}
