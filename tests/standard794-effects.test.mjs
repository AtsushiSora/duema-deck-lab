import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-794.json',import.meta.url)));
const LEAP="dm24ex4-053",JOKER="dm24ex4-085",RAINBOW="dm24ex4-015";
const SMALL="dm01-108",TWIN="dmbd16-009",BOL="dm06-s08",MIRROR="dm24ex4-032";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 794 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:794}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:794}));
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
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:794}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const choices=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const taskIs=(s,op)=>assert.equal(s.decision?.task?.op,op,JSON.stringify(s.decision));
const end=s=>{s.phase='attack';act(s,'endTurn');};
function breakAt(s,x,shield){
 s.phase='attack';
 act(s,'attack',a=>a.uid===x.uid&&a.target==='player'&&(!shield||a.shield===shield.uid));
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>!shield||a.shields.includes(shield.uid));
}

test('超躍の絆 discards a hidden selection, draws twice, and lets the opponent destroy three of their creatures',()=>{
 const s=setup(),spell=put(s,0,'hand',LEAP);
 const first=put(s,1,'hand',SMALL),second=put(s,1,'hand',BOL);
 const ally=put(s,0,'battle',SMALL),enemies=Array.from({length:4},()=>put(s,1,'battle',SMALL));
 play(s,spell);
 taskIs(s,'g34_BlindDiscard773');
 assert.equal(s.decision.player,0);
 assert.deepEqual(choices(s),[0,1]);
 assert.ok(s.decision.choices.every(x=>!x.cardId&&!x.label.includes(e.card(first).name)&&!x.label.includes(e.card(second).name)));
 pick(s,1);
 assert.ok(has(s,1,'grave',second)&&has(s,1,'hand',first));
 assert.equal(s.players[0].hand.length,2);
 assert.equal(s.decision.player,1);
 assert.deepEqual(choices(s),enemies.map(x=>x.uid));
 for(const x of enemies.slice(1))pick(s,x.uid);
 assert.ok(has(s,0,'battle',ally)&&has(s,1,'battle',enemies[0]));
 assert.ok(enemies.slice(1).every(x=>has(s,1,'grave',x)));
});

test('超躍の絆 caps only the next opposing start, leaves already untapped mana alone and respects stricter caps',()=>{
 for(const galy of [false,true]){
  let s=setup(),spell=put(s,0,'hand',LEAP);
  if(galy)put(s,0,'battle','dm23ex2-022');
  const mana=Array.from({length:7},()=>inst(SMALL));
  s.players[1].mana=mana;
  for(const x of mana.slice(1))x.tapped=true;
  mana[6].skipUntap=true;
  play(s,spell);
  end(s);
  s=restore(s);
  taskIs(s,'g4_Untap');
  assert.equal(s.decision.player,1);
  assert.ok(!choices(s).includes(mana[0].uid)&&!choices(s).includes(mana[6].uid));
  const max=galy?3:4;
  for(const x of mana.slice(1,1+max))pick(s,x.uid);
  assert.equal(s.players[1].mana.filter(x=>!x.tapped).length,max+1);
  if(galy)s.players[0].battle=[];
  end(s);
  end(s);
  assert.ok(s.players[1].mana.every(x=>!x.tapped));
 }
});

test('超躍の絆 uses G・ストライク from a broken shield without casting its spell',()=>{
 const s=setup();s.active=1;give(s,0,'shields',[LEAP]);
 const attacker=put(s,1,'battle',SMALL),later=put(s,1,'battle',SMALL);
 breakAt(s,attacker);
 taskIs(s,'gsDeclare');
 pick(s,true);
 taskIs(s,'gsTarget');
 pick(s,later.uid);
 assert.ok(s.players[0].hand.some(x=>x.cardId===LEAP));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===later.uid));
 assert.ok(!s.g43UntapLimits?.length);
});

test('ピュリファイ・ジョーカー may replace an opposing discard, shuffle either graveyard and still draws when the shuffle is declined',()=>{
 for(const owner of [0,1,null]){
  const s=setup(),spell=put(s,0,'hand','dm01-094'),joker=put(s,1,'hand',JOKER);
  const graves=[put(s,0,'grave',SMALL),put(s,1,'grave',BOL)];
  play(s,spell);
  taskIs(s,'discardChosen');
  pick(s,true);
  taskIs(s,'g22Shuffle');
  assert.equal(s.decision.player,1);
  assert.equal(e.effectiveCard(joker,s).blocker,true);
  pick(s,owner);
  assert.equal(s.players[1].hand.length,2);
  for(const p of [0,1])assert.equal(has(s,p,'grave',graves[p]),owner!==p);
 }
});

test('ピュリファイ・ジョーカー may stay a discard and does not replace its owner’s discard',()=>{
 for(const enemy of [true,false]){
  const s=setup(),joker=put(s,1,'hand',JOKER);
  s.extTasks=[{op:'discard',p:1,source:LEAP,n:1,random:true,causedBy:enemy?0:1,selfDiscard:!enemy}];
  act(s,'toAttack');
  if(enemy){taskIs(s,'discardChosen');pick(s,false);}
  assert.ok(!s.decision);
  assert.ok(has(s,1,'grave',joker));
 }
});

test('ボルメテウス・レインボー・ドラゴン gives allied names including itself speed and may decline its own break',()=>{
 const s=setup(),rainbow=put(s,0,'hand',RAINBOW),ally=put(s,0,'battle',BOL),other=put(s,0,'battle',TWIN),enemy=put(s,1,'battle',BOL);
 const shields=s.players[0].shields.length;
 play(s,rainbow);
 taskIs(s,'g34_Break497');
 pick(s,null);
 assert.equal(s.players[0].shields.length,shields);
 assert.equal(e.effectiveCard(rainbow,s).breaker,2);
 assert.equal(e.effectiveCard(rainbow,s).speedAttacker,true);
 assert.equal(e.effectiveCard(ally,s).speedAttacker,true);
 assert.ok(!e.effectiveCard(other,s).speedAttacker&&!e.effectiveCard(enemy,s).speedAttacker);
});

test('ボルメテウス・レインボー・ドラゴン breaks its own shield and grants the qualifying twin face only',()=>{
 const s=setup(),rainbow=put(s,0,'hand',RAINBOW);
 const twin=put(s,0,'shields',TWIN);
 play(s,rainbow);
 pick(s,twin.uid);
 const triggers=e.getLegalActions(s).filter(a=>a.kind==='useTrigger');
 assert.deepEqual(triggers.map(a=>a.face??0),[0]);
 assert.equal(s.triggers.player,0);
 act(s,'useTrigger');
 assert.ok(has(s,0,'battle',twin));
});

test('ボルメテウス・レインボー・ドラゴン changes once during the same attack',()=>{
 const s=setup(),base=put(s,0,'battle',MIRROR),first=put(s,0,'hand',RAINBOW),second=put(s,0,'hand',RAINBOW);
 attack(s,base.uid);
 taskIs(s,'revDeclare');
 pick(s,true);
 taskIs(s,'revDeclare');
 pick(s,true);
 const effect=s.pendingEffects.find(x=>x.uid===first.uid);
 act(s,'orderEffect',a=>a.effectId===effect.effectId);
 taskIs(s,'revResolve');
 pick(s,base.uid);
 const entry=s.pendingEffects.find(x=>x.uid===first.uid);
 act(s,'orderEffect',a=>a.effectId===entry.effectId);
 taskIs(s,'g34_Break497');
 pick(s,null);
 assert.ok(has(s,0,'battle',first)&&has(s,0,'hand',base)&&has(s,0,'hand',second));
 assert.ok(!has(s,0,'battle',second));
});

test('ボルメテウス・レインボー・ドラゴン does not grant shield triggers above cost seven or while sealed',()=>{
 for(const [id,sealed] of [[BOL,true],['dm24ex4-020',false],[SMALL,false]]){
  const s=setup();s.active=1;
  give(s,0,'shields',[id]);
  const rainbow=put(s,0,'battle',RAINBOW),attacker=put(s,1,'battle',SMALL);
  if(sealed)s.players[0].seals.push({...inst(SMALL),faceDown:true,sealOf:rainbow.uid});
  breakAt(s,attacker);
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='useTrigger'));
  assert.ok(s.players[0].hand.some(x=>x.cardId===id));
 }
});

test('超躍の絆 does not expose face-down mana identities when choosing what to untap',()=>{
 const s=setup(),spell=put(s,0,'hand',LEAP);
 give(s,1,'mana',[SMALL,BOL]);
 const hidden=s.players[1].mana[1];
 hidden.faceDown=true;
 for(const x of s.players[1].mana)x.tapped=true;
 play(s,spell);
 end(s);
 taskIs(s,'g4_Untap');
 const choice=s.decision.choices.find(x=>x.value===hidden.uid);
 assert.ok(choice);
 assert.match(choice.label,/裏向きのマナ/);
 assert.ok(!choice.cardId);
 pick(s,hidden.uid);
 pick(s,null);
 assert.equal(hidden.tapped,false);
});
