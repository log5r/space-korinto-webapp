// Headless, reproducible experiments. Transforms affect this VM only, never the game files.
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('../tests/harness.cjs');
const variants = {
 baseline: {},
 guidedRamp: {spacing:140,y:240,width:70,passage:true,chutes:true,railGap:36,setsPerMult:2},
 guidedRampGrace: {spacing:140,y:240,width:70,passage:true,chutes:true,railGap:36,setsPerMult:2,grace:true},
 guided: {spacing:140,y:240,width:70,passage:true,chutes:true,railGap:36},
 guidedGrace: {spacing:140,y:240,width:70,passage:true,chutes:true,railGap:36,grace:true},
 chutes: {spacing:140,y:240,width:70,passage:true,chutes:true},
 chutesPace: {spacing:140,y:240,width:70,passage:true,chutes:true,repeat:0,bonus:500},
 chutesGrace: {spacing:140,y:240,width:70,passage:true,chutes:true,grace:true},
 channels: {spacing:140, y:240, width:35, passage:true},
 channelsPace: {spacing:140, y:240, width:35, passage:true, repeat:0, bonus:500},
 channelsGrace: {spacing:140, y:240, width:35, passage:true, grace:true},
 spread: { spacing: 110 },
 wide: { spacing: 150 },
 passage: { spacing: 150, passage: true },
 pace: { spacing: 150, passage: true, repeat: 0, bonus: 500 },
 grace: { spacing: 150, passage: true, repeat: 0, bonus: 500, grace: true },
};
function transformFor(v) {
 return (name, source) => {
  if (['core.js','game.js','board.js'].includes(name)) source=fs.readFileSync(path.join(__dirname,'../design/balance/baseline',name),'utf8');
  if (name === 'board.js' && v.spacing) {
   const centers = [300-v.spacing,300,300+v.spacing];
   const ys = centers.map(x => v.y || (x===300?160:200));
   const start=source.indexOf('const laneX ='), end=source.indexOf('// ---------------------------------------------------------------- planet');
   source=source.slice(0,start)+`const laneX = [];
const lanes = ${JSON.stringify(centers)}.map((x,i) => ({ x, y: ${JSON.stringify(ys)}[i], r:9, lit:false }));
for (const l of lanes) {
 for (const x of [l.x-${v.width||17},l.x+${v.width||17}]) { laneX.push(x); seg(x,l.y-28,x,l.y+23,{w:5,e:0.35}); }
 box(l.x-${(v.width||17)+18},l.y-${v.y?65:48},${2*((v.width||17)+18)},${v.y?110:96});
}
\n`+source.slice(end);
  }
  if (name === 'board.js' && v.chutes) {
   source=source.replace('l.y-28,x,l.y+23', `Math.max(128, ARC_CY-Math.sqrt(ARC_R*ARC_R-(x-ARC_CX)**2)+${v.railGap||18}),x,l.y+23`);
   source=source.replace('const px = x + rand(-3, 3), py = y + rand(-2, 2);','const px = x + rand(-3, 3), py = y + rand(-2, 2); if (py < 275) continue;');
  }
  if (name === 'game.js') {
   if(v.passage) {
    source=source.replace('  b.vy += GRAVITY * dt;', '  b.previousX = b.x; b.previousY = b.y;\n  b.vy += GRAVITY * dt;');
    const start=source.indexOf('  for (const l of board.lanes) {',source.indexOf('function checkSensors'));
    const end=source.indexOf('  for (const s of board.stars)',start);
    source=source.slice(0,start)+`  for (const l of board.lanes) {
    if (b.previousY < l.y && b.y >= l.y && b.vy > 0) {
      const x = b.previousX + (b.x-b.previousX)*(l.y-b.previousY)/(b.y-b.previousY);
      if (Math.abs(x-l.x) < ${v.width ? v.width-8 : 10} && b.inLane !== l) { b.inLane=l; onLane(b,l); }
    }
    if (b.inLane===l && b.y>l.y+30) b.inLane=null;
  }
`+source.slice(end);
   }
   if(v.setsPerMult) source=source.replace('if (state.multiplier < MAX_MULTIPLIER) state.multiplier++;', `if (state.multiplier < MAX_MULTIPLIER && state.laneSets % ${v.setsPerMult} === 0) state.multiplier++;`);
   if(v.grace) source=source.replace('board.gate.side);', '(board.gate.clock >= 10 && board.gate.clock % 10 < 1 && h.type !== "black") ? Math.sign(h.x - 300) : board.gate.side);');
  }
  if(name==='core.js' && v.repeat!=null) source=source.replace('LANE_REPEAT_POINTS = 100','LANE_REPEAT_POINTS = '+v.repeat).replace('LANES_BONUS = 1500','LANES_BONUS = '+v.bonus);
  return source;
 };
}
function run(variant, strategy, seed) {
 const {game:g}=load({seed, transform:transformFor(variants[variant])});g.state.modeId='timed';g.startGame();
 const s=g.state; let first2=null, first5=null;
 for(let i=0;i<5401&&s.mode==='playing';i++) {
  const right=Math.floor((s.timeAlive+2)/10)%2;
  if(typeof strategy==='number')s.handle=strategy;
  else if(strategy==='follow')s.handle=right?.8:.1;
  else { // Visit the three power bands until the first multiplier upgrades, then follow the gate.
   s.handle=s.multiplier<3?[.35,.6,.85][Math.floor(s.timeAlive/4)%3]:(right?.8:.1);
  }
  g.update(1/60);
  if(first2===null&&s.multiplier>=2)first2=s.timeAlive;
  if(first5===null&&s.multiplier>=5)first5=s.timeAlive;
 }
 return {seed,score:s.score,multiplier:s.multiplier,sets:s.laneSets,first2,first5,hits:s.hitsByType};
}
if(require.main===module){
 const selected=process.argv[2]||'baseline';const count=+(process.argv[3]||3);
 const strategies=[.1,.3,.5,.6,.7,.8,.95,'follow','build'];
 const rows=[];
 for(const strategy of strategies){const samples=[];for(let seed=1;seed<=count;seed++)samples.push(run(selected,strategy,seed));
 const mean=Math.round(samples.reduce((n,s)=>n+s.score,0)/count);
 const row={variant:selected,strategy,mean,min:Math.min(...samples.map(s=>s.score)),max:Math.max(...samples.map(s=>s.score)),samples};rows.push(row);
 console.log(JSON.stringify({...row,samples:undefined}));}
 fs.writeFileSync(`design/balance/${selected}.json`,JSON.stringify(rows,null,2)+'\n');
}
module.exports={variants,transformFor,run};
