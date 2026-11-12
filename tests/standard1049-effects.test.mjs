import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const INFINITE='dmex15-b029',AZREA='dm24ex1-027',VAL='dmrp19-s08';
const NATURE='dm01-108',FIRE='dm01-097',SEED='dm22ex1-086',FRIED='dm02-012';
const HAND='dm01-027',APUL='dmrp22-042',EX='dm23ex2-016',DAY='dm14-015',ONIKAMASU='dmrp01-041';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const live=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const restore=s=>decodeBattleData(encodeBattleData(s));

function add(s,p,z,id){
 const x=inst(id);
 s.players[p][z].push(x);
 return x;
}
function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(NATURE));
  give(s,p,'grave',[]);
 }
 return s;
}
function resolveAttack(s){
 if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');
 drain(s);
}
function castInfinite(s,x){
 play(s,add(s,0,'hand',INFINITE));
 assert.ok(!choices(s).includes(null));
 pick(s,x.uid);
}
function destroyWithHand(s,x){
 play(s,add(s,s.active,'hand',HAND));
 act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid));
}
function orderByOp(s,op){
 const effect=s.pendingEffects.find(x=>x.task?.defs?.[0]?.op===op);
 assert.ok(effect,op);
 act(s,'orderEffect',a=>a.effectId===effect.effectId);
}

test('Three verified definitions retain the official printing, restrictions, names and IDs',()=>{
 const manifest=read('tools/support-phase-1049.json'),catalogue=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[INFINITE,AZREA,VAL]);
 assert.deepEqual(manifest.printAliases,[]);
 for(const row of manifest.cards){
  const c=e.card(row.id),f=row.faces[0];
  assert.equal(catalogue.get(row.id).id,row.id);
  assert.ok(catalogue.get(row.id).supported&&row.verification.facesMatched);
  assert.deepEqual([c.cost,e.civilizations(c),c.manaValue,c.limit],
   [f.cost,f.civilizations,1,manifest.regulationVerification.limits[row.id]]);
  if(c.type==='creature')assert.deepEqual([c.power,c.race],[Number(f.powerText),f.race]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.id,row.image]]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1049}),row.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[row.id]);
 }
});

test('Infinite Attack Revolution gives one ally +6000 and Powered Breaker even with shields',()=>{
 const s=field(),ally=add(s,0,'battle',FIRE),other=add(s,0,'battle',NATURE);
 const enemy=add(s,1,'battle',FIRE),seed=add(s,0,'battle',SEED);
 play(s,add(s,0,'hand',INFINITE));
 assert.deepEqual(new Set(choices(s)),new Set([ally.uid,other.uid]));
 pick(s,ally.uid);
 assert.equal(e.power(ally,false,s),8000);
 assert.ok(e.effectiveCard(ally,s).poweredBreaker&&!e.effectiveCard(seed,s).poweredBreaker);
 assert.equal(e.power(enemy,false,s),2000);
 attack(s,ally.uid);
 resolveAttack(s);
 assert.equal(s.players[1].shields.length,3);
 assert.ok(ally.tapped);
 act(s,'endTurn');
 drain(s);
 assert.equal(e.power(ally,false,s),2000);
 assert.ok(!e.effectiveCard(ally,s).poweredBreaker);
});

test('Infinite Attack Revolution untaps the same attacker on every attack with zero shields',()=>{
 let s=field();
 give(s,0,'shields',[]);
 const ally=add(s,0,'battle',FIRE);
 castInfinite(s,ally);
 s=restore(s);
 const source=live(s,0,'battle',ally);
 for(const remaining of [3,1]){
  attack(s,source.uid);
  resolveAttack(s);
  assert.equal(s.players[1].shields.length,remaining);
  assert.equal(source.tapped,false);
 }
});

for(const ownAbilityFirst of [true,false])test('Infinite Attack Revolution checks shields on resolution in either effect order '+ownAbilityFirst,()=>{
 const s=field(),ally=add(s,0,'battle',FRIED);
 give(s,0,'shields',[NATURE]);
 const shield=s.players[0].shields[0];
 castInfinite(s,ally);
 attack(s,ally.uid);
 assert.equal(s.decision.type,'effectOrder');
 orderByOp(s,ownAbilityFirst?'ShieldGrave':'IfOwn');
 pick(s,shield.uid);
 resolveAttack(s);
 assert.ok(has(s,0,'grave',shield));
 assert.equal(ally.tapped,!ownAbilityFirst);
});

test('Azrea pays its normal cost from either hand or grave and counts all physical cards in both graves',()=>{
 for(const origin of ['hand','grave']){
  const s=field(),azrea=add(s,0,origin,AZREA);
  give(s,1,'grave',[NATURE,HAND]);
  add(s,0,'grave',SEED);
  const all=physical(s);
  const action=e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===azrea.uid&&(a.origin||'hand')===origin);
  assert.equal(action.cost,4);
  play(s,azrea);
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4);
  assert.equal(e.power(azrea,false,s),6000);
  assert.ok(has(s,0,'battle',azrea)&&!has(s,0,'grave',azrea));
  assert.deepEqual(physical(s),all);
 }
});

test('Azrea respects grave locks and mills the enemy’s top two before counting its Powered Breaker',()=>{
 const s=field(),azrea=add(s,0,'grave',AZREA),apul=add(s,1,'battle',APUL);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===azrea.uid));
 s.players[1].battle.splice(s.players[1].battle.indexOf(apul),1);
 s.players[0].grave.splice(s.players[0].grave.indexOf(azrea),1);
 s.players[0].battle.push(azrea);
 add(s,1,'grave',NATURE);
 const top=s.players[1].deck.slice(0,2),all=physical(s);
 assert.equal(e.power(azrea,false,s),4000);
 attack(s,azrea.uid);
 resolveAttack(s);
 assert.ok(top.every(x=>has(s,1,'grave',x)));
 assert.equal(s.players[0].deck.length,12);
 assert.equal(e.power(azrea,false,s),6000);
 assert.equal(s.players[1].shields.length,3);
 assert.deepEqual(physical(s),all);
});

test('Valhazar puts up its EX Life shield and taps a legal enemy for itself and for another allied creature',()=>{
 const s=field(),val=add(s,0,'hand',VAL),a=add(s,1,'battle',NATURE),b=add(s,1,'battle',FIRE);
 add(s,1,'battle',ONIKAMASU);
 const top=s.players[0].deck[0],all=physical(s);
 play(s,val);
 assert.ok(e.exLifeShields(s,0,val).some(x=>x.uid===top.uid));
 assert.deepEqual(new Set(choices(s)),new Set([a.uid,b.uid]));
 pick(s,a.uid);
 assert.ok(a.tapped&&e.effectiveCard(val,s).speedAttacker);
 play(s,add(s,0,'hand',SEED));
 assert.equal(s.decision,null);
 play(s,add(s,0,'hand',NATURE));
 pick(s,b.uid);
 assert.ok(b.tapped);
 assert.ok(e.getLegalActions({...s,phase:'attack'}).some(a=>a.kind==='attack'&&a.uid===val.uid));
 assert.equal(physical(s).length,all.length+2);
});

test('Valhazar gains one shield and +6000 per opposing destruction and its power expires at turn end',()=>{
 const s=field(),val=add(s,0,'battle',VAL);
 const a=add(s,1,'battle',FIRE),b=add(s,1,'battle',NATURE),[top,second]=s.players[0].deck;
 destroyWithHand(s,a);
 drain(s);
 assert.ok(has(s,0,'shields',top)&&has(s,1,'grave',a));
 assert.equal(e.power(val,false,s),13500);
 destroyWithHand(s,b);
 drain(s);
 assert.ok(has(s,0,'shields',second)&&has(s,1,'grave',b));
 assert.equal(e.power(val,false,s),19500);
 act(s,'toAttack');
 act(s,'endTurn');
 drain(s);
 assert.equal(e.power(val,false,s),7500);
 assert.equal(s.players[0].shields.length,7);
});

test('Valhazar does not trigger when opposing EX Life replaces destruction or when it leaves in the same batch',()=>{
 const s=field(),val=add(s,0,'battle',VAL),enemy=add(s,1,'battle',EX);
 const shield=s.players[1].shields[0];
 enemy.exLifeShieldUid=shield.uid;
 destroyWithHand(s,enemy);
 drain(s);
 assert.ok(has(s,1,'battle',enemy)&&has(s,1,'grave',shield));
 assert.equal(s.players[0].shields.length,5);
 assert.equal(e.power(val,false,s),7500);
 for(const p of [0,1])for(let n=0;n<2;n++)add(s,p,'battle',NATURE);
 play(s,add(s,0,'hand',DAY));
 drain(s);
 assert.ok(has(s,0,'grave',val)&&has(s,1,'grave',enemy));
 assert.equal(s.players[0].shields.length,5);
});

test('Two copies of Infinite Attack Revolution produce separate untap triggers and stack power',()=>{
 const s=field(),ally=add(s,0,'battle',FIRE);
 give(s,0,'shields',[]);
 castInfinite(s,ally);
 castInfinite(s,ally);
 assert.equal(e.power(ally,false,s),14000);
 attack(s,ally.uid);
 assert.equal(s.decision.type,'effectOrder');
 assert.equal(s.pendingEffects.filter(x=>x.task?.defs?.[0]?.op==='IfOwn').length,2);
 orderByOp(s,'IfOwn');
 resolveAttack(s);
 assert.equal(s.players[1].shields.length,2);
 assert.equal(ally.tapped,false);
});

test('Valhazar protected by its own EX Life still sees opposing creatures destroyed in the batch',()=>{
 const s=field(),val=add(s,0,'battle',VAL),original=s.players[0].shields[0];
 val.exLifeShieldUid=original.uid;
 for(let n=0;n<2;n++)add(s,0,'battle',NATURE);
 for(let n=0;n<3;n++)add(s,1,'battle',NATURE);
 play(s,add(s,0,'hand',DAY));
 drain(s);
 assert.ok(has(s,0,'battle',val)&&has(s,0,'grave',original));
 assert.equal(s.players[0].shields.length,7);
 assert.equal(e.power(val,false,s),25500);
});
