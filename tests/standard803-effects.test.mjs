import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-803.json',import.meta.url)));
const REAL="dm26-011",BLADE="dm24-039",RACER="dm25-050";
const FIRE="dm01-097",NATURE="dm01-108",WATER="dm01-083";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 803 definitions preserve their canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:803}));
  assert.throws(()=>standardCardSpec(detail,{phase:802}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:803}));
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

test('all three reprints resolve to their original supported deck cards',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.equal(printAliases.length,3);
 for(const print of printAliases){
  assert.equal(print.verification.facesMatched,true);
  assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:803}),cards.find(x=>x.id===print.canonicalId).spec);
  assert.equal(regulationVerification.limits[print.id],e.card(print.canonicalId).limit);
  assert.equal(registry.resolveRows([{id:print.id,count:1}])[0].id,print.canonicalId);
  assert.equal(refs.find(x=>x.id===print.id).image,print.image);
 }
});

const play=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);
const finish=s=>{if(s.decision?.type==='block')act(s,'noBlock');drain(s);};
const ids=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const end=s=>{s.phase='attack';act(s,'endTurn');finish(s);};

for(const mode of ['destroy and select','no target','grave locked','evolution','missing evolution base']){
 test('Real and Death resolves both instructions with the correct players for '+mode,()=>{
  let s=setup();
  const source=put(s,0,'hand',REAL),burn=put(s,1,'grave',FIRE),spell=put(s,1,'grave','dm01-027');
  const target=['destroy and select','evolution'].includes(mode)?put(s,1,'battle',NATURE):null;
  const base=mode==='evolution'?put(s,1,'battle',WATER):null;
  const evo=['evolution','missing evolution base'].includes(mode)?put(s,1,'grave','dmr16g-021'):null;
  if(mode==='grave locked')put(s,0,'battle','dmrp20-020');
  play(s,source);
  if(target){
   assert.equal(s.decision.task.op,'g34_Target');
   pick(s,target.uid);
  }
  assert.equal(s.decision.player,0);
  assert.equal(s.decision.task.op,'g34_Select');
  assert.ok(ids(s).includes(burn.uid)&&!ids(s).includes(spell.uid)&&!ids(s).includes(null));
  if(target)assert.ok(ids(s).includes(target.uid));
  s=JSON.parse(JSON.stringify(s));
  pick(s,evo?.uid??burn.uid);
  if(base){
   assert.equal(s.decision.player,1);
   pick(s,base.uid);
  }
  finish(s);
  assert.ok(has(s,0,'grave',source));
  assert.ok(!has(s,0,'battle',burn));
  assert.equal(has(s,1,'battle',burn),!evo&&mode!=='grave locked');
  assert.ok(has(s,1,'grave',spell));
  if(base)assert.ok(s.players[1].battle.find(x=>x.uid===evo.uid).under.some(x=>x.uid===base.uid));
  if(evo)assert.equal(has(s,1,'grave',evo),!base);
 });
}

test('Real and Death can use its shield trigger and the destroyed attacker can be put back',()=>{
 const s=setup();
 s.active=1;
 const enemy=put(s,1,'battle',FIRE);
 give(s,0,'shields',[REAL]);
 attack(s,enemy.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 pick(s,enemy.uid);
 pick(s,enemy.uid);
 finish(s);
 assert.ok(has(s,1,'battle',enemy));
 assert.equal(s.metrics[0].triggers,1);
});

for(const mode of ['cast','decline','blocked']){
 test('Blade selects the qualifying mana face before deciding to cast '+mode,()=>{
  let s=setup();
  const source=put(s,0,'hand',BLADE);
  const normal=put(s,0,'mana','dm01-027'),twin=put(s,0,'mana','dm23rp3-013');
  const creatureTrigger=put(s,0,'mana','dm23sp1-008'),hidden=put(s,0,'mana','dm01-086');
  hidden.faceDown=true;
  const target=put(s,1,'battle',FIRE);
  if(mode==='blocked')put(s,1,'battle','dmrp22-042');
  play(s,source);
  assert.deepEqual(ids(s),[normal.uid,twin.uid]);
  assert.equal(s.decision.choices.find(x=>x.value.uid===twin.uid).value.face,1);
  assert.ok(!ids(s).includes(creatureTrigger.uid));
  pick(s,twin.uid);
  if(mode!=='blocked'){
   assert.equal(s.decision.task.selected.face,1);
   s=JSON.parse(JSON.stringify(s));
   pick(s,mode==='cast'?true:null);
  }
  finish(s);
  assert.ok(has(s,0,'grave',source));
  assert.equal(has(s,0,'grave',twin),mode==='cast');
  assert.equal(has(s,0,'mana',twin),mode!=='cast');
  assert.ok(has(s,0,'mana',normal));
  assert.ok(has(s,1,mode==='cast'?'hand':'battle',target));
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,5);
  assert.equal(s.metrics[0].triggers,0);
 });
}

for(const [index,qualifies] of [[0,false],[1,true],[2,true]]){
 test('Pararira reveals only the opposing player selection '+index,()=>{
  let s=setup();
  const hidden=[put(s,0,'hand',FIRE),put(s,0,'hand','dm26-012'),put(s,0,'hand','dm24bd4-007')];
  const racer=put(s,0,'hand',RACER);
  play(s,racer);
  assert.equal(s.decision.player,1);
  assert.deepEqual(s.decision.choices.map(x=>[x.value,x.cardId,x.score]),[[0,undefined,0],[1,undefined,0],[2,undefined,0]]);
  assert.ok(hidden.every(x=>!JSON.stringify(e.getLegalActions(s)).includes(x.cardId)));
  s=JSON.parse(JSON.stringify(s));
  pick(s,index);
  finish(s);
  assert.deepEqual(s.players[0].hand.map(x=>x.uid),hidden.map(x=>x.uid));
  assert.deepEqual(s.log.filter(x=>x.type==='reveal'&&x.text.includes('パラリラ')).map(x=>x.cardId),[hidden[index].cardId]);
  const live=s.players[0].battle.find(x=>x.uid===racer.uid);
  assert.equal(!!e.effectiveCard(live,s).speedAttacker,qualifies);
  act(s,'toAttack');
  assert.equal(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===racer.uid),qualifies);
  end(s);
  assert.equal(!!e.effectiveCard(live,s).speedAttacker,false);
 });
}

test('Pararira with no other hand cards gives no choice or grant',()=>{
 const s=setup(),racer=put(s,0,'hand',RACER);
 play(s,racer);
 assert.equal(s.decision,null);
 assert.ok(!e.effectiveCard(racer,s).speedAttacker);
});
