// Vice Key Art Studio — cinematic grades.
// Each grade is a three-stop gradient map (shadow / midtone / highlight) that
// is baked into a 256-entry lookup table and applied per pixel, plus a
// strength that blends the mapped colour back with the original photo.

function hex(rgb) {
  return [
    parseInt(rgb.slice(1, 3), 16),
    parseInt(rgb.slice(3, 5), 16),
    parseInt(rgb.slice(5, 7), 16),
  ];
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

export const GRADES = [
  { id: 'sunset-drive', name: 'Sunset Drive', shadow: '#2b1140', mid: '#e2603c', high: '#ffe9bd', strength: 0.82 },
  { id: 'neon-pink', name: 'Neon Pink', shadow: '#1b1040', mid: '#d63384', high: '#ffd7ef', strength: 0.85 },
  { id: 'ocean-teal', name: 'Ocean Teal', shadow: '#062a33', mid: '#1f9e9a', high: '#f2e3bb', strength: 0.8 },
  { id: 'golden-hour', name: 'Golden Hour', shadow: '#33200e', mid: '#d99a3d', high: '#fff3d6', strength: 0.8 },
  { id: 'miami-nights', name: 'Miami Nights', shadow: '#050914', mid: '#5b3fae', high: '#a8f4ff', strength: 0.88 },
  { id: 'palm-shadow', name: 'Palm Shadow', shadow: '#0d2417', mid: '#7fa33c', high: '#fdf6c8', strength: 0.8 },
  { id: 'noir-ink', name: 'Noir Ink', shadow: '#060606', mid: '#8a8a8a', high: '#f5f5f5', strength: 1 },
  { id: 'chrome-dusk', name: 'Chrome Dusk', shadow: '#1c2438', mid: '#5d7ea6', high: '#ffd9e8', strength: 0.78 },
  { id: 'vice-original', name: 'Vice Original', shadow: '#10131f', mid: '#b98a68', high: '#fff6ea', strength: 0.45 },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

// Build a 256x3 lookup table for a grade: luminance -> mapped RGB.
export function buildLut(grade) {
  const sh = hex(grade.shadow);
  const md = hex(grade.mid);
  const hi = hex(grade.high);
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const c = t < 0.5 ? mix(sh, md, t * 2) : mix(md, hi, (t - 0.5) * 2);
    lut[i * 3] = c[0];
    lut[i * 3 + 1] = c[1];
    lut[i * 3 + 2] = c[2];
  }
  return lut;
}

// Apply a grade to an ImageData in place (deterministic, no randomness).
export function applyGrade(imageData, grade) {
  const lut = buildLut(grade);
  const d = imageData.data;
  const s = grade.strength;
  const keep = 1 - s;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const lum = Math.max(0, Math.min(255, Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)));
    const li = lum * 3;
    d[i] = lut[li] * s + r * keep;
    d[i + 1] = lut[li + 1] * s + g * keep;
    d[i + 2] = lut[li + 2] * s + b * keep;
  }
  return imageData;
}
