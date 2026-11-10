import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-776.json',import.meta.url)));
const ARIAN='dm24rp1-030',FLAME='dm24rp4-020',SURGE='dm24rp4-016';
const BODY='dm01-108',SPELL='dm01-110',BIG='dm01-007',RAMP='dm01-106';
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function play(s,id){
 s.phase='main';
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
test('Phase 776 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:776}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:776}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const prints=printAliases.filter(x=>x.canonicalId===row.id);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:prints[0]?.id??row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
  for(const print of prints){
   assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[row.id]);
   assert.equal(print.verification.facesMatched,true);
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:776}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

const ids=(s,p,zone)=>s.players[p][zone].map(x=>x.uid);
function end(s){
 s.phase='attack';
 act(s,'endTurn');
}
function task(s,op,p,options){
 s.phase='main';
 s.extTasks=[{op,p,source:BODY,...options}];
 act(s,'toAttack');
}
function smallDeck(s){
 give(s,0,'deck',[SPELL,BIG,BODY,SPELL,SPELL]);
 return s.players[0].deck;
}
function yobi(s,id){
 play(s,id);
 assert.equal(s.decision.task.op,'g19Yobi');
}
test('Arian compiles the verified later mandatory reduction without changing its original deck ID',()=>{
 const row=cards.find(x=>x.id===ARIAN);
 assert.match(row.faces[0].abilityText,/最大２/);
 assert.doesNotMatch(row.currentPrint.faces[0].abilityText,/最大/);
 assert.ok(row.currentPrint.verification.facesMatched);
 assert.deepEqual(standardCardSpec({...row.currentPrint,status:'complete'},{phase:776}),row.spec);
 assert.equal(row.spec.g299Untapped[0].optional,undefined);
});
test('Arian untaps on its controller’s turn and reduces the next creature summon only, with a minimum cost of one',()=>{
 let s=setup();
 s.active=1;
 const arian=put(s,0,'battle',ARIAN);
 arian.tapped=true;
 const first=put(s,0,'hand',BODY),second=put(s,0,'hand',BIG),spell=put(s,0,'hand',FLAME);
 end(s);
 assert.equal(s.active,0);
 assert.equal(arian.tapped,false);
 s=restore(s);
 s.phase='main';
 const options=x=>e.getLegalActions(s).filter(a=>a.kind==='play'&&a.uid===x.uid).map(a=>a.cost);
 assert.deepEqual(options(first),[1]);
 assert.deepEqual(options(second),[5]);
 assert.deepEqual(options(spell),[5]);
 act(s,'play',a=>a.uid===first.uid);
 assert.deepEqual(options(second),[7]);
});
test('Arian ignores a redundant untap and expires an unused reduction at end of turn',()=>{
 const s=setup(),arian=put(s,0,'battle',ARIAN),later=put(s,0,'hand',BIG);
 task(s,'g34_Target',0,{owner:'self',untap:true});
 pick(s,arian.uid);
 assert.ok(!s.extLimits?.some(x=>x.kind==='g456NextReduction'));
 arian.tapped=true;
 task(s,'g34_Target',0,{owner:'self',untap:true});
 pick(s,arian.uid);
 assert.ok(s.extLimits.some(x=>x.kind==='g456NextReduction'));
 end(s);
 end(s);
 s.phase='main';
 assert.equal(e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===later.uid).cost,7);
});
for(const accept of [true,false])test('Arian may shield the actual top card after leaving on the opposing turn ('+accept+')',()=>{
 let s=setup();
 s.active=1;
 const arian=put(s,0,'battle',ARIAN),top=s.players[0].deck[0],before=ids(s,0,'shields');
 task(s,'g34_Target',1,{to:'hand'});
 pick(s,arian.uid);
 assert.ok(has(s,0,'hand',arian));
 assert.equal(s.decision.task.op,'g34_Offer');
 assert.equal(s.decision.player,0);
 s=restore(s);
 pick(s,accept?true:null);
 assert.deepEqual(ids(s,0,'shields'),accept?[...before,top.uid]:before);
 if(accept)assert.equal(s.players[0].shields.at(-1).faceUp??false,false);
});
test('Arian leaving on its controller’s turn does not offer a shield',()=>{
 const s=setup(),arian=put(s,0,'battle',ARIAN),before=ids(s,0,'shields');
 task(s,'g34_Target',0,{owner:'self',to:'grave'});
 pick(s,arian.uid);
 assert.ok(has(s,0,'grave',arian));
 assert.equal(s.decision,null);
 assert.deepEqual(ids(s,0,'shields'),before);
});
test('Flame finishes Yobinion before choosing a mode and gives speed to the deployed creature and other current allies',()=>{
 let s=setup();
 const [skipSpell,skipBig,hit,top]=smallDeck(s),ally=put(s,0,'battle',BODY),enemy=put(s,1,'battle',BODY);
 ally.entered=s.turn;
 yobi(s,FLAME);
 s=restore(s);
 pick(s,true);
 assert.equal(s.decision.task.op,'g34_Choose');
 assert.ok(has(s,0,'battle',hit));
 assert.equal(ids(s,0,'deck')[0],top.uid);
 assert.deepEqual(ids(s,0,'deck').slice(-2).sort(),[skipSpell.uid,skipBig.uid].sort());
 pick(s,1);
 const speed=(p,x)=>Boolean(e.effectiveCard(s.players[p].battle.find(y=>y.uid===x.uid),s).speedAttacker);
 assert.ok(speed(0,hit)&&speed(0,ally));
 assert.equal(speed(1,enemy),false);
 const later=play(s,BODY);
 assert.equal(speed(0,later),false);
 end(s);
 assert.equal(speed(0,hit),false);
});
test('Flame may decline Yobinion and breaks only the selected shield UID after restoring',()=>{
 let s=setup();
 const deck=ids(s,0,'deck'),before=ids(s,1,'shields'),target=before[3];
 put(s,0,'battle','dm26-002');
 yobi(s,FLAME);
 pick(s,null);
 assert.equal(s.decision.task.op,'g34_Choose');
 pick(s,0);
 s=restore(s);
 pick(s,target);
 assert.deepEqual(ids(s,1,'shields'),before.filter(uid=>uid!==target));
 assert.deepEqual(ids(s,1,'hand'),[target]);
 assert.deepEqual(ids(s,0,'deck'),deck);
});
test('Flame mode resolves before the creature’s pending entry trigger',()=>{
 const s=setup();
 give(s,0,'deck',[RAMP,SPELL,BODY,BODY]);
 const [hit,top]=s.players[0].deck;
 yobi(s,FLAME);
 pick(s,true);
 assert.equal(s.decision?.task?.op,'g34_Choose');
 assert.ok(has(s,0,'battle',hit)&&has(s,0,'deck',top));
 pick(s,1);
 assert.ok(has(s,0,'mana',top));
 assert.ok(e.effectiveCard(hit,s).speedAttacker);
});
test('Surge can protect the creature it deployed, allows its owner to choose it, and expires at the next own turn',()=>{
 let s=setup();
 const [,,hit]=smallDeck(s);
 const ally=put(s,0,'battle',BODY),enemy=put(s,1,'battle',BODY);
 yobi(s,SURGE);
 pick(s,true);
 assert.equal(s.decision.task.op,'g34_Target');
 s=restore(s);
 pick(s,hit.uid);
 const live=()=>s.players[0].battle.find(x=>x.uid===hit.uid);
 const protectedCard=()=>e.effectiveCard(live(),s);
 assert.ok(protectedCard().untargetable&&protectedCard().cannotBeAttacked);
 task(s,'g34_Target',0,{owner:'self',tap:true});
 pick(s,hit.uid);
 end(s);
 assert.equal(s.active,1);
 task(s,'g34_Target',1,{to:'hand'});
 assert.deepEqual(s.decision.choices.map(c=>c.value.uid),[ally.uid]);
 pick(s,ally.uid);
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===enemy.uid&&a.target===hit.uid));
 end(s);
 assert.equal(s.active,0);
 assert.equal(Boolean(protectedCard().untargetable||protectedCard().cannotBeAttacked),false);
});
test('Surge with no smaller creature leaves the revealed cards in deck and still protects an ally',()=>{
 const s=setup(),ally=put(s,0,'battle',BODY);
 give(s,0,'deck',[SPELL,BIG,SPELL]);
 const before=ids(s,0,'deck').sort();
 yobi(s,SURGE);
 pick(s,true);
 assert.equal(s.decision.task.op,'g34_Target');
 pick(s,ally.uid);
 assert.deepEqual(ids(s,0,'deck').sort(),before);
 assert.ok(e.effectiveCard(ally,s).untargetable);
});
test('Yobinion stops at the first qualifying evolution even if it has no base (QA 45263)',()=>{
 const s=setup(),ally=put(s,0,'battle',BODY);
 give(s,0,'deck',[SPELL,'dm02-s02',BODY,BIG,BODY]);
 const [skip,evolution,next]=s.players[0].deck;
 yobi(s,SURGE);
 pick(s,true);
 assert.equal(s.decision.task.op,'g34_Target');
 assert.deepEqual(ids(s,0,'battle'),[ally.uid]);
 assert.equal(s.players[0].deck[0].uid,next.uid);
 assert.deepEqual(ids(s,0,'deck').slice(-2).sort(),[skip.uid,evolution.uid].sort());
 pick(s,ally.uid);
 assert.ok(e.effectiveCard(ally,s).untargetable);
});
test('Arian’s shieldization obeys the existing deck-to-grave replacement',()=>{
 const s=setup();
 s.active=1;
 const arian=put(s,0,'battle',ARIAN),top=s.players[0].deck[0],before=ids(s,0,'shields');
 put(s,1,'battle','dm22ex1-086');
 task(s,'g34_Target',1,{to:'hand'});
 pick(s,arian.uid);
 pick(s,true);
 assert.ok(has(s,0,'grave',top));
 assert.deepEqual(ids(s,0,'shields'),before);
});
