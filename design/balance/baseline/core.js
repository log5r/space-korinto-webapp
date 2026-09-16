// Shared configuration and helpers; classic scripts also support file:// URLs.
window.SpaceKorinto = (() => {
'use strict';

// ---------------------------------------------------------------- constants
const W = 600, H = 880;            // logical canvas size
const HUD_H = 76;                  // top plaque
const WALL = 28;                   // steel rail thickness
const L = WALL, Rgt = W - WALL, T = HUD_H + WALL, B = H - WALL;  // interior bounds
const R = 8;                       // ball radius
const PIN_R = 2.8;                 // silver pin radius
const LANE_W = 22;                 // launch lane along the left rail
const FIELD_L = L + LANE_W;        // playfield starts right of the lane
const CX = 300;                    // the board is mirror-symmetric around this line
// the top of the playfield is a semicircle: balls fired up the lane ride along it and drop off somewhere along the way
const ARC_CX = (L + Rgt) / 2, ARC_R = (Rgt - L) / 2, ARC_CY = T + ARC_R;
const GRAVITY = 1500;
const MAX_SPEED = 2100;
// launch strength maps linearly onto this band; the low end drops the ball off the arc early (left side),
// the high end carries it all the way over to the right
const LAUNCH_MIN = 1400, LAUNCH_MAX = 1700;
const LAUNCH_INTERVAL = 0.6;       // 100 balls a minute
const HANDLE_DEAD = 0.04;          // gauge below this = handle released, nothing fires
const TIME_LIMIT = 90;             // seconds in the timed mode
const START_BALLS = 30;            // normal-mode stock
const MAX_BALLS_IN_PLAY = 40;
// wormholes: points scored and balls paid back into the stock per entry; time attack uses a fixed clock
const HOLES = {
  small: { label: '200',  points: 200,  payout: 1, color: '#4ff5ff', r: 15 },
  mid:   { label: '500',  points: 500,  payout: 2, color: '#c46bff', r: 15 },
  black: { label: 'BLACK HOLE', points: 1000, payout: 4, color: '#ffd23f', r: 19 },
};
const BUMPER_POINTS = 100, BUMPER_KICK = 620;
const SLING_POINTS = 50, SLING_KICK = 420;
const STAR_POINTS = 300;           // inlane rollover stars
const LANE_POINTS = 300, LANE_REPEAT_POINTS = 100, LANES_BONUS = 1500;
const MAX_MULTIPLIER = 5;          // every full set of hyperspace lanes adds one
// flippers swing on their own: a ball falling into the catch zone above a flipper triggers it
const FLIPPER_LEN = 70, FLIPPER_SPEED = 22, FLIPPER_HOLD = 0.16, FLIPPER_COOLDOWN = 0.12;
// the score is a plain JS number: past MAX_SAFE_INTEGER integer arithmetic loses precision, so the run ends there
const SCORE_MAX = Number.MAX_SAFE_INTEGER;
const SCORE_LIMIT_RETURN = 8;      // seconds the SCORE LIMIT screen stays up before returning to the title
// Side pockets pay their usual reward only on the lit side in Normal mode.
function holeReward(h, modeId, side) {
  const lit = modeId === 'infinite' || h.type === 'black' || Math.sign(h.x - CX) === side;
  if (modeId === 'timed') return { points: h.points * (lit && h.type !== 'black' ? 2 : 1), payout: 0, lit };
  return { points: lit ? h.points : h.points / 2, payout: lit ? h.payout : 0, lit };
}
// ---------------------------------------------------------------- utils
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;

return { W, H, HUD_H, WALL, L, Rgt, T, B, R, PIN_R, LANE_W, FIELD_L, CX, ARC_CX, ARC_CY, ARC_R, GRAVITY, MAX_SPEED, LAUNCH_MIN, LAUNCH_MAX, LAUNCH_INTERVAL, HANDLE_DEAD,
         TIME_LIMIT, START_BALLS, MAX_BALLS_IN_PLAY, HOLES, BUMPER_POINTS, BUMPER_KICK, SLING_POINTS, SLING_KICK, STAR_POINTS,
         LANE_POINTS, LANE_REPEAT_POINTS, LANES_BONUS, MAX_MULTIPLIER, FLIPPER_LEN, FLIPPER_SPEED, FLIPPER_HOLD, FLIPPER_COOLDOWN, SCORE_MAX, SCORE_LIMIT_RETURN, holeReward, clamp, rand, lerp };
})();
