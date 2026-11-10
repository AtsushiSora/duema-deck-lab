import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,GEN} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-771.json',import.meta.url)));
const WING='dm23rp4-001',ROCK='dm23rp4-068',MELA='dm23rp4-071';
const BODY='dm01-108',BIG='dm01-001',SEED='dm25rp4-013',NINGYO='dmrp22-033',APUL='dmrp22-042';
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
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
test('three complete definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:771}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:771}));
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

function tap(s,p,target){
 task(s,'g34_Target',p,{owner:'self',tap:true});
 pick(s,target.uid);
}
function move(s,p,target,to='hand'){
 task(s,'g34_ExactMove',p,{owner:p,target:target.uid,to});
}
const options=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const grant=(x,s)=>x.g34Grants?.some(g=>g.turn===s.turn&&g.spellSource===MELA&&g.speedAttacker);

test('Wing reduces its summon cost by three only with more creatures',()=>{
 const s=setup(),wing=put(s,0,'hand',WING);
 const cost=()=>e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===wing.uid).cost;
 assert.equal(cost(),6);
 put(s,0,'battle',SEED);
 assert.equal(cost(),6);
 put(s,0,'battle',BODY);
 assert.equal(cost(),3);
 put(s,1,'battle',BODY);
 assert.equal(cost(),6);
});

test('Wing offers one draw per actual friendly creature tap, including itself on the opponent turn',()=>{
 let s=setup();
 s.active=1;
 const wing=put(s,0,'battle',WING),ally=put(s,0,'battle',BODY),enemy=put(s,1,'battle',BODY);
 tap(s,1,enemy);
 assert.equal(s.decision,null);
 const size=s.players[0].hand.length;
 tap(s,0,ally);
 assert.equal(s.decision.task.op,'g34_Draw');
 assert.equal(s.decision.player,0);
 s=restore(s);
 pick(s,1);
 assert.equal(s.players[0].hand.length,size+1);
 tap(s,0,ally);
 assert.equal(s.decision,null);
 tap(s,0,wing);
 assert.equal(s.decision.task.op,'g34_Draw');
 pick(s,0);
 assert.equal(s.players[0].hand.length,size+1);
});

test('Wing may untap when another friendly creature leaves for hand or mana',()=>{
 for(const dest of ['hand','mana'])for(const accept of [false,true]){
  let s=setup();
  const wing=put(s,0,'battle',WING),ally=put(s,0,'battle',BODY),enemy=put(s,1,'battle',BODY);
  wing.tapped=true;
  move(s,1,enemy);
  assert.equal(s.decision,null);
  move(s,0,ally,dest);
  assert.ok(has(s,0,dest,ally));
  assert.equal(s.decision.task.op,'g34_Offer');
  s=restore(s);
  pick(s,accept?true:null);
  assert.equal(s.players[0].battle.find(x=>x.uid===wing.uid).tapped,!accept);
 }
});

test('Wing ignores a departing noncreature and does not watch another creature leave simultaneously with it',()=>{
 const s=setup(),wing=put(s,0,'battle',WING),ally=put(s,0,'battle',BODY),seed=put(s,0,'battle',SEED);
 wing.tapped=true;
 move(s,0,seed);
 assert.equal(s.decision,null);
 task(s,'g34_GroupPower',1,{filter:{creature:true},power:-20000});
 assert.ok(has(s,0,'grave',wing)&&has(s,0,'grave',ally));
 assert.equal(s.decision,null);
});

for(const fromGrave of [false,true])for(const fromHand of [false,true])
test('Rock selects each zone independently and commits together '+fromGrave+'/'+fromHand,()=>{
 let s=setup();
 const grave=put(s,0,'grave',BODY),otherGrave=put(s,0,'grave',BIG),hand=put(s,0,'hand',BODY),otherHand=put(s,0,'hand',BIG);
 play(s,ROCK);
 assert.equal(s.decision.task.op,'g34_GraveHandMana771');
 assert.deepEqual(options(s),[grave.uid,otherGrave.uid,null]);
 pick(s,fromGrave?grave.uid:null);
 assert.ok(has(s,0,'grave',grave));
 assert.ok(!has(s,0,'mana',grave));
 s=restore(s);
 assert.deepEqual(options(s),[hand.uid,otherHand.uid,null]);
 pick(s,fromHand?hand.uid:null);
 assert.equal(has(s,0,'mana',grave),fromGrave);
 assert.equal(has(s,0,'mana',hand),fromHand);
 for(const x of s.players[0].mana.filter(x=>[grave.uid,hand.uid].includes(x.uid)))assert.ok(x.tapped);
 assert.ok(has(s,0,'grave',otherGrave)&&has(s,0,'hand',otherHand));
});

for(const lock of [NINGYO,APUL])
test('Rock still moves the hand card under '+lock,()=>{
 const s=setup(),grave=put(s,0,'grave',BODY),hand=put(s,0,'hand',BODY);
 put(s,1,'battle',lock);
 play(s,ROCK);
 if(lock===NINGYO)pick(s,grave.uid);
 assert.deepEqual(options(s),[hand.uid,null]);
 pick(s,hand.uid);
 assert.strictEqual(s.players[0].grave[0],grave);
 assert.ok(s.players[0].mana.find(x=>x.uid===hand.uid)?.tapped);
});

test('Mela grants speed only to the selected creature for the turn and still charges',()=>{
 let s=setup();
 const ally=put(s,0,'battle',BODY),cheap=put(s,0,'hand',BODY),expensive=put(s,0,'hand',BIG);
 const spell=play(s,MELA);
 assert.deepEqual(options(s),[cheap.uid,null]);
 s=restore(s);
 pick(s,cheap.uid);
 assert.ok(has(s,0,'hand',expensive)&&has(s,0,'mana',spell));
 const entered=s.players[0].battle.find(x=>x.uid===cheap.uid);
 assert.ok(grant(entered,s));
 assert.ok(!grant(ally,s));
 act(s,'toAttack');
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===cheap.uid));
 assert.ok(!grant(entered,{turn:s.turn+1}));
 move(s,0,entered);
 s.phase='main';
 act(s,'play',a=>a.uid===entered.uid);
 assert.ok(!grant(s.players[0].battle.find(x=>x.uid===cheap.uid),s));
});

test('Mela can decline deployment and still moves the spell to mana',()=>{
 const s=setup(),cheap=put(s,0,'hand',BODY);
 const spell=play(s,MELA);
 pick(s,null);
 assert.ok(has(s,0,'hand',cheap)&&has(s,0,'mana',spell));
});

test('Mela grants speed after optional NEO evolution and respects an enters-tapped effect',()=>{
 const s=setup(),base=put(s,0,'battle','dm01-097'),neo=put(s,0,'hand','dmrp03-078');
 put(s,1,'battle','dmr02-s03');
 const spell=play(s,MELA);
 pick(s,neo.uid);
 assert.equal(s.decision.task.op,'g34_Put');
 pick(s,base.uid);
 const entrant=s.players[0].battle.find(x=>x.uid===neo.uid);
 assert.ok(entrant.tapped&&grant(entrant,s));
 assert.equal(entrant.under[0].uid,base.uid);
 assert.ok(has(s,0,'mana',spell));
});

test('Mela does not grant speed when the entry is replaced by a move to mana',()=>{
 const s=setup(),cheap=put(s,0,'hand',BODY),spell=put(s,0,'grave',MELA);
 put(s,1,'battle','dmr20-066');
 give(s,0,'mana',[]);
 task(s,'g34_Put',0,{source:MELA,origin:'grave',target:spell.uid,execution:true});
 pick(s,cheap.uid);
 assert.ok(!has(s,0,'battle',cheap));
 assert.ok(has(s,0,'mana',cheap)&&has(s,0,'mana',spell));
 assert.ok(!cheap.g34Grants?.length);
});

test('Mela marks the speed grant as a spell effect so spell suppression applies',()=>{
 const s=setup(),cheap=put(s,0,'hand',BODY);
 play(s,MELA);
 pick(s,cheap.uid);
 assert.equal(e.effectiveCard(cheap,s).speedAttacker,true);
 put(s,1,'battle',GEN);
 assert.ok(!e.effectiveCard(cheap,s).speedAttacker);
});

test('Wing draws on declaring its attack and breaks two shields',()=>{
 const s=setup(),wing=put(s,0,'battle',WING);
 attack(s,wing.uid);
 assert.equal(s.decision.task.op,'g34_Draw');
 pick(s,0);
 act(s,'noBlock');
 assert.equal(s.decision.type,'breakChoice');
 act(s,'breakShields');
 assert.equal(s.players[1].shields.length,3);
});
