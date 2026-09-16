// Playfield layout: asteroid-belt pins, hyperspace lanes, planet bumpers, wormholes, slingshots and the auto flippers.
// Coordinates are logical canvas units; the field runs from FIELD_L to Rgt horizontally and T to B vertically,
// with the semicircular arc rail closing the top.
window.SpaceKorinto.createBoard = function () {
'use strict';
const { L, Rgt, T, B, R, PIN_R, FIELD_L, CX, ARC_CX, ARC_CY, ARC_R, HOLES, FLIPPER_LEN, rand } = window.SpaceKorinto;
const mirror = x => 2 * CX - x;

const pins = [], segs = [], keepOut = [];
const pin = (x, y) => { pins.push({ x, y, r: PIN_R, flash: 0 }); };
const pinRow = (x0, y0, x1, y1, n) => { for (let i = 0; i < n; i++) { const t = n === 1 ? 0 : i / (n - 1); pin(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t); } };
const pinRowM = (x0, y0, x1, y1, n) => { pinRow(x0, y0, x1, y1, n); pinRow(mirror(x0), y0, mirror(x1), y1, n); };
const seg = (ax, ay, bx, by, o = {}) => { const s = { ax, ay, bx, by, e: 0.45, ...o }; segs.push(s); return s; };
const box = (x, y, w, h) => keepOut.push({ x, y, w, h });   // scattered pins are not generated inside these

// ---------------------------------------------------------------- hyperspace lanes (top centre)
const laneX = [250, 283, 317, 350];
for (const x of laneX) seg(x, 128, x, 178, { w: 5, e: 0.35 });
const lanes = [266, 300, 334].map(x => ({ x, y: 160, r: 9, lit: false }));
box(222, 104, 156, 100);

// ---------------------------------------------------------------- planet bumpers
const bumpers = [
  { x: 215, y: 300, r: 26, flash: 0, cool: 0, base: '#d64a9c', dark: '#5a1247', ring: '#ff9ad1' },
  { x: 385, y: 300, r: 26, flash: 0, cool: 0, base: '#3f8cff', dark: '#123a7a', ring: '#8fd8ff' },
  { x: 300, y: 380, r: 26, flash: 0, cool: 0, base: '#f0a03a', dark: '#7a4610', ring: '#ffd9a3' },
];
for (const b of bumpers) box(b.x - 50, b.y - 50, 100, 100);

// ---------------------------------------------------------------- wormholes (scoring pockets)
const holes = [];
function hole(type, x, y) {
  const h = { type, x, y, flash: 0, spin: rand(0, 6), ...HOLES[type] };
  holes.push(h);
  box(x - h.r - 30, y - h.r - 30, h.r * 2 + 60, h.r * 2 + 60);
  return h;
}
hole('small', 120, 430); hole('small', mirror(120), 430);
hole('mid', 170, 560);   hole('mid', mirror(170), 560);
hole('black', CX, 600);
// pin rims: a pair either side of each hole so a ball has to drop in from above
pin(100, 430); pin(140, 430); pin(mirror(100), 430); pin(mirror(140), 430);
pin(150, 560); pin(190, 560); pin(mirror(150), 560); pin(mirror(190), 560);
pin(262, 596); pin(mirror(262), 596); pin(CX, 564);   // the black hole's rim: only an off-centre, unhurried drop gets in
// a shelf of pins on each side above the outlanes, and sparse scatter pins between the holes
pinRowM(86, 610, 206, 610, 6);
for (const [x, y] of [[98, 372], [128, 388], [160, 376], [236, 452], [212, 500], [118, 490], [90, 520], [246, 530], [232, 570]]) { pin(x, y); pin(mirror(x), y); }
pin(280, 640); pin(mirror(280), 640);
// a small asteroid cluster between the flippers and the black hole scatters shots coming up the middle
for (const [x, y] of [[300, 656], [268, 682], [332, 682], [300, 708], [236, 706], [364, 706]]) pin(x, y);

// ---------------------------------------------------------------- lower playfield
// outlane dividers, inlane stars, slingshots, flipper guides
seg(82, 660, 82, 740, { w: 4 }); seg(mirror(82), 660, mirror(82), 740, { w: 4 });
const stars = [{ x: 100, y: 715, r: 9, flash: 0 }, { x: mirror(100), y: 715, r: 9, flash: 0 }];
const slings = [];
function makeSling(pts, mirrored) {
  const p = pts.map(([x, y]) => [mirrored ? mirror(x) : x, y]);
  const [A, B2, C] = p;
  const dx = C[0] - A[0], dy = C[1] - A[1], l = Math.hypot(dx, dy);
  let nx = dy / l, ny = -dx / l;
  if ((mirrored && nx > 0) || (!mirrored && nx < 0)) { nx = -nx; ny = -ny; }
  const sl = { pts: p, flash: 0, cool: 0, nx, ny };
  seg(A[0], A[1], C[0], C[1], { e: 0.3, sling: sl });
  seg(A[0], A[1], B2[0], B2[1]); seg(B2[0], B2[1], C[0], C[1]);
  slings.push(sl);
}
makeSling([[118, 664], [118, 718], [172, 736]], false);
makeSling([[118, 664], [118, 718], [172, 736]], true);
const flippers = [
  { px: 212, py: 808, len: FLIPPER_LEN, r0: 8, r1: 5, rest: 0.5, active: -0.55, angle: 0.5, omega: 0, pressed: false, hold: 0, cool: 0, side: 'L' },
  { px: mirror(212), py: 808, len: FLIPPER_LEN, r0: 8, r1: 5, rest: Math.PI - 0.5, active: Math.PI + 0.55, angle: Math.PI - 0.5, omega: 0, pressed: false, hold: 0, cool: 0, side: 'R' },
];
// the guides meet the top of the flipper's pivot boss flush, so a ball rolls straight from the guide onto the flipper
seg(82, 740, flippers[0].px, flippers[0].py - flippers[0].r0 + 2.5, { w: 5, e: 0.35 });
seg(mirror(82), 740, flippers[1].px, flippers[1].py - flippers[1].r0 + 2.5, { w: 5, e: 0.35 });
const drain = { x: CX, w: 120 };

// ---------------------------------------------------------------- asteroid belt
// a jittered hexagonal grid of pins under the arc; the middle of the board stays open apart from the guide rows above
const SPACING = 28;
box(FIELD_L, T, 26, B - T); box(Rgt - 26, T, 26, B - T);   // keep clear of the side walls
for (let row = 0, y = T + 36; y < 336; row++, y += SPACING * 0.87) {
  const off = row % 2 ? SPACING / 2 : 0;
  for (let x = FIELD_L + 24 + off; x < Rgt - 20; x += SPACING) {
    const px = x + rand(-3, 3), py = y + rand(-2, 2);
    // must sit well inside the arc so a ball can still pass between the pin and the rail
    if (py < ARC_CY && Math.hypot(px - ARC_CX, py - ARC_CY) > ARC_R - 2 * R - PIN_R - 6) continue;
    if (keepOut.some(k => px > k.x && px < k.x + k.w && py > k.y && py < k.y + k.h)) continue;
    if (pins.some(n => Math.hypot(n.x - px, n.y - py) < 2 * R + 2 * PIN_R + 3)) continue;
    pin(px, py);
  }
}
// edge pins: set almost into the side walls so a ball running down a wall is bumped back into the field
// (they sit closer to the wall than the ball's radius, so a ball can never come to rest on top of one)
for (let y = ARC_CY + 40; y < 640; y += 58) { pin(FIELD_L + 6, y); pin(Rgt - 6, y + 29); }

// ---------------------------------------------------------------- launch lane
// the lane's inner wall runs from the bottom rail up to where the arc begins; the flap at its top is a one-way gate so
// a ball that fails to clear the arc rolls out into the field instead of dropping back down the lane
seg(FIELD_L, ARC_CY, FIELD_L, B, { e: 0.2 });
{
  const ax = L, ay = ARC_CY - 12, bx = FIELD_L + 2 * R + 4, by = ARC_CY + 2;
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
  segs.push({ ax, ay, bx, by, e: 0.1, oneWay: true, nx: dy / len, ny: -dx / len, flap: true });
}

// The Normal / Time Attack diverter sweeps a clear pocket below the planets.
const gate = { px: CX, py: 478, len: 110, r0: 6, r1: 6,
  angle: -0.42, omega: 0, clock: 0, side: -1, warning: false };
for (const n of pins) n.gateZone = Math.abs(n.x - CX) < 128 && Math.abs(n.y - gate.py) < 66;

// pins are looked up through a coarse grid so each ball only tests the ones around it
const CELL = 40;
const grid = new Map();
const key = (cx, cy) => cx + ',' + cy;
for (const n of pins) {
  const cx = Math.floor(n.x / CELL), cy = Math.floor(n.y / CELL);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const k = key(cx + i, cy + j);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(n);
  }
}
const pinsNear = (x, y) => grid.get(key(Math.floor(x / CELL), Math.floor(y / CELL))) || [];

return { gate, pins, segs, laneX, lanes, bumpers, holes, stars, slings, flippers, drain, pinsNear, mirror };
};
