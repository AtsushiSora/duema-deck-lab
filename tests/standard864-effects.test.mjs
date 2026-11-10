import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const CARLY='dm37-008',DOPPEL='dm39-024',RIN='dm39-047';
const BODY='dm01-108',HOLY='dm37-007',MAGIC='dm36-019',EVIL='dm36-091',ALL='dm36-021',TANK='dm03-015';
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
test('Phase 864 registers the whole official cards with their original IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-864.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(row=>row.id),[CARLY,DOPPEL,RIN]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:864}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:863}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:864}));
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

const accept=s=>act(s,'extended',a=>values(s)[a.choice]===true);

test('Carly evolves only from allied H or M Soul and has W-Breaker',()=>{
 for(const soul of [HOLY,MAGIC,ALL]){
  const s=field();
  const bases=[HOLY,MAGIC,ALL].map(id=>add(s,0,'battle',id));
  add(s,0,'battle',EVIL);
  add(s,1,'battle',MAGIC);
  const carly=play(s,CARLY);
  assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),bases.map(x=>x.uid));
  const base=bases.find(x=>x.cardId===soul);
  act(s,'evolve',a=>a.baseUid===base.uid);
  assert.deepEqual(carly.under.map(x=>x.uid),[base.uid]);
  attack(s,carly.uid);
  if(s.decision?.type==='block')act(s,'noBlock');
  act(s,'breakShields',a=>a.shields.length===2);
  assert.equal(s.players[1].brokenThisTurn,2);
 }
});

test('Carly chooses zero, one or two draws one at a time, including after resuming (QA 36100)',()=>{
 for(const count of [0,1,2]){
  let s=field();
  add(s,1,'battle',CARLY);
  const cards=s.players[1].deck.slice(0,2);
  play(s,BODY);
  assert.equal(s.decision.player,1);
  assert.equal(s.decision.task.n,2);
  if(count===0)decline(s);
  else{
   accept(s);
   assert.ok(has(s,1,'hand',cards[0]));
   assert.equal(s.decision.task.n,1);
   s=restore(s);
   if(count===1)decline(s);else accept(s);
  }
  assert.deepEqual(s.players[1].hand.map(x=>x.uid),cards.slice(0,count).map(x=>x.uid));
  assert.equal(s.decision,null);
 }
});

test('Carly ignores allied and noncreature entries, and observes each opponent creature from an effect',()=>{
 const s=field();
 add(s,0,'battle',CARLY);
 play(s,BODY);
 assert.equal(s.decision,null);
 s.active=1;
 play(s,'dm22ex1-086');
 assert.equal(s.decision,null);
 const first=add(s,1,'hand',BODY),second=add(s,1,'hand',BODY);
 s.extTasks=[{op:'g34_Select',p:1,source:BODY,origin:'hand',n:2,deploy:true,filter:{creature:true}}];
 act(s,'toAttack');
 pick(s,first);
 pick(s,second);
 for(let i=0;i<2;i++){
  if(s.decision?.type==='effectOrder')act(s,'orderEffect');
  assert.equal(s.decision.task.op,'g34_DrawUpTo');
  assert.equal(s.decision.player,0);
  accept(s);
  decline(s);
 }
 assert.equal(s.players[0].hand.length,2);
 assert.equal(s.decision,null);
});

test('Doppel can decline or reveal all three cards, keeping different Souls and milling the rest (QA 36226)',()=>{
 for(const yes of [false,true]){
  let s=field();
  give(s,0,'deck',[HOLY,BODY,MAGIC,EVIL,BODY,BODY]);
  const [holy,body,magic,fourth]=s.players[0].deck;
  play(s,DOPPEL);
  s=restore(s);
  if(yes)accept(s);else decline(s);
  assert.equal(s.decision,null);
  assert.deepEqual(s.players[0].hand.map(x=>x.uid),yes?[holy.uid,magic.uid]:[]);
  assert.deepEqual(s.players[0].grave.map(x=>x.uid),yes?[body.uid]:[]);
  assert.equal(s.players[0].deck[0].uid,(yes?fourth:holy).uid);
  assert.equal(s.log.some(x=>x.type==='reveal'&&x.cardId===DOPPEL),yes);
 }
});

test('Doppel recognizes every Soul and treats a multi-Soul card as one card',()=>{
 const souls=[HOLY,MAGIC,EVIL,'dm36-100','dm36-036','dm37-027'];
 for(const id of souls){
  const s=field();
  give(s,0,'deck',[id,ALL,BODY,BODY,BODY]);
  const [single,multi,other]=s.players[0].deck;
  play(s,DOPPEL);
  accept(s);
  assert.deepEqual(s.players[0].hand.map(x=>x.uid),[single.uid,multi.uid]);
  assert.deepEqual(s.players[0].grave.map(x=>x.uid),[other.uid]);
 }
});

test('Rinrin cannot attack, blocks, and has Slayer only when either hand is empty (QA 36244)',()=>{
 for(const empty of [0,1,2,null]){
  const s=field(),rin=add(s,1,'battle',RIN),tank=add(s,0,'battle',TANK);
  s.active=1;
  s.phase='attack';
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===rin.uid));
  s.active=0;
  for(const p of [0,1])if(empty!==p&&empty!==2)add(s,p,'hand',BODY);
  assert.equal(!!e.effectiveCard(rin,s).slayer,empty!==null);
  attack(s,tank.uid);
  act(s,'block',a=>a.uid===rin.uid);
  assert.ok(has(s,1,'grave',rin));
  assert.equal(has(s,0,'grave',tank),empty!==null);
 }
});
