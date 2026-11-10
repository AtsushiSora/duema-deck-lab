import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-808.json',import.meta.url)));
const MUSHA="dm24-s04",RUSTY="dm24-s02",MAX="dm24-075";
const FIRE="dm01-097",NATURE="dm01-108",LIGHT="dm01-075",HAND="dm01-027";
const MULTI="dm25rp1-050",TWIN="dm24bd4-007",JOURNEY="dmx22b-163";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 808 definitions preserve their canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:808}));
  assert.throws(()=>standardCardSpec(detail,{phase:807}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:808}));
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

test('all nine alternate prints resolve to their original supported deck cards',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.equal(printAliases.length,9);
 for(const print of printAliases){
  assert.equal(print.verification.facesMatched,true);
  assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:808}),cards.find(x=>x.id===print.canonicalId).spec);
  assert.equal(regulationVerification.limits[print.id],e.card(print.canonicalId).limit);
  assert.equal(registry.resolveRows([{id:print.id,count:1}])[0].id,print.canonicalId);
  assert.equal(refs.find(x=>x.id===print.id).image,print.image);
 }
});

const play=(s,x,face=0)=>act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face&&!a.alternative);

for(const mode of ['pay','decline','no shield','no target']){
 test('Musha links optional shield burial to creature destruction before blocking '+mode,()=>{
  let s=setup();
  const source=put(s,0,'battle',MUSHA),above=put(s,1,'battle','dmrp07-001');
  const target=mode==='no target'?null:put(s,1,'battle','dm06-048');
  give(s,0,'shields',mode==='no shield'?[]:[HAND,NATURE]);
  const shield=s.players[0].shields[0];
  attack(s,source.uid);
  if(shield){
   assert.equal(s.decision?.task?.op,'g34_ShieldGrave');
   s=JSON.parse(JSON.stringify(s));
   pick(s,mode==='decline'?null:shield.uid);
  }
  if(mode==='pay'){
   assert.equal(s.decision?.task?.op,'g34_Target');
   assert.deepEqual(s.decision.choices.map(x=>x.value.uid),[target.uid]);
   pick(s,target.uid);
   assert.ok(has(s,1,'grave',target));
  }else if(target)assert.ok(has(s,1,'battle',target));
  assert.ok(has(s,1,'battle',above));
  if(shield)assert.equal(has(s,0,'grave',shield),['pay','no target'].includes(mode));
  assert.equal(s.metrics[0].triggers,0);
  act(s,'noBlock');
  assert.equal(s.decision?.count,2);
  act(s,'breakShields');
  drain(s);
  assert.equal(s.players[1].shields.length,3);
 });
}

for(const [id,face,draw,normal] of [[MULTI,0,true,0],[JOURNEY,0,true,3],[LIGHT,0,false,0],[TWIN,0,false,0],[TWIN,1,false,2]]){
 test('Rusty counts the chosen spell or creature face of a card used by its controller '+id+' '+face,()=>{
  const s=setup(),source=put(s,0,'battle',RUSTY),used=put(s,0,'hand',id);
  give(s,0,'deck',Array(9).fill(NATURE));
  play(s,used,face);
  if(id===TWIN&&face===1)while(s.decision&&s.decision.task?.source!==source.cardId) e.step(s,e.chooseAI(s));
  assert.equal(s.decision?.task?.source===source.cardId,draw);
  if(draw){
   assert.equal(s.decision?.task?.op,'g34_Draw');
   pick(s,1);
  }
  assert.equal(s.players[0].hand.length,normal+Number(draw));
 });
}

test('Rusty may decline the draw from a free S-trigger summon on the other turn',()=>{
 const s=setup();
 put(s,0,'battle',RUSTY);
 const enemy=put(s,1,'battle',FIRE);
 give(s,0,'shields',[MULTI]);
 give(s,0,'deck',[NATURE,NATURE]);
 s.active=1;
 attack(s,enemy.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.equal(s.decision?.task?.source,RUSTY);
 assert.equal(s.decision.player,0);
 assert.equal(s.metrics[0].triggers,1);
 pick(s,0);
 drain(s);
 assert.equal(s.players[0].hand.length,0);
 assert.equal(s.players[0].deck.length,2);
 assert.ok(s.players[0].battle.some(x=>x.cardId===MULTI));
});

test('Rusty and Maxgaizer ignore a non-summon deployment and opposing executions',()=>{
 const s=setup(),rusty=put(s,0,'battle',RUSTY),max=put(s,0,'battle',MAX),multi=put(s,0,'hand',MULTI);
 s.extTasks=[{op:'g34_Put',p:0,source:RUSTY,origin:'hand',target:multi.uid}];
 act(s,'toAttack');
 assert.ok(has(s,0,'battle',multi));
 assert.equal(s.decision,null);
 assert.equal(e.power(max,false,s),2000);
 s.active=1;
 s.phase='main';
 play(s,put(s,1,'hand',MULTI));
 play(s,put(s,1,'hand',JOURNEY));
 assert.equal(s.decision,null);
 assert.equal(e.power(max,false,s),2000);
 assert.ok(has(s,0,'battle',rusty));
});

test('Maxgaizer stacks one boost for each qualifying use and expires at the end of the turn',()=>{
 const s=setup(),source=put(s,0,'battle',MAX);
 for(const [id,face,expected] of [[LIGHT,0,2000],[MULTI,0,4000],[JOURNEY,0,6000],[TWIN,0,8000],[TWIN,1,10000],['dmrp07-001',0,10000]]){
  play(s,put(s,0,'hand',id),face);
  drain(s);
  assert.equal(e.power(source,false,s),expected,id);
 }
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 assert.equal(e.power(source,false,s),2000);
});

test('Maxgaizer also boosts on a free qualifying spell during the opponent turn',()=>{
 const s=setup(),source=put(s,0,'battle',MAX),enemy=put(s,1,'battle',FIRE);
 give(s,0,'shields',['dm06-110']);
 s.active=1;
 attack(s,enemy.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 drain(s);
 assert.equal(s.metrics[0].triggers,1);
 assert.equal(e.power(source,false,s),4000);
 act(s,'endTurn');
 drain(s);
 assert.equal(e.power(source,false,s),2000);
});
