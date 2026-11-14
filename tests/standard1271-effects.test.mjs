import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const HANNIBAL='dm36-005',GALBO='dm33-034',YASAKA='dm33-025',ABYSS='dmrp20-004';
const WEAK='dm01-100',EX_LIFE='dmrp20-025',GENKA='dmrp08-014',NATURE='dm01-108',BOUNCE='dmrp20-036';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1]){give(s,p,'deck',Array(24).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}
function add(s,p,zone,id,fields={}){
 const x=Object.assign(inst(id),fields);s.players[p][zone].push(x);return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const options=s=>s.decision?.choices.map(x=>x.value?.uid??x.value)??[];
const pick=(s,v)=>act(s,'extended',a=>options(s)[a.choice]===v);
function finish(s){if(s.decision?.type==='block')act(s,'noBlock');drain(s);}

function passBlock(s){if(s.decision?.type==='block')act(s,'noBlock');}
function pickGrave(s,count){for(const y of count)pick(s,y.uid);}
function orderBonus(s,id){if(s.decision?.type==='effectOrder')
 act(s,'orderEffect',a=>s.pendingEffects.some(row=>row.effectId===a.effectId&&row.source===id));}
const bonus=s=>s.decision?.title==='ブレイク・ボーナスを使う？';

test('three official prints resolve as three distinct original IDs, including W Breaker and limits',()=>{
 const m=read('tools/support-phase-1271.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[HANNIBAL,GALBO,YASAKA]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id,name,faces:[f],image}=row,c=e.card(id),d=details.cards.find(x=>x.id===id);
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1271}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:1270}));
  const altered=structuredClone(d);altered.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:1271}));
  assert.deepEqual(cat.resolveRows([{id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit,c.breaker],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,m.regulationVerification.limits[id],2]);
  assert.equal(CARD_IMAGES[id],image);
  assert.ok(refs.some(e=>e.id===id&&e.canonicalId===id&&e.image===image));
 }
});

for(const plays of [0,1,2])test('Hannibal may resolve separate sets of four and stop after '+plays+' (QA37632)',()=>{
 let s=field(),x=add(s,0,'battle',HANNIBAL);
 const targets=Array.from({length:3},()=>add(s,1,'battle',WEAK));
 const grave=Array.from({length:9},()=>add(s,0,'grave',NATURE));
 const chosen=grave.slice(0,8).reverse();
 attack(s,x.uid);
 for(let i=0;i<plays;i++){
  pickGrave(s,chosen.slice(4*i,4*i+4));
  s=JSON.parse(JSON.stringify(s));
  pick(s,targets[i].uid);
 }
 if(plays<2)pick(s,null);else assert.notEqual(s.decision?.task?.op,'g34_Select');
 finish(s);
 assert.deepEqual(s.players[0].deck.slice(24).map(y=>y.uid),chosen.slice(0,4*plays).map(y=>y.uid));
 assert.ok(targets.every((y,i)=>has(s,1,i<plays?'grave':'battle',y)));
});

test('Hannibal stops when no target remains even if another four-card use is affordable',()=>{
 const s=field(),x=add(s,0,'battle',HANNIBAL),y=add(s,1,'battle',WEAK);
 const grave=Array.from({length:8},()=>add(s,0,'grave',NATURE));
 attack(s,x.uid);pickGrave(s,grave.slice(0,4));pick(s,y.uid);
 assert.notEqual(s.decision?.task?.op,'g34_Select');
 assert.equal(s.players[0].grave.length,4);
});

test('Hannibal still resolves a locked return but does not chain a replaced destruction',()=>{
 const s=field(),x=add(s,0,'battle',HANNIBAL),lock=add(s,1,'battle',GENKA);
 const y=add(s,1,'battle',EX_LIFE),shield=s.players[1].shields.at(-1);
 y.exLifeShieldUid=shield.uid;
 const grave=Array.from({length:8},()=>add(s,0,'grave',NATURE));
 attack(s,x.uid);pickGrave(s,grave.slice(0,4));pick(s,y.uid);
 assert.ok(has(s,1,'battle',y)&&has(s,1,'battle',lock)&&has(s,1,'grave',shield));
 assert.equal(s.players[0].grave.length,8);
 assert.notEqual(s.decision?.task?.op,'g34_Select');
});

for(const shields of [1,2])test('Galbo resolves one optional two-card ramp per shield group: '+shields,()=>{
 const s=field(),x=add(s,0,'battle',GALBO),own=s.players[0];
 give(s,1,'shields',Array(shields).fill(NATURE));
 s.players[1].shields[0].shieldStack=[inst(NATURE)];
 const mana=own.mana.length,top=own.deck.slice(0,4);
 attack(s,x.uid);passBlock(s);
 for(let i=0;i<shields;i++){orderBonus(s,GALBO);assert.ok(bonus(s));pick(s,true);}
 assert.ok(!bonus(s));
 assert.equal(own.mana.length,mana+2*shields);
 assert.deepEqual(own.mana.slice(-2*shields).map(x=>x.uid),top.slice(0,2*shields).map(x=>x.uid));
});

test('Yasaka can decline one occurrence and mill four from the other; short decks lose (QA35865)',()=>{
 for(const deckSize of [10,3]){
  const s=field(),x=add(s,0,'battle',YASAKA),opp=s.players[1];
  give(s,1,'shields',[NATURE,NATURE]);give(s,1,'deck',Array(deckSize).fill(WEAK));
  const top=opp.deck.slice(0,4).map(x=>x.uid);
  attack(s,x.uid);passBlock(s);orderBonus(s,YASAKA);
  assert.ok(bonus(s));pick(s,null);assert.ok(bonus(s));pick(s,true);
  assert.deepEqual(opp.grave.map(x=>x.uid),top);
  assert.equal(s.winner,deckSize<4?0:null);
 }
});

test('a bounce Shield Trigger prevents Break Bonus even if both shields were broken (QA31809)',()=>{
 const s=field(),x=add(s,0,'battle',GALBO),own=s.players[0],mana=own.mana.length;
 give(s,1,'shields',[BOUNCE,NATURE]);
 attack(s,x.uid);passBlock(s);act(s,'useTrigger',a=>a.cardId===BOUNCE);drain(s);
 assert.ok(has(s,0,'hand',x));
 assert.equal(own.mana.length,mana);
 assert.ok(!bonus(s));
});

test('a Shield Saver leaves only one Break Bonus use when replacing one of two breaks',()=>{
 const s=field(),x=add(s,0,'battle',GALBO),own=s.players[0],mana=own.mana.length;
 const saver=add(s,1,'battle','dmrp14-062');
 give(s,1,'shields',[NATURE,NATURE]);
 attack(s,x.uid);passBlock(s);
 act(s,'saveShield',a=>a.uid===saver.uid);
 if(s.decision?.type==='shieldGuard')act(s,'finishShieldGuards');
 assert.ok(bonus(s));pick(s,true);
 assert.ok(!bonus(s));
 assert.equal(own.mana.length,mana+2);
 assert.equal(s.players[1].shields.length,1);
});

test('two queued uses remain available after a Hurricane destroys the attacker at attack end',()=>{
 const s=field(),x=add(s,0,'battle',GALBO),own=s.players[0],mana=own.mana.length;
 add(s,0,'battle',ABYSS);
 give(s,1,'shields',[NATURE,NATURE]);
 attack(s,x.uid);passBlock(s);
 orderBonus(s,GALBO);assert.ok(bonus(s));pick(s,true);
 orderBonus(s,ABYSS);
 assert.ok(has(s,0,'grave',x));
 assert.ok(bonus(s));pick(s,true);
 assert.equal(own.mana.length,mana+4);
});
