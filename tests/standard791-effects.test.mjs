import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-791.json',import.meta.url)));
const SHIN="dm24ex4-049",KANA="dm24ex4-052",MOON="dm24ex4-034";
const LIGHT="dm01-075",NATURE="dm01-103",WATER="dm01-051",DUAL="dmr04-052",FIRE="dm01-097";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 791 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:791}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:791}));
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
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:791}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

const play=(s,x,face=0)=>act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face);
const choices=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const taskIs=(s,op)=>assert.equal(s.decision?.task?.op,op,JSON.stringify(s.decision));
function hit(s,x,shield){
 attack(s,x.uid);
 act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.includes(shield.uid));
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
}
function top(s,p,ids){
 const xs=ids.map(inst);
 s.players[p].deck.unshift(...xs);
 return xs;
}

test('審問の絆 draws two before selecting any-cost light or water non-evolution Blockers',()=>{
 const s=setup();
 const spell=put(s,0,'hand',SHIN);
 const wrongColor=put(s,0,'hand','dm01-089');
 const evolution=put(s,0,'hand','dm02-s01');
 const noBlocker=put(s,0,'hand',LIGHT);
 const [sirius,water]=top(s,0,['dm05-s01',WATER]);
 play(s,spell);
 assert.equal(s.players[0].drawsThisTurn,2);
 assert.deepEqual(new Set(choices(s)),new Set([sirius.uid,water.uid,null]));
 pick(s,sirius.uid);
 assert.ok(has(s,0,'battle',sirius));
 assert.ok([wrongColor,evolution,noBlocker,water].every(x=>has(s,0,'hand',x)));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,6);
});

test('審問の絆 may decline deployment and can put a NEO Blocker over a legal base',()=>{
 for(const deploy of [false,true]){
  const s=setup();
  const spell=put(s,0,'hand',SHIN),neo=put(s,0,'hand','dm25rp2-S01');
  const base=put(s,0,'battle',LIGHT);
  play(s,spell);
  pick(s,deploy?neo.uid:null);
  if(deploy)act(s,'extended',a=>s.decision.choices[a.choice].value===base.uid);
  if(deploy){
   assert.ok(has(s,0,'battle',neo));
   assert.equal(neo.under[0].uid,base.uid);
  }else assert.ok(has(s,0,'hand',neo));
 }
});

test('審問の絆 can use G Strike when broken and stays in hand without casting',()=>{
 const s=setup();
 s.active=1;
 const a=put(s,1,'battle',FIRE),b=put(s,1,'battle',FIRE);
 give(s,0,'shields',[SHIN]);
 const shield=s.players[0].shields[0];
 hit(s,a,shield);
 taskIs(s,'gsDeclare');
 pick(s,true);
 taskIs(s,'gsTarget');
 pick(s,b.uid);
 assert.ok(e.attackLocked(s,1,b));
 assert.ok(has(s,0,'hand',shield));
 assert.equal(s.players[0].drawsThisTurn||0,0);
});

test('彼方の絆 counts a multicolored card once and grants Blocker through the opposing turn',()=>{
 let s=setup();
 const spell=put(s,0,'hand',KANA);
 const [dual,nature,fire]=top(s,0,[DUAL,NATURE,FIRE]);
 play(s,spell);
 taskIs(s,'g34_LookPick');
 assert.deepEqual(choices(s),[dual.uid,null]);
 pick(s,dual.uid);
 assert.ok(has(s,0,'deck',dual));
 assert.ok(!has(s,0,'hand',dual));
 s=restore(s);
 assert.deepEqual(choices(s),[nature.uid,null]);
 pick(s,nature.uid);
 taskIs(s,'g34_Select');
 pick(s,dual.uid);
 const deployed=()=>s.players[0].battle.find(x=>x.uid===dual.uid);
 assert.equal(e.effectiveCard(deployed(),s).blocker,true);
 assert.ok(has(s,0,'hand',nature));
 assert.equal(s.players[0].deck.at(-1).uid,fire.uid);
 assert.equal(s.players[0].drawsThisTurn||0,0);
 end(s);
 assert.equal(e.effectiveCard(deployed(),s).blocker,true);
 end(s);
 assert.equal(!!e.effectiveCard(deployed(),s).blocker,false);
});

test('彼方の絆 can skip either color, orders the leftovers, and filters the deployment independently',()=>{
 const s=setup();
 const spell=put(s,0,'hand',KANA),water=put(s,0,'hand',WATER),high=put(s,0,'hand','dm05-s01');
 const [light,nature,fire]=top(s,0,[LIGHT,NATURE,FIRE]);
 play(s,spell);
 pick(s,null);
 pick(s,nature.uid);
 taskIs(s,'g34_Order');
 pick(s,fire.uid);
 assert.deepEqual(s.players[0].deck.slice(-2).map(x=>x.uid),[fire.uid,light.uid]);
 assert.deepEqual(choices(s),[nature.uid,null]);
 pick(s,null);
 assert.ok([water,high,nature].every(x=>has(s,0,'hand',x)));
});

test('彼方の絆 used as a shield trigger can grant Blocker for the next attack',()=>{
 const s=setup();
 s.active=1;
 const first=put(s,1,'battle',FIRE),second=put(s,1,'battle',FIRE);
 const defender=put(s,0,'hand',LIGHT);
 top(s,0,[FIRE,FIRE,FIRE]);
 give(s,0,'shields',[KANA,NATURE]);
 hit(s,first,s.players[0].shields[0]);
 act(s,'useTrigger');
 for(let i=0;i<2;i++)pick(s,choices(s)[0]);
 pick(s,defender.uid);
 assert.equal(e.effectiveCard(defender,s).blocker,true);
 attack(s,second.uid);
 act(s,'block',a=>a.uid===defender.uid);
});

test('彼方の絆 does not grant Blocker when a deployment is replaced',()=>{
 const s=setup();
 const spell=put(s,0,'hand',KANA),defender=put(s,0,'hand',LIGHT);
 put(s,1,'battle','dm24ex4-074');
 s.players[0].enteredThisTurn=2;
 top(s,0,[FIRE,FIRE,FIRE]);
 play(s,spell);
 for(let i=0;i<2;i++)pick(s,choices(s)[0]);
 pick(s,defender.uid);
 assert.ok(has(s,0,'mana',defender));
 assert.ok(!s.extLimits?.some(l=>l.kind==='g521Grant'&&l.ref.uid===defender.uid));
});

test('インデペンデンス may decline the mill or recover only one card from the same two-card mill',()=>{
 for(const mode of ['skip','leave','recover']){
  let s=setup();
  const moon=put(s,0,'hand',MOON),earlier=put(s,0,'grave',NATURE);
  const [a,b]=top(s,0,[NATURE,SHIN]);
  play(s,moon);
  assert.equal(e.effectiveCard(moon,s).blocker,true);
  taskIs(s,'g34_Offer');
  pick(s,mode==='skip'?null:true);
  if(mode==='skip'){
   assert.equal(s.players[0].deck[0].uid,a.uid);
   assert.deepEqual(s.players[0].grave.map(x=>x.uid),[earlier.uid]);
   continue;
  }
  s=restore(s);
  assert.deepEqual(choices(s),[a.uid,b.uid,null]);
  pick(s,mode==='recover'?b.uid:null);
  assert.ok(has(s,0,'grave',a)&&has(s,0,'grave',earlier));
  assert.ok(has(s,0,mode==='recover'?'hand':'grave',b));
 }
});

test('インデペンデンス gains Slayer and targeting protection only with its own extra-zone spell',()=>{
 const s=setup(),moon=put(s,0,'hand',MOON);
 play(s,moon);
 pick(s,null);
 put(s,1,'extra',SHIN);
 put(s,0,'extra',LIGHT);
 assert.equal(!!e.effectiveCard(moon,s).slayer,false);
 const twin=put(s,0,'extra','dm24ex4-065');
 assert.ok(e.card(twin).spellFace);
 assert.equal(e.effectiveCard(moon,s).slayer,true);
 s.active=1;
 const spell=put(s,1,'hand',MOON),other=put(s,0,'battle',LIGHT);
 play(s,spell,1);
 assert.deepEqual(choices(s),[other.uid]);
 pick(s,other.uid);
 pick(s,0);
 s.players[0].extra.pop();
 assert.equal(!!e.effectiveCard(moon,s).slayer,false);
 assert.equal(!!e.effectiveCard(moon,s).untargetable,false);
});

test('月を継ぐもの can trigger, returns a noncreature element first, and keeps discard choices hidden',()=>{
 let s=setup();
 s.active=1;
 const attacker=put(s,1,'battle',FIRE),seed=put(s,1,'battle','dm22ex1-086');
 const hidden=put(s,1,'hand',LIGHT);
 give(s,0,'shields',[MOON]);
 const shield=s.players[0].shields[0];
 hit(s,attacker,shield);
 act(s,'useTrigger',a=>a.face===1);
 pick(s,seed.uid);
 assert.ok(has(s,1,'hand',seed));
 taskIs(s,'g34_BlindDiscard773');
 assert.deepEqual(choices(s),[0,1]);
 assert.ok(s.decision.choices.every(x=>!x.cardId));
 s=restore(s);
 pick(s,1);
 assert.ok(has(s,1,'grave',seed)&&has(s,1,'hand',hidden));
 assert.ok(has(s,0,'grave',shield));
});

test('彼方の絆 grants Blocker through the spell and Genmu can suppress it until it leaves',()=>{
 const s=setup(),spell=put(s,0,'hand',KANA),unit=put(s,0,'hand',LIGHT);
 top(s,0,[FIRE,FIRE,FIRE]);
 play(s,spell);
 for(let i=0;i<2;i++)pick(s,choices(s)[0]);
 pick(s,unit.uid);
 assert.equal(e.effectiveCard(unit,s).blocker,true);
 put(s,1,'battle','dmrp15-km1');
 assert.equal(!!e.effectiveCard(unit,s).blocker,false);
 s.players[1].grave.push(s.players[1].battle.pop());
 assert.equal(e.effectiveCard(unit,s).blocker,true);
});
