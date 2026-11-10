import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-809.json',import.meta.url)));
const SIGNAL="dm25-009",SOUL="dm24-110",DOLJI="dm26-028";
const FIRE="dm01-097",NATURE="dm01-108",WATER="dm01-083";
const MULTI="dm24-009",TWIN="dm24bd4-007",GOD="dmex17-059",SEED="dm22ex1-047";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 809 definitions preserve their canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:809}));
  assert.throws(()=>standardCardSpec(detail,{phase:808}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:809}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

test('all five alternate prints resolve to their original supported deck cards',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.equal(printAliases.length,5);
 for(const print of printAliases){
  assert.equal(print.verification.facesMatched,true);
  assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:809}),cards.find(x=>x.id===print.canonicalId).spec);
  assert.equal(regulationVerification.limits[print.id],e.card(print.canonicalId).limit);
  assert.equal(registry.resolveRows([{id:print.id,count:1}])[0].id,print.canonicalId);
  assert.equal(refs.find(x=>x.id===print.id).image,print.image);
 }
});

const play=(s,x,face=0)=>act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face&&!a.alternative);

for(const mode of ['select','decline','no match','locked','one revealed']){
 test('God Signal searches only visible God creatures and shuffles before placing the choice '+mode,()=>{
  let s=setup();
  const blocker=mode==='locked'?'dm25ex1-049':mode==='one revealed'?'dmrp22-030':null;
  if(blocker)put(s,1,'battle',blocker);
  give(s,0,'deck',mode==='one revealed'?[GOD,SEED,NATURE,'dm25rp3-S06']:
   [FIRE,mode==='no match'?TWIN:GOD,SEED,NATURE,mode==='no match'?FIRE:'dm25rp3-S06']);
  const before=s.players[0].deck.map(x=>x.uid),oldHand=s.players[0].hand.length;
  const target=s.players[0].deck.find(x=>x.cardId===GOD);
  const spell=put(s,0,'hand',SIGNAL);
  play(s,spell);
  if(target&&mode!=='locked'){
   assert.equal(s.decision?.task?.op,'g54_Search');
   const offered=s.decision.choices.map(x=>x.value);
   assert.deepEqual(offered,mode==='one revealed'?[target.uid,null]:[target.uid,before.at(-1),null]);
   assert.equal(s.log.some(x=>x.type==='reveal'),mode==='one revealed');
   s=JSON.parse(JSON.stringify(s));
   pick(s,mode==='decline'?null:target.uid);
  }else assert.equal(s.decision,null);
  if(['select','one revealed'].includes(mode)){
   assert.equal(s.players[0].deck[0].uid,target.uid);
   assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===GOD));
  }else assert.equal(s.log.some(x=>x.type==='reveal'),false);
  const after=s.players[0].deck.map(x=>x.uid);
  if(mode==='locked')assert.deepEqual(after,before);
  if(['no match','decline'].includes(mode))assert.notDeepEqual(after,before);
  assert.deepEqual([...after].sort(),[...before].sort());
  assert.equal(s.players[0].hand.length,oldHand);
  assert.ok(has(s,0,'grave',spell));
 });
}

test('God Signal resolves as a free shield trigger for the defending player',()=>{
 const s=setup(),enemy=put(s,1,'battle',FIRE);
 give(s,0,'shields',[SIGNAL]);
 give(s,0,'deck',[NATURE,GOD,NATURE]);
 s.active=1;
 attack(s,enemy.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.equal(s.decision.player,0);
 const target=s.players[0].deck[1];
 pick(s,target.uid);
 assert.equal(s.players[0].deck[0].uid,target.uid);
 assert.equal(s.metrics[0].triggers,1);
});

for(const [id,count] of [[FIRE,1],['dmrp07-001',0],[MULTI,2],[TWIN,1],['dmbd10-008',5]]){
 test('Seikon counts only the selected own creature civilizations before it leaves '+id,()=>{
  const s=setup(),source=put(s,0,'hand',SOUL),target=put(s,0,'battle',id);
  put(s,1,'battle',MULTI);
  give(s,0,'deck',[MULTI,FIRE,NATURE,NATURE,NATURE,NATURE]);
  const initial=s.players[0].mana.length,top=s.players[0].deck[0];
  play(s,source);
  assert.deepEqual(s.decision.choices.map(x=>x.value.uid),[target.uid]);
  pick(s,target.uid);
  assert.ok(has(s,0,'grave',target));
  assert.equal(s.players[0].mana.length,initial+count);
  assert.equal(s.players[0].deck.length,6-count);
  if(count)assert.ok(has(s,0,'mana',top)&&top.tapped);
 });
}

test('Seikon keeps the last known added color through an EX Life replacement',()=>{
 let s=setup();
 const source=put(s,0,'hand',SOUL),target=put(s,0,'battle','dmrp20-km2'),shield=s.players[0].shields[0];
 target.exLifeShieldUid=shield.uid;
 s.extLimits=[{kind:'g805BattleColor',turn:s.turn,uid:target.uid,incarnation:0,color:'火'}];
 give(s,0,'deck',Array(6).fill(NATURE));
 const before=s.players[0].mana.length;
 play(s,source);
 s=JSON.parse(JSON.stringify(s));
 pick(s,target.uid);
 assert.ok(has(s,0,'battle',target));
 assert.ok(has(s,0,'grave',shield));
 assert.equal(s.players[0].mana.length,before+4);
});

test('Seikon puts its whole batch in mana before mana-entry effects can resolve',()=>{
 const s=setup(),source=put(s,0,'hand',SOUL),target=put(s,0,'battle',MULTI);
 put(s,0,'battle','dm26-025');
 put(s,1,'battle',FIRE);
 const initial=s.players[0].mana.length;
 play(s,source);
 pick(s,target.uid);
 assert.equal(s.players[0].mana.length,initial+2);
 assert.equal(s.decision?.type,'effectOrder');
 assert.equal(s.pendingEffects.filter(x=>x.source==='dm26-025').length,2);
 drain(s);
});

test('Seikon as an S-trigger resolves harmlessly with no own creature',()=>{
 const s=setup(),enemy=put(s,1,'battle',FIRE);
 give(s,0,'shields',[SOUL]);
 s.active=1;
 const before=s.players[0].mana.length;
 attack(s,enemy.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.equal(s.metrics[0].triggers,1);
 assert.equal(s.players[0].mana.length,before);
 assert.ok(s.players[0].grave.some(x=>x.cardId===SOUL));
});

for(const origin of ['hand','untapped mana','tapped mana']){
 test('Dolji evolves with full payment and breaks three shields from '+origin,()=>{
  let s=setup();
  give(s,0,'mana',origin==='untapped mana'?Array(8).fill(NATURE):[WATER,...Array(8).fill(NATURE)]);
  const source=put(s,0,origin==='hand'?'hand':'mana',DOLJI),base=put(s,0,'battle',MULTI);
  source.tapped=origin==='tapped mana';
  put(s,0,'battle',TWIN);
  put(s,0,'battle',NATURE);
  play(s,source);
  assert.equal(s.decision?.type,'evolution');
  assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
  s=JSON.parse(JSON.stringify(s));
  act(s,'evolve',a=>a.baseUid===base.uid);
  const evolved=s.players[0].battle.find(x=>x.uid===source.uid);
  assert.deepEqual(evolved.under.map(x=>x.uid),[base.uid]);
  assert.equal(s.players[0].mana.length,origin==='untapped mana'?8:9);
  assert.ok(s.players[0].mana.every(x=>x.tapped));
  attack(s,source.uid);
  act(s,'noBlock');
  assert.equal(s.decision?.count,3);
  act(s,'breakShields');
  drain(s);
  assert.equal(s.players[1].shields.length,2);
 });
}

test('Dolji charges tapped and cannot be summoned without eligible base or enough mana',()=>{
 const s=setup(),source=put(s,0,'hand',DOLJI);
 give(s,0,'mana',[WATER,...Array(7).fill(NATURE)]);
 s.phase='charge';
 act(s,'charge',a=>a.uid===source.uid);
 assert.equal(source.tapped,true);
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===source.uid&&a.kind==='play'));
 const base=put(s,0,'battle',MULTI);
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===source.uid&&a.kind==='play'));
 source.tapped=false;
 assert.ok(e.getLegalActions(s).some(a=>a.uid===source.uid&&a.kind==='play'));
 base.sealed=true;
 s.players[0].seals.push({...inst(FIRE),sealOf:base.uid});
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===source.uid&&a.kind==='play'));
});
