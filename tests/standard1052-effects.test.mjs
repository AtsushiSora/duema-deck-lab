import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const SAW='dmr17-s06',VEN='dm23bd5-003',KUSARI='dmrp22-059';
const DARK='dm01-090',GREEN='dm01-108',WATER='dm01-083',FIRE='dm01-097';
const SEED='dm22ex1-086',REX='dmrp18-060',HIYOKU='dmrp03-035',NEO='dmrp01-087';
const EX='dm23ex2-016',ONIKAMASU='dmrp01-041',KILL='dm01-027';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>decodeBattleData(encodeBattleData(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const live=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);

function add(s,p,z,id){
 const x=inst(id);
 s.players[p][z].push(x);
 return x;
}
function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(GREEN));
  give(s,p,'grave',[]);
 }
 return s;
}
function destroy(s,x){
 const spell=add(s,s.active,'hand',KILL);
 play(s,spell);
 act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid));
 drain(s);
}
function discardPair(s,p,a,b){
 assert.equal(s.decision.player,p);
 assert.ok(choices(s).includes(a.uid));
 pick(s,a.uid);
 assert.ok(live(s,p,'hand',a));
 pick(s,b.uid);
 assert.ok(live(s,p,'grave',a)&&live(s,p,'grave',b));
}

test('Three full official texts preserve IDs, stats, images and legal deck limits',()=>{
 const manifest=read('tools/support-phase-1052.json'),cat=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[SAW,VEN,KUSARI]);
 assert.deepEqual(manifest.printAliases,[]);
 for(const row of manifest.cards){
  const c=e.card(row.id),f=row.faces[0];
  assert.ok(cat.get(row.id).supported&&row.verification.facesMatched);
  assert.equal(cat.get(row.id).id,row.id);
  assert.deepEqual([c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,manifest.regulationVerification.limits[row.id]]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.id,row.image]]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1052}),row.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[row.id]);
 }
 assert.equal(e.card(SAW).breaker,2);
});

test('Chainsaw makes the opponent resolve each destruction separately, including a replaced one',()=>{
 let s=field();
 const saw=add(s,0,'hand',SAW),first=add(s,0,'hand',FIRE),second=add(s,0,'hand',WATER);
 const ex=add(s,1,'battle',EX),untouched=add(s,1,'battle',ONIKAMASU),seed=add(s,1,'battle',SEED);
 const shield=s.players[1].shields[0];
 ex.exLifeShieldUid=shield.uid;
 const all=physical(s);
 play(s,saw);
 assert.ok(live(s,0,'grave',first)&&live(s,0,'grave',second));
 assert.equal(s.decision.player,1);
 assert.deepEqual(new Set(choices(s)),new Set([ex.uid,untouched.uid]));
 pick(s,ex.uid);
 if(s.decision?.type==='leaveReplace')act(s,'replaceExLife');
 assert.ok(live(s,1,'battle',ex)&&live(s,1,'grave',shield));
 s=restore(s);
 pick(s,ex.uid);
 assert.ok(live(s,1,'grave',ex)&&live(s,1,'battle',untouched)&&live(s,1,'battle',seed));
 assert.deepEqual(physical(s),all);
});

for(const real of [true,false])test('Chainsaw excludes cards whose discard is replaced: ordinary discard '+real,()=>{
 let s=field();
 const saw=add(s,0,'hand',SAW),hiyoku=add(s,0,'hand',HIYOKU),host=add(s,0,'battle',NEO);
 const first=add(s,1,'battle',ONIKAMASU),second=add(s,1,'battle',GREEN);
 const ordinary=real?add(s,0,'hand',FIRE):null;
 const all=physical(s);
 play(s,saw);
 assert.equal(s.decision.player,0);
 s=restore(s);
 pick(s,host.uid);
 assert.equal(live(s,0,'battle',host).under[0].uid,hiyoku.uid);
 assert.ok(!live(s,0,'grave',hiyoku));
 if(real){
  assert.ok(live(s,0,'grave',ordinary));
  assert.equal(s.decision.player,1);
  pick(s,first.uid);
  assert.ok(live(s,1,'grave',first));
 }else assert.ok(live(s,1,'battle',first));
 assert.ok(live(s,1,'battle',second));
 assert.equal(s.decision,null);
 assert.deepEqual(physical(s),all);
});

test('Chainsaw can enter with no other cards in hand and stops when the opponent runs out of creatures',()=>{
 const empty=field(),saw=add(empty,0,'hand',SAW),safe=add(empty,1,'battle',WATER);
 play(empty,saw);
 assert.equal(empty.decision,null);
 assert.ok(live(empty,1,'battle',safe));
 live(empty,0,'battle',saw).entered=empty.turn-1;
 attack(empty,saw.uid);
 drain(empty);
 assert.equal(empty.players[1].shields.length,3);
 const s=field(),otherSaw=add(s,0,'hand',SAW),target=add(s,1,'battle',WATER);
 add(s,0,'hand',FIRE);
 add(s,0,'hand',GREEN);
 play(s,otherSaw);
 pick(s,target.uid);
 assert.ok(live(s,1,'grave',target));
 assert.equal(s.decision,null);
});

test('VEN shields before its entry discard and discards again before breaking three shields on attack',()=>{
 let s=field();
 const ven=add(s,0,'hand',VEN),a=add(s,1,'hand',FIRE),b=add(s,1,'hand',WATER),c=add(s,1,'hand',GREEN);
 const shield=s.players[0].deck[0];
 const all=physical(s);
 play(s,ven);
 assert.equal(live(s,0,'battle',ven).exLifeShieldUid,shield.uid);
 assert.ok(live(s,0,'shields',shield));
 discardPair(s,1,a,b);
 assert.ok(live(s,1,'hand',c));
 const next=add(s,1,'hand',FIRE);
 live(s,0,'battle',ven).entered=s.turn-1;
 attack(s,ven.uid);
 s=restore(s);
 discardPair(s,1,c,next);
 drain(s);
 assert.equal(s.players[1].shields.length,2);
 assert.deepEqual(physical(s).filter(uid=>uid!==next.uid),all);
});

test('VEN can block and its EX Life shield replaces the first removal',()=>{
 const s=field(),ven=add(s,0,'hand',VEN),enemy=add(s,1,'battle',GREEN);
 play(s,ven);
 const shield=live(s,0,'battle',ven).exLifeShieldUid;
 s.active=1;
 attack(s,enemy.uid);
 act(s,'block',a=>a.uid===ven.uid);
 drain(s);
 assert.ok(live(s,1,'grave',enemy));
 assert.equal(s.players[0].shields.length,6);
 s.phase='main';
 destroy(s,ven);
 assert.ok(live(s,0,'battle',ven)&&s.players[0].grave.some(x=>x.uid===shield));
 destroy(s,ven);
 assert.ok(live(s,0,'grave',ven));
});

test('Kusari discards two on a Tamaseed and Star Evolution reconstructs that Tamaseed',()=>{
 let s=field();
 const source=add(s,0,'hand',KUSARI),seed=add(s,0,'battle',SEED),invalid=add(s,0,'battle',GREEN);
 const a=add(s,1,'hand',FIRE),b=add(s,1,'hand',WATER),safe=add(s,1,'hand',GREEN);
 play(s,source);
 assert.ok(e.getLegalActions(s).some(x=>x.kind==='evolve'&&x.baseUid===seed.uid));
 assert.ok(!e.getLegalActions(s).some(x=>x.kind==='evolve'&&x.baseUid===invalid.uid));
 act(s,'evolve',x=>x.baseUid===seed.uid);
 s=restore(s);
 discardPair(s,1,a,b);
 assert.ok(live(s,1,'hand',safe));
 assert.equal(live(s,0,'battle',source).under[0].uid,seed.uid);
 s.active=1;
 s.phase='main';
 destroy(s,source);
 assert.ok(live(s,0,'battle',seed)&&live(s,0,'grave',source));
});

for(const baseId of [DARK,REX])test('Kusari can use a creature base without the discard: '+baseId,()=>{
 const s=field(),source=add(s,0,'hand',KUSARI),base=add(s,0,'battle',baseId);
 const hands=[add(s,1,'hand',FIRE),add(s,1,'hand',WATER)];
 // A Tamaseed below the direct creature base does not satisfy the condition.
 base.under=[inst(SEED)];
 play(s,source);
 act(s,'evolve',x=>x.baseUid===base.uid);
 assert.equal(s.decision,null);
 assert.equal(live(s,0,'battle',source).under[0].uid,base.uid);
 assert.deepEqual(s.players[1].hand.map(x=>x.uid),hands.map(x=>x.uid));
});
