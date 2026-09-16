# Space Korinto

**English** | [日本語](README.ja.md)

A one-handle space table in a steel cabinet: fire silver balls up the rail, let them rattle down through an asteroid belt of pins past planet bumpers, and drop them into wormholes. Auto flippers at the bottom knock falling balls back up for another go. Play **Normal** (30 balls), a 90-second **Time Attack**, or the **Infinite mode** with no limits.
Written in plain HTML / CSS / JavaScript (Canvas 2D + Web Audio API) — no build step, no dependencies. Built as a follow-on to [Easy Block Breaker](https://github.com/log5r/EasyBlockBreakerWebapp): same cabinet, same HUD, same ball; a korinto / smart-ball / pinball hybrid with a Space Cadet flavour.

The interface automatically selects Japanese or English from your browser’s language preferences, falling back to English if neither is listed.

## How to play

- Pick a mode on the title screen:
  - **Normal**: you start with **30 balls**. Every shot costs one; wormholes pay balls back. The run ends when the stock is empty and the last ball has left the board.
  - **Time Attack**: unlimited balls, **90 seconds**. The clock is fixed, with no time extensions.
  - **Infinite mode**: unlimited balls, no clock (the TIME plate shows elapsed time). Use "Finish & save score" on the pause screen to go to the results screen.
- The only control is the **blue-lit handle gauge** on the bottom rail. While the handle is turned, balls fire automatically at 100 a minute; push it all the way left (STOP) to hold fire. Weak shots drop off the top arc on the left, strong shots carry over to the right.
- Scoring (all of it scaled by the multiplier):
  | Target | Points | Payout (Normal) |
  | --- | --- | --- |
  | Wormhole, cyan (×2) | 200 | 1 ball |
  | Wormhole, purple (×2) | 500 | 2 balls |
  | Black hole (center) | 1,000 | 4 balls |
  | Planet bumper (×3) | 100 | — |
  | Slingshot (×2) | 50 | — |
  | Inlane star (×2) | 300 | — |
  | Hyperspace lane | 300 (100 once lit) | — |
- Roll through all three **hyperspace lanes** at the top for 1,500 points and a permanent **+1 to the multiplier** (up to ×5). Each launch strength tends to feed one lane, so lighting all three means changing your aim.
- The **flippers swing on their own** whenever a ball falls into the zone above them. A ball that drops between them or down an outlane is out. Balls moving fast upward skip across a wormhole; they are swallowed when they fall in or arrive slowly.
- Your best score is saved per mode in the browser's `localStorage` (the last mode you picked is remembered too).
- The score is capped at `Number.MAX_SAFE_INTEGER` (9,007,199,254,740,991). If you ever reach it, scoring stops there and a "SCORE LIMIT" screen returns you to the title.

- **Normal and Time Attack: a moving diverter gate** changes the flow of balls across the middle of the board. It switches sides every 10 seconds, warns 2 seconds ahead, and swings over 1.5 seconds. Follow the on-board cue: low power for left, high power for right. Pins in its swept area are removed in both modes. In Normal, lit side pockets pay the listed points and balls; dim side pockets give half points and no balls. In Time Attack, lit side pockets score double and dim side pockets score normally; the lane multiplier also applies. The central black hole always pays normally.

### Controls

| Action | Input |
| --- | --- |
| Handle | Mouse / touch position across the board, or <kbd>←</kbd> <kbd>→</kbd> / <kbd>A</kbd> <kbd>D</kbd> |
| Start / retry | <kbd>Space</kbd> / <kbd>Enter</kbd> or the on-screen button |
| Pause / resume | <kbd>P</kbd> / <kbd>Esc</kbd> or the button in the top-right corner (auto-pauses when the tab is hidden); the pause screen also lets you finish now or quit to the title without saving |
| Toggle mute | <kbd>M</kbd> or the button in the top-right corner |
| Volume | Slider on the title screen and the pause screen (remembered in `localStorage`) |

## Running

Just open `index.html` in a browser.

To serve it locally instead:

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765/.

## Tests

The rules and physics run headless in Node (no dependencies):

```bash
for t in tests/i18n.cjs tests/modes.cjs tests/board.cjs tests/score-limit.cjs tests/gate.cjs tests/timed-lanes.cjs; do node "$t" || break; done
```

Use `node scripts/check-balance.cjs --timed` for the fixed 90-second Time Attack comparison across six seeds per strategy.

Run `node scripts/check-balance.cjs` for a reproducible comparison of center, low-power and cue-following play (six seeds, up to 180 seconds each), including duration, score and balls paid per shot.

## Deploy to Cloudflare

Requires Node.js 22 or later and a Cloudflare account:

```bash
npx wrangler@4.131.1 login
npx wrangler@4.131.1 deploy
```

`wrangler.jsonc` configures the `space-korinto` Worker. Deployment automatically runs `scripts/prepare-deploy.cjs` to copy only the game files and license into `dist/`, then publishes them as static assets on `workers.dev`.

## Layout

```
index.html        title / pause / results overlays
css/style.css     overlay styling (from Easy Block Breaker)
js/core.js        constants: cabinet geometry, launch band, scoring, payouts, flipper timing
js/i18n.js        ja / en dictionaries
js/audio.js       synthesized sound effects
js/board.js       playfield layout: pins, lanes, bumpers, wormholes, slingshots, flippers, launch lane
js/renderer.js    cabinet, HUD and ball rendering (from Easy Block Breaker) plus the space playfield
js/game.js        rules, modes, auto flippers, physics, input, loop
tests/*.cjs       headless checks
design/           static colour mock the board was designed from
```

### Time Attack aiming

Three upper chutes separate shots before they scatter through pins. Aim low for left, roughly 45–55% for middle and 65% for right. Downward crossings light the lanes; jitter at a sensor cannot score repeatedly. Completing all three still raises the multiplier by one, up to ×5. Both sides score double for one second after each gate switch.

See [balance report](design/balance/report.md). Run `node scripts/validate-timed-balance.cjs` for the independent-seed sweep of 20 fixed powers and adaptive strategies.
