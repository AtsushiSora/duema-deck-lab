import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const [row]=JSON.parse(readFileSync(new URL('../tools/support-phase-578.json',import.meta.url))).cards;
const GRIMOIRE='dmrp01-019', FIRE='dm01-097', DARK='dm01-090', SEED='dmsd20-016';
const NEXT='dm24bd3-009', DIVER='dm23ex1-003', SYNC='dm23rp3-013';

function field(active){
  const s=setup();
  s.active=active;
  for(const p of [0,1])give(s,p,'deck',Array(20).fill(FIRE));
  return s;
}
function put(s,p,id,zone='battle'){
  const x=inst(id);
  s.players[p][zone].push(x);
  return x;
}
function pick(s,value){
  act(s,'extended',a=>s.decision.choices[a.choice].value===value);
}
function shieldCast(s,p,remaining=0){
  const x=put(s,p,GRIMOIRE,'shields');
  s.players[p].shields=[x,...Array.from({length:remaining},()=>inst(FIRE))];
  const attacker=put(s,1-p,FIRE);
  attack(s,attacker.uid);
  act(s,'noBlock');
  act(s,'useTrigger',a=>a.uid===x.uid);
  return x;
}
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const targets=s=>s.decision?.choices?.map(q=>q.value)??[];

test('Grimoire uses the full official card data and correct printing',()=>{
  const d=details.cards.find(c=>c.id===GRIMOIRE),c=e.card(GRIMOIRE);
  assert.equal(row.id,GRIMOIRE);
  assert.deepEqual(d.faces,row.faces);
  assert.throws(()=>standardCardSpec(d,{phase:577}));
  assert.deepEqual(standardCardSpec(d,{phase:578}),row.spec);
  assert.ok(row.verification.facesMatched);
  assert.equal(c.limit,4);
  assert.equal(c.manaValue,1);
  assert.equal(CARD_IMAGES[GRIMOIRE],row.image);
  const unsupported=details.cards.find(c=>c.id==='dmrp01-025');
  assert.throws(()=>standardCardSpec(unsupported,{phase:578}));
});

for(const n of [0,1,2])test('normal casting can draw '+n+' and then discards even at zero shields',()=>{
  const s=field(0),spell=put(s,0,GRIMOIRE,'hand'),discard=put(s,0,DARK,'hand');
  spell.superTrigger=true;
  s.players[0].shields=[];
  const enemy=put(s,1,SEED),before=physical(s);
  act(s,'play',a=>a.uid===spell.uid);
  for(let i=0;i<n;i++)pick(s,true);
  if(n<2)pick(s,null);
  assert.equal(s.decision.task.op,'discard');
  pick(s,discard.uid);
  assert.equal(s.players[0].deck.length,20-n);
  assert.ok(has(s,0,'grave',discard)&&has(s,0,'grave',spell)&&has(s,1,'battle',enemy));
  assert.equal(s.decision,null);
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);
  assert.deepEqual(physical(s),before);
});

for(const p of [0,1])for(const remaining of [0,1])test('shield trigger adds the bonus only with zero shields left '+p+' '+remaining,()=>{
  let s=field(1-p);
  give(s,p,'mana',[]);
  const enemy=put(s,1-p,SEED),discard=put(s,p,DARK,'hand'),spell=shieldCast(s,p,remaining);
  pick(s,true);
  pick(s,null);
  assert.equal(s.decision.task.op,'discard');
  pick(s,discard.uid);
  if(!remaining){
    assert.equal(s.decision.task.op,'g34_BattleCardBounce578');
    assert.ok(targets(s).includes(enemy.uid));
    s=JSON.parse(JSON.stringify(s));
    pick(s,enemy.uid);
  }
  assert.equal(s.decision,null);
  assert.equal(has(s,1-p,'hand',enemy),!remaining);
  assert.ok(has(s,p,'grave',spell));
  assert.equal(s.players[p].mana.length,0);
});

for(const upper of [false,true])test('the last-shield bonus can return one card in an evolution stack '+upper,()=>{
  const s=field(1),top=put(s,1,NEXT),base=inst(FIRE);
  top.under=[base];
  const discard=put(s,0,DARK,'hand');
  shieldCast(s,0);
  const before=physical(s);
  pick(s,null);
  pick(s,discard.uid);
  assert.ok(targets(s).includes(top.uid)&&targets(s).includes(base.uid));
  pick(s,upper?top.uid:base.uid);
  assert.ok(has(s,1,'hand',upper?top:base));
  assert.ok(has(s,1,'battle',upper?base:top));
  assert.deepEqual(physical(s),before);
});

test('seals are legal choices with hidden identities, while a sealed creature is ignored',()=>{
  const s=field(1),body=put(s,1,FIRE),sealed=put(s,1,DARK,'seals'),discard=put(s,0,FIRE,'hand');
  sealed.faceDown=true;
  sealed.sealOf=body.uid;
  body.sealed=true;
  shieldCast(s,0);
  pick(s,null);
  pick(s,discard.uid);
  const option=s.decision.choices.find(q=>q.value===sealed.uid);
  assert.match(option.label,/封印/);
  assert.equal(option.cardId,undefined);
  assert.ok(!targets(s).includes(body.uid));
  pick(s,sealed.uid);
  assert.ok(has(s,1,'hand',sealed)&&has(s,1,'battle',body));
  assert.equal(body.sealed,undefined);
});

test('the card target respects Just Diver and the opposing forced target',()=>{
  const s=field(1),diver=put(s,1,DIVER),sync=put(s,1,SYNC),discard=put(s,0,DARK,'hand');
  diver.justDiverActive=true;
  put(s,1,SEED);
  shieldCast(s,0);
  pick(s,null);
  pick(s,discard.uid);
  assert.deepEqual(targets(s),[sync.uid]);
});
