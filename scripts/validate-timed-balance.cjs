// Independent seeds not used to select the layout. Fixed power sweep plus adaptive policies.
const fs = require('node:fs');
const { load } = require('../tests/harness.cjs');
const count = +(process.argv[2] || 5);
const rows = [];
for (const strategy of [...Array.from({length:20}, (_,i)=>(i+1)/20), 'follow', 'build', 'buildMax']) {
 const samples=[];
 for(let seed=101;seed<101+count;seed++) {
  const {game:g}=load({seed,storage:{korinto_mode:'timed'}});g.startGame();const s=g.state;
  let first2=null,first5=null;
  for(let i=0;i<5401&&s.mode==='playing';i++){
   const right=Math.floor((s.timeAlive+2)/10)%2;
   if(typeof strategy==='number')s.handle=strategy;
   else if(strategy==='follow' || s.multiplier >= (strategy==='buildMax'?5:3))s.handle=right?.65:.1;
   else s.handle=[.15,.5,.65][Math.floor(s.timeAlive/4)%3];
   g.update(1/60);
   if(first2===null&&s.multiplier>=2)first2=s.timeAlive;
   if(first5===null&&s.multiplier>=5)first5=s.timeAlive;
  }
  samples.push({seed,score:s.score,multiplier:s.multiplier,first2,first5,ended:s.endReason,seconds:s.timeAlive,kicks:s.kicks});
 }
 const scores=samples.map(s=>s.score),mean=scores.reduce((a,b)=>a+b,0)/count;
 const row={strategy,mean:Math.round(mean),min:Math.min(...scores),max:Math.max(...scores),sd:Math.round(Math.sqrt(scores.reduce((a,x)=>a+(x-mean)**2,0)/count)),samples};
 rows.push(row);console.log(JSON.stringify({...row,samples:undefined}));
}
fs.writeFileSync('design/balance/validation.json',JSON.stringify(rows,null,2)+'\n');
