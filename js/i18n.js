// Local dictionaries; works offline and with file://, without fetching translations.
window.SpaceKorinto.i18n = (() => {
'use strict';
const messages = {
  "ja": {
    "vortexcalm": "光の軌跡を眺めてみよう",
    "vortexwarning": "重力の渦まで {seconds}秒",
    "vortexactive": "重力の渦が発生中 · {seconds}秒",
    "vortexrelease": "重力がゆっくり戻ります",
    "gateGrace": "切り替え猶予 · 両側の得点2倍",
    "gateLeft": "◀ LEFT",
    "gateRight": "RIGHT ▶",
    "gateTimedLow": "弱めに発射 · 左側の得点2倍",
    "gateTimedHigh": "強めに発射 · 右側の得点2倍",
    "gateLowPower": "弱めに発射 · 左側で賞球",
    "gateHighPower": "強めに発射 · 右側で賞球",
    "gateCountdown": "切り替えまで {seconds}秒",
    "tagline": "ハンドルひとつで玉を打ち出し、ピンの小惑星帯をくぐらせてワームホールを狙おう。",
    "rulesSummary": "くわしいルール",
    "modes": "鋼の筐体に組まれた宇宙の盤面。<b>ノーマルモード</b>は持ち玉 30 個からスタートし、玉が尽きたら終了。<b>タイムアタック</b>は玉が無限で 90 秒の制限時間内のスコアを競い、<b>無限モード</b>は玉も時間も無限で好きなだけ続けられます（ポーズ画面の「スコアを確定して終了」でリザルトへ）。",
    "handle": "操作は下の壁にある<b>青く光るハンドルゲージ</b>だけ。ハンドルを回している間、玉は自動で連続発射（ノーマルは毎分 100 発、タイムアタック・無限モードは毎分 200 発）。弱いと左に、強いと右に落ちるので、狙いたい場所に合わせて強さを調整しよう。いちばん左に戻すと発射が止まります。<b>ノーマル・タイムアタック：</b>中段のゲートが10秒ごとに左右へ傾きます。2秒前の予告を見て、左は弱め・右は強めに打ち分けよう。ノーマルは点灯側が通常配当、反対側は得点半分・賞球なし。タイムアタックは点灯側の得点2倍、反対側は通常得点。切り替え直後の1秒間は両側2倍。中央は常に通常得点で、時間延長はありません。",
    "holes": "玉が<b>ワームホール</b>に吸い込まれると得点と<b>賞球</b>（持ち玉の払い出し）が入ります。シアンが 200 点、パープルが 500 点、中央の<b>ブラックホール</b>が 1,000 点。惑星の<b>バンパー</b>は 100 点、スリングショットは 50 点、インレーンの星は 300 点。",
    "lanes": "上部の<b>ハイパースペース・レーン</b>を 3 本すべて通過すると 1,500 点のボーナスと、以降の得点<b>倍率が +1</b>（最大 ×5）。タイムアタックのレーンは左・中央・右に分かれ、下向きに通り抜けると点灯します。",
    "flippers": "下の<b>フリッパーは自動</b>で動きます。落ちてきた玉を打ち上げてもう一度ワームホールを狙えますが、フリッパーの間や外側のレーンに落ちた玉はアウトです。",
    "controls": "<span class=\"kbd\">マウス / タッチ</span> <span class=\"kbd\">← →</span> でハンドル操作 &nbsp; <span class=\"kbd\">P</span> / <span class=\"kbd\">Esc</span> ポーズ &nbsp; <span class=\"kbd\">M</span> ミュート",
    "modeNormal": "ノーマル<small>持ち玉 30 個</small>",
    "modeTimed": "タイムアタック<small>90 秒・玉無限</small>",
    "modeInfinite": "無限モード<small>制限なし</small>",
    "pauseHelp": "<span class=\"kbd\">P</span> / <span class=\"kbd\">Esc</span> / <span class=\"kbd\">Space</span> または下のボタンで再開",
    "start": "スタート",
    "retry": "もう一度",
    "toTitle": "タイトルへ",
    "resume": "再開",
    "finish": "スコアを確定して終了",
    "quit": "やめる",
    "flash": "フラッシュエフェクト（入賞時の画面の光）",
    "aurora": "ボールの光の軌跡（無限モード）",
    "volume": "音量",
    "finishNote": "「スコアを確定して終了」は今のスコアで結果画面へ（ベスト更新あり）。「やめる」はスコアを残さずタイトルに戻ります。",
    "pauseAction": "ポーズ (P)",
    "resumeAction": "再開 (P)",
    "muteAction": "ミュート (M)",
    "unmuteAction": "ミュート解除 (M)",
    "played": "プレイ時間 {time} ／ ",
    "stats": "発射 {shots} 発 ／ ワームホール {hits} 個 ／ 最終倍率 ×{mult}",
    "limitNote": "スコアがプログラムで扱える上限 ({max}) に達しました。{seconds} 秒後にタイトルへ戻ります。"
  },
  "en": {
    "vortexcalm": "FOLLOW THE LIGHT",
    "vortexwarning": "VORTEX IN {seconds}s",
    "vortexactive": "ORBITING · {seconds}s",
    "vortexrelease": "RETURNING TO NORMAL",
    "gateGrace": "GRACE · BOTH SIDES DOUBLE",
    "gateLeft": "◀ LEFT",
    "gateRight": "RIGHT ▶",
    "gateTimedLow": "LOW POWER · DOUBLE LEFT",
    "gateTimedHigh": "HIGH POWER · DOUBLE RIGHT",
    "gateLowPower": "LOW POWER · LEFT PAYS",
    "gateHighPower": "HIGH POWER · RIGHT PAYS",
    "gateCountdown": "SWITCH IN {seconds}s",
    "tagline": "One handle: fire balls through the asteroid belt of pins and drop them into wormholes.",
    "rulesSummary": "Full rules",
    "modes": "A space playfield built into a steel cabinet. <b>Normal mode</b> starts you with 30 balls and ends when they run out. <b>Time Attack</b> gives you unlimited balls and 90 seconds to score. <b>Infinite mode</b> has unlimited balls and no clock, so play as long as you like (use “Finish & save score” on the pause screen to see your results).",
    "handle": "The only control is the <b>blue-lit handle gauge</b> on the bottom rail. While the handle is turned, balls fire automatically (100 a minute in Normal; 200 in Time Attack and Infinite). Weak shots drop on the left, strong shots carry to the right, so adjust the strength to aim. Push it all the way left to stop firing. <b>Normal and Time Attack:</b> the middle gate changes its tilt every 10 seconds, with a 2-second warning. Aim left with low power and right with high power. In Normal, lit pockets pay normally; dim pockets give half points and no balls. In Time Attack, lit pockets score double and dim pockets score normally. Both sides score double for one second after switching. The black hole always scores normally and never adds time.",
    "holes": "A ball swallowed by a <b>wormhole</b> scores points and pays <b>balls</b> back into your stock: cyan 200, purple 500, and the central <b>black hole</b> 1,000. The planet <b>bumpers</b> score 100, the slingshots 50 and the inlane stars 300.",
    "lanes": "Roll through all three <b>hyperspace lanes</b> at the top for a 1,500-point bonus and a permanent <b>+1 to the score multiplier</b> (up to ×5). Time Attack separates the lanes into left, middle and right chutes; cross downward to light them.",
    "flippers": "The <b>flippers swing on their own</b>. They knock falling balls back up for another try at the wormholes, but a ball that drops between them or down an outlane is lost.",
    "controls": "Handle: <span class=\"kbd\">Mouse / Touch</span> or <span class=\"kbd\">← →</span> &nbsp; Pause: <span class=\"kbd\">P</span> / <span class=\"kbd\">Esc</span> &nbsp; Mute: <span class=\"kbd\">M</span>",
    "modeNormal": "Normal<small>30 balls</small>",
    "modeTimed": "Time Attack<small>90 s, unlimited balls</small>",
    "modeInfinite": "Infinite<small>no limits</small>",
    "pauseHelp": "Press <span class=\"kbd\">P</span> / <span class=\"kbd\">Esc</span> / <span class=\"kbd\">Space</span> or use the button below to resume.",
    "start": "Start",
    "retry": "Play again",
    "toTitle": "Title",
    "resume": "Resume",
    "finish": "Finish & save score",
    "quit": "Quit",
    "flash": "Flash effects (screen flashes when a ball scores)",
    "aurora": "Glowing ball trails (Infinite mode)",
    "volume": "Volume",
    "finishNote": "“Finish & save score” opens the results and updates your best score. “Quit” returns to the title without saving this run.",
    "pauseAction": "Pause (P)",
    "resumeAction": "Resume (P)",
    "muteAction": "Mute (M)",
    "unmuteAction": "Unmute (M)",
    "played": "Played {time} / ",
    "stats": "Shots: {shots} / Wormholes: {hits} / Final multiplier: ×{mult}",
    "limitNote": "The score reached the largest value the program can handle ({max}). Returning to the title in {seconds} seconds."
  }
};
// Honor the first supported language in the browser's preference order.
function selectLanguage(languages) {
  for (const tag of languages) {
    if (typeof tag !== 'string') continue;
    const base = tag.toLowerCase().split(/[-_]/)[0];
    if (Object.hasOwn(messages, base)) return base;
  }
  return 'en';
}
const language = selectLanguage(navigator.languages?.length ? navigator.languages : [navigator.language]);
function t(key, values = {}) {
  const message = messages[language][key] ?? messages.en[key] ?? key;
  return message.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);
}
function labelButton(id, key) {
  const button = document.getElementById(id);
  button.title = t(key);
  button.setAttribute('aria-label', t(key));
}
document.documentElement.lang = language;
for (const element of document.querySelectorAll('[data-i18n]')) {
  // Only bundled, trusted dictionary markup is used here.
  element.innerHTML = t(element.dataset.i18n);
}
labelButton('pauseBtn', 'pauseAction');
labelButton('mute', 'muteAction');
return { language, t, labelButton, selectLanguage };
})();
