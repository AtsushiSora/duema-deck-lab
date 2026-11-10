import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-770.json',import.meta.url)));
const MOG='dm23rp4-023',NAKA='dm23rp4-054',MAID='dm23rp3-040',ALRA='dm23rp4-065';
const BODY='dm01-108',BIG='dm01-001',MADNESS='dm12-036',SLAYER='dmrp22-033';
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
function task(s,op,p,options){
 s.phase='main';
 s.extTasks=[{op,p,source:BODY,...options}];
 act(s,'toAttack');
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
}
function advanceTo(s,op){
 for(let n=0;s.decision&&s.decision.task?.op!==op;n++){
  assert.ok(n<20);
  e.step(s,e.chooseAI(s));
 }
 assert.equal(s.decision?.task?.op,op);
}

test('four complete definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:770}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:770}));
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
   assert.deepEqual(print.faces.map(f=>({...f,abilityText:f.abilityText.replace(/ /g,'')})),row.faces.map(f=>({...f,abilityText:f.abilityText.replace(/ /g,'')})));
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

test('Mogu may resolve self-destruction before its separately pending removal and ramp',()=>{
 let s=setup();
 s.active=1;
 const enemy=put(s,1,'battle',BODY),incoming=put(s,0,'hand',MOG),top=s.players[0].deck[0];
 task(s,'putCreature',0,{origin:'hand',uid:incoming.uid});
 assert.equal(s.decision.type,'effectOrder');
 s=restore(s);
 const destruction=s.pendingEffects.find(x=>x.task?.op==='g34_SelfDestroy');
 act(s,'orderEffect',a=>a.effectId===destruction.effectId);
 assert.ok(has(s,0,'grave',incoming));
 pick(s,enemy.uid);
 assert.ok(has(s,1,'mana',enemy)&&has(s,0,'mana',top));
});

test('Mogu survives when two own shield groups were actually broken before its Shield Trigger',()=>{
 const s=setup();
 s.active=1;
 give(s,0,'shields',[MOG,BODY]);
 const breaker=put(s,1,'battle','dm23rp3-063');
 attack(s,breaker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'useTrigger');
 assert.equal(s.players[0].brokenThisTurn,2);
 assert.equal(s.decision.task.op,'g34_Target');
 pick(s,breaker.uid);
 drain(s);
 const mogu=s.players[0].battle.find(x=>x.cardId===MOG);
 assert.ok(mogu);
 assert.equal(e.effectiveCard(mogu,s).breaker,2);
});

test('Mogu ramps without a legal removal target during its own turn',()=>{
 const s=setup(),top=s.players[0].deck[0];
 const incoming=play(s,MOG);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'mana',top)&&has(s,0,'battle',incoming));
});

test('Nakatsugi may decline then draw on the next allied attack, once per turn',()=>{
 let s=setup();
 const naka=put(s,0,'battle',NAKA),first=put(s,0,'battle',BODY),second=put(s,0,'battle',BODY),third=put(s,0,'battle',BODY);
 attack(s,first.uid);
 assert.equal(s.decision.task.uid,naka.uid);
 pick(s,null);
 drain(s);
 const before=s.players[0].hand.length;
 attack(s,second.uid);
 s=restore(s);
 pick(s,true);
 drain(s);
 assert.equal(s.players[0].hand.length,before+1);
 attack(s,third.uid);
 assert.notEqual(s.decision?.task?.op,'g34_AttackDraw770');
 drain(s);
 s.turn++;
 for(const x of s.players[0].battle)x.tapped=false;
 attack(s,naka.uid);
 assert.equal(s.decision.task.op,'g34_AttackDraw770');
});

test('Nakatsugi blocks an enemy attack and can untap a chosen ally at its own turn end',()=>{
 const s=setup(),naka=put(s,0,'battle',NAKA),ally=put(s,0,'battle',BODY);
 ally.tapped=true;
 end(s);
 assert.equal(s.decision.task.op,'g34_Target');
 assert.ok(!s.decision.choices.some(c=>c.value===null));
 pick(s,ally.uid);
 drain(s);
 assert.equal(ally.tapped,false);
 assert.equal(s.active,1);
 const attacker=put(s,1,'battle',BODY);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===naka.uid);
 drain(s);
 assert.ok(naka.tapped||has(s,0,'grave',naka));
});

test('Maidou chooses again after the first battle and its Slayer consequence',()=>{
 let s=setup();
 const first=put(s,0,'battle',BIG),second=put(s,0,'battle',BIG),slayer=put(s,1,'battle',SLAYER),enemy=put(s,1,'battle',BODY);
 play(s,MAID);
 assert.equal(s.decision.task.op,'g34_Fight240');
 pick(s,first.uid);
 pick(s,slayer.uid);
 assert.ok(has(s,0,'grave',first)&&has(s,1,'grave',slayer));
 assert.equal(s.decision.task.op,'g34_Fight240');
 assert.ok(s.decision.choices.every(x=>x.value.uid!==first.uid));
 s=restore(s);
 pick(s,second.uid);
 pick(s,enemy.uid);
 assert.ok(has(s,1,'grave',enemy));
 assert.equal(s.log.filter(x=>x.type==='battle').length,2);
});

test('Maidou can summon by Shield Trigger and stops choosing when the only enemy has been destroyed',()=>{
 const s=setup(),ally=put(s,0,'battle',BIG),enemy=put(s,1,'battle',BODY);
 s.active=1;
 give(s,0,'shields',[MAID,BODY]);
 attack(s,enemy.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'useTrigger');
 advanceTo(s,'g34_Fight240');
 pick(s,ally.uid);
 pick(s,enemy.uid);
 drain(s);
 assert.ok(has(s,1,'grave',enemy));
 assert.equal(s.log.filter(x=>x.type==='battle').length,1);
 assert.ok(s.players[0].battle.some(x=>x.cardId===MAID));
});

test('Alrapan can decline or discard one card to attack on the turn it enters',()=>{
 for(const accept of [false,true]){
  let s=setup();
  const discard=put(s,0,'hand',BODY),alra=play(s,ALRA);
  s=restore(s);
  pick(s,accept?discard.uid:null);
  assert.equal(has(s,0,'grave',discard),accept);
  assert.equal(has(s,0,'hand',discard),!accept);
  s.phase='attack';
  assert.equal(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===alra.uid),accept);
 }
});

test('Alrapan still gains the grant when the selected discard is replaced',()=>{
 const s=setup();
 s.active=1;
 const madness=put(s,0,'hand',MADNESS),alra=put(s,0,'hand',ALRA);
 task(s,'putCreature',0,{origin:'hand',uid:alra.uid});
 pick(s,madness.uid);
 drain(s);
 assert.ok(has(s,0,'battle',madness));
 assert.ok(!has(s,0,'grave',madness));
 assert.equal(e.effectiveCard(alra,s).speedAttacker,true);
});


test('each Nakatsugi can use its draw on the same attack',()=>{
 const s=setup(),first=put(s,0,'battle',NAKA),second=put(s,0,'battle',NAKA),ally=put(s,0,'battle',BODY);
 const before=s.players[0].hand.length;
 attack(s,ally.uid);
 const effect=s.pendingEffects.find(x=>x.uid===first.uid);
 act(s,'orderEffect',a=>a.effectId===effect.effectId);
 pick(s,true);
 assert.equal(s.decision.task.uid,second.uid);
 pick(s,true);
 drain(s);
 assert.equal(s.players[0].hand.length,before+2);
});
