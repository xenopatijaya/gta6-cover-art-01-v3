// Vice Key Art Studio — panel layouts.
// Every layout is a list of panels in normalized canvas coordinates (0..1).
// A panel is { x, y, w, h } for rectangles, or { poly: [[x,y],...] } for free
// shapes. Optional flags: pop (subject breaks out of the frame), polaroid
// (thick white snap frame, slight tilt), backdrop (dimmed full-bleed base).

export const ROLE_TAGS = [
  'THE BOSS',
  'THE DRIVER',
  'THE GETAWAY',
  'THE MUSCLE',
  'THE INSIDER',
  'THE HEART',
  'THE FIXER',
  'THE LOOKOUT',
  'THE WHEELMAN',
];

function r(x, y, w, h, extra) {
  return Object.assign({ x, y, w, h }, extra || {});
}

export const LAYOUTS = [
  {
    id: 'keyart-wide',
    name: 'Key Art Wide',
    build() {
      return [
        r(0, 0, 0.5, 0.27),
        r(0.5, 0, 0.5, 0.27),
        r(0, 0.27, 0.58, 0.73),
        r(0.58, 0.27, 0.21, 0.365),
        r(0.79, 0.27, 0.21, 0.365),
        r(0.58, 0.635, 0.21, 0.365),
        r(0.79, 0.635, 0.21, 0.365),
      ];
    },
  },
  {
    id: 'keyart-ensemble',
    name: 'Key Art Ensemble',
    build() {
      return [
        r(0, 0, 0.42, 0.58),
        r(0.42, 0, 0.58, 0.34),
        r(0.42, 0.34, 0.29, 0.24),
        r(0.71, 0.34, 0.29, 0.24),
        r(0, 0.58, 0.58, 0.42),
        r(0.58, 0.58, 0.42, 0.42),
      ];
    },
  },
  {
    id: 'pop-out',
    name: 'Pop-Out Hero',
    build() {
      return [
        r(0, 0, 0.5, 0.5),
        r(0.5, 0, 0.5, 0.5),
        r(0, 0.5, 0.5, 0.5),
        r(0.5, 0.5, 0.5, 0.5),
        r(0.3, 0.15, 0.4, 0.74, { pop: true }),
      ];
    },
  },
  {
    id: 'diagonal-cut',
    name: 'Diagonal Cut',
    build() {
      return [
        { poly: [[0, 0], [0.4, 0], [0.64, 1], [0, 1]] },
        { poly: [[0.4, 0], [1, 0], [1, 1], [0.64, 1]] },
      ];
    },
  },
  {
    id: 'nine-grid',
    name: 'Nine Grid',
    build() {
      const out = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) out.push(r(col / 3, row / 3, 1 / 3, 1 / 3));
      }
      return out;
    },
  },
  {
    id: 'hero-plus-3',
    name: 'Hero + 3',
    build() {
      return [
        r(0, 0, 0.62, 1),
        r(0.62, 0, 0.38, 1 / 3),
        r(0.62, 1 / 3, 0.38, 1 / 3),
        r(0.62, 2 / 3, 0.38, 1 / 3),
      ];
    },
  },
  {
    id: 'full-bleed',
    name: 'Full Bleed',
    build() {
      return [r(0, 0, 1, 1)];
    },
  },
  {
    id: 'duo-split',
    name: 'Duo Split',
    build() {
      return [r(0, 0, 0.5, 1), r(0.5, 0, 0.5, 1)];
    },
  },
  {
    id: 'triple-strip',
    name: 'Triple Strip',
    build() {
      return [r(0, 0, 1 / 3, 1), r(1 / 3, 0, 1 / 3, 1), r(2 / 3, 0, 1 / 3, 1)];
    },
  },
  {
    id: 'polaroid-snaps',
    name: 'Polaroid Snaps',
    build() {
      return [
        r(0, 0, 1, 1, { backdrop: true }),
        r(0.07, 0.2, 0.33, 0.42, { polaroid: true, angle: -6 }),
        r(0.58, 0.16, 0.33, 0.42, { polaroid: true, angle: 5 }),
        r(0.31, 0.5, 0.36, 0.44, { polaroid: true, angle: -2 }),
      ];
    },
  },
  {
    id: 'center-stage',
    name: 'Center Stage',
    build() {
      return [
        r(0, 0, 0.27, 0.45),
        r(0.73, 0, 0.27, 0.45),
        r(0, 0.55, 0.27, 0.45),
        r(0.73, 0.55, 0.27, 0.45),
        r(0.27, 0.1, 0.46, 0.8),
      ];
    },
  },
  {
    id: 'four-square',
    name: 'Four Square',
    build() {
      return [
        r(0, 0, 0.5, 0.5),
        r(0.5, 0, 0.5, 0.5),
        r(0, 0.5, 0.5, 0.5),
        r(0.5, 0.5, 0.5, 0.5),
      ];
    },
  },
  {
    id: 'hero-top',
    name: 'Hero Top',
    build() {
      return [
        r(0, 0, 1, 0.58),
        r(0, 0.58, 1 / 3, 0.42),
        r(1 / 3, 0.58, 1 / 3, 0.42),
        r(2 / 3, 0.58, 1 / 3, 0.42),
      ];
    },
  },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}
