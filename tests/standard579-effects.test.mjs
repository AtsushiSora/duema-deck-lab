import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD579_DECK} from '../tools/fixtures/standard579.mjs';

const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-579.json',import.meta.url)));
const PERO='dmrp09-092', IDEA='dm22rp2-049', CANNON='dmrp01-025', FLY='dmrp14-078';
const HAM='promoy15-064', PHOTO='dmrp12-056', ONI='dmrp16-019', DEKA='dm22rp1-003';
const KID='dmrp21-010', SUI='dmr14-023', CASTLE='dmr15-041';
const FIRE='dm01-097', WATER='dm01-083', SEED='dmsd20-016', GEAR='dm14-110';
const TWIN='dmex17-105', NEXT='dm24bd3-009', MID='dm26rp3-068', SEVEN='dm01-s01';
const HIGH='dm05-s04', SYNC='dm23rp3-013', DIVER='dm23ex1-003', MULTI='dm23rp4-045';

function field(active=0){
  const s=setup();
  s.active=active;
  for(const p of [0,1])give(s,p,'deck',Array(25).fill(FIRE));
  return s;
}
function put(s,p,id,zone='battle'){
  const x=inst(id);
  s.players[p][zone].push(x);
  return x;
}
function play(s,id){
  const x=put(s,s.active,id,'hand');
  act(s,'play',a=>a.uid===x.uid);
  return x;
}
function pick(s,value){
  act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===value);
}
function seal(s,p,x,id){
  const hidden=put(s,p,id,'seals');
  hidden.faceDown=true;
  hidden.sealOf=x.uid;
  x.sealed=true;
  return hidden;
}
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const options=s=>s.decision?.choices??[];
const targets=s=>options(s).map(o=>o.value?.uid??o.value);

for(const row of manifest.cards)test(row.name+' has a verified complete definition',()=>{
  const detail=details.cards.find(x=>x.id===row.id),c=e.card(row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.throws(()=>standardCardSpec(detail,{phase:578}));
  assert.deepEqual(standardCardSpec(detail,{phase:579}),row.spec);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(c.manaValue,1);
  assert.equal(c.limit,4);
  assert.ok(row.verification.facesMatched);
  if(row.id===HAM){
    assert.equal(row.manaReference.id,'dmr23-028');
    assert.equal(row.manaReference.verification.manaValue,1);
  }
});

for(const id of [PERO,FLY,PHOTO])test(id+' can remove a buried seed or seal and excludes creature cards',()=>{
  let s=field();
  const host=put(s,1,NEXT),base=inst(FIRE),seed=inst(SEED),gear=put(s,1,GEAR),twin=put(s,1,TWIN);
  host.under=[base,seed];
  const locked=put(s,1,FIRE),hidden=seal(s,1,locked,HIGH);
  play(s,id);
  if(id===PHOTO)pick(s,1);
  assert.deepEqual(new Set(targets(s)),new Set([seed.uid,gear.uid,hidden.uid]));
  assert.equal(options(s).find(o=>o.value===hidden.uid).cardId,undefined);
  const before=physical(s);
  s=JSON.parse(JSON.stringify(s));
  pick(s,id===FLY?hidden.uid:seed.uid);
  assert.ok(has(s,1,'grave',id===FLY?hidden:seed));
  assert.ok(has(s,1,'battle',host)&&has(s,1,'battle',twin));
  assert.deepEqual(physical(s),before);
});

test('Idea applies the correct inclusive cost range for each mode',()=>{
  for(const mode of [0,1]){
    const s=field(),low=put(s,1,FIRE),edge=put(s,1,MID),locked=put(s,1,HIGH),hidden=seal(s,1,locked,HIGH);
    const own=put(s,0,MID);
    play(s,IDEA);
    pick(s,mode);
    assert.deepEqual(new Set(targets(s)),new Set(mode===0?[edge.uid]:[low.uid,hidden.uid]));
    pick(s,mode===0?edge.uid:low.uid);
    assert.ok(has(s,1,mode===0?'hand':'grave',mode===0?edge:low)&&has(s,0,'battle',own));
  }
});

test('Rakujou can return an own evolution top while its former base stays',()=>{
  const s=field(),top=put(s,0,NEXT),base=inst(FIRE),high=put(s,1,HIGH),twin=inst(TWIN);
  top.under=[base];
  high.under=[twin];
  play(s,CASTLE);
  const before=physical(s);
  assert.ok(targets(s).includes(twin.uid)&&!targets(s).includes(high.uid));
  pick(s,top.uid);
  assert.ok(has(s,0,'hand',top)&&has(s,0,'battle',base));
  assert.deepEqual(physical(s),before);
});

test('cost matching uses only the active face of a twinpact in play and either cost when it is underneath',()=>{
  const s=field(),top=put(s,1,HIGH),buried=inst(TWIN),visible=put(s,1,TWIN);
  top.under=[buried];
  play(s,CASTLE);
  assert.ok(targets(s).includes(buried.uid));
  assert.ok(!targets(s).includes(visible.uid));
  pick(s,buried.uid);
  assert.ok(has(s,1,'hand',buried)&&has(s,1,'battle',top));
});

test('Hamukatsu can send one chosen opposing multicolor card to its owner’s tapped mana',()=>{
  const s=field(),enemy=put(s,1,MULTI),other=put(s,0,FIRE);
  play(s,HAM);
  pick(s,1);
  assert.ok(targets(s).includes(enemy.uid)&&targets(s).includes(other.uid));
  pick(s,enemy.uid);
  assert.ok(has(s,1,'mana',enemy));
  assert.ok(enemy.tapped);
});

test('Hamukatsu’s sweep respects a current attack-only power bonus',()=>{
  const s=field(1),attacker=put(s,1,FIRE),small=put(s,1,FIRE);
  attacker.buff=2000;
  give(s,0,'shields',[HAM]);
  attack(s,attacker.uid);
  act(s,'noBlock');
  act(s,'useTrigger');
  pick(s,0);
  assert.ok(has(s,1,'battle',attacker)&&has(s,1,'grave',small));
});

for(const total of [6,7])test('Oni Time performs a second selection only at six shields or fewer '+total,()=>{
  const s=field(),low=put(s,1,FIRE),mid=put(s,1,MID);
  give(s,0,'shields',Array(3).fill(FIRE));
  give(s,1,'shields',Array(total-3).fill(FIRE));
  play(s,ONI);
  assert.deepEqual(targets(s),[low.uid]);
  pick(s,low.uid);
  if(total===6){assert.deepEqual(targets(s),[mid.uid]);pick(s,mid.uid);}
  assert.equal(has(s,1,'grave',mid),total===6);
  assert.equal(s.decision,null);
});

test('Dodonga uses the card selection before the extra last-shield sweep',()=>{
  const s=field(1),seed=put(s,1,SEED),seven=put(s,1,SEVEN),high=put(s,1,HIGH),a=put(s,1,FIRE);
  give(s,0,'shields',[CANNON]);
  attack(s,a.uid);
  act(s,'noBlock');
  act(s,'useTrigger');
  assert.deepEqual(new Set(targets(s)),new Set([seed.uid,a.uid]));
  pick(s,seed.uid);
  assert.ok(has(s,1,'grave',seed)&&has(s,1,'grave',seven)&&has(s,1,'grave',a));
  assert.ok(has(s,1,'battle',high));
});

test('Dekabetta bounces an eligible buried twinpact on tapping and gains civil-count benefits',()=>{
  const s=field(),x=put(s,0,DEKA),ally=put(s,0,WATER),third=put(s,0,WATER),host=put(s,1,HIGH),twin=inst(TWIN);
  host.under=[twin];
  assert.equal(e.power(x,false,s),e.card(DEKA).power+6000);
  assert.equal(e.effectiveCard(x,s).breaker,2);
  assert.ok(e.effectiveCard(x,s).untargetable);
  attack(s,x.uid);
  assert.deepEqual(new Set(targets(s)),new Set([twin.uid,null]));
  pick(s,twin.uid);
  assert.ok(has(s,1,'hand',twin));
  s.players[0].battle.splice(s.players[0].battle.indexOf(third),1);
  assert.equal(e.power(x,false,s),e.card(DEKA).power);
  assert.equal(e.effectiveCard(x,s).untargetable,undefined);
  assert.ok(has(s,0,'battle',ally));
});

test('HEAVEN Kid excludes itself and shields one selected opposing card face down',()=>{
  const s=field(),enemy=put(s,1,SEED),own=put(s,0,GEAR),high=put(s,1,MID);
  const x=play(s,KID);
  assert.deepEqual(new Set(targets(s)),new Set([enemy.uid,own.uid,null]));
  pick(s,enemy.uid);
  assert.ok(has(s,1,'shields',enemy)&&has(s,0,'battle',x)&&has(s,1,'battle',high));
  assert.ok(!enemy.faceUp);
});

test('Suiryo can bottom a buried card without moving its host or draw three',()=>{
  for(const mode of [0,1]){
    const s=field(),host=put(s,1,NEXT),base=inst(FIRE);
    host.under=[base];
    play(s,SUI);
    pick(s,mode);
    if(mode===0){pick(s,base.uid);assert.equal(s.players[1].deck.at(-1).uid,base.uid);}
    else assert.equal(s.players[0].hand.length,3);
    assert.ok(has(s,1,'battle',host));
  }
});

test('force targeting applies only if the forced card is selectable',()=>{
  const s=field(),sync=put(s,1,SYNC),diver=put(s,1,DIVER),base=inst(FIRE);
  diver.justDiverActive=true;
  diver.under=[base];
  play(s,CASTLE);
  assert.deepEqual(targets(s),[sync.uid]);
});

test('legal forty CPU match finishes through JSON continuation conserving cards',()=>{
  assert.deepEqual(e.validateDeck(STANDARD579_DECK),[]);
  let s=e.createGame([STANDARD579_DECK,PRESETS[0]],{seed:57901,first:0}),saved=false;
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
