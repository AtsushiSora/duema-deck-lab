import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-699.json',import.meta.url)));

test('Phase 699 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:699}));
  assert.throws(()=>standardCardSpec(detail,{phase:698}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
  const incomplete=structuredClone(detail);
  incomplete.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(incomplete,{phase:699}));
 }
});

const JAG='dm12-003',AQUA='dm08-s02',TURTLE='dm12-053';
const BODY='dm01-108',PEACAP='dm06-032',SPARK='dm01-015',GATE='dm01-086';
const BASE='dmrp18-068';
const put=(s,p,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const play=(s,id)=>{
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid);
 return x;
};
const block=(s,x)=>act(s,'block',a=>a.uid===x.uid);
const value=x=>x.value?.uid??x.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);

test('Same-name prints have the same official faces and rules without a second playable ID',()=>{
 assert.deepEqual(printAliases.map(x=>x.id),['dmc44-017']);
 for(const row of printAliases){
  const canonical=cards.find(x=>x.id===row.canonicalId);
  assert.deepEqual(row.faces,canonical.faces);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:699}),canonical.spec);
  assert.equal(regulationVerification.limits[row.id],regulationVerification.limits[canonical.id]);
  assert.ok(row.verification.facesMatched);
  assert.ok(!data.cards.some(c=>c.id===row.id));
 }
});

test('Jaglavine destroys itself after the battle result and resumes that effect from JSON',()=>{
 let s=setup();
 const attacker=put(s,0,BODY),jag=put(s,1,JAG,{g34Grants:[{turn:s.turn,battleWinDraw:true}]});
 attack(s,attacker.uid);
 block(s,jag);
 assert.equal(s.decision.type,'draw');
 assert.ok(has(s,0,'grave',attacker));
 assert.ok(has(s,1,'battle',jag));
 s=restore(s);
 act(s,'draw');
 assert.ok(has(s,1,'grave',jag));
 assert.equal(s.players[1].shields.length,5);
});

test('Jaglavine can W-break and survives a normal battle or a block that skips battle',()=>{
 const s=setup(),jag=put(s,0,JAG),target=put(s,1,BODY,{tapped:true});
 attack(s,jag.uid,target.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.ok(has(s,0,'battle',jag));
 assert.ok(has(s,1,'grave',target));
 jag.tapped=false;
 give(s,1,'shields',[BODY,BODY]);
 attack(s,jag.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.equal(s.players[1].shields.length,0);
 const t=setup(),peacap=put(t,0,PEACAP),defender=put(t,1,JAG);
 attack(t,peacap.uid);
 block(t,defender);
 assert.ok(has(t,1,'battle',defender));
 assert.equal(defender.tapped,true);
 assert.ok(!t.log.some(x=>x.type==='battle'));
});

test('Emperor Aqua requires an own Cyber Lord and draws up to two after an opposing trigger',()=>{
 for(const drawCount of [0,1,2]){
  const s=setup(),attacker=put(s,0,BODY),enemyBase=put(s,1,BASE);
  const aqua=inst(AQUA);
  s.players[0].hand.push(aqua);
  assert.ok(!e.getLegalActions(s).some(a=>a.uid===aqua.uid));
  const base=put(s,0,BASE);
  act(s,'play',a=>a.uid===aqua.uid);
  assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
  act(s,'evolve',a=>a.baseUid===base.uid);
  assert.equal(aqua.under[0].uid,base.uid);
  assert.ok(e.effectiveCard(aqua,s).blocker);
  assert.ok(has(s,1,'battle',enemyBase));
  give(s,0,'deck',[BODY,BODY,BODY]);
  give(s,1,'shields',[SPARK]);
  attack(s,attacker.uid);
  if(s.decision?.type==='block')act(s,'noBlock');
  act(s,'useTrigger');
  assert.equal(s.decision.task.op,'g34_DrawUpTo');
  assert.ok(aqua.tapped);
  for(let i=0;i<drawCount;i++)pick(s,true);
  if(drawCount<2)pick(s,null);
  assert.equal(s.players[0].hand.length,drawCount);
  assert.equal(s.decision,null);
 }
});

test('Turtle Horn waits for the opposing S-Trigger spell and can search after leaving play',()=>{
 let s=setup();
 const attacker=put(s,0,BODY),turtle=put(s,0,TURTLE);
 give(s,0,'deck',[BODY,SPARK,BODY]);
 give(s,1,'shields',[GATE]);
 const wanted=s.players[0].deck[2],spell=s.players[0].deck[1],rng=s.rng;
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'useTrigger');
 assert.equal(s.decision.type,'effect');
 assert.equal(s.decision.player,1);
 act(s,'effect',a=>a.targets?.[0]?.uid===turtle.uid);
 assert.equal(s.decision.task.op,'g34_LookPick');
 assert.equal(s.decision.player,0);
 assert.ok(has(s,0,'hand',turtle));
 assert.ok(!s.decision.choices.map(value).includes(spell.uid));
 s=restore(s);
 pick(s,wanted.uid);
 assert.ok(has(s,0,'hand',wanted));
 assert.notEqual(s.rng,rng);
 assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===BODY));
});

test('Turtle Horn searches once per used S-Trigger after both spells and can decline a search result',()=>{
 let s=setup();
 const attacker=put(s,0,BODY);
 put(s,0,TURTLE);
 give(s,0,'deck',[BODY,SPARK,BODY]);
 give(s,1,'shields',[SPARK]);
 const [root]=s.players[1].shields,stacked=inst(SPARK);
 root.shieldStack=[stacked];
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'useTrigger');
 act(s,'useTrigger');
 act(s,'orderTrigger',a=>a.uid===root.uid);
 assert.ok(has(s,1,'grave',root));
 assert.ok(has(s,1,'grave',stacked));
 assert.equal(s.decision.type,'entryOrder');
 s=restore(s);
 const first=e.getLegalActions(s)[0];
 assert.ok(first.effectId);
 e.step(s,first);
 const rng=s.rng;
 pick(s,null);
 assert.notEqual(s.rng,rng);
 assert.equal(s.players[0].hand.length,0);
 const wanted=s.players[0].deck.find(x=>x.cardId===BODY);
 pick(s,wanted.uid);
 assert.ok(has(s,0,'hand',wanted));
 assert.equal(s.decision,null);
});

test('Turtle Horn ignores a declined shield trigger and its controller’s own shield trigger',()=>{
 for(const ownShield of [false,true]){
  const s=setup(),attacker=put(s,0,BODY),p=ownShield?1:0;
  put(s,p,TURTLE);
  give(s,p,'deck',[BODY,SPARK,BODY]);
  give(s,1,'shields',[SPARK]);
  const rng=s.rng;
  attack(s,attacker.uid);
  if(s.decision?.type==='block')act(s,'noBlock');
  act(s,ownShield?'useTrigger':'skipTrigger');
  assert.equal(s.decision,null);
  assert.equal(s.rng,rng);
 }
});
