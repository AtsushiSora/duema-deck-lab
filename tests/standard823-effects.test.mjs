import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain,GEN} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-823.json',import.meta.url)));
const LUCIANO='dm34-042',AFEX='dm34-038',SAMO='dm34-046',KORA='dm34-054',RAVEN='dm34-050';
const NATURE='dm01-108',DARK='dm01-090',EVO='dm02-033',NEO='dmrp01-087';
const DEMON='dm01-027',BOUNCE='dm01-086',HERO='dmbd16-009',STRATO='dm22rp2-048';
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 823 definitions preserve their canonical saved deck IDs',()=>{
 assert.equal(cards.length,5);
 assert.deepEqual(printAliases,[]);
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:823}));
  assert.throws(()=>standardCardSpec(detail,{phase:822}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:823}));
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

const play=(s,x,face=0)=>act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face);

const target=(s,x)=>act(s,'effect',a=>a.targets?.some(y=>y.uid===x.uid));
const drawChoice=(s,id)=>{
 assert.equal(s.decision.task.op,'optionalDrawOne');
 assert.equal(s.decision.source,id);
};

for(const [id,accept] of [[LUCIANO,true],[AFEX,false],[SAMO,true],[KORA,false],[RAVEN,true]])test('each physical source can draw when its evolution stack is destroyed: '+id,()=>{
 let s=setup();
 const [next]=give(s,1,'deck',[NATURE,DARK,NATURE]);
 const top=put(s,1,'battle',EVO),below=inst(id);
 top.under=[below];
 play(s,put(s,0,'hand',DEMON));
 target(s,top);
 assert.ok(has(s,1,'grave',top)&&has(s,1,'grave',below));
 assert.equal(s.decision.player,1);
 drawChoice(s,id);
 s=JSON.parse(JSON.stringify(s));
 pick(s,accept?true:null);
 assert.equal(s.decision,null);
 assert.equal(has(s,1,'hand',next),accept);
});

test('two physical copies trigger once each when their common stack is destroyed',()=>{
 let s=setup();
 const [first,second]=give(s,1,'deck',[NATURE,DARK,NATURE]);
 const top=put(s,1,'battle',EVO),a=inst(SAMO),b=inst(SAMO);
 top.under=[a,b];
 play(s,put(s,0,'hand',DEMON));
 target(s,top);
 assert.equal(s.decision.type,'effectOrder');
 assert.equal(s.decision.player,1);
 const triggered=s.pendingEffects.filter(x=>x.source===SAMO);
 assert.deepEqual(triggered.map(x=>x.uid),[a.uid,b.uid]);
 s=JSON.parse(JSON.stringify(s));
 act(s,'orderEffect',a=>a.effectId===triggered[1].effectId);
 drawChoice(s,SAMO);
 pick(s,true);
 drawChoice(s,SAMO);
 pick(s,true);
 assert.ok(has(s,1,'hand',first)&&has(s,1,'hand',second));
 assert.equal(s.decision,null);
});

for(const [host,triggers] of [[NEO,true],[NATURE,false]])test('removing the last card underneath uses the pre-move evolution status: '+host,()=>{
 const s=setup(),top=put(s,1,'battle',host),below=inst(RAVEN);
 top.under=[below];
 const [next]=give(s,1,'deck',[DARK,NATURE]);
 play(s,put(s,0,'hand',HERO),1);
 target(s,below);
 assert.ok(has(s,1,'battle',top)&&has(s,1,'grave',below));
 assert.equal(s.players[1].battle[0].under.length,0);
 if(triggers){drawChoice(s,RAVEN);pick(s,true);}
 assert.equal(s.decision,null);
 assert.equal(has(s,1,'hand',next),triggers);
});

test('a G-NEO replacement trashes its source and keeps the host in battle',()=>{
 const s=setup();
 const top=put(s,1,'battle','dm25rp1-S06'),below=inst(KORA);
 top.under=[below];
 const [next]=give(s,1,'deck',[DARK,NATURE]);
 play(s,put(s,0,'hand',DEMON));
 target(s,top);
 drawChoice(s,KORA);
 assert.ok(has(s,1,'battle',top)&&has(s,1,'grave',below));
 pick(s,true);
 assert.ok(has(s,1,'hand',next));
});

test('Stratobag can send just the top to mana and the source still triggers in the grave',()=>{
 const s=setup(),top=put(s,1,'battle',EVO),below=inst(AFEX);
 top.under=[below];
 put(s,0,'battle',STRATO);
 const [next]=give(s,1,'deck',[DARK,NATURE]);
 play(s,put(s,0,'hand',DEMON));
 target(s,top);
 act(s,'g47Replace',a=>a.choice?.replacement==='strato');
 pick(s,top.uid);
 pick(s,null);
 drawChoice(s,AFEX);
 assert.ok(has(s,1,'mana',top)&&has(s,1,'grave',below));
 pick(s,true);
 assert.ok(has(s,1,'hand',next));
});

test('under-card Meteorburn draws after the attack effect completes, even from a face-down source',()=>{
 let s=setup(),top=put(s,0,'battle','dm22ex2-S06'),below=inst(AFEX);
 below.faceDown=true;
 top.under=[below];
 const [next]=give(s,0,'deck',[DARK,NATURE]);
 attack(s,top.uid);
 assert.equal(s.decision.task.op,'g31_Meteor');
 assert.equal(s.decision.choices.find(x=>x.value===below.uid).cardId,undefined);
 s=JSON.parse(JSON.stringify(s));
 pick(s,below.uid);
 assert.ok(has(s,0,'grave',below));
 drawChoice(s,AFEX);
 pick(s,true);
 assert.ok(has(s,0,'hand',next));
 assert.equal(s.decision.type,'block');
});

test('a source follows the grave trigger even while Genmu ignores small creatures',()=>{
 const s=setup(),top=put(s,1,'battle',EVO),below=inst(LUCIANO);
 top.under=[below];
 put(s,0,'battle',GEN);
 const [next]=give(s,1,'deck',[DARK,NATURE]);
 play(s,put(s,0,'hand',DEMON));
 target(s,top);
 drawChoice(s,LUCIANO);
 pick(s,true);
 assert.ok(has(s,1,'hand',next));
});

test('ordinary destruction, bouncing an evolution stack, and subsequent discard grant no draw',()=>{
 const s=setup(),ordinary=put(s,1,'battle',KORA),top=put(s,1,'battle',EVO),below=inst(LUCIANO);
 top.under=[below];
 play(s,put(s,0,'hand',DEMON));
 target(s,ordinary);
 assert.ok(has(s,1,'grave',ordinary));
 assert.equal(s.decision,null);
 play(s,put(s,0,'hand',BOUNCE));
 target(s,top);
 assert.ok(has(s,1,'hand',below));
 assert.equal(s.decision,null);
 play(s,put(s,0,'hand','dm33-015'));
 pick(s,below.uid);
 pick(s,true);
 assert.ok(has(s,1,'grave',below));
 assert.equal(s.decision,null);
});

test('A-Fex can block and attack a tapped creature, with no player attack',()=>{
 const s=setup(),afex=put(s,0,'hand',AFEX),enemy=put(s,1,'battle',DARK);
 play(s,afex);
 afex.entered=0;
 enemy.tapped=true;
 s.phase='attack';
 const attacks=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===afex.uid);
 assert.deepEqual(attacks.map(a=>a.target),[enemy.uid]);
 enemy.tapped=false;
 s.active=1;
 attack(s,enemy.uid);
 act(s,'block',a=>a.uid===afex.uid);
 drain(s);
 assert.ok(has(s,0,'grave',afex)&&has(s,1,'grave',enemy));
 assert.equal(s.decision,null);
});

test('DOOM resolves its Meteorburn effects before the detached source may draw',()=>{
 const s=setup(),top=put(s,0,'battle','dm22ex1-007'),below=inst(SAMO);
 top.under=[below];
 const [next]=give(s,0,'deck',[DARK,NATURE]);
 const enemy=put(s,1,'battle',NATURE);
 attack(s,top.uid);
 assert.equal(s.decision.task.op,'g24_Meteor');
 pick(s,below.uid);
 assert.equal(s.decision.task.op,'g24_Minus');
 pick(s,enemy.uid);
 assert.equal(s.decision.task.op,'g24_DoomRevive');
 pick(s,below.uid);
 drawChoice(s,SAMO);
 assert.ok(has(s,0,'battle',below)&&has(s,1,'grave',enemy));
 pick(s,true);
 assert.ok(has(s,0,'hand',next));
});
