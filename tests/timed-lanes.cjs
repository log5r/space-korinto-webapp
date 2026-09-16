const assert = require('node:assert/strict');
const { load } = require('./harness.cjs');
const {game:g,click,consts}=load({seed:31,storage:{korinto_mode:'timed'}});
const s=g.state;
g.startGame();
assert.deepEqual(Array.from(g.board.lanes,l=>l.x),[160,300,440]);
assert.ok(!g.board.pins.some(p=>p.y<275),'the chutes must stay clear');
function ball(y,vy) {return {x:160,y,vx:0,vy,r:8,trail:[],age:0,still:0};}
s.handle=0;s.balls=[ball(241,-300)];g.update(1/60);
assert.equal(s.hitsByType.lane,undefined,'upward crossing gives no credit');
s.balls=[ball(239,200)];g.update(1/60);
assert.equal(s.hitsByType.lane,1,'downward crossing scores');
const b=s.balls[0];b.y=239;b.vy=200;g.update(1/60);
assert.equal(s.hitsByType.lane,1,'a bounce at the sensor cannot score twice');
b.y=275;b.vy=200;g.update(1/60);
b.x=160;b.y=239;b.vy=200;g.update(1/60);
assert.equal(s.hitsByType.lane,2,'leaving below rearms a later real pass');
const left=g.board.holes.find(h=>h.x<300&&h.type==='mid');
for(const [clock,double] of [[0,false],[9.999,false],[10,true],[10.999,true],[11,false],[20,true]]) {
 assert.equal(consts.holeReward(left,'timed',1,clock).points,left.points*(double?2:1));
 assert.equal(consts.holeReward(left,'normal',1,clock).points,left.points/2);
}
const black=g.board.holes.find(h=>h.type==='black');
assert.equal(consts.holeReward(black,'timed',1,10).points,1000);
click('modeNormal');g.startGame();
assert.equal(g.board.timed,false);
assert.deepEqual(Array.from(g.board.lanes,l=>l.x),[266,300,334]);
click('modeTimed');g.startGame();
assert.deepEqual(Array.from(g.board.lanes,l=>l.x),[160,300,440]);
assert.ok(g.board.lanes.every(l=>!l.lit));
console.log('Timed lanes passed: passage direction, rearming, grace boundaries, black hole and mode switching.');

// Exercise the new chute geometry with real moving balls across all three power bands.
for (let i = 0; i < 5401 && s.mode === 'playing'; i++) {
  s.handle = [.15, .5, .65][Math.floor(i / 240) % 3];
  g.update(1 / 60);
  for (const b of s.balls) {
    assert.ok([b.x, b.y, b.vx, b.vy].every(Number.isFinite));
    assert.ok(b.x >= consts.L + consts.R - 0.5 && b.x <= consts.Rgt - consts.R + 0.5);
    assert.ok(b.y >= consts.T + consts.R - 0.5);
    assert.ok(b.age < 60);
  }
}
assert.equal(s.endReason, 'time');
console.log('Timed chute physics passed: finite motion, containment, no permanent stalls and timed finish.');
