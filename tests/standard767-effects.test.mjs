import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-767.json',import.meta.url)));
const BATS='dm23rp2-049',GURU='dm23rp2-064',ZEN='dm23rp2-033';
const BODY='dm01-108',SEED='dm25ex1-054',MAGIC='dm23rp2-059',ABYSS='dm23rp2-005';
const BIG_ABYSS='dm23rp2-OR02',BIG_MAGIC='dmr17-066';
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const end=s=>{s.phase='attack';act(s,'endTurn');};
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
function deploy(s,p,id){
 const x=put(s,p,'hand',id);
 task(s,'putCreature',p,{origin:'hand',uid:x.uid});
 assert.ok(has(s,p,'battle',x));
 return x;
}

test('three complete definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:767}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:767}));
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
test('Batsuda follows the exact second or later enemy through a saved optional choice',()=>{
 let s=setup();
 const watcher=put(s,0,'battle',BATS);
 s.active=1;
 const first=play(s,BODY);
 assert.equal(s.decision,null);
 const second=play(s,BODY);
 assert.equal(s.decision.task.op,'g34_Batsuda767');
 pick(s,null);
 const third=play(s,BODY);
 s=restore(s);
 pick(s,true);
 assert.ok(has(s,0,'mana',watcher));
 assert.ok(has(s,1,'mana',third));
 assert.ok(has(s,1,'battle',first)&&has(s,1,'battle',second));
});

test('Batsuda still moves the entering creature if its own move is replaced',()=>{
 const s=setup();
 const watcher=put(s,0,'battle',BATS);
 deploy(s,1,BODY);
 put(s,1,'battle','dmrp22-033');
 const enemy=deploy(s,1,BODY);
 pick(s,true);
 assert.ok(has(s,0,'grave',watcher));
 assert.ok(has(s,1,'mana',enemy));
});

test('Gurubokassa counts the actual opponent grave entries and uses the eligible Abyss',()=>{
 let s=setup();
 put(s,0,'battle',GURU);
 give(s,1,'grave',[BODY,BODY]);
 give(s,0,'deck',[BIG_ABYSS,ABYSS,BODY,BODY,BODY,BODY]);
 task(s,'g34_Mill',0,{owner:1,n:1});
 assert.equal(s.g767GraveEntries.counts[1],1);
 task(s,'g34_Mill',0,{owner:1,n:1});
 s=restore(s);
 end(s);
 assert.equal(s.decision.task.op,'g34_RaidPick');
 assert.deepEqual(s.decision.choices.map(c=>c.cardId).filter(Boolean),[ABYSS]);
 const usable=s.players[0].deck.find(x=>x.cardId===ABYSS);
 const [big,,wrong]=s.players[0].deck.slice(0,3);
 pick(s,usable.uid);
 assert.ok(has(s,0,'battle',usable));
 pick(s,wrong.uid);
 drain(s);
 assert.deepEqual(s.players[0].deck.slice(-2).map(x=>x.uid),[wrong.uid,big.uid]);
});

test('Gurubokassa ignores preexisting grave cards, own entries and the opponent turn',()=>{
 for(const situation of ['old','own','opponent','previousTurn']){
  const s=setup();
  put(s,0,'battle',GURU);
  give(s,1,'grave',[BODY,BODY]);
  if(situation==='old')task(s,'g34_Mill',0,{owner:1,n:1});
  if(situation==='own')task(s,'g34_Mill',0,{owner:0,n:2});
  if(situation==='opponent'){
   s.active=1;
   task(s,'g34_Mill',1,{owner:1,n:2});
  }
  if(situation==='previousTurn'){
   task(s,'g34_Mill',0,{owner:1,n:2});
   s.turn++;
  }
  end(s);
  assert.equal(s.decision,null,situation);
 }
});

test('Zentuu sees unpaid elements including a Tamaseed and permits one accepted raid per turn',()=>{
 let s=setup();
 put(s,0,'battle',ZEN);
 s.active=1;
 play(s,BODY);
 assert.equal(s.decision,null);
 deploy(s,1,BODY);
 assert.equal(s.decision.task.op,'g34_Zentuu767');
 pick(s,null);
 give(s,0,'deck',[BODY,MAGIC,BIG_MAGIC,BODY,BODY]);
 deploy(s,1,SEED);
 assert.equal(s.decision.task.op,'g34_Zentuu767');
 s=restore(s);
 pick(s,true);
 assert.deepEqual(s.decision.choices.map(c=>c.cardId).filter(Boolean),[MAGIC]);
 const usable=s.players[0].deck.find(x=>x.cardId===MAGIC);
 pick(s,usable.uid);
 drain(s);
 assert.ok(has(s,0,'battle',usable));
 deploy(s,1,BODY);
 assert.equal(s.decision,null);
 s.turn++;
 deploy(s,1,BODY);
 assert.equal(s.decision.task.op,'g34_Zentuu767');
});

test('Zentuu can react to a Shield Trigger summon during its controller’s turn',()=>{
 const s=setup();
 const watcher=put(s,0,'battle',ZEN),attacker=put(s,0,'battle',BODY);
 give(s,1,'shields',['dmr19-081']);
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'useTrigger');
 assert.equal(s.decision.task.uid,watcher.uid);
 assert.equal(s.decision.task.op,'g34_Zentuu767');
 pick(s,null);
 drain(s);
});

test('Zentuu sees a zero-cost summon and an entry with its own trigger suppressed',()=>{
 const s=setup();
 const watcher=put(s,0,'battle',ZEN);
 s.active=1;
 play(s,'dmex08-174');
 assert.equal(s.decision.task.uid,watcher.uid);
 assert.equal(s.decision.task.op,'g34_Zentuu767');
 pick(s,null);
 const entrant=put(s,1,'grave',MAGIC);
 const handSize=s.players[1].hand.length;
 task(s,'g29_Deploy',1,{origin:'grave',uid:entrant.uid,ignoreEntry:true});
 assert.equal(s.decision.task.op,'g34_Zentuu767');
 pick(s,null);
 assert.equal(s.players[1].hand.length,handSize);
 assert.ok(has(s,1,'battle',entrant));
});
