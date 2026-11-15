import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {handCardModel} from '../dist/hand-ui.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const ZAESSA='dm26rp3-061',BAGIN='dm26rp3-066',CHUCHURIS='dm26rp3-071',RUGUNDODO='dm26rp3-075';
const ids=[ZAESSA,BAGIN,CHUCHURIS,RUGUNDODO];
const BASIC='dm01-108',BOLS='dm01-008',LAND='dm26ex2-008',WATER='dm01-083';
const SEED='dmsd20-005',KAMA='dmrp01-041',MAGNIE='dm26rp3-042',LOCK='dmrp22-027';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(BASIC));
 return s;
}
function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const choices=s=>s.decision?.choices?.map(value)??[];

test('four verified original IDs resolve with the current limits, image and complete ability',()=>{
 const m=read('tools/support-phase-1319.json'),registry=createCatalogue(snapshot,data.cards,details);
 const {prints}=read('tools/image-reference-prints.json');
 assert.deepEqual(m.cards.map(c=>c.id),ids);
 assert.deepEqual(m.printAliases,[]);
 for(const {id,name,image,source,faces,spec} of m.cards){
  const c=e.card(id),f=faces[0];
  assert.deepEqual(standardCardSpec({id,name,faces,status:'complete'},{phase:1319}),spec);
  assert.deepEqual(prints.find(x=>x.id===id),{id,canonicalId:id,name,image,source});
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.limit,e.manaValue(c)],
   [f.cost,Number(f.powerText)||0,f.race,f.civilizations,4,1]);
  for(const [key,v] of Object.entries(spec))assert.deepEqual(c[key],v);
  assert.equal(CARD_IMAGES[id],image);
  assert.equal(e.playFaces(c).length,faces.length);
  assert.deepEqual(e.playFaces(c).map(f=>[f.name,f.type,f.cost,!!f.trigger]),
   [[faces[0].name,'seed',2,false],[faces[1].name,'spell',faces[1].cost,true]]);
  assert.equal(c.sasage,2);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck({...deck,cards:registry.resolveRows(deck.cards)}),[]);
 }
});

const tappedMana=(s,p)=>s.players[p].mana.filter(x=>x.tapped).length;
const validSasage=(s,card)=>e.getLegalActions(s).filter(a=>a.kind==='play'&&a.uid===card.uid&&a.alternative==='sasage');
const play=(s,id,face=0)=>{
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face&&!a.alternative);
 return x;
};
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

for(const id of ids)test('seed side costs two and its physical card pays Sasage 2 for a Dispector '+id,()=>{
 const s=field(),source=play(s,id);
 const a=add(s,0,'hand',MAGNIE),normal=add(s,0,'hand',BOLS);
 assert.ok(has(s,0,'battle',source));
 assert.ok(!e.isCreature(s,source));
 assert.equal(tappedMana(s,0),2);
 assert.equal(validSasage(s,normal).length,0);
 const reduced=validSasage(s,a).find(action=>action.sasage?.includes(source.uid));
 assert.equal(reduced.cost,3);
 assert.equal(reduced.face,0);
 const before=physical(s);
 act(s,'play',action=>action.uid===a.uid&&action.sasage?.includes(source.uid));
 drain(s);
 assert.equal(tappedMana(s,0),5);
 assert.ok(has(s,0,'grave',source)&&has(s,0,'battle',a));
 assert.deepEqual(physical(s),before);
});

test('hand controls expose the correct destination and action for each face',()=>{
 const s=field(),source=add(s,0,'hand',ZAESSA);
 const front=handCardModel(s,source.uid,0),back=handCardModel(s,source.uid,1);
 assert.equal(front.face.name,'ザエッサの海影');
 assert.equal(back.face.name,'六奇怪の無 ～氾濫する覇王～');
 assert.deepEqual(front.destinations,['battle']);
 assert.deepEqual(back.destinations,['spell']);
 assert.deepEqual(front.faceActions.map(a=>[a.face||0,a.cost]),[[0,2]]);
 assert.deepEqual(back.faceActions.map(a=>[a.face,a.cost]),[[1,3]]);
});

test('three donated seeds cap the reduced Dispector cost at one and can resume from mana payment',()=>{
 let s=field();
 const donors=ids.slice(0,3).map(id=>add(s,0,'battle',id)),a=add(s,0,'hand',MAGNIE);
 const action=validSasage(s,a).find(action=>action.sasage.length===3);
 assert.equal(action.cost,1);
 const before=physical(s);
 e.step(s,action,{manualMana:true});
 assert.equal(s.decision.type,'manaPayment');
 assert.ok(donors.every(x=>has(s,0,'battle',x)));
 s=JSON.parse(JSON.stringify(s));
 const payment=s.decision.pool.find(x=>x.colors?.includes('火'))??s.players[0].mana.find(x=>e.card(x).civ==='火');
 act(s,'selectMana',a=>a.uid===payment.uid);
 act(s,'confirmMana');
 drain(s);
 assert.ok(donors.every(x=>has(s,0,'grave',x))&&has(s,0,'battle',a));
 assert.equal(tappedMana(s,0),1);
 assert.deepEqual(physical(s),before);
});

test('Sasage is unavailable for a hidden, out-of-zone, or ignored donor',()=>{
 const s=field(),a=add(s,0,'hand',MAGNIE);
 for(const zone of ['hand','mana','grave','shields'])add(s,0,zone,ZAESSA);
 const hidden=add(s,0,'battle',BAGIN,{sealed:true}),ignored=add(s,0,'battle',RUGUNDODO,{g35Ignored:s.turn});
 assert.equal(validSasage(s,a).length,0);
 delete ignored.g35Ignored;
 assert.deepEqual(validSasage(s,a).map(a=>a.sasage),[[ignored.uid]]);
 add(s,1,'battle',LOCK);
 assert.equal(validSasage(s,a).length,0);
 assert.ok(has(s,0,'battle',hidden));
});

const dest={[ZAESSA]:'hand',[BAGIN]:'grave',[CHUCHURIS]:'grave',[RUGUNDODO]:'mana'};
for(const id of ids)test('broken shield offers only the spell face as a free S Trigger '+id,()=>{
 const s=field();
 s.active=1;
 give(s,0,'shields',[id,BASIC,BASIC]);
 give(s,0,'mana',[]);
 const shield=s.players[0].shields[0],attacker=add(s,1,'battle',BASIC),
  target=add(s,1,'battle',id===ZAESSA||id===RUGUNDODO?SEED:WATER);
 const before=physical(s);
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='useTrigger').map(a=>a.face),[1]);
 act(s,'useTrigger',a=>a.face===1);
 assert.ok(choices(s).includes(target.uid)&&!choices(s).includes(null));
 pick(s,target.uid);
 drain(s);
 assert.ok(has(s,1,dest[id],target));
 assert.ok(has(s,0,'grave',shield));
 assert.equal(s.players[0].mana.length,0);
 assert.deepEqual(physical(s),before);
});

test('Zaessa returns an opponent-controlled noncreature element to its card owner',()=>{
 const s=field(),owned=add(s,0,'battle',SEED),opponent=add(s,1,'battle',SEED,{cardOwner:0}),
  protectedCreature=add(s,1,'battle',KAMA);
 const spell=play(s,ZAESSA,1);
 assert.deepEqual(choices(s),[opponent.uid]);
 pick(s,opponent.uid);
 assert.ok(has(s,0,'hand',opponent)&&has(s,0,'battle',owned)&&has(s,1,'battle',protectedCreature));
 assert.ok(has(s,0,'grave',spell));
 assert.equal(tappedMana(s,0),3);
});

test('Bagin only chooses untapped enemy creatures, respecting spell targeting protection',()=>{
 const s=field(),target=add(s,1,'battle',BOLS),tapped=add(s,1,'battle',BASIC,{tapped:true}),
  protectedCreature=add(s,1,'battle',KAMA),seed=add(s,1,'battle',SEED);
 const spell=play(s,BAGIN,1);
 assert.deepEqual(choices(s),[target.uid]);
 pick(s,target.uid);
 assert.ok(has(s,1,'grave',target)&&[tapped,protectedCreature,seed].every(x=>has(s,1,'battle',x)));
 assert.ok(has(s,0,'grave',spell));
 assert.equal(tappedMana(s,0),4);
});

test('Chuchuris uses the current 6000 boundary, including tapped creatures',()=>{
 const s=field(),target=add(s,1,'battle',BOLS,{tapped:true}),
  raised=add(s,1,'battle',BOLS,{powerModifiers:[{amount:1}]}),
  reduced=add(s,1,'battle',LAND,{powerModifiers:[{amount:-2000}]});
 const spell=play(s,CHUCHURIS,1);
 assert.deepEqual(new Set(choices(s)),new Set([target.uid,reduced.uid]));
 pick(s,target.uid);
 assert.ok(has(s,1,'grave',target)&&has(s,1,'battle',raised)&&has(s,0,'grave',spell));
 assert.equal(tappedMana(s,0),4);
});

for(const owner of [0,1])test('Rugundodo can choose a noncreature element or a cost-five creature from either side '+owner,()=>{
 const s=field(),target=add(s,1,'battle',LAND,{cardOwner:owner}),
  seed=add(s,0,'battle',SEED),large=add(s,1,'battle',BOLS);
 const spell=play(s,RUGUNDODO,1);
 assert.deepEqual(new Set(choices(s)),new Set([target.uid,seed.uid]));
 pick(s,owner===0?target.uid:seed.uid);
 assert.ok(owner===0?has(s,0,'mana',target):has(s,0,'mana',seed));
 assert.ok(has(s,1,'battle',large)&&has(s,0,'grave',spell));
 assert.equal(tappedMana(s,0),4);
});
