import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,drain,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD588_DECK} from '../tools/fixtures/standard588.mjs';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-588.json',import.meta.url)));
const GWD='dmrp04m-s06', ACE='dmr03-044', JACK='dmr03-025', MUTAKING='dmr03-003', BATRAIO='dmd15-001';
const AQUA='dmr01-019', TANK='dmrp05-053', JOLLY='dmex16-016', HATCHIN='dm20-030';
const TOTE='dmrp05-010', BE='dmrp06-026', META='dmrp12-052', DOL='dmr18-060';
const MACK='dmr14-029', SISTER='dmex14-067', METEOR='dmr10-s05', AJISAI='dmsd19-011';
const CLASH='dmrp19-085', FIRE='dm01-097', WATER='dm01-083', BIG='dm01-001', DRAGON='dmx17-008';

function field(){
  const s=setup();
  s.active=0;
  for(const p of [0,1])give(s,p,'deck',Array(26).fill(FIRE));
  return s;
}
function put(s,p,id,zone='battle'){
  const x=inst(id);
  s.players[p][zone].push(x);
  return x;
}
function play(s,id){
  const x=put(s,s.active,id,'hand');
  act(s,'play',a=>a.uid===x.uid&&!a.alternative);
  return x;
}
const choices=s=>s.decision?.choices??[];
const value=o=>o.value?.uid??o.value;
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,v){act(s,'extended',a=>value(choices(s)[a.choice])===v);}
function fight(s,a,b){
  s.phase='main';
  play(s,CLASH);
  pick(s,a.uid);pick(s,b.uid);
}

for(const row of cards)test(row.name+' matches its official verified printing and battle definition',()=>{
  const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:588}),row.spec);
  assert.throws(()=>standardCardSpec(detail,{phase:587}));
  for(const [key,val] of Object.entries(row.spec))assert.deepEqual(c[key],val);
  assert.equal(c.limit,regulationVerification.limits[row.id]);
  assert.equal(c.manaValue,1);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.ok(row.verification.facesMatched);
});

test('Ace can declare multiple copies, hides the unused cards, and resumes after saving',()=>{
  let s=field();
  const a=put(s,0,ACE,'hand'),b=put(s,0,ACE,'hand'),hidden=put(s,0,JACK,'hand'),declined=put(s,0,ACE,'hand');
  fight(s,put(s,0,BIG),put(s,1,FIRE));
  assert.equal(s.decision.task.op,'g34_BattleDeclare588');
  assert.deepEqual(choices(s).map(value),[a.uid,b.uid,declined.uid,null]);
  assert.ok(!JSON.stringify(e.observation(s,1)).includes(a.uid));
  pick(s,a.uid);
  s=JSON.parse(JSON.stringify(s));
  pick(s,b.uid);pick(s,null);
  assert.equal(s.decision.type,'battleWinOrder');
  act(s,'battleWinOrder',x=>x.uid===b.uid);
  assert.deepEqual(s.players[0].battle.filter(x=>x.cardId===ACE).map(x=>x.uid),[b.uid,a.uid]);
  assert.ok(has(s,0,'hand',declined)&&has(s,0,'hand',hidden));
  assert.equal(s.log.filter(x=>x.type==='reveal'&&x.cardId===ACE).length,2);
});

test('Ace drawn from a public victory ability cannot declare for that same victory',()=>{
  const s=field(),available=put(s,0,ACE,'hand');
  give(s,0,'deck',[ACE,...Array(25).fill(FIRE)]);
  const drawn=s.players[0].deck[0];
  put(s,0,GWD);
  fight(s,put(s,0,BIG),put(s,1,FIRE));
  assert.deepEqual(choices(s).map(value),[available.uid,null]);
  pick(s,null);
  assert.ok(!s.decision&&has(s,0,'hand',drawn));
});

test('Jack and Mutaking each require the named allied winner',()=>{
  const s=field(),ace=put(s,0,ACE),jack=put(s,0,JACK,'hand'),boss=put(s,0,MUTAKING,'hand');
  fight(s,ace,put(s,1,WATER));
  assert.deepEqual(choices(s).map(value),[jack.uid,null]);
  pick(s,jack.uid);
  assert.ok(has(s,0,'battle',jack));
  fight(s,put(s,0,BIG),put(s,1,WATER));
  assert.ok(!s.decision);
  assert.ok(has(s,0,'hand',boss));
  const weak=put(s,1,WATER);
  fight(s,jack,weak);
  pick(s,boss.uid);
  assert.equal(s.decision.task.op,'g34_ShieldGrave588');
  const first=put(s,1,FIRE,'shields');
  s.players[1].shields.pop();
  const shield=s.players[1].shields[0];
  shield.shieldStack=[first];
  pick(s,shield.uid);pick(s,null);
  assert.ok(has(s,1,'grave',shield)&&has(s,1,'grave',first));
  assert.equal(s.players[1].shields.length,4);
  assert.ok(has(s,0,'battle',boss));
});

test('Batraio can enter when a fire Dragon wins and then replace a fire ally in a battle',()=>{
  const s=field(),x=put(s,0,BATRAIO,'hand'),dragon=put(s,0,DRAGON);
  fight(s,dragon,put(s,1,WATER));
  pick(s,x.uid);
  assert.ok(has(s,0,'battle',x));
  const fire=put(s,0,FIRE),foe=put(s,1,BIG);
  foe.powerModifiers=[{amount:-4000,expires:'end',who:0}];
  fight(s,fire,foe);
  assert.equal(s.decision.task.op,'g393SG_Battle');
  pick(s,x.uid);
  assert.ok(has(s,0,'battle',fire)&&has(s,1,'grave',foe));
  assert.equal(x.tapped,false);
});

test('Batraio cannot replace a non-fire creature or a battle between allies',()=>{
  const s=field(),fire=put(s,0,FIRE),water=put(s,0,WATER),foe=put(s,1,BIG);
  put(s,0,BATRAIO);
  fight(s,water,foe);
  assert.ok(has(s,0,'grave',water)&&!s.decision);
  fight(s,fire,put(s,0,WATER));
  assert.ok(!s.decision&&has(s,0,'battle',fire));
});

test('GWD draws after its entry battle and after another ally wins',()=>{
  const s=field(),target=put(s,1,WATER);
  play(s,GWD);
  pick(s,target.uid);
  assert.equal(s.players[0].hand.length,1);
  fight(s,put(s,0,BIG),put(s,1,FIRE));
  assert.equal(s.players[0].hand.length,2);
});

test('Aqua Attack looks after a Hunter victory and privately puts one card on the bottom',()=>{
  const s=field(),x=put(s,0,AQUA),[first,second]=s.players[0].deck;
  fight(s,x,put(s,1,FIRE));
  pick(s,true);
  pick(s,second.uid);
  assert.ok(has(s,0,'hand',second));
  assert.equal(s.players[0].deck.at(-1).uid,first.uid);
});

test('Totenton can keep a looked-at card on top or move it to mana',()=>{
  const s=field(),x=put(s,0,TOTE),top=s.players[0].deck[0];
  fight(s,x,put(s,1,FIRE));
  pick(s,null);
  assert.equal(s.players[0].deck[0].uid,top.uid);
  fight(s,x,put(s,1,FIRE));
  pick(s,top.uid);pick(s,'mana');
  assert.ok(has(s,0,'mana',top));
});

for(const id of [JOLLY,AJISAI])test(id+' sends one looked-at card to mana and the other to hand',()=>{
  const s=field(),[first,second]=s.players[0].deck;
  if(id===JOLLY)fight(s,put(s,0,id),put(s,1,WATER));
  else play(s,id);
  pick(s,second.uid);
  drain(s);
  assert.ok(has(s,0,'mana',second)&&has(s,0,'hand',first));
});

test('Tank gains its buff once, and Be only reacts to a different allied winner',()=>{
  const s=field(),tank=put(s,0,TANK),be=put(s,0,BE);
  const tp=e.power(tank,false,s),bp=e.power(be,false,s);
  fight(s,be,put(s,1,WATER));
  assert.equal(e.power(tank,false,s),tp+8000);
  assert.equal(e.effectiveCard(tank,s).breaker,3);
  assert.equal(e.power(be,false,s),bp);
  fight(s,tank,put(s,1,WATER));
  assert.equal(e.power(tank,false,s),tp+8000);
  assert.equal(e.power(be,false,s),bp+3000);
});

test('Hatchin grants the selected ally speed and W-Breaker when a Dream Mate wins',()=>{
  const s=field(),mate=put(s,0,'dm34-052'),ally=put(s,0,FIRE);
  put(s,0,HATCHIN);
  fight(s,put(s,0,BIG),put(s,1,WATER));
  assert.ok(!s.decision);
  fight(s,mate,put(s,1,WATER));
  pick(s,ally.uid);
  assert.equal(e.effectiveCard(ally,s).speedAttacker,true);
  assert.equal(e.effectiveCard(ally,s).breaker,2);
});

test('Metappy untaps on only its first win each turn and tracks a saved game',()=>{
  let s=field(),x=put(s,0,META);
  x.tapped=true;
  fight(s,x,put(s,1,WATER));
  assert.equal(x.tapped,false);
  s=JSON.parse(JSON.stringify(s));
  x=s.players[0].battle[0];
  x.tapped=true;
  fight(s,x,put(s,1,WATER));
  assert.equal(x.tapped,true);
  s.phase='attack';act(s,'endTurn');drain(s);
  fight(s,x,put(s,1,WATER));
  assert.equal(x.tapped,false);
});

test('Dol destroys itself before milling two cards after a win',()=>{
  const s=field(),x=put(s,0,DOL),[first,second]=s.players[0].deck;
  fight(s,x,put(s,1,FIRE));
  assert.deepEqual(s.players[0].grave.filter(y=>y.cardId!==CLASH).map(y=>y.uid),[x.uid,first.uid,second.uid]);
});

test('Sister can decline the ramp, or accept and then return that card to hand',()=>{
  const s=field(),x=put(s,0,SISTER),top=s.players[0].deck[0];
  fight(s,x,put(s,1,WATER));
  pick(s,null);
  assert.equal(s.players[0].deck[0].uid,top.uid);
  fight(s,x,put(s,1,WATER));
  pick(s,true);pick(s,top.uid);
  assert.ok(has(s,0,'hand',top));
});

for(const id of [MACK,METEOR])test(id+' can begin a second battle from the first victory',()=>{
  const s=field(),source=put(s,0,id),winner=id===MACK?put(s,0,BIG):source;
  const a=put(s,1,FIRE),b=put(s,1,WATER),c=put(s,1,WATER),before=physical(s);
  fight(s,winner,a);
  pick(s,b.uid);pick(s,c.uid);
  assert.ok([a,b,c].every(x=>has(s,1,'grave',x)));
  assert.ok(has(s,0,'battle',winner)&&!s.decision&&!s.battleResolution&&!s.battleStack?.length);
  assert.equal(physical(s).length,before.length+1);
});

test('A nested victory resumes other pending wins from the first battle',()=>{
  const s=field(),meteor=put(s,0,METEOR),a=put(s,1,FIRE),b=put(s,1,WATER);
  put(s,0,GWD);
  fight(s,meteor,a);
  act(s,'battleWinOrder',x=>x.cardId===METEOR);
  pick(s,b.uid);
  act(s,'battleWinOrder',x=>x.cardId===GWD);
  assert.ok(!s.battleResolution&&!s.battleStack?.length&&!s.decision);
  assert.equal(s.players[0].hand.length,2);
});

test('legal forty CPU match completes after JSON continuation with all physical cards',()=>{
  assert.deepEqual(e.validateDeck(STANDARD588_DECK),[]);
  let s=e.createGame([STANDARD588_DECK,PRESETS[0]],{seed:58801,first:0}),saved=false;
  const before=physical(s);
  while(s.winner===null&&s.actions<3000&&s.turn<160){
    e.step(s,e.chooseAI(s));
    assert.deepEqual(physical(s),before);
    if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}
  }
  assert.ok(saved);
  assert.notEqual(s.winner,null);
  assert.equal(new Set(physical(s)).size,80);
});
