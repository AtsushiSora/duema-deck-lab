import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const PENDERA='dm36-043',VC='dm36-043VC',DOPPEL='dm36-021',WORM='dm36-091';
const BODY='dm01-108',KAPARA='dm36-044',KURT='dm38-020',SHIIKAI='dm36-082';
const MIEZO='dm36-067',WIRAPON='dm36-032',DEMON='dm01-027',YAMATA='dmbd18-003';
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(BODY));
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const play=(s,id)=>{const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;};
const targets=s=>e.getLegalActions(s).filter(a=>a.kind==='effect').flatMap(a=>a.targets.map(t=>t.uid));
const end=(s,p)=>{s.active=p;s.phase='attack';act(s,'endTurn');};
const power=(s,x)=>e.power(x,false,s);

test('Phase 859 registers the whole official cards with their original IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-859.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(row=>row.id),[PENDERA,DOPPEL,WORM]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[VC,PENDERA]]);
 assert.deepEqual(registry.resolveRows([{id:VC,count:2},{id:PENDERA,count:2}]),[{id:PENDERA,count:4}]);
 const ref=m.printAliases[0];
 assert.deepEqual(standardCardSpec({...ref,status:'complete'},{phase:859}),m.cards[0].spec);
 assert.equal(m.regulationVerification.limits[VC],4);
 assert.notEqual(ref.image,CARD_IMAGES[PENDERA]);
 assert.ok(!data.cards.some(c=>c.id===VC));
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:859}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:858}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:859}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   ['creature',f.cost,Number.parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:4}]),[{id:row.id,count:4}]);
 }
});

test('Penderamon protects other H Soul allies from an opponent choice but can itself be chosen (QA 36002)',()=>{
 const s=field();
 const pend=add(s,1,'battle',PENDERA),kapara=add(s,1,'battle',KAPARA);
 const nonH=add(s,1,'battle',WORM);
 play(s,DEMON);
 assert.deepEqual(targets(s),[pend.uid,nonH.uid]);
 act(s,'effect',a=>a.targets.some(t=>t.uid===pend.uid));
 assert.ok(s.players[1].grave.includes(pend));
 assert.ok(s.players[1].battle.includes(kapara));
});

test('Two Penderamon protect each other until one source is ignored (QA 36003)',()=>{
 let s=field();
 const a=add(s,1,'battle',PENDERA),b=add(s,1,'battle',PENDERA),plain=add(s,1,'battle',BODY);
 play(s,DEMON);
 assert.deepEqual(targets(s),[plain.uid]);
 s=JSON.parse(JSON.stringify(s));
 act(s,'effect');
 s.players[1].battle.find(x=>x.uid===a.uid).g35Ignored=s.turn;
 play(s,DEMON);
 assert.deepEqual(targets(s),[b.uid]);
});

test('Penderamon still allows attacks and blocks involving a protected H Soul creature',()=>{
 for(const blocking of [false,true]){
  const s=field(),attacker=add(s,0,'battle',BODY),pend=add(s,1,'battle',PENDERA);
  const kapara=add(s,1,'battle',KAPARA,{tapped:!blocking});
  assert.equal(e.effectiveCard(pend,s).breaker,2);
  attack(s,attacker.uid,blocking?'player':kapara.uid);
  if(blocking)act(s,'block',a=>a.uid===kapara.uid);
  drain(s);
  assert.ok(s.players[0].grave.includes(attacker));
 }
});

test('Doppel gives one bonus per source even to a creature with all six Souls (QA 34915)',()=>{
 const s=field();
 const a=add(s,0,'battle',DOPPEL);
 assert.equal(power(s,a),2000);
 const b=add(s,0,'battle',DOPPEL),enemy=add(s,1,'battle',DOPPEL);
 assert.deepEqual([a,b,enemy].map(x=>power(s,x)),[3000,3000,2000]);
 const c=add(s,0,'battle',DOPPEL);
 assert.deepEqual([a,b,c].map(x=>power(s,x)),[4000,4000,4000]);
 a.g35Ignored=s.turn;
 assert.deepEqual([a,b,c].map(x=>power(s,x)),[4000,3000,3000]);
});

test('Doppel boosts friendly Souls even when a recipient is ignored, and skips plain or sealed cards',()=>{
 const s=field();
 add(s,0,'battle',DOPPEL);
 const eligible=[KAPARA,SHIIKAI,WORM,WIRAPON,MIEZO].map(id=>add(s,0,'battle',id));
 const ignored=eligible[0];
 ignored.g35Ignored=s.turn;
 const plain=add(s,0,'battle',BODY,{under:[inst(DOPPEL)]}),enemy=add(s,1,'battle',KAPARA);
 assert.deepEqual(eligible.map(x=>power(s,x)),eligible.map(x=>e.card(x).power+1000));
 assert.equal(power(s,plain),e.card(plain).power);
 assert.equal(power(s,enemy),e.card(enemy).power);
 s.players[0].seals=[{...inst(BODY),sealOf:eligible[1].uid}];
 act(s,'toAttack');
 assert.ok(eligible[1].sealed);
 assert.equal(power(s,eligible[1]),e.card(eligible[1]).power);
});

test('Worm self-destructs only at the end of its own turn without another friendly E Soul',()=>{
 const s=field(),worm=add(s,0,'battle',WORM);
 add(s,0,'battle',KAPARA);
 add(s,1,'battle',KURT);
 end(s,1);
 drain(s);
 assert.ok(s.players[0].battle.includes(worm));
 end(s,0);
 drain(s);
 assert.ok(s.players[0].grave.includes(worm));
});

test('Worm survives with another E Soul even if that ally has no active abilities',()=>{
 for(const ally of [WORM,KURT,DOPPEL]){
  const s=field(),worm=add(s,0,'battle',WORM);
  add(s,0,'battle',ally,{g35Ignored:s.turn});
  end(s,0);
  drain(s);
  assert.ok(s.players[0].battle.includes(worm));
 }
});

test('Worm self-destruction can be replaced after resuming a saved choice',()=>{
 let s=field();
 const worm=add(s,0,'battle',WORM);
 add(s,0,'battle',YAMATA);
 end(s,0);
 assert.equal(s.decision.type,'leaveReplace');
 s=JSON.parse(JSON.stringify(s));
 act(s,'replaceYamata');
 drain(s);
 assert.ok(s.players[0].mana.some(x=>x.uid===worm.uid));
});
