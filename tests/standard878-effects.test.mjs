import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const EATER='dmr05-037',JACKET='dmr05-026',AQUA='dmr09-018';
const SMALL='dm01-108',WATER='dm01-083',GHOST='dm03-045',OTHER_GHOST='dmr05-057',BIG_GHOST='dm01-023';
const JUDGE='dmr06-023',TWIN='dmrp12-s01',SIGN='dmc44-001',BOUNCE='dm01-086',KALEIKO='dm22ex1-086';
const REPRINTS=[['dmr05-026M',JACKET],['dmx16-032',AQUA],['dmex02-073',AQUA]];

function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(SMALL));
 }
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===(value?.uid??value));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 878 uses three verified original card IDs and full official definitions',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-878.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[EATER,JACKET,AQUA]);
 assert.deepEqual(m.printAliases.map(({id,canonicalId})=>[id,canonicalId]),REPRINTS);
 assert.deepEqual(registry.resolveRows(REPRINTS.map(([id])=>({id,count:1}))),
  [{id:JACKET,count:1},{id:AQUA,count:2}]);
 assert.equal(registry.get('dm22ex1-038').id,'dm22ex1-038');
 for(const row of m.printAliases){
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:878}),m.cards.find(x=>x.id===row.canonicalId).spec);
  assert.equal(m.regulationVerification.limits[row.id],4);
 }
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:878}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:877}));
  const changed=structuredClone(d);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:878}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.power,c.race,c.manaValue,c.limit],
   ['creature',f.cost,f.civilizations,Number(f.powerText),f.race,1,4]);
  assert.ok(registry.get(row.id).supported);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
});





test('Omori replaces each own revealed-card move independently and keeps the chosen judge costs',()=>{
 let s=field();
 for(const p of [0,1])add(s,p,'battle',EATER);
 give(s,0,'deck',[TWIN,SMALL,WATER]);
 give(s,1,'deck',[SMALL,WATER,SMALL]);
 const first=s.players[0].deck[0],second=s.players[1].deck[0];
 cast(s,JUDGE);
 assert.equal(s.decision.type,'judgeCost');
 act(s,'judgeCost',a=>a.cost===5);
 assert.equal(s.decision.type,'judgeMana878');
 assert.equal(s.decision.player,0);
 s=JSON.parse(JSON.stringify(s));
 act(s,'judgeMana878',a=>a.toMana);
 assert.equal(s.decision.player,1);
 assert.equal(s.players[0].deck[0].uid,first.uid);
 act(s,'judgeMana878',a=>!a.toMana);
 assert.ok(has(s,0,'mana',first));
 assert.equal(s.players[1].deck.at(-1).uid,second.uid);
 assert.match(s.log.find(e=>e.type==='judgeResult').text,/5 対 2、勝ち/);
});

test('Omori can replace a losing reveal and its mana move is not replaced again',()=>{
 const s=field();
 add(s,0,'battle',EATER);
 add(s,1,'battle',KALEIKO);
 give(s,0,'deck',[SMALL,WATER]);
 give(s,1,'deck',[TWIN,SMALL]);
 const top=s.players[0].deck[0];
 cast(s,JUDGE);
 act(s,'judgeCost',a=>a.cost===5);
 act(s,'judgeMana878',a=>a.toMana);
 assert.ok(has(s,0,'mana',top));
 assert.match(s.log.find(e=>e.type==='judgeResult').text,/2 対 5、負け/);
});

test('Omori can decline a one-card reveal; accepting it causes deck-out before the result',()=>{
 for(const accept of [false,true]){
  const s=field();
  add(s,0,'battle',EATER);
  give(s,0,'deck',[SMALL]);
  const top=s.players[0].deck[0];
  cast(s,JUDGE);
  act(s,'judgeMana878',a=>a.toMana===accept);
  assert.equal(s.winner,accept?1:null);
  assert.ok(has(s,0,accept?'mana':'deck',top));
  assert.equal(s.log.some(e=>e.type==='judgeResult'),!accept);
 }
});

test('Omori only offers Nature mana recovery at the end of its own turn',()=>{
 const s=field(),ally=add(s,0,'battle',EATER);
 add(s,1,'battle',EATER);
 give(s,0,'mana',[SMALL,WATER]);
 const [nature,water]=s.players[0].mana;
 s.phase='attack';
 act(s,'endTurn');
 assert.equal(s.decision.player,0);
 assert.deepEqual(choices(s),[nature.uid,null]);
 pick(s,nature);
 assert.ok(has(s,0,'hand',nature)&&has(s,0,'mana',water)&&has(s,0,'battle',ally));
});

test('Jacket summons itself and can revive a same-cost Ghost without triggering again (QA 36603)',()=>{
 const s=field(),target=add(s,0,'grave',BIG_GHOST);
 const another=add(s,0,'grave',JACKET);
 add(s,0,'grave',AQUA);
 add(s,0,'grave',GHOST);
 cast(s,JACKET);
 assert.deepEqual(choices(s),[target.uid,another.uid,null]);
 pick(s,target);
 assert.ok(has(s,0,'battle',target)&&has(s,0,'grave',another));
 assert.equal(s.decision,null);
});

test('Jacket watches another summoned Ghost but ignores spell deployment and can decline',()=>{
 const s=field();
 add(s,0,'battle',JACKET);
 const free=add(s,0,'grave',GHOST),reserve=add(s,0,'grave',OTHER_GHOST);
 cast(s,SIGN);
 pick(s,free);
 assert.equal(s.decision,null);
 cast(s,SMALL);
 assert.equal(s.decision,null);
 cast(s,GHOST);
 assert.deepEqual(choices(s),[reserve.uid,null]);
 pick(s,null);
 assert.ok(has(s,0,'grave',reserve));
});

test('Spell Blue shuffles and reveals a nonspell to both players before adding it to hand',()=>{
 const s=field();
 const prior=s.players[0].deck.map(x=>x.uid);
 cast(s,AQUA);
 const [found]=s.players[0].hand;
 assert.ok(prior.includes(found.uid));
 assert.notDeepEqual(s.players[0].deck.map(x=>x.uid),prior.filter(uid=>uid!==found.uid));
 assert.ok(s.log.some(row=>row.type==='reveal'&&row.text.includes(e.card(found.cardId).name)));
 assert.equal(s.decision,null);
});

test('Spell Blue can decline a Twinpact spell and leaves the exact revealed card on top (QA 36833)',()=>{
 const s=field();
 give(s,0,'deck',Array(5).fill(TWIN));
 cast(s,AQUA);
 const top=s.players[0].deck[0];
 assert.deepEqual(choices(s),[top.uid,null]);
 pick(s,null);
 assert.equal(s.players[0].deck[0].uid,top.uid);
 assert.equal(s.players[0].hand.length,0);
});

test('Spell Blue uses its Shield Trigger, then casts a revealed spell without mana',()=>{
 const s=field();
 s.active=1;
 give(s,0,'shields',[AQUA]);
 give(s,0,'mana',[]);
 give(s,0,'deck',Array(6).fill(BOUNCE));
 const attacker=add(s,1,'battle',SMALL),blue=s.players[0].shields[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===blue.uid);
 const spell=s.players[0].deck[0];
 pick(s,spell);
 act(s,'effect',a=>a.targets[0].uid===attacker.uid);
 drain(s);
 assert.ok(has(s,0,'battle',blue)&&has(s,0,'grave',spell)&&has(s,1,'hand',attacker));
 assert.equal(s.players[0].mana.length,0);
});

test('Spell Blue declines or loses before casting the final card of its deck (QA 43078)',()=>{
 for(const accept of [false,true]){
  const s=field();
  give(s,0,'deck',[BOUNCE]);
  const spell=s.players[0].deck[0];
  const enemy=add(s,1,'battle',SMALL);
  cast(s,AQUA);
  pick(s,accept?spell:null);
  assert.equal(s.winner,accept?1:null);
  assert.ok(has(s,1,'battle',enemy));
 }
});
