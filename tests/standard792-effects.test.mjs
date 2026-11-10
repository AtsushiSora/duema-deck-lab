import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-792.json',import.meta.url)));
const MEL="dm24ex4-016",BON="dm24ex4-033",KAISER="dm24ex4-023";
const LIGHT="dm01-075",NATURE="dm01-103",WATER="dm01-051",FIRE="dm01-097",SEED="dm22ex1-086";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 792 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:792}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:792}));
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
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:792}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

const play=(s,x,pred=()=>true)=>act(s,'play',a=>a.uid===x.uid&&pred(a));
const choices=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const taskIs=(s,op)=>assert.equal(s.decision?.task?.op,op,JSON.stringify(s.decision));
const attacks=(s,x)=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid);
function finishAttack(s){
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
}
function end(s){s.phase='attack';act(s,'endTurn');}
function top(s,p,id){const x=inst(id);s.players[p].deck.unshift(x);return x;}

test('メルヴェイユ can evolve from mana onto light or nature and shield an opposing noncreature',()=>{
 let s=setup();
 const mel=put(s,0,'mana',MEL),light=put(s,0,'battle',LIGHT),nature=put(s,0,'battle',NATURE);
 const water=put(s,0,'battle',WATER),seed=put(s,1,'battle',SEED);
 play(s,mel,a=>a.origin==='mana'&&a.cost===6);
 assert.deepEqual(new Set(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid)),new Set([light.uid,nature.uid]));
 s=restore(s);
 act(s,'evolve',a=>a.baseUid===nature.uid);
 assert.ok(has(s,0,'battle',mel));
 assert.equal(s.players[0].battle.find(x=>x.uid===mel.uid).under[0].uid,nature.uid);
 assert.ok(!has(s,0,'mana',mel));
 assert.ok(choices(s).includes(seed.uid)&&choices(s).includes(water.uid));
 pick(s,seed.uid);
 assert.ok(has(s,1,'shields',seed));
 assert.equal(s.players[1].shields.find(x=>x.uid===seed.uid).faceUp,undefined);
});

test('メルヴェイユ can decline shield placement and continuously buffs other allies only',()=>{
 const s=setup();
 const mel=put(s,0,'hand',MEL),base=put(s,0,'battle',LIGHT),friend=put(s,0,'battle',NATURE);
 const enemy=put(s,1,'battle',WATER);
 play(s,mel);
 act(s,'evolve',a=>a.baseUid===base.uid);
 pick(s,null);
 assert.ok(has(s,1,'battle',enemy));
 assert.equal(e.power(mel,false,s),12000);
 assert.equal(e.effectiveCard(mel,s).breaker,3);
 assert.equal(e.power(friend,false,s),e.card(friend).power+6000);
 assert.equal(e.effectiveCard(friend,s).poweredBreaker,true);
 assert.equal(e.effectiveCard(friend,s).breaker,2);
 assert.equal(e.power(enemy,false,s),e.card(enemy).power);
 s.players[0].grave.push(s.players[0].battle.pop());
 assert.equal(e.power(friend,false,s),e.card(friend).power);
 assert.equal(!!e.effectiveCard(friend,s).poweredBreaker,false);
});

test('ボンボヤージュ can decline one ally entry and draw at the next, independently from its attack ability',()=>{
 const s=setup();
 const bon=put(s,0,'hand',BON),a=put(s,0,'hand',FIRE),b=put(s,0,'hand',LIGHT),c=put(s,0,'hand',NATURE);
 const attacker=put(s,0,'battle',FIRE);
 play(s,bon);
 assert.equal(s.decision,null);
 assert.equal(e.effectiveCard(bon,s).blocker,true);
 play(s,a);
 pick(s,null);
 play(s,b);
 pick(s,true);
 assert.equal(s.players[0].drawsThisTurn,1);
 play(s,c);
 assert.equal(s.decision,null);
 const ramped=top(s,0,NATURE);
 attack(s,attacker.uid);
 taskIs(s,'g34_Offer');
 pick(s,true);
 assert.ok(choices(s).includes(ramped.uid));
 pick(s,ramped.uid);
 assert.ok(has(s,0,'battle',ramped));
 assert.equal(s.players[0].drawsThisTurn,1);
});

test('ボンボヤージュ can decline the first attack, ramp on the second and then stops for that turn',()=>{
 let s=setup();
 put(s,0,'battle',BON);
 const attackers=Array.from({length:3},()=>put(s,0,'battle',FIRE));
 const valid=put(s,0,'mana',LIGHT),wrongColor=put(s,0,'mana',FIRE),expensive=put(s,0,'mana',BON);
 const ramped=top(s,0,NATURE);
 attack(s,attackers[0].uid);
 pick(s,null);
 assert.equal(s.players[0].deck[0].uid,ramped.uid);
 finishAttack(s);
 attack(s,attackers[1].uid);
 s=restore(s);
 pick(s,true);
 assert.ok(choices(s).includes(valid.uid)&&choices(s).includes(ramped.uid));
 assert.ok(!choices(s).includes(wrongColor.uid)&&!choices(s).includes(expensive.uid));
 pick(s,null);
 assert.ok(has(s,0,'mana',ramped));
 finishAttack(s);
 attack(s,attackers[2].uid);
 assert.equal(s.decision?.type,'block');
 finishAttack(s);
 end(s);
 end(s);
 attack(s,attackers[0].uid);
 taskIs(s,'g34_Offer');
 pick(s,null);
});

test('ボンボヤージュ may deploy from mana if the attempted ramp is replaced (analogous QA39986)',()=>{
 const s=setup();
 put(s,0,'battle',BON);
 put(s,1,'battle','dmrp22-033');
 const attacker=put(s,0,'battle',FIRE),mana=put(s,0,'mana',LIGHT),ramped=top(s,0,NATURE);
 assert.match(e.card('dmrp22-033').name,/ニンギョ/);
 attack(s,attacker.uid);
 pick(s,true);
 assert.ok(has(s,0,'grave',ramped));
 assert.ok(choices(s).includes(mana.uid)&&!choices(s).includes(ramped.uid));
 pick(s,mana.uid);
 pick(s,true);
 assert.equal(s.players[0].drawsThisTurn,1);
});

test('ボンボヤージュ draws on the opposing turn and each copy has its own usage',()=>{
 const s=setup();
 const first=put(s,0,'battle',BON),second=put(s,0,'battle',BON);
 const a=put(s,1,'battle',FIRE);
 s.active=1;
 give(s,0,'shields',['dm24rp2-015']);
 attack(s,a.uid);
 finishAttack(s);
 act(s,'useTrigger');
 act(s,'orderEntry',x=>x.uid===first.uid);
 pick(s,true);
 act(s,'orderEntry',x=>x.uid===second.uid);
 taskIs(s,'g34_Offer');
 pick(s,true);
 assert.equal(s.players[0].drawsThisTurn,2);
 assert.ok(has(s,0,'battle',second));
});

test('カイザー uses G・G・G with one hand card and no other same-name creature',()=>{
 const s=setup();
 give(s,0,'mana',[]);
 const k=put(s,0,'hand',KAISER),other=put(s,0,'hand',LIGHT);
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===k.uid&&a.freeSummon));
 s.players[0].grave.push(s.players[0].hand.pop());
 assert.ok(has(s,0,'grave',other));
 play(s,k,a=>a.freeSummon==='G・G・G'&&a.cost===0);
 assert.ok(has(s,0,'battle',k));
 assert.equal(e.effectiveCard(k,s).speedAttacker,true);
 assert.equal(e.effectiveCard(k,s).breaker,2);
 const second=put(s,0,'hand',KAISER);
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===second.uid&&a.freeSummon));
});

test('カイザー has a million bonus only in battle during its controller’s turn',()=>{
 const s=setup(),k=put(s,0,'battle',KAISER),enemy=put(s,1,'battle',FIRE);
 assert.equal(e.power(k,false,s),10000);
 assert.equal(e.power(k,true,s),10000);
 assert.equal(e.matchupPower(k,enemy,true,s),1010000);
 assert.equal(e.matchupPower(k,enemy,false,s),1010000);
 s.active=1;
 assert.equal(e.matchupPower(k,enemy,false,s),10000);
});

test('カイザー narrows only the first attack and permits ending the turn',()=>{
 const s=setup();
 const a=put(s,0,'battle',FIRE),b=put(s,0,'battle',FIRE);
 const k=put(s,1,'battle',KAISER),other=put(s,1,'battle',LIGHT);
 k.tapped=other.tapped=true;
 s.phase='attack';
 assert.deepEqual(attacks(s,a).map(x=>x.target),[k.uid]);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='endTurn'));
 attack(s,a.uid,k.uid);
 finishAttack(s);
 assert.ok(attacks(s,b).some(x=>x.target==='player'));
 assert.ok(attacks(s,b).some(x=>x.target===other.uid));
});

test('カイザー does not create a new legal target or force a later attack after the first has passed',()=>{
 const s=setup();
 const a=put(s,0,'battle',FIRE),b=put(s,0,'battle',FIRE),k=put(s,1,'battle',KAISER);
 s.phase='attack';
 assert.ok(attacks(s,a).every(x=>x.target==='player'));
 attack(s,a.uid);
 finishAttack(s);
 k.tapped=true;
 assert.ok(attacks(s,b).some(x=>x.target==='player'));
 assert.ok(attacks(s,b).some(x=>x.target===k.uid));
});
