import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const BEEL='dm36-055',BEEL_VC='dm36-055VC',COOL='dm36-019',COOL_PROMO='promoy21-074',PROVENTS='dm37-027';
const BODY='dm01-108',WORM='dm36-091',ANVIL='dm36-025',ROSE='dm36-088';
const EVO='dm36-011',NEO='dm25rp4-030',HEAVY='dmex17-033',METAL='dmex17-059';
const SMALL_BLOCKER='dm38-020',LARGE_BLOCKER='dm01-001',LOCK='dmrp08-014';
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
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,x)=>act(s,'extended',a=>values(s)[a.choice]===x.uid);
test('Phase 863 registers the whole official cards with their original IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-863.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(row=>row.id),[BEEL,COOL,PROVENTS]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[BEEL_VC,BEEL],[COOL_PROMO,COOL]]);
 for(const ref of m.printAliases){
  assert.deepEqual(registry.resolveRows([{id:ref.id,count:2},{id:ref.canonicalId,count:2}]),[{id:ref.canonicalId,count:4}]);
  assert.deepEqual(standardCardSpec({...ref,status:'complete'},{phase:863}),m.cards.find(x=>x.id===ref.canonicalId).spec);
  assert.equal(m.regulationVerification.limits[ref.id],4);
  assert.notEqual(ref.image,CARD_IMAGES[ref.canonicalId]);
  assert.ok(!data.cards.some(c=>c.id===ref.id));
 }
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:863}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:862}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:863}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   ['creature',f.cost,Number.parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:4}]),[{id:row.id,count:4}]);
 }
});

const restore=s=>JSON.parse(JSON.stringify(s));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const end=s=>{s.phase='attack';act(s,'endTurn');};
const decline=s=>act(s,'extended',a=>values(s)[a.choice]===null);

test('Beelzebub pays in order, then selects an affordable E Soul from the remaining graveyard',()=>{
 let s=field();
 const beel=add(s,0,'battle',BEEL);
 const pay=[add(s,0,'grave',BODY),add(s,0,'grave',WORM),add(s,0,'grave',BODY)];
 const eligible=[add(s,0,'grave',WORM),add(s,0,'grave',ROSE)];
 const wrongSoul=add(s,0,'grave',COOL),expensive=add(s,0,'grave',ANVIL);
 add(s,1,'grave',WORM);
 attack(s,beel.uid);
 pick(s,pay[1]);
 s=restore(s);
 pick(s,pay[0]);
 pick(s,pay[2]);
 assert.deepEqual(s.players[0].deck.slice(-3).map(x=>x.uid),[pay[1],pay[0],pay[2]].map(x=>x.uid));
 assert.deepEqual(values(s),eligible.map(x=>x.uid));
 pick(s,eligible[0]);
 assert.ok(has(s,0,'battle',eligible[0]));
 for(const x of [eligible[1],wrongSoul,expensive])assert.ok(has(s,0,'grave',x));
});

test('Beelzebub can pay with the last eligible card or decline, and cannot make a short payment (QA 36031)',()=>{
 for(const mode of ['noTarget','decline','short','locked']){
  const s=field(),beel=add(s,0,'battle',BEEL);
  const pay=[add(s,0,'grave',WORM),add(s,0,'grave',BODY)];
  if(mode!=='short')pay.push(add(s,0,'grave',BODY));
  if(mode==='locked')add(s,1,'battle',LOCK);
  attack(s,beel.uid);
  if(mode==='decline')decline(s);
  if(mode==='noTarget'||mode==='locked')for(const x of pay)pick(s,x);
  assert.notEqual(s.decision?.task?.op,'g34_Select');
  assert.equal(s.players[0].grave.length,mode==='noTarget'?0:pay.length);
  assert.ok(!s.players[0].battle.some(x=>x.cardId===WORM));
 }
});

test('Cool Beauty can bounce either player’s actual evolution and may decline',()=>{
 for(const chosen of [0,1,null]){
  const s=field();
  const evolutions=[add(s,0,'battle',EVO,{under:[inst(BODY)]}),add(s,1,'battle',NEO,{under:[inst(BODY)]})];
  add(s,0,'battle',NEO);
  add(s,1,'battle',HEAVY);
  add(s,1,'battle',BODY);
  play(s,COOL);
  assert.deepEqual(values(s),[...evolutions.map(x=>x.uid),null]);
  if(chosen===null)decline(s);else pick(s,evolutions[chosen]);
  for(const [p,x] of evolutions.entries()){
   assert.equal(has(s,p,'hand',x),p===chosen);
   assert.equal(has(s,p,'battle',x),p!==chosen);
  }
 }
});

test('Cool Beauty chooses a linked God as one creature, then its owner chooses the departing card',()=>{
 let s=field();
 const linked=add(s,1,'battle',HEAVY,{godLinks:[inst(METAL)]});
 const metal=linked.godLinks[0];
 play(s,COOL);
 assert.deepEqual(values(s),[linked.uid,null]);
 pick(s,linked);
 assert.equal(s.decision.type,'godLeave');
 assert.equal(s.decision.player,1);
 s=restore(s);
 act(s,'godLeave',a=>a.uid===metal.uid);
 assert.ok(has(s,1,'battle',linked));
 assert.ok(has(s,1,'hand',metal));
 assert.ok(!s.players[1].battle.find(x=>x.uid===linked.uid).godLinks?.length);
});

test('Cool Beauty can summon with S-Trigger and return the attacking evolution',()=>{
 const s=field(),evo=add(s,0,'battle',EVO);
 give(s,1,'shields',[COOL,BODY]);
 attack(s,evo.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'useTrigger');
 assert.ok(s.players[1].battle.some(x=>x.cardId===COOL));
 pick(s,evo);
 assert.ok(has(s,0,'hand',evo));
});

test('Provents only triggers if either hand is empty and lowers the opposing creatures for that turn',()=>{
 for(const empty of [0,1,2,null]){
  const s=field(),provents=add(s,0,'battle',PROVENTS);
  for(const p of [0,1])if(empty!==p&&empty!==2)add(s,p,'hand',BODY);
  const ally=add(s,0,'battle',BODY),small=add(s,1,'battle',SMALL_BLOCKER),large=add(s,1,'battle',LARGE_BLOCKER);
  const initial=e.power(large,false,s),allyPower=e.power(ally,false,s);
  attack(s,provents.uid);
  const triggered=empty!==null;
  assert.equal(has(s,1,'grave',small),triggered);
  assert.equal(e.power(large,false,s),initial-(triggered?2000:0));
  assert.equal(e.power(ally,false,s),allyPower);
  act(s,'noBlock');
  assert.equal(e.power(large,false,s),initial-(triggered?2000:0));
  end(s);
  assert.equal(e.power(large,false,s),initial);
 }
});

test('Provents keeps its queued attack trigger after an earlier effect fills the empty hand',()=>{
 const s=field(),provents=add(s,0,'battle',PROVENTS);
 const tire=add(s,0,'battle','dm22rp1-031');
 const small=add(s,1,'battle',SMALL_BLOCKER);
 add(s,1,'hand',BODY);
 attack(s,provents.uid);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',a=>a.uid===tire.uid);
 act(s,'extended',a=>values(s)[a.choice]===true);
 assert.equal(s.players[0].hand.length,1);
 assert.ok(has(s,1,'grave',small));
});
