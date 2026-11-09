import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-697.json',import.meta.url)));

test('Phase 697 validates four complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:697}));
  assert.throws(()=>standardCardSpec(detail,{phase:696}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:697}));
 }
});

const RIVEN='dm19-006',GUEM='dm24-032',WALTZ='dm16-012',CLONE='dm12-028';
const BODY='dm01-108',BASE='dm15-044',SPARK='dm01-015',DEATH='dm01-027',BOUNCE='dm01-086';
const put=(s,p,id,attrs={})=>{const x=Object.assign(inst(id),attrs);s.players[p].battle.push(x);return x;};
const play=(s,id)=>{const x=inst(id);s.players[s.active].hand.push(x);act(s,'play',a=>a.uid===x.uid);return x;};
const choiceValues=s=>s.decision.choices.map(x=>x.value);
const pick=(s,uid)=>act(s,'extended',a=>{const v=choiceValues(s)[a.choice];return (v?.uid??v)===uid;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const removeWith=(s,id,target)=>{s.active=1;s.phase='main';play(s,id);act(s,'effect',a=>a.targets?.some(x=>x.uid===target.uid));};

for(const owner of [0,1])test('Riven makes only the player with more shields select one '+owner,()=>{
 const s=setup();give(s,owner,'shields',[BODY,SPARK]);give(s,1-owner,'shields',[BODY]);
 const chosen=s.players[owner].shields[1];
 // Multiple physical cards in one pile do not affect the shield count.
 s.players[1-owner].shields[0].shieldStack=[inst(BODY),inst(BODY)];
 play(s,RIVEN);
 assert.equal(s.decision.player,owner);
 assert.ok(s.decision.choices.every(x=>!x.cardId));
 assert.equal(choiceValues(s).length,2);
 pick(s,chosen.uid);
 assert.ok(has(s,owner,'grave',chosen));
 assert.deepEqual(s.players.map(p=>p.shields.length),[1,1]);
 assert.equal(s.decision,null);
});

test('On a tie both players choose before either shield moves, including after restore',()=>{
 let s=setup();s.active=1;
 give(s,0,'shields',[BODY,SPARK]);give(s,1,'shields',[SPARK,BODY]);
 const first=s.players[1].shields[0],second=s.players[0].shields[1];
 play(s,RIVEN);
 assert.equal(s.decision.player,1);
 pick(s,first.uid);
 assert.equal(s.decision.player,0);
 assert.deepEqual(s.players.map(p=>p.shields.length),[2,2]);
 assert.ok(!has(s,1,'grave',first));
 s=JSON.parse(JSON.stringify(s));
 pick(s,second.uid);
 assert.ok(has(s,1,'grave',first));
 assert.ok(has(s,0,'grave',second));
 assert.deepEqual(s.players.map(p=>p.shields.length),[1,1]);
 assert.equal(s.decision,null);
});

test('Riven with no shields on either side resolves without a choice',()=>{
 const s=setup();give(s,0,'shields',[]);give(s,1,'shields',[]);
 play(s,RIVEN);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players.map(p=>p.shields.length),[0,0]);
});

test('Death Waltz evolves on an own Gargoyle and the opponent chooses despite unequal shields',()=>{
 const s=setup(),base=put(s,0,BASE);
 put(s,0,BODY);put(s,1,BASE);
 give(s,0,'shields',[]);give(s,1,'shields',[BODY,SPARK]);
 const shield=s.players[1].shields[1],evo=play(s,WALTZ);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.ok(s.players[0].battle.find(x=>x.uid===evo.uid).under.some(x=>x.uid===base.uid));
 assert.equal(s.decision.player,1);
 pick(s,shield.uid);
 assert.ok(has(s,1,'grave',shield));
 assert.equal(s.players[1].shields.length,1);
});

test('Guem adds the top card face down before its controller chooses an opposing shield',()=>{
 const s=setup(),guem=put(s,0,GUEM);
 give(s,0,'deck',[SPARK,BODY]);give(s,1,'shields',[BODY,SPARK,BODY]);
 const top=s.players[0].deck[0],target=s.players[1].shields[1],before=s.players[0].shields.length;
 removeWith(s,DEATH,guem);
 assert.ok(has(s,0,'grave',guem));
 assert.ok(has(s,0,'shields',top));
 assert.ok(!top.faceUp);
 assert.equal(s.players[0].shields.length,before+1);
 assert.equal(s.decision.player,0);
 assert.ok(!choiceValues(s).includes(null));
 pick(s,target.uid);
 assert.ok(has(s,1,'grave',target));
 assert.equal(s.decision,null);
});

test('Guem does not trigger when returned to hand, and still adds a shield when the opponent has none',()=>{
 const s=setup(),guem=put(s,0,GUEM);
 removeWith(s,BOUNCE,guem);
 assert.ok(has(s,0,'hand',guem));
 assert.deepEqual(s.players.map(p=>p.shields.length),[5,5]);
 const t=setup(),victim=put(t,0,GUEM);
 give(t,1,'shields',[]);
 removeWith(t,DEATH,victim);
 assert.deepEqual(t.players.map(p=>p.shields.length),[6,0]);
 assert.equal(t.decision,null);
});

test('Clone Crush requires the first target and can decline additional targets',()=>{
 const s=setup(),first=put(s,1,BODY),second=put(s,1,BODY);
 give(s,1,'grave',[CLONE]);
 play(s,CLONE);
 assert.ok(!choiceValues(s).includes(null));
 pick(s,first.uid);
 assert.ok(choiceValues(s).includes(null));
 assert.ok(has(s,1,'battle',first));
 assert.ok(!choiceValues(s).some(v=>v?.uid===first.uid));
 pick(s,null);
 assert.ok(has(s,1,'grave',first));
 assert.ok(has(s,1,'battle',second));
});

test('Clone Crush counts both graves, excludes its pending cast, and destroys all selected creatures together',()=>{
 let s=setup();
 const targets=[put(s,1,BODY),put(s,1,BODY,{powerModifiers:[{amount:1000}]}),put(s,1,BODY)];
 const remaining=put(s,1,BODY),high=put(s,1,BODY,{powerModifiers:[{amount:1001}]});
 give(s,0,'grave',[CLONE]);give(s,1,'grave',[CLONE,BODY]);
 const spell=play(s,CLONE);
 assert.ok(!choiceValues(s).some(v=>v?.uid===high.uid));
 pick(s,targets[0].uid);
 s=JSON.parse(JSON.stringify(s));
 pick(s,targets[1].uid);
 assert.ok(targets.every(x=>has(s,1,'battle',x)));
 pick(s,targets[2].uid);
 assert.equal(s.decision,null);
 assert.ok(targets.every(x=>has(s,1,'grave',x)));
 assert.ok(has(s,1,'battle',remaining));
 assert.ok(has(s,1,'battle',high));
 assert.ok(has(s,0,'grave',spell));
});
