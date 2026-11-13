import test from 'node:test';
import assert from 'node:assert/strict';
import {act,cast,drain,e,give,inst,setup} from './target-fixture.mjs';

const DUEL='dm26ex2-030', APOC='dm26ex1-N011', OMI='dm26ex2-SPR001', SIGN='dm26ex2-046', MAG='dm20-013';
const GREEN='dm01-108', BLUE='dm01-083', FIRE='dm01-097';
const add=(s,p,z,id)=>{const x=inst(id);s.players[p][z].push(x);return x;};
const field=()=>{const s=setup();s.active=0;for(const p of [0,1]){give(s,p,'grave',[]);give(s,p,'deck',Array(18).fill(GREEN));}return s;};
const choose=(s,v)=>act(s,'extended',a=>{const r=s.decision.choices[a.choice].value;return (r?.uid??r)===v;});
const turn=s=>{s.phase='attack';act(s,'endTurn');};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);

test('Duel can reveal a Lost Crusader on charge and bounces at the hand count after drawing',()=>{
 const s=field(),charge=add(s,0,'hand',DUEL),lost=add(s,0,'hand',OMI);
 const equal=add(s,1,'battle','dm01-050'),above=add(s,1,'battle',MAG);
 s.phase='charge';act(s,'charge',a=>a.uid===charge.uid);assert.equal(charge.tapped,true);choose(s,lost.uid);
 assert.equal(charge.tapped,false);
 cast(s,DUEL);assert.equal(s.players[0].hand.length,3);
 assert.ok(has(s,1,'hand',equal));assert.ok(has(s,1,'battle',above));
 assert.equal(e.card(DUEL).trigger,true);
});

test('Apocalypse destroys opposing elements and protects new allied units until the next own start',()=>{
 const s=field(),ally=add(s,0,'battle',GREEN),enemy=add(s,1,'battle',GREEN),enemySeed=add(s,1,'battle','dm25rp4-024');
 cast(s,APOC);
 assert.ok(has(s,0,'battle',ally));assert.ok(has(s,1,'grave',enemy));assert.ok(has(s,1,'grave',enemySeed));
 const newUnit=add(s,0,'battle',BLUE);
 turn(s);act(s,'skipCharge');cast(s,APOC);
 assert.ok(has(s,0,'battle',newUnit));
 turn(s);
 assert.ok(!s.extLimits.some(l=>l.player===0&&l.kind==='g1087ElementsStay'));
 assert.equal(e.card(APOC).gStrike,true);
});

test('Omikami preserves allied Lost Crusaders, exiles other battlefield and grave cards and draws only chosen cards',()=>{
 const s=field(),ally=add(s,0,'battle',GREEN),enemy=add(s,1,'battle',FIRE);
 const alliedLost=add(s,0,'battle',OMI),g0=add(s,0,'grave',BLUE),g1=add(s,1,'grave',BLUE);
 const x=add(s,0,'hand',OMI);
 assert.ok(e.getLegalActions(s).some(a=>a.uid===x.uid&&a.cost===11));
 act(s,'play',a=>a.uid===x.uid);
 assert.ok(has(s,0,'battle',alliedLost));assert.ok(has(s,0,'battle',x));
 assert.ok(has(s,0,'extra',ally));assert.ok(has(s,1,'extra',enemy));
 assert.ok(has(s,0,'extra',g0));assert.ok(has(s,1,'extra',g1));
 choose(s,true);choose(s,null);assert.equal(s.players[0].hand.length,1);
 turn(s);act(s,'skipCharge');cast(s,APOC);assert.ok(has(s,0,'grave',x));
});

test('Lost Sign summons from the shuffled top four and removes the temporary blocker grant next turn',()=>{
 const s=field();give(s,0,'deck',[OMI,GREEN,BLUE,FIRE]);
 const x=s.players[0].deck[0];
 cast(s,SIGN);
 choose(s,x.uid);
 while(s.decision?.task?.op==='g34_Order')act(s,'extended');
 if(s.decision)choose(s,null); // Omikami's summoned entry draws up to three.
 assert.ok(has(s,0,'battle',x));assert.equal(x.summonedTurn,s.turn);
 assert.ok(x.g34Grants.some(g=>g.blocker&&g.spellSource===SIGN));
 assert.equal(s.players[0].deck.length,3);
 turn(s);turn(s);drain(s);
 // Its own leave restriction prevents the scheduled bounce.
 assert.ok(has(s,0,'battle',x));assert.ok(!x.g34Grants.some(g=>g.blocker&&g.turn===s.turn));
});

test('Lost Sign returns its actual summoned creature at the next own start',()=>{
 const s=field(),mizu='dm25ex2-004';give(s,0,'deck',[mizu,GREEN,BLUE,FIRE]);
 const x=s.players[0].deck[0];cast(s,SIGN);choose(s,x.uid);drain(s);
 assert.ok(has(s,0,'battle',x));
 turn(s);turn(s);drain(s);
 assert.ok(has(s,0,'hand',x));
});

test('Magnum triggers on its own free entry and a free spell, but not an ordinary mana payment',()=>{
 const s=field(),m=add(s,0,'grave',MAG);
 cast(s,'dm19-027');choose(s,m.uid);choose(s,m.uid);assert.ok(has(s,0,'grave',m));
 cast(s,MAG);const survivor=add(s,0,'battle',GREEN);
 cast(s,BLUE);assert.ok(has(s,0,'battle',survivor));
 give(s,0,'mana',[]);give(s,0,'battle',[MAG,BLUE,BLUE,BLUE,BLUE]);const victim=s.players[0].battle[1];
 cast(s,'dm22rp2-014');choose(s,victim.uid);
 assert.ok(has(s,0,'grave',victim));assert.equal(s.players[0].hand.length,3);
});
