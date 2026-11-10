import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-762.json',import.meta.url)));
const DAN='dm22rp2-023',GRIFFER='dm24rp4-073',CIAN='dm24rp2-048';
const BODY='dm01-108',RED='dmr17-081',TURBO='dmr17-s07',CHANGE='promoy15-020';
const SIX='dm17-048',FIVE='dmr23-072',HYPER='dm24rp2-S02';
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{
 const option=s.decision.choices[a.choice].value;
 return (option?.uid??option)===value;
});
const inZone=(s,p,z,uid)=>s.players[p][z].some(x=>x.uid===uid);
const noBlock=s=>{if(s.decision?.type==='block')act(s,'noBlock');};
const attacks=(s,x)=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid).map(a=>a.target);

test('three complete definitions keep their existing catalogue IDs and verified images',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:762}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:762}));
  assert.deepEqual(registry.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(registry.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

test('the alternate Dan print uses the same stored identity and verified rules',()=>{
 const cat=createCatalogue(snapshot,data.cards,details);
 const [row]=printAliases;
 assert.equal(row.canonicalId,DAN);
 assert.ok(row.verification.facesMatched);
 assert.deepEqual(row.faces,cards.find(c=>c.id===DAN).faces);
 assert.equal(regulationVerification.limits[row.id],e.card(DAN).limit);
 assert.deepEqual(cat.resolveRows([{id:row.id,count:1},{id:DAN,count:2}]),[{id:DAN,count:3}]);
});

test('Dan sends a new opposing attacker to mana before combat and leaves older or friendly attacks alone',()=>{
 for(const [side,fresh] of [[1,true],[1,false],[0,true]]){
  const s=setup(),attacker=put(s,0,'battle',RED,{entered:fresh?s.turn:0});
  put(s,side,'battle',DAN);
  attack(s,attacker.uid);
  noBlock(s);
  drain(s);
  const moved=side===1&&fresh;
  assert.equal(inZone(s,0,'mana',attacker.uid),moved);
  assert.equal(s.players[1].shields.length,moved?5:4);
 }
});

test('Dan follows the original attacker through an invasion only when that attacker was new',()=>{
 for(const fresh of [false,true]){
  let s=setup();
  const attacker=put(s,0,'battle',RED,{entered:fresh?s.turn:0});
  const invader=put(s,0,'hand',TURBO);
  put(s,1,'battle',DAN);
  attack(s,attacker.uid);
  assert.equal(s.decision.task.op,'g23_Declare');
  pick(s,true);
  assert.equal(s.decision.task.op,'g23_Invade');
  s=JSON.parse(JSON.stringify(s));
  pick(s,true);
  drain(s);
  assert.equal(inZone(s,0,'mana',attacker.uid),fresh);
  assert.equal(inZone(s,0,'mana',invader.uid),fresh);
  assert.equal(inZone(s,0,'battle',invader.uid),!fresh);
  assert.equal(s.players[1].shields.length,fresh?5:3);
 }
});

test('Dan does not move the replacement after revolution change',()=>{
 for(const fresh of [false,true]){
  const s=setup();
  const attacker=put(s,0,'battle',RED,{entered:fresh?s.turn:0});
  const incoming=put(s,0,'hand',CHANGE);
  put(s,1,'battle',DAN);
  attack(s,attacker.uid);
  assert.equal(s.decision.task.op,'revDeclare');
  pick(s,true);
  assert.equal(s.decision.task.op,'revResolve');
  pick(s,attacker.uid);
  drain(s);
  assert.ok(inZone(s,0,'hand',attacker.uid)&&inZone(s,0,'battle',incoming.uid));
  assert.ok(!inZone(s,0,'mana',incoming.uid));
  assert.equal(s.players[1].shields.length,4);
 }
});

test('Griffer grants same-turn creature attacks at cost six, including after it leaves, but not below six',()=>{
 const s=setup(),griffer=put(s,0,'battle',GRIFFER);
 const enemy=put(s,1,'battle',BODY);
 cast(s,SIX);
 drain(s);
 cast(s,FIVE);
 drain(s);
 const high=s.players[0].battle.find(x=>x.cardId===SIX);
 const low=s.players[0].battle.find(x=>x.cardId===FIVE);
 assert.equal(e.effectiveCard(low,s).machFighter,undefined);
 assert.equal(e.effectiveCard(high,s).machFighter,true);
 s.extTasks=[{op:'g34_ExactMove',p:1,source:GRIFFER,owner:0,target:griffer.uid,to:'hand'}];
 act(s,'toAttack');
 assert.ok(inZone(s,0,'hand',griffer.uid));
 assert.deepEqual(attacks(s,high),[enemy.uid]);
 s.turn++;
 assert.equal(e.effectiveCard(high,s).machFighter,undefined);
 assert.ok(!attacks(s,high).includes(enemy.uid));
});

test('Cian may substitute only its own Hyper Beast on attack or defense, even without an active Hyper Mode',()=>{
 for(const side of [0,1]){
  let s=setup();
  const cian=put(s,side,'battle',CIAN,{entered:side===0?s.turn:0,tapped:side===1});
  const proxy=put(s,side,'battle',HYPER,{tapped:true}),other=put(s,side,'battle',BODY);
  const opposing=put(s,1-side,'battle',RED);
  put(s,1-side,'battle',HYPER);
  attack(s,side===0?cian.uid:opposing.uid,side===0?opposing.uid:cian.uid);
  noBlock(s);
  assert.equal(s.decision.task.op,'g393SG_Battle');
  assert.equal(s.decision.player,side);
  assert.deepEqual(s.decision.choices.map(o=>o.value?.uid??o.value),[proxy.uid,null]);
  s=JSON.parse(JSON.stringify(s));
  pick(s,proxy.uid);
  drain(s);
  assert.ok(inZone(s,side,'battle',cian.uid)&&inZone(s,side,'battle',proxy.uid)&&inZone(s,side,'battle',other.uid));
  assert.ok(inZone(s,1-side,'grave',opposing.uid));
 }
});

test('Cian can decline the battle substitution',()=>{
 const s=setup(),cian=put(s,0,'battle',CIAN,{entered:s.turn});
 const rival=put(s,1,'battle',RED),proxy=put(s,0,'battle',HYPER);
 attack(s,cian.uid,rival.uid);
 noBlock(s);
 pick(s,null);
 drain(s);
 assert.ok(inZone(s,0,'grave',cian.uid)&&inZone(s,0,'battle',proxy.uid));
 assert.ok(inZone(s,1,'battle',rival.uid));
});
